{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.gnumake
    pkgs.gcc
    pkgs.curl
    pkgs.python3
    pkgs.python3Packages.yfinance
    pkgs.python3Packages.pip
    pkgs.nodejs  
  ];

  nativeBuildInputs = [
    pkgs.pkg-config
  ];

  shellHook = ''
    export CPLUS_INCLUDE_PATH="$CPLUS_INCLUDE_PATH:./"
    export LIBRARY_PATH="$LIBRARY_PATH:${pkgs.curl}/lib"

    export PKG_CONFIG_PATH="$PKG_CONFIG_PATH:${pkgs.curl}/lib/pkgconfig"
    echo "Development shell for advanced_daytrading_bot_api activated!"
    echo "C++ compiler (g++) and make are available."
    echo "httplib.h and nlohmann_json.hpp should be placed in the project root directory."
    echo "Run 'make' to compile the C++ API."

    echo ""
    echo "Node.js and npm are also available for frontend development."
    echo "You can use 'npm install' to install Node.js dependencies."
    echo "Then use 'npm run dev' to start your development server (if configured in package.json)."
  '';
}