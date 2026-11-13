//! Starting, watching and stopping the analysis engine.
//!
//! The application starts `ian serve`, reads its one line of JSON from standard output and hands the base URL and
//! the token to the webview through two commands. The token lives in memory only: it is never logged or written to
//! disk. This module uses only the standard library, including a small JSON reader for the engine's two documents.

use std::collections::HashMap;
use std::ffi::OsString;
use std::io::{self, BufRead, BufReader, Read};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::sync::{Condvar, Mutex, MutexGuard};
use std::thread;
use std::time::Duration;

/// How long the engine has to print its ready line.
pub const LAUNCH_TIMEOUT: Duration = Duration::from_secs(30);

/// The most failure-envelope text read from the engine's standard output.
const MAX_FAILURE_TEXT: u64 = 1024 * 1024;

/// The environment variable that names the engine executable.
pub const EXECUTABLE_VARIABLE: &str = "IAD_IAN_PATH";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExecutableSource {
    /// The `IAD_IAN_PATH` environment variable.
    Environment,
    /// A search of `PATH`.
    Path,
}

impl ExecutableSource {
    fn label(self) -> &'static str {
        match self {
            Self::Environment => EXECUTABLE_VARIABLE,
            Self::Path => "PATH",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Executable {
    pub path: PathBuf,
    pub source: ExecutableSource,
}

fn executable_names() -> &'static [&'static str] {
    if cfg!(windows) {
        &["ian.exe", "ian.cmd", "ian.bat"]
    } else {
        &["ian"]
    }
}

fn find_in_directories(path_variable: &OsString) -> Option<PathBuf> {
    std::env::split_paths(path_variable)
        .flat_map(|directory| {
            executable_names()
                .iter()
                .map(move |name| directory.join(name))
        })
        .find(|candidate| candidate.is_file())
}

/// Chooses the engine executable: `IAD_IAN_PATH` when it is set and not empty, otherwise the first `ian` on `PATH`.
/// When nothing is found the bare name `ian` is returned, so that starting it fails as "not found".
pub fn choose_executable(
    iad_ian_path: Option<OsString>,
    path_variable: Option<OsString>,
) -> Executable {
    if let Some(configured) = iad_ian_path.filter(|value| !value.is_empty()) {
        return Executable {
            path: PathBuf::from(configured),
            source: ExecutableSource::Environment,
        };
    }
    let found = path_variable.as_ref().and_then(find_in_directories);
    Executable {
        path: found.unwrap_or_else(|| PathBuf::from("ian")),
        source: ExecutableSource::Path,
    }
}

/// The origin of a webview URL, as `scheme://host[:port]`, which is what the engine's `--allow-origin` takes.
/// A custom scheme such as `tauri://localhost` has an opaque origin for the `url` crate, so it is built by hand.
pub fn origin_of(url: &tauri::Url) -> Option<String> {
    let host = url.host_str()?;
    let host = if host.contains(':') {
        format!("[{host}]")
    } else {
        host.to_string()
    };
    Some(match url.port() {
        Some(port) => format!("{}://{host}:{port}", url.scheme()),
        None => format!("{}://{host}", url.scheme()),
    })
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Launch {
    Ready {
        port: u16,
        token: String,
    },
    Failed {
        reason_code: Option<String>,
        reason: Option<String>,
    },
}

/// Reads what the engine wrote to standard output. A successful launch is a single line holding the port and the
/// token. A failed launch is a failure envelope, which the engine writes as indented JSON over several lines, so
/// `first_line` and `remainder` together hold the document. Anything else is a failure with no reason code.
pub fn classify_output(first_line: &str, remainder: &str) -> Launch {
    if let Some(JsonValue::Object(fields)) = parse_json(first_line)
        && let (Some(JsonValue::Number(port)), Some(JsonValue::String(token))) =
            (fields.get("port"), fields.get("token"))
        && let Ok(port) = port.parse::<u16>()
        && !token.is_empty()
    {
        return Launch::Ready {
            port,
            token: token.clone(),
        };
    }
    let document = format!("{first_line}\n{remainder}");
    let fields = match parse_json(&document) {
        Some(JsonValue::Object(fields)) => fields,
        _ => HashMap::new(),
    };
    let text = |key: &str| match fields.get(key) {
        Some(JsonValue::String(value)) if !value.is_empty() => Some(value.clone()),
        _ => None,
    };
    Launch::Failed {
        reason_code: text("reason_code"),
        reason: text("reason"),
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Connection {
    Pending,
    Ready { base_url: String, token: String },
    NotFound,
    LaunchFailed { reason_code: Option<String> },
    TimedOut,
}

impl Connection {
    /// The document `engine_connection` returns to the webview.
    fn to_json(&self) -> String {
        match self {
            Self::Pending => r#"{"state":"pending"}"#.to_string(),
            Self::Ready { base_url, token } => format!(
                r#"{{"state":"ready","base_url":{},"token":{}}}"#,
                json_string(base_url),
                json_string(token)
            ),
            Self::NotFound => r#"{"state":"not_found"}"#.to_string(),
            Self::LaunchFailed { reason_code } => format!(
                r#"{{"state":"launch_failed","reason_code":{}}}"#,
                reason_code
                    .as_deref()
                    .map_or_else(|| "null".to_string(), json_string)
            ),
            Self::TimedOut => r#"{"state":"timed_out"}"#.to_string(),
        }
    }
}

/// The engine's state, shared between the launch thread and the commands.
pub struct Engine {
    connection: Mutex<Connection>,
    resolved: Condvar,
    child: Mutex<Option<Child>>,
}

impl Default for Engine {
    fn default() -> Self {
        Self {
            connection: Mutex::new(Connection::Pending),
            resolved: Condvar::new(),
            child: Mutex::new(None),
        }
    }
}

fn locked<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

impl Engine {
    fn resolve(&self, connection: Connection) {
        *locked(&self.connection) = connection;
        self.resolved.notify_all();
    }

    /// Waits until the launch has an outcome, then returns it.
    fn wait_for_connection(&self) -> Connection {
        let mut connection = locked(&self.connection);
        while *connection == Connection::Pending {
            connection = self
                .resolved
                .wait(connection)
                .unwrap_or_else(|poisoned| poisoned.into_inner());
        }
        connection.clone()
    }

    fn is_running(&self) -> bool {
        match locked(&self.child).as_mut() {
            Some(child) => matches!(child.try_wait(), Ok(None)),
            None => false,
        }
    }

    /// Kills the engine if it is still running, so that no engine is left listening after a failed launch.
    fn kill_if_running(&self) {
        if let Some(child) = locked(&self.child).as_mut() {
            if matches!(child.try_wait(), Ok(None)) {
                let _ = child.kill();
            }
            let _ = child.wait();
        }
    }

    /// Closes the engine's standard input. The engine finishes or stops a running refresh within its own bounded
    /// shutdown and exits; the application neither waits for it nor kills it.
    pub fn close_standard_input(&self) {
        if let Some(child) = locked(&self.child).as_mut() {
            drop(child.stdin.take());
        }
    }
}

fn describe(value: &Option<String>) -> String {
    value
        .as_deref()
        .map_or_else(|| "none".to_string(), |text| format!("{text:?}"))
}

/// One line per launch outcome on standard error. It never holds the token.
fn log_outcome(
    outcome: &str,
    executable: &Executable,
    reason_code: &Option<String>,
    reason: &Option<String>,
) {
    eprintln!(
        "engine launch: outcome={outcome} executable={:?} source={} reason_code={} reason={}",
        executable.path,
        executable.source.label(),
        describe(reason_code),
        describe(reason),
    );
}

fn spawn_engine(executable: &Executable, origin: &str) -> io::Result<Child> {
    let mut command = Command::new(&executable.path);
    command
        .args(["serve", "--port", "0", "--allow-origin", origin])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    command.spawn()
}

/// Reads the first line, reports what it means, then drains standard output so the pipe cannot fill.
fn read_output(stdout: impl Read, sender: mpsc::Sender<Launch>) {
    let mut reader = BufReader::new(stdout);
    let mut first_line = String::new();
    if reader.read_line(&mut first_line).is_err() {
        let _ = sender.send(Launch::Failed {
            reason_code: None,
            reason: None,
        });
        return;
    }
    let first = classify_output(&first_line, "");
    if matches!(first, Launch::Ready { .. }) {
        let _ = sender.send(first);
        let _ = io::copy(&mut reader, &mut io::sink());
        return;
    }
    let mut remainder = String::new();
    let _ = reader.take(MAX_FAILURE_TEXT).read_to_string(&mut remainder);
    let _ = sender.send(classify_output(&first_line, &remainder));
}

/// Starts the engine and records the outcome. Runs on a background thread started in `setup`.
pub fn launch(engine: &Engine, origin: &str) {
    let executable = choose_executable(
        std::env::var_os(EXECUTABLE_VARIABLE),
        std::env::var_os("PATH"),
    );
    let mut child = match spawn_engine(&executable, origin) {
        Ok(child) => child,
        Err(error) => {
            let outcome = if error.kind() == io::ErrorKind::NotFound {
                Connection::NotFound
            } else {
                Connection::LaunchFailed { reason_code: None }
            };
            let name = if outcome == Connection::NotFound {
                "not_found"
            } else {
                "launch_failed"
            };
            log_outcome(name, &executable, &None, &Some(error.to_string()));
            engine.resolve(outcome);
            return;
        }
    };
    let stdout = child.stdout.take();
    *locked(&engine.child) = Some(child);
    let Some(stdout) = stdout else {
        engine.kill_if_running();
        engine.resolve(Connection::LaunchFailed { reason_code: None });
        return;
    };

    let (sender, receiver) = mpsc::channel();
    thread::spawn(move || read_output(stdout, sender));
    match receiver.recv_timeout(LAUNCH_TIMEOUT) {
        Ok(Launch::Ready { port, token }) => {
            log_outcome("ready", &executable, &None, &None);
            engine.resolve(Connection::Ready {
                base_url: format!("http://127.0.0.1:{port}"),
                token,
            });
        }
        Ok(Launch::Failed {
            reason_code,
            reason,
        }) => {
            log_outcome("launch_failed", &executable, &reason_code, &reason);
            engine.kill_if_running();
            engine.resolve(Connection::LaunchFailed { reason_code });
        }
        Err(RecvTimeoutError::Timeout) => {
            log_outcome("timed_out", &executable, &None, &None);
            engine.kill_if_running();
            engine.resolve(Connection::TimedOut);
        }
        Err(RecvTimeoutError::Disconnected) => {
            log_outcome("launch_failed", &executable, &None, &None);
            engine.kill_if_running();
            engine.resolve(Connection::LaunchFailed { reason_code: None });
        }
    }
}

/// Records a failed launch when the main window's origin cannot be determined.
pub fn fail_without_origin(engine: &Engine) {
    eprintln!("engine launch: outcome=launch_failed reason=\"the main window has no origin\"");
    engine.resolve(Connection::LaunchFailed { reason_code: None });
}

/// Returns the launch outcome as JSON, waiting for it if the engine is still starting.
#[tauri::command(async)]
pub fn engine_connection(engine: tauri::State<'_, Engine>) -> tauri::ipc::Response {
    tauri::ipc::Response::new(engine.wait_for_connection().to_json())
}

/// Returns `"running"` or `"exited"` for the engine process.
#[tauri::command(async)]
pub fn engine_status(engine: tauri::State<'_, Engine>) -> tauri::ipc::Response {
    let state = if engine.is_running() {
        r#""running""#
    } else {
        r#""exited""#
    };
    tauri::ipc::Response::new(state.to_string())
}

fn json_string(text: &str) -> String {
    let mut out = String::with_capacity(text.len() + 2);
    out.push('"');
    for character in text.chars() {
        match character {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            control if (control as u32) < 0x20 => {
                out.push_str(&format!("\\u{:04x}", control as u32));
            }
            other => out.push(other),
        }
    }
    out.push('"');
    out
}

#[derive(Debug, Clone, PartialEq)]
enum JsonValue {
    Object(HashMap<String, JsonValue>),
    Array,
    String(String),
    /// A number's text, so an integer is not rounded through a float.
    Number(String),
    Other,
}

/// Parses one JSON document, or returns `None` when the text is not exactly one valid document.
fn parse_json(text: &str) -> Option<JsonValue> {
    let mut parser = JsonParser {
        bytes: text.as_bytes(),
        position: 0,
        depth: 0,
    };
    parser.skip_whitespace();
    let value = parser.value()?;
    parser.skip_whitespace();
    (parser.position == parser.bytes.len()).then_some(value)
}

struct JsonParser<'a> {
    bytes: &'a [u8],
    position: usize,
    depth: usize,
}

impl JsonParser<'_> {
    fn peek(&self) -> Option<u8> {
        self.bytes.get(self.position).copied()
    }

    fn skip_whitespace(&mut self) {
        while matches!(self.peek(), Some(b' ' | b'\t' | b'\n' | b'\r')) {
            self.position += 1;
        }
    }

    fn expect(&mut self, byte: u8) -> Option<()> {
        (self.peek() == Some(byte)).then(|| self.position += 1)
    }

    fn literal(&mut self, word: &str) -> Option<JsonValue> {
        let end = self.position + word.len();
        (self.bytes.get(self.position..end)? == word.as_bytes()).then(|| {
            self.position = end;
            JsonValue::Other
        })
    }

    fn value(&mut self) -> Option<JsonValue> {
        match self.peek()? {
            b'{' => self.nested(Self::object),
            b'[' => self.nested(Self::array),
            b'"' => self.string().map(JsonValue::String),
            b't' => self.literal("true"),
            b'f' => self.literal("false"),
            b'n' => self.literal("null"),
            b'-' | b'0'..=b'9' => self.number(),
            _ => None,
        }
    }

    fn nested(&mut self, parse: fn(&mut Self) -> Option<JsonValue>) -> Option<JsonValue> {
        self.depth += 1;
        if self.depth > 64 {
            return None;
        }
        let value = parse(self);
        self.depth -= 1;
        value
    }

    fn object(&mut self) -> Option<JsonValue> {
        self.expect(b'{')?;
        let mut fields = HashMap::new();
        self.skip_whitespace();
        if self.peek() == Some(b'}') {
            self.position += 1;
            return Some(JsonValue::Object(fields));
        }
        loop {
            self.skip_whitespace();
            let key = self.string()?;
            self.skip_whitespace();
            self.expect(b':')?;
            self.skip_whitespace();
            let value = self.value()?;
            fields.insert(key, value);
            self.skip_whitespace();
            match self.peek()? {
                b',' => self.position += 1,
                b'}' => {
                    self.position += 1;
                    return Some(JsonValue::Object(fields));
                }
                _ => return None,
            }
        }
    }

    fn array(&mut self) -> Option<JsonValue> {
        self.expect(b'[')?;
        self.skip_whitespace();
        if self.peek() == Some(b']') {
            self.position += 1;
            return Some(JsonValue::Array);
        }
        loop {
            self.skip_whitespace();
            self.value()?;
            self.skip_whitespace();
            match self.peek()? {
                b',' => self.position += 1,
                b']' => {
                    self.position += 1;
                    return Some(JsonValue::Array);
                }
                _ => return None,
            }
        }
    }

    fn number(&mut self) -> Option<JsonValue> {
        let start = self.position;
        while matches!(
            self.peek(),
            Some(b'-' | b'+' | b'.' | b'e' | b'E' | b'0'..=b'9')
        ) {
            self.position += 1;
        }
        let text = std::str::from_utf8(&self.bytes[start..self.position]).ok()?;
        text.parse::<f64>().ok()?;
        Some(JsonValue::Number(text.to_string()))
    }

    fn hex4(&mut self) -> Option<u32> {
        let digits = self.bytes.get(self.position..self.position + 4)?;
        let text = std::str::from_utf8(digits).ok()?;
        let value = u32::from_str_radix(text, 16).ok()?;
        self.position += 4;
        Some(value)
    }

    fn string(&mut self) -> Option<String> {
        self.expect(b'"')?;
        let mut out: Vec<u8> = Vec::new();
        loop {
            let byte = self.peek()?;
            self.position += 1;
            match byte {
                b'"' => return String::from_utf8(out).ok(),
                b'\\' => {
                    let escape = self.peek()?;
                    self.position += 1;
                    let character = match escape {
                        b'"' => '"',
                        b'\\' => '\\',
                        b'/' => '/',
                        b'b' => '\u{8}',
                        b'f' => '\u{c}',
                        b'n' => '\n',
                        b'r' => '\r',
                        b't' => '\t',
                        b'u' => {
                            let first = self.hex4()?;
                            let code = if (0xD800..0xDC00).contains(&first) {
                                self.expect(b'\\')?;
                                self.expect(b'u')?;
                                let second = self.hex4()?;
                                if !(0xDC00..0xE000).contains(&second) {
                                    return None;
                                }
                                0x10000 + ((first - 0xD800) << 10) + (second - 0xDC00)
                            } else {
                                first
                            };
                            char::from_u32(code)?
                        }
                        _ => return None,
                    };
                    let mut buffer = [0u8; 4];
                    out.extend_from_slice(character.encode_utf8(&mut buffer).as_bytes());
                }
                0..=0x1f => return None,
                other => out.push(other),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn os(text: &str) -> Option<OsString> {
        Some(OsString::from(text))
    }

    #[test]
    fn the_environment_variable_wins_over_path() {
        let directory = std::env::temp_dir().join("iad-engine-test-wins");
        fs::create_dir_all(&directory).unwrap();
        fs::write(directory.join(executable_names()[0]), "").unwrap();
        let path = std::env::join_paths([&directory]).unwrap();

        let chosen = choose_executable(os("custom-ian"), Some(path));

        assert_eq!(
            chosen,
            Executable {
                path: PathBuf::from("custom-ian"),
                source: ExecutableSource::Environment,
            }
        );
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn an_empty_variable_is_ignored_and_path_is_searched() {
        let directory = std::env::temp_dir().join("iad-engine-test-search");
        fs::create_dir_all(&directory).unwrap();
        let file = directory.join(executable_names()[0]);
        fs::write(&file, "").unwrap();
        assert!(file.is_file());
        let path = std::env::join_paths([&directory]).unwrap();

        let chosen = choose_executable(os(""), Some(path));

        assert_eq!(chosen.source, ExecutableSource::Path);
        assert_eq!(chosen.path, file);
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn nothing_on_path_falls_back_to_the_bare_name() {
        let empty = std::env::temp_dir().join("iad-engine-test-empty");
        fs::create_dir_all(&empty).unwrap();
        let path = std::env::join_paths([&empty]).unwrap();

        let chosen = choose_executable(None, Some(path));

        assert_eq!(chosen.path, PathBuf::from("ian"));
        assert_eq!(chosen.source, ExecutableSource::Path);
        fs::remove_dir_all(empty).unwrap();
    }

    #[test]
    fn the_ready_line_gives_the_port_and_token() {
        let launch = classify_output(r#"{"port": 51234, "token": "abc_DEF-123"}"#, "");

        assert_eq!(
            launch,
            Launch::Ready {
                port: 51234,
                token: "abc_DEF-123".to_string(),
            }
        );
    }

    #[test]
    fn an_indented_failure_envelope_gives_its_reason_code_and_reason() {
        let first = "{";
        let rest = "  \"database\": {\"expected_revision\": \"0006\"},\n  \"diagnostics\": [],\n  \"reason\": \"Back up, then run:\\n\\n    ian db upgrade\",\n  \"reason_code\": \"database_upgrade_required\",\n  \"status\": \"error\"\n}\n";

        assert_eq!(
            classify_output(first, rest),
            Launch::Failed {
                reason_code: Some("database_upgrade_required".to_string()),
                reason: Some("Back up, then run:\n\n    ian db upgrade".to_string()),
            }
        );
    }

    #[test]
    fn a_one_line_failure_envelope_gives_its_reason_code() {
        let launch = classify_output(
            r#"{"status":"error","reason_code":"database_busy","reason":"in use"}"#,
            "",
        );

        assert_eq!(
            launch,
            Launch::Failed {
                reason_code: Some("database_busy".to_string()),
                reason: Some("in use".to_string()),
            }
        );
    }

    #[test]
    fn end_of_file_and_unrecognised_output_have_no_reason_code() {
        let none = Launch::Failed {
            reason_code: None,
            reason: None,
        };

        assert_eq!(classify_output("", ""), none);
        assert_eq!(
            classify_output("Traceback (most recent call last):", ""),
            none
        );
        assert_eq!(classify_output(r#"{"port": 80}"#, ""), none);
        assert_eq!(
            classify_output(r#"{"port": 70000, "token": "t"}"#, ""),
            none
        );
        assert_eq!(classify_output(r#"{"port": 80, "token": ""}"#, ""), none);
    }

    #[test]
    fn json_strings_handle_escapes_and_surrogate_pairs() {
        let launch = classify_output(
            r#"{"status":"error","reason_code":"aé😀\"","reason":"x"}"#,
            "",
        );

        assert_eq!(
            launch,
            Launch::Failed {
                reason_code: Some("aé😀\"".to_string()),
                reason: Some("x".to_string()),
            }
        );
    }

    #[test]
    fn the_origin_comes_from_scheme_host_and_port() {
        let origin = |text: &str| origin_of(&tauri::Url::parse(text).unwrap());

        assert_eq!(
            origin("tauri://localhost"),
            Some("tauri://localhost".into())
        );
        assert_eq!(
            origin("http://tauri.localhost/index.html"),
            Some("http://tauri.localhost".into())
        );
        assert_eq!(
            origin("http://localhost:5173/"),
            Some("http://localhost:5173".into())
        );
        assert_eq!(
            origin("http://127.0.0.1:1420/a?b#c"),
            Some("http://127.0.0.1:1420".into())
        );
        assert_eq!(origin("about:blank"), None);
    }

    #[test]
    fn connection_documents_are_json() {
        assert_eq!(
            Connection::Ready {
                base_url: "http://127.0.0.1:9".into(),
                token: "t\"k".into(),
            }
            .to_json(),
            r#"{"state":"ready","base_url":"http://127.0.0.1:9","token":"t\"k"}"#
        );
        assert_eq!(
            Connection::LaunchFailed { reason_code: None }.to_json(),
            r#"{"state":"launch_failed","reason_code":null}"#
        );
        assert_eq!(
            Connection::LaunchFailed {
                reason_code: Some("database_busy".into())
            }
            .to_json(),
            r#"{"state":"launch_failed","reason_code":"database_busy"}"#
        );
        assert_eq!(Connection::NotFound.to_json(), r#"{"state":"not_found"}"#);
        assert_eq!(Connection::TimedOut.to_json(), r#"{"state":"timed_out"}"#);
    }
}
