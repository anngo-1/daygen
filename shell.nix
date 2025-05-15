{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
  buildInputs = [
    pkgs.gnumake
    pkgs.gcc
    pkgs.curl
    pkgs.python3
    pkgs.python3Packages.pandas
    pkgs.python3Packages.pip
    pkgs.nodejs  
  ];
  nativeBuildInputs = [
    pkgs.pkg-config
  ];
  shellHook = ''
    export CPLUS_INCLUDE_PATH="$CPLUS_INCLUDE_PATH:./:/usr/include:${pkgs.curl.dev}/include"
    export LIBRARY_PATH="$LIBRARY_PATH:${pkgs.curl}/lib:${pkgs.curl.dev}/lib"
    export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:${pkgs.curl}/lib:${pkgs.curl.dev}/lib"
    export PKG_CONFIG_PATH="$PKG_CONFIG_PATH:${pkgs.curl}/lib/pkgconfig:${pkgs.curl.dev}/lib/pkgconfig"
    
    # Create and activate a virtual environment
    python -m venv .venv
    source .venv/bin/activate
    
    # Install latest yfinance
    pip install --upgrade yfinance
    
    echo "Development shell for activated!"
    echo "Python virtual environment created and activated"
    echo "Latest yfinance installed"
    echo "C++ compiler (g++) and make are available."
    echo "Run 'make' to compile the C++ API."
    echo ""
    echo "Node.js and npm are also available for frontend development."
  '';
}
