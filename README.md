# Investment Analysis Desktop

A desktop application for investors who want to use the [Investment Analysis Engine](https://github.com/PeterPontbriand/investment-analysis-engine) without a command line.

This project is pre-release and is not ready for general use.

## Development setup

Install the pinned Node and pnpm toolchains, then run `pnpm install --frozen-lockfile` and `pnpm gate`. Rust is pinned by `rust-toolchain.toml`; Rustup installs that toolchain with the required `rustfmt` and `clippy` components when Cargo runs.

On Windows, install Visual Studio 2022 or later, or Visual Studio Build Tools with the **Desktop development with C++** workload. It must include MSVC v143 build tools and a Windows 11 SDK. Run Cargo commands from a Visual Studio Developer PowerShell, or initialize the environment with the installation's `VC/Auxiliary/Build/vcvars64.bat`, so `cl.exe`, `link.exe`, the SDK headers, and libraries are available.
