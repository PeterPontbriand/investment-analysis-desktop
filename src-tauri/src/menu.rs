//! The macOS application menu: Tauri's default menu, with its built-in Quit item replaced by one that asks the
//! application first. The built-in item quits without going through the window's close request, so Cmd+Q would skip
//! the question the application asks when a refresh is running. The replacement closes the main window instead, which
//! raises the same close request the window's own close button does.
//!
//! The construction compiles on every platform so that every build checks it; only macOS installs it.

#![cfg_attr(not(target_os = "macos"), allow(dead_code))]

use tauri::menu::{Menu, MenuEvent, MenuItem, MenuItemKind};
use tauri::{AppHandle, Manager, Runtime};

/// The identifier of the replacement item.
pub const QUIT_ID: &str = "quit";

/// The replacement item's shortcut; `CmdOrCtrl` is Cmd on macOS.
pub const QUIT_ACCELERATOR: &str = "CmdOrCtrl+Q";

/// The label the built-in item has on macOS: "Quit" and the application's name.
pub fn quit_label(application_name: &str) -> String {
    format!("Quit {application_name}")
}

/// The position of the built-in Quit item in the application submenu: Tauri's default menu puts it last.
pub fn quit_position(item_count: usize) -> Option<usize> {
    item_count.checked_sub(1)
}

/// Whether a menu event is the replacement Quit item's.
pub fn is_quit(id: &str) -> bool {
    id == QUIT_ID
}

/// Tauri's default menu with the application submenu's Quit item replaced. A menu without such a submenu is
/// returned as the default builds it.
pub fn app_menu<R: Runtime>(handle: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let menu = Menu::default(handle)?;
    let application_menu = match menu.items()?.into_iter().next() {
        Some(MenuItemKind::Submenu(submenu)) => submenu,
        _ => return Ok(menu),
    };
    if let Some(position) = quit_position(application_menu.items()?.len()) {
        application_menu.remove_at(position)?;
        let quit = MenuItem::with_id(
            handle,
            QUIT_ID,
            quit_label(&handle.package_info().name),
            true,
            Some(QUIT_ACCELERATOR),
        )?;
        application_menu.append(&quit)?;
    }
    Ok(menu)
}

/// Runs the application's close path for the replacement Quit item: closing the main window raises its close
/// request, which the page answers, and the application exits when the window is gone. With no window to close
/// the application exits at once.
pub fn on_menu_event<R: Runtime>(handle: &AppHandle<R>, event: MenuEvent) {
    if !is_quit(event.id().as_ref()) {
        return;
    }
    match handle.get_webview_window("main") {
        Some(window) => {
            let _ = window.close();
        }
        None => handle.exit(0),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_label_names_the_application() {
        assert_eq!(
            quit_label("Investment Analysis Desktop"),
            "Quit Investment Analysis Desktop"
        );
    }

    #[test]
    fn the_built_in_item_is_the_last_one() {
        assert_eq!(quit_position(8), Some(7));
        assert_eq!(quit_position(1), Some(0));
        assert_eq!(quit_position(0), None);
    }

    #[test]
    fn only_the_replacement_item_is_a_quit() {
        assert!(is_quit(QUIT_ID));
        assert!(!is_quit("about"));
        assert!(!is_quit(""));
    }

    #[test]
    fn the_shortcut_is_command_q() {
        assert_eq!(QUIT_ACCELERATOR, "CmdOrCtrl+Q");
    }
}
