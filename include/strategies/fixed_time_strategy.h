#ifndef FIXED_TIME_STRATEGY_H
#define FIXED_TIME_STRATEGY_H

#include "strategy.h"
#include "utils/math_utils.h"
#include <vector>
#include <string>
#include <memory>
#include <chrono>
#include <unordered_map>

namespace trading {

class FixedTimeStrategy : public Strategy {
public:
    FixedTimeStrategy(int holdingPeriodMinutes = 15, 
                     double positionSizePercent = 0.90,
                     int cooldownPeriodMinutes = 0,
                     double transactionCost = 0.001);

    SimulationResult execute(const MarketData& data, double initialCash) override;
    virtual void onTick(double price, int timeStep, const std::string& tickTimestamp) override;

private:
    std::vector<Trade> trades;
    std::vector<HistoricalDataPoint> historicalData;
    std::unordered_map<int, std::string> positionStartTimes;
    
    double cash;
    int position;
    double transactionCostRate;
    double lastPrice;
    bool debugDetailTicks;
    
    // Strategy parameters
    int holdingPeriodMinutes;
    double positionSizePercent;
    int cooldownPeriodMinutes;
    
    // Helper values
    int lastTradeStep;
    
    // Helper methods
    int getMinutesDifference(const std::string& startTime, const std::string& endTime) const;
    bool isWithinTradingHours(const std::string& timestamp) const;
    std::chrono::system_clock::time_point parseTimestamp(const std::string& timestamp) const;
};

// Factory function for creating Fixed Time strategy
inline std::unique_ptr<Strategy> createFixedTimeStrategy() {
    return std::make_unique<FixedTimeStrategy>();
}

// Register the strategy
namespace {
    static const std::vector<StrategyParam> fixedTimeParams = {
        {"holdingPeriodMinutes", "number", "Number of minutes to hold a position before selling", "15", {}},
        {"positionSizePercent", "number", "Percentage of available cash to use for each position (0.0-1.0)", "0.90", {}},
        {"cooldownPeriodMinutes", "number", "Waiting period after a trade before taking a new position", "0", {}},
        {"transactionCost", "number", "Transaction cost as a percentage", "0.001", {}}
    };

    static bool registered_fixed_time = Strategy::registerStrategy({
        "fixed_time",
        "Fixed Time Interval Strategy",
        "A simple time-based strategy that buys and sells at fixed intervals. "
        "Buys at the start and automatically sells after a specified holding period (default: 15 minutes), "
        "regardless of price movement. Optionally enforces a cooldown period between trades.",
        fixedTimeParams,
        createFixedTimeStrategy
    });
}

} // namespace trading
#endif
