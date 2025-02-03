#ifndef MACD_STRATEGY_H
#define MACD_STRATEGY_H

#include "strategy.h"
#include "utils/math_utils.h"
#include <vector>
#include <string>

namespace trading {

class MACDStrategy : public Strategy {
public:
    MACDStrategy(double volEstimate,
                 double trendAlpha,
                 double garchOmega, double garchAlpha, double garchBeta,
                 int macdFastPeriod, int macdSlowPeriod, int signalPeriod,
                 double tradeThresholdFactor, double stopLossPercentage,
                 double transactionCost);

    SimulationResult execute(const MarketData& data, double initialCash) override;
    virtual void onTick(double price, int timeStep, const std::string& tickTimestamp) override; // ADDED TIMESTAMP TO DECLARATION
    double getCurrentMACD() const;
    double getCurrentSignal() const;

private:
    TrendEstimator<double> trendEstimator; // Now defined in math_utils.h
    GARCHEstimator<double> garchEstimator; // Now defined in math_utils.h
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

} // namespace trading
#endif