#ifndef MEAN_REVERSION_STRATEGY_H
#define MEAN_REVERSION_STRATEGY_H

#include "strategy.h"
#include "utils/math_utils.h"
#include <vector>
#include <string>
#include <memory>
#include <deque>

namespace trading {

class MeanReversionStrategy : public Strategy {
public:
    MeanReversionStrategy(int lookbackPeriod = 20, 
                          double entryThreshold = 1.5,
                          double exitThreshold = 0.5,
                          double stopLossPercentage = 0.02,
                          double profitTargetPercentage = 0.03,
                          double transactionCost = 0.001);

    SimulationResult execute(const MarketData& data, double initialCash) override;
    virtual void onTick(double price, int timeStep, const std::string& tickTimestamp) override;

private:
    std::vector<Trade> trades;
    std::vector<HistoricalDataPoint> historicalData;
    
    // Price history for calculating mean and standard deviation
    std::deque<double> priceHistory;
    
    double cash;
    int position;
    double stopLossPct;
    double profitTargetPct;
    double transactionCostRate;
    double entryPrice;
    double lastPrice;
    
    int lookbackPeriod;
    double entryThreshold;
    double exitThreshold;
    
    // Current values
    double currentMean;
    double currentStdDev;
    double currentZScore;
    bool debugDetailTicks;

    // Helper methods
    void calculateStats();
};

// Factory function for creating Mean Reversion strategy
inline std::unique_ptr<Strategy> createMeanReversionStrategy() {
    return std::make_unique<MeanReversionStrategy>();
}

// Register the strategy
namespace {
    static const std::vector<StrategyParam> meanReversionParams = {
        {"lookbackPeriod", "number", "Number of periods to use for calculating the mean and standard deviation", "20", {}},
        {"entryThreshold", "number", "Z-score threshold to enter a position (>1.0 recommended)", "1.5", {}},
        {"exitThreshold", "number", "Z-score threshold to exit a position (<1.0 recommended)", "0.5", {}},
        {"stopLossPercentage", "number", "Stop loss percentage for risk management", "0.02", {}},
        {"profitTargetPercentage", "number", "Profit target percentage for taking profits", "0.03", {}},
        {"transactionCost", "number", "Transaction cost as a percentage", "0.001", {}}
    };

    static bool registered_mean_reversion = Strategy::registerStrategy({
        "mean_reversion",
        "Mean Reversion Strategy",
        "A statistical arbitrage strategy that trades on the tendency of prices to revert to their mean. "
        "Uses z-scores (standard deviation from the mean) to identify overbought (sell) and oversold (buy) "
        "conditions, combined with profit targets and stop losses for risk management.",
        meanReversionParams,
        createMeanReversionStrategy
    });
}

} // namespace trading
#endif
