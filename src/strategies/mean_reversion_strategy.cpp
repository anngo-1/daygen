#include "strategies/mean_reversion_strategy.h"
#include <cmath>
#include <iostream>
#include <numeric>
#include <limits>
#include <iomanip>
#include <chrono>

namespace trading {

/**
 * @brief Constructor for the Mean Reversion strategy.
 *
 * @param lookbackPeriod Number of periods to use for calculating mean and standard deviation
 * @param entryThreshold Z-score threshold to trigger entry (e.g., 1.5)
 * @param exitThreshold Z-score threshold to trigger exit (e.g., 0.5)
 * @param stopLossPercentage Maximum loss percentage before exiting position
 * @param profitTargetPercentage Target profit percentage to take profits
 * @param transactionCost Transaction cost as a percentage of trade value
 */
MeanReversionStrategy::MeanReversionStrategy(int lookbackPeriod, 
                                           double entryThreshold,
                                           double exitThreshold,
                                           double stopLossPercentage,
                                           double profitTargetPercentage,
                                           double transactionCost)
    : trades()
    , historicalData()
    , priceHistory()
    , cash(0)
    , position(0)
    , stopLossPct(stopLossPercentage)
    , profitTargetPct(profitTargetPercentage)
    , transactionCostRate(transactionCost)
    , entryPrice(0.0)
    , lastPrice(0.0)
    , lookbackPeriod(lookbackPeriod)
    , entryThreshold(entryThreshold)
    , exitThreshold(exitThreshold)
    , currentMean(0.0)
    , currentStdDev(0.0)
    , currentZScore(0.0)
    , debugDetailTicks(false)
{
    if (lookbackPeriod < 3) {
        throw std::invalid_argument("MeanReversionStrategy: lookbackPeriod must be at least 3");
    }
    if (entryThreshold <= 0) {
        throw std::invalid_argument("MeanReversionStrategy: entryThreshold must be positive");
    }
    if (exitThreshold < 0) {
        throw std::invalid_argument("MeanReversionStrategy: exitThreshold cannot be negative");
    }
    if (stopLossPercentage < 0 || stopLossPercentage >= 1) {
        throw std::invalid_argument("MeanReversionStrategy: stopLossPercentage must be between 0 and 1");
    }
    if (profitTargetPercentage <= 0 || profitTargetPercentage >= 1) {
        throw std::invalid_argument("MeanReversionStrategy: profitTargetPercentage must be between 0 and 1");
    }
    if (transactionCost < 0) {
        throw std::invalid_argument("MeanReversionStrategy: transactionCost cannot be negative");
    }
}

/**
 * @brief Main execution method for the Mean Reversion strategy.
 *
 * Processes market data tick by tick, executing the strategy logic:
 * 1. Initialize portfolio and performance tracking
 * 2. Process each price point sequentially
 * 3. Calculate statistics and execute trades based on z-scores
 * 4. Liquidate any remaining positions at the end of the session
 * 5. Return performance metrics and trade history
 *
 * @param data Market data containing prices and timestamps
 * @param initialCash Starting capital for the simulation
 * @return SimulationResult object with performance metrics and trade history
 */
SimulationResult MeanReversionStrategy::execute(const MarketData& data, double initialCash) {
    cash = initialCash;
    position = 0;
    trades.clear();
    historicalData.clear();
    historicalData.reserve(data.prices.size());
    priceHistory.clear();
    lastPrice = 0.0;
    entryPrice = 0.0;
    currentMean = 0.0;
    currentStdDev = 0.0;
    currentZScore = 0.0;
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

    std::cout << "\nDEBUG: " << timestamp << " - INFO: Starting mean reversion strategy execution with " << data.prices.size() << " price points." << std::endl;
    std::cout << "DEBUG: " << timestamp << " - INFO: Initial cash: " << initialCash << std::endl;

    for (size_t i = 0; i < data.prices.size(); ++i) {
        onTick(data.prices[i], i, data.timestamps[i]);
    }

    // Final liquidation at the end of the session if still holding
    if (position > 0) {
        double finalPrice = data.prices.back();
        double proceeds = position * finalPrice * (1 - transactionCostRate);
        cash += proceeds;
        trades.push_back({static_cast<int>(data.prices.size()-1),
                         "EXIT_LONG",
                         "SELL",
                         finalPrice,
                         static_cast<double>(position)});
        std::cout << "DEBUG: " << timestamp << " - INFO: End of session, liquidated position at price " << finalPrice << ", proceeds: " << proceeds << std::endl;
    } else if (position < 0) {
        double finalPrice = data.prices.back();
        double cost = -position * finalPrice * (1 + transactionCostRate);
        cash -= cost;
        trades.push_back({static_cast<int>(data.prices.size()-1),
                         "EXIT_SHORT",
                         "BUY",
                         finalPrice,
                         static_cast<double>(-position)});
        std::cout << "DEBUG: " << timestamp << " - INFO: End of session, covered short position at price " << finalPrice << ", cost: " << cost << std::endl;
    }

    std::cout << "DEBUG: " << timestamp << " - INFO: Strategy execution completed." << std::endl;
    return {cash, cash - initialCash, trades, historicalData};
}

/**
 * @brief Calculate statistical measures for mean reversion analysis.
 *
 * Calculates the mean, standard deviation, and z-score based on the price history.
 * These statistics are used to determine entry and exit points for the strategy.
 */
void MeanReversionStrategy::calculateStats() {
    if (priceHistory.size() <= 1) {
        currentMean = priceHistory.front();
        currentStdDev = 0.0;
        currentZScore = 0.0;
        return;
    }

    // Calculate mean
    double sum = std::accumulate(priceHistory.begin(), priceHistory.end(), 0.0);
    currentMean = sum / priceHistory.size();

    // Calculate standard deviation
    double variance = 0.0;
    for (double price : priceHistory) {
        variance += (price - currentMean) * (price - currentMean);
    }
    variance /= priceHistory.size();
    currentStdDev = std::sqrt(variance);

    // Calculate z-score
    if (currentStdDev > 0.0) {
        currentZScore = (lastPrice - currentMean) / currentStdDev;
    } else {
        currentZScore = 0.0;
    }
}

/**
 * @brief Processes each price tick and executes strategy logic.
 *
 * This is the core method implementing the strategy's decision-making process:
 * 1. Updates price history and calculates statistics
 * 2. Checks stop-loss and profit targets for active positions
 * 3. Executes buy signals when z-score is below negative threshold (oversold)
 * 4. Executes sell signals when z-score is above positive threshold (overbought)
 * 5. Records performance metrics and trade details
 *
 * @param price Current price at this tick
 * @param timeStep Current time step index
 * @param tickTimestamp Timestamp string for this tick (unused in this implementation)
 */
void MeanReversionStrategy::onTick(double price, int timeStep, const std::string& /* tickTimestamp */) {
    auto now = std::chrono::system_clock::now();
    auto now_c = std::chrono::system_clock::to_time_t(now);
    std::tm now_tm;
    localtime_r(&now_c, &now_tm);
    std::stringstream ss;
    ss << std::put_time(&now_tm, "%Y-%m-%d %H:%M:%S");
    std::string timestamp = ss.str();

    // Update price history
    priceHistory.push_back(price);
    if (priceHistory.size() > static_cast<size_t>(lookbackPeriod)) {
        priceHistory.pop_front();
    }
    lastPrice = price;

    // Calculate statistics
    calculateStats();

    // Record historical data point
    HistoricalDataPoint dataPoint{
        currentZScore, // Using MACD field for z-score
        0.0,           // Not using signal field
        cash + (position * price),  // current portfolio value
        static_cast<double>(position),
        cash,
        currentMean,   // Using trend field for mean
        currentStdDev  // Using volatility field for std dev
    };

    if (static_cast<size_t>(timeStep) >= historicalData.size()) {
        historicalData.push_back(dataPoint);
    } else {
        historicalData[timeStep] = dataPoint;
    }

    // Only start trading after we have enough data
    if (priceHistory.size() < static_cast<size_t>(lookbackPeriod)) {
        if (timeStep % 10 == 0 || debugDetailTicks) {
            std::cout << "DEBUG: " << timestamp << " - TICK " << timeStep << " - Building price history: " << priceHistory.size() << " / " << lookbackPeriod << std::endl;
        }
        return;
    }

    if (timeStep % 10 == 0 || debugDetailTicks) {
        std::cout << "\nDEBUG: " << timestamp << " - TICK " << timeStep << " - Price: " << std::fixed << std::setprecision(2) << price
                  << " Mean: " << std::fixed << std::setprecision(2) << currentMean
                  << " StdDev: " << std::fixed << std::setprecision(2) << currentStdDev
                  << " Z-Score: " << std::fixed << std::setprecision(2) << currentZScore << std::endl;
    }

    // Check stop loss and profit target for existing positions
    if (position > 0) { // Long position
        // Check stop loss
        if (price < entryPrice * (1 - stopLossPct)) {
            double proceeds = position * price * (1 - transactionCostRate);
            cash += proceeds;
            trades.push_back({timeStep, "EXIT_LONG", "SELL", price, static_cast<double>(position)});
            std::cout << "DEBUG: " << timestamp << " - INFO: STOP LOSS triggered at " << std::fixed << std::setprecision(2) << price
                      << ", qty: " << position << ", proceeds: " << std::fixed << std::setprecision(2) << proceeds << std::endl;
            position = 0;
            entryPrice = 0.0;
            debugDetailTicks = true;
            return;
        }
        
        // Check profit target
        if (price > entryPrice * (1 + profitTargetPct)) {
            double proceeds = position * price * (1 - transactionCostRate);
            cash += proceeds;
            trades.push_back({timeStep, "EXIT_LONG", "SELL", price, static_cast<double>(position)});
            std::cout << "DEBUG: " << timestamp << " - INFO: PROFIT TARGET reached at " << std::fixed << std::setprecision(2) << price
                      << ", qty: " << position << ", proceeds: " << std::fixed << std::setprecision(2) << proceeds << std::endl;
            position = 0;
            entryPrice = 0.0;
            debugDetailTicks = true;
            return;
        }
    }
    else if (position < 0) { // Short position
        // Check stop loss
        if (price > entryPrice * (1 + stopLossPct)) {
            double cost = -position * price * (1 + transactionCostRate);
            cash -= cost;
            trades.push_back({timeStep, "EXIT_SHORT", "BUY", price, static_cast<double>(-position)});
            std::cout << "DEBUG: " << timestamp << " - INFO: STOP LOSS triggered at " << std::fixed << std::setprecision(2) << price
                      << ", qty: " << -position << ", cost: " << std::fixed << std::setprecision(2) << cost << std::endl;
            position = 0;
            entryPrice = 0.0;
            debugDetailTicks = true;
            return;
        }
        
        // Check profit target
        if (price < entryPrice * (1 - profitTargetPct)) {
            double cost = -position * price * (1 + transactionCostRate);
            cash -= cost;
            trades.push_back({timeStep, "EXIT_SHORT", "BUY", price, static_cast<double>(-position)});
            std::cout << "DEBUG: " << timestamp << " - INFO: PROFIT TARGET reached at " << std::fixed << std::setprecision(2) << price
                      << ", qty: " << -position << ", cost: " << std::fixed << std::setprecision(2) << cost << std::endl;
            position = 0;
            entryPrice = 0.0;
            debugDetailTicks = true;
            return;
        }
    }

    // Trading logic based on mean reversion
    // Buy (go long) when price is too low (negative z-score with large magnitude)
    if (position == 0 && currentZScore < -entryThreshold) {
        int qty = static_cast<int>(cash / (price * (1 + transactionCostRate)) * 0.95); // Use 95% of available cash
        if (qty > 0) {
            double cost = qty * price * (1 + transactionCostRate);
            cash -= cost;
            position = qty;
            entryPrice = price;
            trades.push_back({timeStep, "LONG", "BUY", price, static_cast<double>(qty)});
            std::cout << "DEBUG: " << timestamp << " - INFO: BUY (Oversold) at " << std::fixed << std::setprecision(2) << price
                      << ", qty: " << qty << ", z-score: " << std::fixed << std::setprecision(2) << currentZScore
                      << ", cost: " << std::fixed << std::setprecision(2) << cost << std::endl;
            debugDetailTicks = true;
        }
    }
    // Sell (go short) when price is too high (positive z-score with large magnitude)
    else if (position == 0 && currentZScore > entryThreshold) {
        int qty = static_cast<int>(cash / (price * (1 + transactionCostRate)) * 0.95); // Use 95% of available cash
        if (qty > 0) {
            double proceeds = qty * price * (1 - transactionCostRate);
            cash += proceeds;
            position = -qty; // Negative for short position
            entryPrice = price;
            trades.push_back({timeStep, "SHORT", "SELL", price, static_cast<double>(qty)});
            std::cout << "DEBUG: " << timestamp << " - INFO: SELL (Overbought) at " << std::fixed << std::setprecision(2) << price
                      << ", qty: " << qty << ", z-score: " << std::fixed << std::setprecision(2) << currentZScore
                      << ", proceeds: " << std::fixed << std::setprecision(2) << proceeds << std::endl;
            debugDetailTicks = true;
        }
    }
    // Exit long position when price returns to normal range
    else if (position > 0 && std::abs(currentZScore) < exitThreshold) {
        double proceeds = position * price * (1 - transactionCostRate);
        cash += proceeds;
        trades.push_back({timeStep, "EXIT_LONG", "SELL", price, static_cast<double>(position)});
        std::cout << "DEBUG: " << timestamp << " - INFO: EXIT LONG at " << std::fixed << std::setprecision(2) << price
                  << ", qty: " << position << ", z-score: " << std::fixed << std::setprecision(2) << currentZScore
                  << ", proceeds: " << std::fixed << std::setprecision(2) << proceeds << std::endl;
        position = 0;
        entryPrice = 0.0;
        debugDetailTicks = true;
    }
    // Exit short position when price returns to normal range
    else if (position < 0 && std::abs(currentZScore) < exitThreshold) {
        double cost = -position * price * (1 + transactionCostRate);
        cash -= cost;
        trades.push_back({timeStep, "EXIT_SHORT", "BUY", price, static_cast<double>(-position)});
        std::cout << "DEBUG: " << timestamp << " - INFO: EXIT SHORT at " << std::fixed << std::setprecision(2) << price
                  << ", qty: " << -position << ", z-score: " << std::fixed << std::setprecision(2) << currentZScore
                  << ", cost: " << std::fixed << std::setprecision(2) << cost << std::endl;
        position = 0;
        entryPrice = 0.0;
        debugDetailTicks = true;
    }

    if (debugDetailTicks && (trades.size() > 0) && (trades.back().timeStep <= timeStep) && (trades.back().timeStep + 5 < timeStep)) {
        debugDetailTicks = false;
    }
}

}
