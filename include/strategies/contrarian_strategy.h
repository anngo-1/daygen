#ifndef CONTRARIAN_STRATEGY_H
#define CONTRARIAN_STRATEGY_H

#include "strategy.h"
#include "utils/math_utils.h"
#include <vector>
#include <string>
#include <memory>
#include <deque>

namespace trading {

class ContrarianStrategy : public Strategy {
public:
    ContrarianStrategy(int consecutiveMoves = 3,
                     double positionSizePercent = 0.90,
                     double stopLossPercentage = 0.03,
                     double transactionCost = 0.001);

    SimulationResult execute(const MarketData& data, double initialCash) override;
    virtual void onTick(double price, int timeStep, const std::string& tickTimestamp) override;

private:
    std::vector<Trade> trades;
    std::vector<HistoricalDataPoint> historicalData;
    std::deque<double> priceHistory;
    
    double cash;
    int position;
    double stopLossPct;
    double transactionCostRate;
    double entryPrice;
    double lastPrice;
    bool debugDetailTicks;
    
    // Strategy parameters
    int consecutiveMoves;
    double positionSizePercent;
    
    // Helper methods
    bool hasConsecutiveDecreases() const;
    bool hasConsecutiveIncreases() const;
};

// Factory function for creating Contrarian strategy
inline std::unique_ptr<Strategy> createContrarianStrategy() {
    return std::make_unique<ContrarianStrategy>();
}

// Register the strategy
namespace {
    static const std::vector<StrategyParam> contrarianParams = {
        {"consecutiveMoves", "number", "Number of consecutive price moves (up or down) required to trigger a trade", "3", {}},
        {"positionSizePercent", "number", "Percentage of available cash to use for each position (0.0-1.0)", "0.90", {}},
        {"stopLossPercentage", "number", "Exit a position at this loss percentage", "0.03", {}},
        {"transactionCost", "number", "Transaction cost as a percentage", "0.001", {}}
    };

    static bool registered_contrarian = Strategy::registerStrategy({
        "contrarian",
        "Contrarian Strategy",
        "A contrarian strategy that goes against recent price movements. Buys after consecutive price decreases "
        "and sells after consecutive price increases, based on the theory that market overreactions "
        "tend to reverse. Includes stop-loss protection against continued adverse movements.",
        contrarianParams,
        createContrarianStrategy
    });
}

} // namespace trading
#endif
