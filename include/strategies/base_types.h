#pragma once
#include <vector>
#include <string>

namespace trading {

struct Trade {
    int timeStep;
    std::string type; // "LONG", "SHORT", "EXIT_LONG", "EXIT_SHORT"
    std::string side; // "BUY", "SELL"
    double price;
    double quantity; // Use double for quantity to handle partial fills or more precise shorting
};

struct HistoricalDataPoint {
    double macd;
    double signal;
    double portfolioValue;
    double position; // Use double to represent long (positive) or short (negative) positions
    double cash;
    double trend;
    double volatility;
};

struct SimulationResult {
    double finalPortfolioValue;
    double profitLoss;
    std::vector<Trade> trades;
    std::vector<HistoricalDataPoint> historical;  
};

struct MarketData {
    std::vector<double> prices;
    std::vector<std::string> timestamps;
};

}
