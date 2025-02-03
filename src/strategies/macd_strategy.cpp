// strategies/macd_strategy.cpp
#include "strategies/macd_strategy.h"
#include <cmath>
#include <iostream>
#include <vector>
#include <limits>
#include <stdexcept>
#include <iomanip>
#include <chrono>

namespace trading {

MACDStrategy::MACDStrategy(double volEstimate,
                           double trendAlpha,
                           double garchOmega, double garchAlpha, double garchBeta,
                           int macdFastPeriod, int macdSlowPeriod, int signalPeriod,
                           double tradeThresholdFactor, double stopLossPercentage,
                           double transactionCost)
    : trendEstimator(0, trendAlpha)
    , garchEstimator(volEstimate, garchOmega, garchAlpha, garchBeta)
    , fastEMAEstimator(0, 2.0 / (macdFastPeriod + 1.0))
    , slowEMAEstimator(0, 2.0 / (macdSlowPeriod + 1.0))
    , signalEMAEstimator(0, 2.0 / (signalPeriod + 1.0))
    , trades()
    , historicalData()
    , cash(0)
    , position(0)
    , stopLossPct(stopLossPercentage)
    , transactionCostRate(transactionCost)
    , entryPrice(0.0)
    , lastPrice(0.0)
    , currentMACD(0.0)
    , currentSignal(0.0)
    , macdFastPeriod(macdFastPeriod)
    , macdSlowPeriod(macdSlowPeriod)
    , signalPeriod(signalPeriod)
    , tradeThresholdFactor(tradeThresholdFactor)
    , debugDetailTicks(false)
{
    if (macdFastPeriod <= 0 || macdSlowPeriod <= 0 || signalPeriod <= 0) {
        throw std::invalid_argument("MACDStrategy: MACD periods must be positive");
    }
    if (macdFastPeriod >= macdSlowPeriod) {
        throw std::invalid_argument("MACDStrategy: fastPeriod must be smaller than slowPeriod");
    }
    if (tradeThresholdFactor < 0) {
        throw std::invalid_argument("MACDStrategy: tradeThresholdFactor cannot be negative");
    }
    if (stopLossPercentage < 0 || stopLossPercentage >= 1) {
        throw std::invalid_argument("MACDStrategy: stopLossPercentage must be between 0 and 1 (exclusive of 1)");
    }
    if (transactionCost < 0) {
        throw std::invalid_argument("MACDStrategy: transactionCost cannot be negative");
    }
}

SimulationResult MACDStrategy::execute(const MarketData& data, double initialCash) {
    cash = initialCash;
    position = 0;
    trades.clear();
    historicalData.clear();
    historicalData.reserve(data.prices.size());
    lastPrice = 0.0;
    entryPrice = 0.0;
    currentMACD = 0.0;
    currentSignal = 0.0;
    debugDetailTicks = false;

    if (data.prices.empty()) {
        std::cout << "No price data to process: Prices vector is empty." << std::endl;
        return {cash, 0, trades, historicalData};
    }
    if (initialCash <= 0) {
        std::cout << "Warning: Initial cash is not positive, simulation might not be meaningful." << std::endl;
    }

    auto now = std::chrono::system_clock::now();
    auto now_c = std::chrono::system_clock::to_time_t(now);
    std::tm now_tm;
    localtime_r(&now_c, &now_tm);
    std::stringstream ss;
    ss << std::put_time(&now_tm, "%Y-%m-%d %H:%M:%S");
    std::string timestamp = ss.str();

    std::cout << "\nDEBUG: " << timestamp << " - INFO: Starting strategy execution with " << data.prices.size() << " price points." << std::endl;
    std::cout << "DEBUG: " << timestamp << " - INFO: Initial cash: " << initialCash << std::endl; // Debug log for initial cash

    trendEstimator = TrendEstimator<double>(data.prices.front(), trendEstimator.getAlpha());
    fastEMAEstimator = TrendEstimator<double>(data.prices.front(), fastEMAEstimator.getAlpha());
    slowEMAEstimator = TrendEstimator<double>(data.prices.front(), slowEMAEstimator.getAlpha());
    signalEMAEstimator = TrendEstimator<double>(0.0, signalEMAEstimator.getAlpha());
    garchEstimator = GARCHEstimator<double>(garchEstimator.getSigma(), garchEstimator.getOmega(), garchEstimator.getAlpha(), garchEstimator.getBeta());

    for (size_t i = 0; i < data.prices.size(); ++i) {
        onTick(data.prices[i], i, data.timestamps[i]); // Pass timestamp
    }

    if (position > 0) {
        double finalPrice = data.prices.back();
        double proceeds = position * finalPrice * (1 - transactionCostRate);
        cash += proceeds;
        trades.push_back({static_cast<int>(data.prices.size()-1),
                         "SELL (End Session)",
                         finalPrice,
                         position});
        std::cout << "DEBUG: " << timestamp << " - INFO: End of session, liquidated position at price " << finalPrice << ", proceeds: " << proceeds << std::endl;
    }

    std::cout << "DEBUG: " << timestamp << " - INFO: Strategy execution completed." << std::endl;
    return {cash, cash - initialCash, trades, historicalData};  // Include historical data in return
}

void MACDStrategy::onTick(double price, int timeStep, const std::string& tickTimestamp) { // Receive timestamp
    auto now = std::chrono::system_clock::now();
    auto now_c = std::chrono::system_clock::to_time_t(now);
    std::tm now_tm;
    localtime_r(&now_c, &now_tm);
    std::stringstream ss;
    ss << std::put_time(&now_tm, "%Y-%m-%d %H:%M:%S");
    std::string timestamp = ss.str();

    if (timeStep % 10 == 0 || debugDetailTicks) {
        std::cout << "\nDEBUG: " << timestamp << " - TICK START - Tick " << timeStep << " - Timestamp: " << tickTimestamp << " - Price: " << std::fixed << std::setprecision(2) << price << std::endl; // Debug log at tick start
    }

    trendEstimator.update(price);
    fastEMAEstimator.update(price);
    slowEMAEstimator.update(price);

    currentMACD = fastEMAEstimator.getTrend() - slowEMAEstimator.getTrend();
    signalEMAEstimator.update(currentMACD);
    currentSignal = signalEMAEstimator.getTrend();

    if (timeStep > 0 && lastPrice > 0) {
        double r = std::log(price / lastPrice);
        garchEstimator.update(r);
    }
    lastPrice = price;

    double currentTrend = trendEstimator.getTrend();
    double currentSigma = std::max(0.01, garchEstimator.getSigma());
    double buyThreshold = currentTrend * (1 - tradeThresholdFactor * currentSigma);
    double sellThreshold = currentTrend * (1 + tradeThresholdFactor * currentSigma);

    HistoricalDataPoint dataPoint{
        currentMACD,
        currentSignal,
        cash + (position * price),  // current portfolio value
        position,
        cash,
        currentTrend,
        currentSigma
    };

    if (static_cast<size_t>(timeStep) >= historicalData.size()) {
        historicalData.push_back(dataPoint);
    } else {
        historicalData[timeStep] = dataPoint;
    }


    if (timeStep % 10 == 0 || debugDetailTicks) {
        std::cout << "  DEBUG: " << timestamp << " - Trend: " << std::fixed << std::setprecision(3) << currentTrend << std::endl;
        std::cout << "  DEBUG: " << timestamp << " - MACD: " << std::fixed << std::setprecision(6) << currentMACD << std::endl;
        std::cout << "  DEBUG: " << timestamp << " - Signal: " << std::fixed << std::setprecision(6) << currentSignal << std::endl;
        std::cout << "  DEBUG: " << timestamp << " - Volatility (GARCH Sigma): " << std::fixed << std::setprecision(2) << currentSigma << std::endl;
        std::cout << "  DEBUG: " << timestamp << " - Position: " << position << std::endl;
        std::cout << "  DEBUG: " << timestamp << " - Buy Threshold: " << std::fixed << std::setprecision(2) << buyThreshold << ", Sell Threshold: " << std::fixed << std::setprecision(2) << sellThreshold << std::endl; // Log thresholds
    }

    // MACD crossover with trend confirmation
    bool buyCondition = (currentMACD > currentSignal) && (price < buyThreshold);
    if (timeStep % 10 == 0 || debugDetailTicks) {
        std::cout << "  DEBUG: " << timestamp << " - BUY Conditions Check - MACD > Signal: (" << std::fixed << std::setprecision(6) << currentMACD << " > " << std::fixed << std::setprecision(6) << currentSignal << ") - " << (currentMACD > currentSignal ? "TRUE" : "FALSE")
                  << ", Price < Buy Threshold (" << std::fixed << std::setprecision(2) << buyThreshold << "): (" << std::fixed << std::setprecision(2) << price << " < " << std::fixed << std::setprecision(2) << buyThreshold << ") - " << (price < buyThreshold ? "TRUE" : "FALSE") << std::endl;
    }
    if (buyCondition) {
        if (position == 0) {
            int qty = 100;
            double cost = qty * price * (1 + transactionCostRate);
            if (cash >= cost) {
                cash -= cost;
                trades.push_back({timeStep, "BUY", price, qty});
                position += qty;
                entryPrice = price;
                std::cout << "DEBUG: " << timestamp << " - INFO: BUY at " << std::fixed << std::setprecision(2) << price << ", qty: " << qty << ", cost: " << std::fixed << std::setprecision(2) << cost << ", new cash: " << std::fixed << std::setprecision(2) << cash << std::endl; // Log BUY info
                debugDetailTicks = true;
            } else {
                std::cout << "WARNING: Not enough cash to BUY at " << std::fixed << std::setprecision(2) << price << ", qty: " << qty << ", cost: " << std::fixed << std::setprecision(2) << cost << ". Current cash: " << std::fixed << std::setprecision(2) << cash << std::endl;
            }

        }
    }


    bool sellCondition = (currentMACD < currentSignal) || (price > sellThreshold);
     if (timeStep % 10 == 0 || debugDetailTicks) {
        std::cout << "  DEBUG: " << timestamp << " - SELL Conditions Check - MACD < Signal: (" << std::fixed << std::setprecision(6) << currentMACD << " < " << std::fixed << std::setprecision(6) << currentSignal << ") - " << (currentMACD < currentSignal ? "TRUE" : "FALSE")
                  << ", Price > Sell Threshold (" << std::fixed << std::setprecision(2) << sellThreshold << "): (" << std::fixed << std::setprecision(2) << price << " > " << std::fixed << std::setprecision(2) << sellThreshold << ") - " << (price > sellThreshold ? "TRUE" : "FALSE") << std::endl;
    }
    if (sellCondition) {
        if (position > 0) {
            double proceeds = position * price * (1 - transactionCostRate);
            cash += proceeds;
            trades.push_back({timeStep, "SELL", price, position});
            std::cout << "DEBUG: " << timestamp << " - INFO: SELL at " << std::fixed << std::setprecision(2) << price << ", qty: " << position << ", proceeds: " << std::fixed << std::setprecision(2) << proceeds << ", new cash: " << std::fixed << std::setprecision(2) << cash << std::endl; // Log SELL info
            position = 0;
            entryPrice = 0.0;
            debugDetailTicks = true;

        }
    }


    // stop loss check
    if (position > 0 && entryPrice > 0) {
        bool stopLossCondition = (price < entryPrice * (1 - stopLossPct));
         if (timeStep % 10 == 0 || debugDetailTicks) {
            std::cout << "  DEBUG: " << timestamp << " - STOP LOSS Conditions Check - Price < Stop Loss Level (" << std::fixed << std::setprecision(2) << entryPrice * (1 - stopLossPct) << "): (" << std::fixed << std::setprecision(2) << price << " < " << std::fixed << std::setprecision(2) << entryPrice * (1 - stopLossPct) << ") - " << (price < entryPrice * (1 - stopLossPct) ? "TRUE" : "FALSE") << std::endl;
        }
        if (stopLossCondition) {
            double proceeds = position * price * (1 - transactionCostRate);
            cash += proceeds;
            trades.push_back({timeStep, "SELL (Stop Loss)", price, position});
            std::cout << "DEBUG: " << timestamp << " - INFO: STOP LOSS triggered at " << std::fixed << std::setprecision(2) << price << ", qty: " << position << ", proceeds: " << std::fixed << std::setprecision(2) << proceeds << ", new cash: " << std::fixed << std::setprecision(2) << cash << std::endl; // Log STOP LOSS info
            position = 0;
            entryPrice = 0.0;
            debugDetailTicks = true;
        }
    }


    if (debugDetailTicks && (trades.back().timeStep <= timeStep) && (trades.back().timeStep + 5 < timeStep)) {
        debugDetailTicks = false;
    }
     if (timeStep % 10 == 0 || debugDetailTicks) {
        std::cout << "DEBUG: " << timestamp << " - TICK END - Tick " << timeStep <<  " - Position: " << position <<  " - Cash: " << std::fixed << std::setprecision(2) << cash << " - Portfolio Value: " << std::fixed << std::setprecision(2) << cash + (position * price) << std::endl; // Debug log at tick end
    }
}

double MACDStrategy::getCurrentMACD() const {
    return currentMACD;
}

double MACDStrategy::getCurrentSignal() const {
    return currentSignal;
}

}