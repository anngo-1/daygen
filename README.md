# daygen
![image](https://github.com/user-attachments/assets/0e6426b4-ae06-4029-ab30-f35f97eacdc5)


⚠️ **DISCLAIMER: This is a hobby project for learning C++, exploring trading concepts, implementing silly strategies, and practicing mathematical modeling. It is NOT intended for real trading or investment advice.**

## Overview
daygen is a backtesting platform for algorithmic day trading strategies, featuring a C++ backend for strategy execution and a Next.js dashboard for visualization. The project currently implements a MACD-based trading strategy with plans to add more in the future.

It is deployed on vercel here: ![link](daygen.vercel.app)


## Features
- Market data fetching from Yahoo Finance (yfinance Python library)
- Trading strategies implemented in C++ (more to come soon), served on a C++ backend
- Cool Next.js dashboard for:
  - Trade visualization
  - Performance analytics

## Architecture

### Backend (C++)
- Custom strategy execution engine
- HTTP server using cpp-httplib for REST API endpoints
- JSON processing with nlohmann/json
- Python integration using system calls for yfinance data fetching
- Runs on an AWS EC2 instance

### Frontend (Next.js)
- React with TypeScript
- Mantine UI library
- Chart.js for visualization
- Hosted on vercel

## Getting Started

### Clone Repository
```bash
git clone https://github.com/anngo-1/daygen.git
cd daygen
```

### Choose Setup Method

#### Option 1: Using Nix (Recommended)
```bash
# this will set up all dependencies automatically
nix-shell
```

#### Option 2: Manual Setup
Install these dependencies:
- GCC
- GNU Make
- curl
- Python 3 + pip
- Node.js
- pkg-config

Then install Python packages:
```bash
pip install yfinance pandas
```

### Build & Run

1. Build the backend:
```bash
make
```

2. Set up the frontend:
```bash
cd ui/trading-dashboard
npm install
```

3. Start both servers:
```bash
# terminal 1 - start backend (from project root)
./trading

# terminal 2 - start frontend (from project root)
cd ui/trading-dashboard
npm run dev
```

4. Open `http://localhost:3000` in your browser

## Strategies
Strategies are documented in the src/strategies directory with markdown files.

