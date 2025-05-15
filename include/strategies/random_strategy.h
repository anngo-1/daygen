#ifndef RANDOM_STRATEGY_H
#define RANDOM_STRATEGY_H

#include "strategy.h"
#include "utils/math_utils.h"
#include <vector>
#include <string>
#include <random>
#include <memory>

namespace trading {

class RandomStrategy : public Strategy {
public:
    RandomStrategy(double transactionCost = 0.001, 
                   int timeStepInterval = 10, 
                   bool clearAtEndOfDay = true);

    SimulationResult execute(const MarketData& data, double initialCash) override;
    virtual void onTick(double price, int timeStep, const std::string& tickTimestamp) override;

private:
    std::vector<Trade> trades;
    std::vector<HistoricalDataPoint> historicalData;
    std::mt19937 rng; // Random number generator
    
    double cash;
    int position;
    double transactionCostRate;
    int timeStepInterval; // How often to consider trading (every X time steps)
    bool clearAtEndOfDay; // Whether to sell all holdings at end of day
    double lastPrice;
    std::string currentDay; // Track the current day for end-of-day selling
    
    int tickCounter; // Count ticks since last trade consideration
    bool debugDetailTicks;
};

// Factory function for creating Random strategy
inline std::unique_ptr<Strategy> createRandomStrategy() {
    return std::make_unique<RandomStrategy>();
}

// Register the Random strategy with the registry
namespace {
    static const std::vector<StrategyParam> randomParams = {
        {"transactionCost", "number", "Transaction cost as a percentage", "0.001", {}},
        {"timeStepInterval", "number", "Trade frequency (consider trade every X time steps)", "10", {}},
        {"clearAtEndOfDay", "boolean", "Sell all holdings at the end of trading day", "true", {"true", "false"}}
    };

    static bool registered_random = Strategy::registerStrategy({
        "random",
        "Random Trading Strategy",
        "A simple random trading strategy that makes buy/sell decisions based on random chance. "
        "Trades at regular intervals and can optionally clear positions at the end of each trading day. "
        "This strategy is useful as a baseline to compare performance of more sophisticated strategies.",
        randomParams,
        createRandomStrategy
    });
}

} // namespace trading
#endif
