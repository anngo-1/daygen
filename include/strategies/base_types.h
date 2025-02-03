#pragma once
#include <vector>
#include <string>

namespace trading {

struct Trade {
    int timeStep;
    std::string side;
    double price;
    int quantity;
};

struct HistoricalDataPoint {
    double macd;
    double signal;
    double portfolioValue;
    int position;
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