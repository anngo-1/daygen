#ifndef MACD_STRATEGY_H
#define MACD_STRATEGY_H

#include "strategy.h"
#include "utils/math_utils.h"
#include <vector>
#include <string>
#include <memory>

namespace trading {

class MACDStrategy : public Strategy {
public:
    MACDStrategy(double volEstimate = 0.02,
                 double trendAlpha = 0.3,
                 double garchOmega = 1e-6, 
                 double garchAlpha = 0.1, 
                 double garchBeta = 0.85,
                 int macdFastPeriod = 12, 
                 int macdSlowPeriod = 26, 
                 int signalPeriod = 9,
                 double tradeThresholdFactor = 0.05, 
                 double stopLossPercentage = 0.02,
                 double transactionCost = 0.001);

    SimulationResult execute(const MarketData& data, double initialCash) override;
    virtual void onTick(double price, int timeStep, const std::string& tickTimestamp) override;
    double getCurrentMACD() const;
    double getCurrentSignal() const;

private:
    TrendEstimator<double> trendEstimator;
    GARCHEstimator<double> garchEstimator;
    TrendEstimator<double> fastEMAEstimator;
    TrendEstimator<double> slowEMAEstimator;
    TrendEstimator<double> signalEMAEstimator;

    std::vector<Trade> trades;
    std::vector<HistoricalDataPoint> historicalData;

    double cash;
    int position;
    double stopLossPct;
    double transactionCostRate;
    double entryPrice;
    double lastPrice;
    double currentMACD;
    double currentSignal;
    int macdFastPeriod;
    int macdSlowPeriod;
    int signalPeriod;
    double tradeThresholdFactor;
    bool debugDetailTicks;
};

// Factory function for creating MACD strategy
inline std::unique_ptr<Strategy> createMACDStrategy() {
    return std::make_unique<MACDStrategy>();
}

// Register the MACD strategy with the registry
namespace {
    static const std::vector<StrategyParam> macdParams = {
        {"volEstimate", "number", "Initial volatility estimate", "0.02", {}},
        {"trendAlpha", "number", "Alpha parameter for trend estimation", "0.3", {}},
        {"garchOmega", "number", "Omega parameter for GARCH model", "0.000001", {}},
        {"garchAlpha", "number", "Alpha parameter for GARCH model", "0.1", {}},
        {"garchBeta", "number", "Beta parameter for GARCH model", "0.85", {}},
        {"macdFastPeriod", "number", "Fast period for MACD calculation", "12", {}},
        {"macdSlowPeriod", "number", "Slow period for MACD calculation", "26", {}},
        {"signalPeriod", "number", "Signal smoothing period", "9", {}},
        {"tradeThresholdFactor", "number", "Trade decision threshold multiplier", "0.05", {}},
        {"stopLossPercentage", "number", "Stop loss percentage", "0.02", {}},
        {"transactionCost", "number", "Transaction cost as a percentage", "0.001", {}}
    };

    static bool registered_macd = Strategy::registerStrategy({
        "macd",
        "MACD Strategy",
        "Moving Average Convergence Divergence (MACD) strategy that uses the crossover of MACD line and signal line "
        "to generate buy/sell signals. Incorporates trend analysis and volatility estimation using GARCH. "
        "Includes stop-loss protection against downward price movements.",
        macdParams,
        createMACDStrategy
    });
}

} // namespace trading
#endif
