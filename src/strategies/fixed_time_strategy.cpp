#include "strategies/fixed_time_strategy.h"
#include <cmath>
#include <iostream>
#include <iomanip>
#include <sstream>
#include <regex>
#include <chrono>
#include <ctime>

namespace trading {

/**
 * @brief Constructor for the Fixed Time strategy.
 *
 * @param holdingPeriodMinutes Number of minutes to hold a position before selling
 * @param positionSizePercent Percentage of available cash to use for each position
 * @param cooldownPeriodMinutes Waiting period after a trade before taking a new position
 * @param transactionCost Transaction cost as a percentage of trade value
 */
FixedTimeStrategy::FixedTimeStrategy(int holdingPeriodMinutes,
                                   double positionSizePercent,
                                   int cooldownPeriodMinutes,
                                   double transactionCost)
    : trades()
    , historicalData()
    , positionStartTimes()
    , cash(0)
    , position(0.0) // Changed to double
    , transactionCostRate(transactionCost)
    , lastPrice(0.0)
    , debugDetailTicks(false)
    , holdingPeriodMinutes(holdingPeriodMinutes)
    , positionSizePercent(positionSizePercent)
    , cooldownPeriodMinutes(cooldownPeriodMinutes)
    , lastTradeStep(-9999) // Initialize to a very negative value to ensure we can trade right away
{
    if (holdingPeriodMinutes <= 0) {
        throw std::invalid_argument("FixedTimeStrategy: holdingPeriodMinutes must be positive");
    }
    
    if (positionSizePercent <= 0 || positionSizePercent > 1.0) {
        throw std::invalid_argument("FixedTimeStrategy: positionSizePercent must be between 0 and 1");
    }
    
    if (cooldownPeriodMinutes < 0) {
        throw std::invalid_argument("FixedTimeStrategy: cooldownPeriodMinutes cannot be negative");
    }
    
    if (transactionCost < 0) {
        throw std::invalid_argument("FixedTimeStrategy: transactionCost cannot be negative");
    }
}

/**
 * @brief Parses a timestamp string into a system_clock time point.
 *
 * Converts timestamp strings from the format "YYYY-MM-DD HH:MM:SS" to 
 * std::chrono::system_clock::time_point for time difference calculations.
 *
 * @param timestamp Timestamp string to parse
 * @return std::chrono::system_clock::time_point representing the parsed time
 */
std::chrono::system_clock::time_point FixedTimeStrategy::parseTimestamp(const std::string& timestamp) const {
    // Example timestamp: "2023-03-21 09:45:00"
    std::tm tm = {};
    std::stringstream ss(timestamp);
    ss >> std::get_time(&tm, "%Y-%m-%d %H:%M:%S");
    return std::chrono::system_clock::from_time_t(std::mktime(&tm));
}

/**
 * @brief Calculates the difference in minutes between two timestamps.
 *
 * Used to determine how long a position has been held, which is the primary
 * decision factor for the Fixed Time strategy's exit logic.
 *
 * @param startTime Starting timestamp as string
 * @param endTime Ending timestamp as string
 * @return int Number of minutes between the two timestamps
 */
int FixedTimeStrategy::getMinutesDifference(const std::string& startTime, const std::string& endTime) const {
    auto start = parseTimestamp(startTime);
    auto end = parseTimestamp(endTime);
    auto diff = std::chrono::duration_cast<std::chrono::minutes>(end - start).count();
    return static_cast<int>(diff);
}

/**
 * @brief Checks if a given timestamp is within market trading hours.
 *
 * Ensures trades only occur during standard market hours (9:30 AM - 4:00 PM ET).
 * This helps avoid potentially invalid trades during pre-market or after-hours when
 * market conditions may be different.
 *
 * @param timestamp Timestamp string to check
 * @return true if the timestamp is within trading hours, false otherwise
 */
bool FixedTimeStrategy::isWithinTradingHours(const std::string& timestamp) const {
    // Extract time portion
    std::regex timePattern("\\d{4}-\\d{2}-\\d{2} (\\d{2}):(\\d{2}):\\d{2}");
    std::smatch matches;
    if (!std::regex_search(timestamp, matches, timePattern) || matches.size() < 3) {
        return false;
    }
    
    int hour = std::stoi(matches[1].str());
    int minute = std::stoi(matches[2].str());
    
    // Trading hours: 9:30 AM - 4:00 PM
    if (hour < 9 || (hour == 9 && minute < 30) || hour >= 16) {
        return false;
    }
    
    return true;
}

/**
 * @brief Main execution method for the Fixed Time strategy.
 *
 * Processes market data tick by tick, executing the strategy logic:
 * 1. Initialize portfolio and performance tracking
 * 2. Process each price point sequentially
 * 3. Execute time-based entry and exit decisions
 * 4. Liquidate any remaining positions at the end of the session
 * 5. Return performance metrics and trade history
 *
 * @param data Market data containing prices and timestamps
 * @param initialCash Starting capital for the simulation
 * @return SimulationResult object with performance metrics and trade history
 */
SimulationResult FixedTimeStrategy::execute(const MarketData& data, double initialCash) {
    cash = initialCash;
    position = 0;
    trades.clear();
    historicalData.clear();
    historicalData.reserve(data.prices.size());
    positionStartTimes.clear();
    lastPrice = 0.0;
    lastTradeStep = -9999;
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

    std::cout << "\nDEBUG: " << timestamp << " - INFO: Starting fixed time strategy execution with " << data.prices.size() << " price points." << std::endl;
    std::cout << "DEBUG: " << timestamp << " - INFO: Initial cash: " << initialCash << std::endl;
    std::cout << "DEBUG: " << timestamp << " - INFO: Holding period: " << holdingPeriodMinutes << " minutes" << std::endl;
    std::cout << "DEBUG: " << timestamp << " - INFO: Position size: " << (positionSizePercent * 100) << "% of cash" << std::endl;
    std::cout << "DEBUG: " << timestamp << " - INFO: Cooldown period: " << cooldownPeriodMinutes << " minutes" << std::endl;

    for (size_t i = 0; i < data.prices.size(); ++i) {
        onTick(data.prices[i], i, data.timestamps[i]);
    }

    // Final liquidation at the end of the session if still holding
    if (position > 0) {
        double finalPrice = data.prices.back();
        double proceeds = position * finalPrice * (1 - transactionCostRate);
        cash += proceeds;
        trades.push_back({static_cast<int>(data.prices.size()-1),
                         "EXIT_LONG", // Type
                         "SELL", // Side
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
 * 1. Records performance metrics for the current tick
 * 2. If holding a position, checks if the holding period has elapsed
 * 3. If not holding a position, checks if we're allowed to enter a new one
 * 4. Makes trading decisions based solely on time criteria, not price
 *
 * @param price Current price at this tick
 * @param timeStep Current time step index
 * @param tickTimestamp Timestamp string for this tick, used for time calculations
 */
void FixedTimeStrategy::onTick(double price, int timeStep, const std::string& tickTimestamp) {
    auto now = std::chrono::system_clock::now();
    auto now_c = std::chrono::system_clock::to_time_t(now);
    std::tm now_tm;
    localtime_r(&now_c, &now_tm);
    std::stringstream ss;
    ss << std::put_time(&now_tm, "%Y-%m-%d %H:%M:%S");
    std::string timestamp = ss.str();

    // Record historical data point
    HistoricalDataPoint dataPoint{
        0.0, // Not using MACD field
        0.0, // Not using signal field
        cash + (position * price),  // current portfolio value
        static_cast<double>(position),
        cash,
        0.0, // Not using trend field
        0.0  // Not using volatility field
    };

    if (static_cast<size_t>(timeStep) >= historicalData.size()) {
        historicalData.push_back(dataPoint);
    } else {
        historicalData[timeStep] = dataPoint;
    }

    // Log initial tick information
    if (timeStep % 10 == 0 || debugDetailTicks) {
        std::cout << "\nDEBUG: " << timestamp << " - TICK " << timeStep << " - Price: " << std::fixed << std::setprecision(2) << price
                  << " - Time: " << tickTimestamp 
                  << " - Position: " << position << std::endl;
    }

    // Check if we need to sell based on holding period
    if (position > 0) {
        // Find when this position was started
        auto it = positionStartTimes.find(position);
        if (it != positionStartTimes.end()) {
            std::string startTime = it->second;
            int minutesHeld = getMinutesDifference(startTime, tickTimestamp);
            
            if (timeStep % 10 == 0 || debugDetailTicks) {
                std::cout << "DEBUG: " << timestamp << " - Position held for " << minutesHeld << " minutes out of " << holdingPeriodMinutes << std::endl;
            }
            
            // If we've held for the specified period, sell
            if (minutesHeld >= holdingPeriodMinutes) {
                double proceeds = position * price * (1 - transactionCostRate);
                cash += proceeds;
                trades.push_back({timeStep, "EXIT_LONG", "SELL", price, static_cast<double>(position)});
                std::cout << "DEBUG: " << timestamp << " - INFO: SELL after " << minutesHeld << " minutes at " << std::fixed << std::setprecision(2) << price
                          << ", qty: " << position << ", proceeds: " << std::fixed << std::setprecision(2) << proceeds << std::endl;
                
                positionStartTimes.erase(it);
                position = 0;
                lastTradeStep = timeStep;
                debugDetailTicks = true;
            }
        }
    }
    // Check if we should buy (no position, within trading hours, and past cooldown)
    else if (position == 0 && isWithinTradingHours(tickTimestamp)) {
        // Check cooldown
        int ticksSinceTrade = timeStep - lastTradeStep;
        
        // If we just started (first tick), we don't apply cooldown
        bool pastCooldown = (lastTradeStep == -9999) || (ticksSinceTrade >= cooldownPeriodMinutes);
        
        if (pastCooldown) {
            // Calculate how many shares to buy based on position size percentage
            double availableCash = cash * positionSizePercent;
            int qty = static_cast<int>(availableCash / (price * (1 + transactionCostRate)));
            
            if (qty > 0) {
                double cost = qty * price * (1 + transactionCostRate);
                cash -= cost;
                position = qty;
                positionStartTimes[position] = tickTimestamp;
                trades.push_back({timeStep, "LONG", "BUY", price, static_cast<double>(qty)}); // Cast qty to double
                std::cout << "DEBUG: " << timestamp << " - INFO: BUY at " << std::fixed << std::setprecision(2) << price
                          << ", qty: " << qty << ", cost: " << std::fixed << std::setprecision(2) << cost 
                          << ", time: " << tickTimestamp << std::endl;
                
                lastTradeStep = timeStep;
                debugDetailTicks = true;
            }
        } else if (timeStep % 10 == 0 || debugDetailTicks) {
            std::cout << "DEBUG: " << timestamp << " - Still in cooldown period. Ticks since last trade: " << ticksSinceTrade << std::endl;
        }
    }

    lastPrice = price;
    
    if (debugDetailTicks && (trades.size() > 0) && (trades.back().timeStep <= timeStep) && (trades.back().timeStep + 5 < timeStep)) {
        debugDetailTicks = false;
    }
}

}
