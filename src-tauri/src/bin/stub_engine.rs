//! A stand-in for `ian serve`, built only with the `e2e` feature, so the shell smoke test runs without IAN.
//!
//! It prints the ready line, serves a fixed `/v1/info` with the engine's CORS headers (including the preflight
//! answer) and `Content-Language: en`, and exits when its standard input closes. It uses only the standard library.

use std::io::{self, BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::thread;

const TOKEN: &str = "stub-token";
const INFO: &str = r#"{"api_versions":["v1"],"engine_version":"0.0.0-stub","locales":[{"tag":"en","name":"English"}],"schema_version":2,"sec_identity_configured":true}"#;
const FAILURE: &str = r#"{"status":"error","reason_code":"not_authenticated","reason":"A valid bearer token is required."}"#;

struct Request {
    method: String,
    path: String,
    headers: Vec<(String, String)>,
}

impl Request {
    fn header(&self, name: &str) -> Option<&str> {
        self.headers
            .iter()
            .find(|(key, _)| key.eq_ignore_ascii_case(name))
            .map(|(_, value)| value.as_str())
    }
}

fn read_request(stream: &TcpStream) -> Option<Request> {
    let mut reader = BufReader::new(stream);
    let mut line = String::new();
    reader.read_line(&mut line).ok()?;
    let mut parts = line.split_whitespace();
    let method = parts.next()?.to_string();
    let path = parts.next()?.to_string();
    let mut headers = Vec::new();
    loop {
        line.clear();
        reader.read_line(&mut line).ok()?;
        let trimmed = line.trim_end();
        if trimmed.is_empty() {
            break;
        }
        let (name, value) = trimmed.split_once(':')?;
        headers.push((name.to_string(), value.trim().to_string()));
    }
    Some(Request {
        method,
        path,
        headers,
    })
}

fn respond(mut stream: TcpStream, status: &str, extra: &[String], body: &str) {
    let mut head = format!("HTTP/1.1 {status}\r\nConnection: close\r\nCache-Control: no-store\r\n");
    for header in extra {
        head.push_str(header);
        head.push_str("\r\n");
    }
    head.push_str(&format!("Content-Length: {}\r\n\r\n{body}", body.len()));
    let _ = stream.write_all(head.as_bytes());
}

fn handle(stream: TcpStream, allowed_origin: &str) {
    let Some(request) = read_request(&stream) else {
        return;
    };
    let mut headers = vec!["Content-Language: en".to_string()];
    if let Some(origin) = request.header("Origin") {
        if origin != allowed_origin {
            respond(
                stream,
                "400 Bad Request",
                &headers,
                r#"{"status":"error","reason_code":"origin_not_allowed","reason":"Requests from this origin are not allowed."}"#,
            );
            return;
        }
        headers.push(format!("Access-Control-Allow-Origin: {origin}"));
        headers.push("Vary: Origin".to_string());
        headers.push("Access-Control-Expose-Headers: WWW-Authenticate".to_string());
        if request.method == "OPTIONS" && request.header("Access-Control-Request-Method").is_some()
        {
            headers.push("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE".to_string());
            headers.push(
                "Access-Control-Allow-Headers: Authorization, Content-Type, Accept-Language"
                    .to_string(),
            );
            headers.push("Access-Control-Max-Age: 600".to_string());
            respond(stream, "204 No Content", &headers, "");
            return;
        }
    }
    let authorised = request
        .header("Authorization")
        .is_some_and(|value| value == format!("Bearer {TOKEN}"));
    if !authorised {
        headers.push("WWW-Authenticate: Bearer".to_string());
        headers.push("Content-Type: application/json".to_string());
        respond(stream, "401 Unauthorized", &headers, FAILURE);
        return;
    }
    headers.push("Content-Type: application/json".to_string());
    if request.method == "GET" && request.path == "/v1/info" {
        respond(stream, "200 OK", &headers, INFO);
    } else {
        respond(
            stream,
            "404 Not Found",
            &headers,
            r#"{"status":"error","reason_code":"not_found","reason":"Not found."}"#,
        );
    }
}

fn allowed_origin() -> String {
    let arguments: Vec<String> = std::env::args().collect();
    arguments
        .windows(2)
        .find(|pair| pair[0] == "--allow-origin")
        .map(|pair| pair[1].clone())
        .unwrap_or_default()
}

fn main() -> io::Result<()> {
    let origin = allowed_origin();
    let listener = TcpListener::bind(("127.0.0.1", 0))?;
    let port = listener.local_addr()?.port();
    thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            let origin = origin.clone();
            thread::spawn(move || handle(stream, &origin));
        }
    });
    println!(r#"{{"port":{port},"token":"{TOKEN}"}}"#);
    io::stdout().flush()?;
    // Exit when standard input closes, as the real engine does.
    let mut sink = [0u8; 256];
    let mut stdin = io::stdin();
    while stdin.read(&mut sink).unwrap_or(0) > 0 {}
    Ok(())
}
