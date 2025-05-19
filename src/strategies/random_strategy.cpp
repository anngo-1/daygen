#include "strategies/random_strategy.h"
#include <cmath>
#include <iostream>
#include <vector>
#include <limits>
#include <stdexcept>
#include <iomanip>
#include <chrono>
#include <random>
#include <ctime>

namespace trading {

/**
 * @brief Constructor for the Random strategy.
 *
 * This strategy makes random trading decisions at specified intervals,
 * simulating non-predictive or discretionary trading behavior.
 * Uses a fixed seed (42) for the random number generator to ensure
 * consistent simulation results across runs.
 *
 * @param transactionCost Transaction cost as a percentage of trade value
 * @param timeStepInterval Number of ticks to wait between trading decisions
 * @param clearAtEndOfDay Whether to liquidate all positions at the end of each trading day
 */
RandomStrategy::RandomStrategy(double transactionCost, int timeStepInterval, bool clearAtEndOfDay)
    : trades()
    , historicalData()
    , rng(42) // Use fixed seed for reproducible simulations
    , cash(0)
    , position(0)
    , transactionCostRate(transactionCost)
    , timeStepInterval(timeStepInterval)
    , clearAtEndOfDay(clearAtEndOfDay)
    , lastPrice(0.0)
    , currentDay("")
    , tickCounter(0)
    , debugDetailTicks(false)
{
    if (transactionCost < 0) {
        throw std::invalid_argument("RandomStrategy: transactionCost cannot be negative");
    }
    if (timeStepInterval <= 0) {
        throw std::invalid_argument("RandomStrategy: timeStepInterval must be positive");
    }
}

/**
 * @brief Main execution method for the Random strategy.
 *
 * Processes market data tick by tick, executing the strategy logic:
 * 1. Initialize portfolio with random seed
 * 2. Process each price point sequentially
 * 3. Make random trading decisions at specified intervals
 * 4. Clear positions at the end of each day if configured
 * 5. Liquidate any remaining positions at the end of the session
 * 6. Return performance metrics and trade history
 *
 * This strategy serves as a benchmarking tool to compare other strategies
 * against random trading decisions.
 *
 * @param data Market data containing prices and timestamps
 * @param initialCash Starting capital for the simulation
 * @return SimulationResult object with performance metrics and trade history
 */
SimulationResult RandomStrategy::execute(const MarketData& data, double initialCash) {
    cash = initialCash;
    position = 0;
    trades.clear();
    historicalData.clear();
    historicalData.reserve(data.prices.size());
    lastPrice = 0.0;
    currentDay = "";
    tickCounter = 0;
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

    std::cout << "\nDEBUG: " << timestamp << " - INFO: Starting random strategy execution with " << data.prices.size() << " price points." << std::endl;
    std::cout << "DEBUG: " << timestamp << " - INFO: Initial cash: " << initialCash << std::endl;

    for (size_t i = 0; i < data.prices.size(); ++i) {
        onTick(data.prices[i], i, data.timestamps[i]); // Pass timestamp
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
    }

    std::cout << "DEBUG: " << timestamp << " - INFO: Strategy execution completed." << std::endl;
    return {cash, cash - initialCash, trades, historicalData};
}

/**
 * @brief Processes each price tick and executes strategy logic.
 *
 * This is the core method implementing the strategy's decision-making process:
 * 1. Checks for day changes and liquidates positions if configured
 * 2. Records performance metrics for the current tick
 * 3. At specified intervals, generates random trading percentages
 * 4. For no position: randomly buys a percentage of available cash
 * 5. For existing position: flips a coin to decide whether to sell
 * 6. If selling, randomly determines what percentage to sell
 * 7. Manages all transaction costs and position tracking
 *
 * @param price Current price at this tick
 * @param timeStep Current time step index
 * @param tickTimestamp Timestamp string for this tick, used for day change detection
 */
void RandomStrategy::onTick(double price, int timeStep, const std::string& tickTimestamp) {
    auto now = std::chrono::system_clock::now();
    auto now_c = std::chrono::system_clock::to_time_t(now);
    std::tm now_tm;
    localtime_r(&now_c, &now_tm);
    std::stringstream ss;
    ss << std::put_time(&now_tm, "%Y-%m-%d %H:%M:%S");
    std::string timestamp = ss.str();

    // Extract date from timestamp (assuming format like "2023-01-01 09:30:00")
    std::string day = tickTimestamp.substr(0, 10); // Extract YYYY-MM-DD part
    
    // Check if we're in a new day
    bool isNewDay = (day != currentDay && !currentDay.empty());
    currentDay = day;
    
    // Sell all holdings at the end of the day if setting is enabled and we just changed days
    if (clearAtEndOfDay && isNewDay && position > 0) {
        double proceeds = position * price * (1 - transactionCostRate);
        cash += proceeds;
        trades.push_back({timeStep, "EXIT_LONG", "SELL", price, static_cast<double>(position)});
        std::cout << "DEBUG: " << timestamp << " - INFO: End of day " << currentDay << ", liquidated position at price " << std::fixed << std::setprecision(2) << price << ", proceeds: " << std::fixed << std::setprecision(2) << proceeds << std::endl;
        position = 0;
    }

    // Record historical data point
    HistoricalDataPoint dataPoint{
        0.0, // No MACD in this strategy
        0.0, // No signal in this strategy
        cash + (position * price),  // current portfolio value
        static_cast<double>(position),
        cash,
        0.0, // No trend in this strategy  
        0.0  // No volatility in this strategy
    };

    if (static_cast<size_t>(timeStep) >= historicalData.size()) {
        historicalData.push_back(dataPoint);
    } else {
        historicalData[timeStep] = dataPoint;
    }

    // Increment tick counter
    tickCounter++;

    // Only consider trading every timeStepInterval ticks
    if (tickCounter >= timeStepInterval) {
        tickCounter = 0;
        
        // Generate a random percentage (1-5%) for trading
        std::uniform_real_distribution<double> pctDist(0.01, 0.05);
        double tradePct = pctDist(rng);
        
        if (timeStep % 10 == 0 || debugDetailTicks) {
            std::cout << "DEBUG: " << timestamp << " - TICK " << timeStep << " - Considering random trade of " << std::fixed << std::setprecision(2) << (tradePct * 100) << "% at price " << std::fixed << std::setprecision(2) << price << std::endl;
        }
        
        // If we don't have a position, make a buy
        if (position == 0) {
            int maxQty = static_cast<int>(cash / (price * (1 + transactionCostRate)));
            int qty = static_cast<int>(maxQty * tradePct);
            
            // Ensure at least 1 share is bought if we have cash
            if (qty < 1 && maxQty >= 1) qty = 1;
            
            if (qty > 0) {
                double cost = qty * price * (1 + transactionCostRate);
                if (cash >= cost) {
                    cash -= cost;
                    position += qty;
                    trades.push_back({timeStep, "LONG", "BUY", price, static_cast<double>(qty)});
                    std::cout << "DEBUG: " << timestamp << " - INFO: RANDOM BUY at " << std::fixed << std::setprecision(2) << price << ", qty: " << qty << ", cost: " << std::fixed << std::setprecision(2) << cost << ", new cash: " << std::fixed << std::setprecision(2) << cash << std::endl;
                    debugDetailTicks = true;
                }
            }
        } 
        // If we have a position, flip a coin to decide whether to sell
        else if (position > 0) {
            std::uniform_int_distribution<int> coinFlip(0, 1);
            bool sellDecision = coinFlip(rng) == 1;
            
            if (timeStep % 10 == 0 || debugDetailTicks) {
                std::cout << "DEBUG: " << timestamp << " - TICK " << timeStep << " - Coin flip for sell: " << (sellDecision ? "HEADS (Sell)" : "TAILS (Hold)") << std::endl;
            }
            
            if (sellDecision) {
                // Sell a random portion (between 50-100%) of the position
                std::uniform_real_distribution<double> sellPctDist(0.5, 1.0);
                double sellPct = sellPctDist(rng);
                int sellQty = static_cast<int>(position * sellPct);
                
                // Ensure at least 1 share is sold
                if (sellQty < 1) sellQty = 1;
                // Don't sell more than we have
                if (sellQty > position) sellQty = position;
                
                if (sellQty > 0) {
                    double proceeds = sellQty * price * (1 - transactionCostRate);
                    cash += proceeds;
                    position -= sellQty;
                    trades.push_back({timeStep, "EXIT_LONG", "SELL", price, static_cast<double>(sellQty)});
                    std::cout << "DEBUG: " << timestamp << " - INFO: COIN FLIP SELL at " << std::fixed << std::setprecision(2) << price << ", qty: " << sellQty << ", proceeds: " << std::fixed << std::setprecision(2) << proceeds << ", new cash: " << std::fixed << std::setprecision(2) << cash << std::endl;
                    debugDetailTicks = true;
                }
            }
        }
    }
    
    lastPrice = price;
    
    if (debugDetailTicks && (trades.back().timeStep <= timeStep) && (trades.back().timeStep + 5 < timeStep)) {
        debugDetailTicks = false;
    }
}

} // namespace trading
