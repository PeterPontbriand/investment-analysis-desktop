# Investment Analysis Desktop

A desktop application for investors who want to use the [Investment Analysis Engine](https://github.com/PeterPontbriand/investment-analysis-engine) without a command line.

This project is pre-release and is not ready for general use.

**Platforms:** Windows, macOS, and Linux. Efforts have been made to keep the application usable on all three: continuous integration runs the full quality gate on each after every merge, and pull requests are checked on Linux. This is not a claim that every operating system version has been verified, and no installers or release binaries exist yet.

## Development setup

Install the pinned Node and pnpm toolchains, then run `pnpm install --frozen-lockfile` and `pnpm gate`. Rust is pinned by `rust-toolchain.toml`; Rustup installs that toolchain with the required `rustfmt` and `clippy` components when Cargo runs. The steps above apply on every platform; the notes below add what each platform needs for the Rust and Tauri build.

**Windows.** Install Visual Studio 2022 or later, or Visual Studio Build Tools with the **Desktop development with C++** workload. It must include MSVC v143 build tools and a Windows 11 SDK. Run Cargo commands from a Visual Studio Developer PowerShell, or initialize the environment with the installation's `VC/Auxiliary/Build/vcvars64.bat`, so `cl.exe`, `link.exe`, the SDK headers, and libraries are available.

**macOS.** Install the Xcode Command Line Tools (`xcode-select --install`), which provide the compiler and linker that Cargo needs.

**Linux.** Install a C toolchain and the WebKitGTK 4.1 development packages that Tauri requires. On Debian and Ubuntu, the continuous integration workflow installs `build-essential curl file libayatana-appindicator3-dev libssl-dev libwebkit2gtk-4.1-dev libxdo-dev librsvg2-dev patchelf xvfb`, and after `pnpm install --frozen-lockfile` runs `pnpm exec playwright install-deps chromium webkit` for the system libraries that Playwright's Chromium and WebKit need; other distributions need the equivalent packages. On a machine without a display, run `pnpm gate` under `xvfb-run`.
