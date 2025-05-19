#include "strategies/macd_strategy.h"
#include <cmath>
#include <iostream>
#include <vector>
#include <limits>
#include <stdexcept>
#include <iomanip>
#include <chrono>

namespace trading {

/**
 * @brief Constructor for the MACD (Moving Average Convergence Divergence) strategy.
 *
 * @param volEstimate Initial volatility estimate for the GARCH model
 * @param trendAlpha Learning rate for the trend estimator (EMA alpha)
 * @param garchOmega Weight parameter for long-term volatility in the GARCH model
 * @param garchAlpha Weight parameter for recent returns in the GARCH model
 * @param garchBeta Weight parameter for previous volatility in the GARCH model
 * @param macdFastPeriod Period for the fast EMA in the MACD calculation
 * @param macdSlowPeriod Period for the slow EMA in the MACD calculation
 * @param signalPeriod Period for the signal line calculation (EMA of the MACD line)
 * @param tradeThresholdFactor Factor used to determine trade thresholds based on volatility
 * @param stopLossPercentage Maximum loss percentage before exiting position
 * @param transactionCost Transaction cost as a percentage of trade value
 */
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

/**
 * @brief Main execution method for the MACD strategy.
 *
 * Processes market data tick by tick, executing the strategy logic:
 * 1. Initialize portfolio, estimators, and performance tracking
 * 2. Process each price point sequentially
 * 3. Calculate MACD, signal line, trend, and volatility estimates
 * 4. Execute trades based on MACD crossovers with trend and volatility filters
 * 5. Apply stop-loss protection for risk management
 * 6. Liquidate any remaining positions at the end of the session
 * 7. Return performance metrics and trade history
 *
 * @param data Market data containing prices and timestamps
 * @param initialCash Starting capital for the simulation
 * @return SimulationResult object with performance metrics and trade history
 */
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

/**
 * @brief Processes each price tick and executes strategy logic.
 *
 * This is the core method implementing the strategy's decision-making process:
 * 1. Updates estimators with current price data
 * 2. Calculates MACD line and signal line values
 * 3. Updates GARCH volatility estimates
 * 4. Determines buy/sell thresholds based on trend and volatility
 * 5. Executes buy signals on MACD > Signal with price confirmation
 * 6. Executes sell signals on MACD < Signal or volatility-adjusted price targets
 * 7. Applies stop-loss for risk management
 * 8. Records performance metrics and trade details
 *
 * @param price Current price at this tick
 * @param timeStep Current time step index
 * @param tickTimestamp Timestamp string for this tick
 */
void MACDStrategy::onTick(double price, int timeStep, const std::string& tickTimestamp) {
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

    // MACD crossover buy signal (for entering long position)
    bool buySignal = (currentMACD > currentSignal);
    if (timeStep % 10 == 0 || debugDetailTicks) {
        std::cout << "  DEBUG: " << timestamp << " - BUY Signal Check - MACD > Signal: (" << std::fixed << std::setprecision(6) << currentMACD << " > " << std::fixed << std::setprecision(6) << currentSignal << ") - " << (buySignal ? "TRUE" : "FALSE") << std::endl;
    }
    if (buySignal && position == 0) { // Only enter long if not currently in a position
        double qty = cash / price; // Buy with all available cash
        double cost = qty * price * (1 + transactionCostRate);
        if (cash >= cost) {
            cash -= cost;
            trades.push_back({timeStep, "LONG", "BUY", price, qty});
            position += qty;
            entryPrice = price;
            std::cout << "DEBUG: " << timestamp << " - INFO: BUY (LONG) at " << std::fixed << std::setprecision(2) << price << ", qty: " << qty << ", cost: " << std::fixed << std::setprecision(2) << cost << ", new cash: " << std::fixed << std::setprecision(2) << cash << std::endl; // Log BUY info
            debugDetailTicks = true;
        } else {
            std::cout << "WARNING: Not enough cash to BUY (LONG) at " << std::fixed << std::setprecision(2) << price << ", qty: " << qty << ", cost: " << std::fixed << std::setprecision(2) << cost << ". Current cash: " << std::fixed << std::setprecision(2) << cash << std::endl;
        }
    }

    // MACD crossover sell signal (for exiting long position)
    bool sellSignal = (currentMACD < currentSignal);
     if (timeStep % 10 == 0 || debugDetailTicks) {
        std::cout << "  DEBUG: " << timestamp << " - SELL Signal Check - MACD < Signal: (" << std::fixed << std::setprecision(6) << currentMACD << " < " << std::fixed << std::setprecision(6) << currentSignal << ") - " << (sellSignal ? "TRUE" : "FALSE") << std::endl;
    }
    if (sellSignal && position > 0) { // Only exit long if currently in a long position
        double proceeds = position * price * (1 - transactionCostRate);
        cash += proceeds;
        trades.push_back({timeStep, "EXIT_LONG", "SELL", price, position});
        std::cout << "DEBUG: " << timestamp << " - INFO: SELL (EXIT LONG) at " << std::fixed << std::setprecision(2) << price << ", qty: " << position << ", proceeds: " << std::fixed << std::setprecision(2) << proceeds << ", new cash: " << std::fixed << std::setprecision(2) << cash << std::endl; // Log SELL info
        position = 0;
        entryPrice = 0.0;
        debugDetailTicks = true;
    }

    // MACD crossover sell signal (for entering short position)
    bool shortSignal = (currentMACD < currentSignal);
    if (timeStep % 10 == 0 || debugDetailTicks) {
        std::cout << "  DEBUG: " << timestamp << " - SHORT Signal Check - MACD < Signal: (" << std::fixed << std::setprecision(6) << currentMACD << " < " << std::fixed << std::setprecision(6) << currentSignal << ") - " << (shortSignal ? "TRUE" : "FALSE") << std::endl;
    }
    if (shortSignal && position == 0) { // Only enter short if not currently in a position
        double qty = cash / price; // Short with a quantity equivalent to available cash
        double cost = qty * price * (1 + transactionCostRate); // Cost is for borrowing/transaction
         if (cash >= cost) { // Ensure enough cash for transaction cost
            cash -= cost;
            trades.push_back({timeStep, "SHORT", "SELL", price, qty});
            position -= qty; // Negative position for short
            entryPrice = price;
            std::cout << "DEBUG: " << timestamp << " - INFO: SELL (SHORT) at " << std::fixed << std::setprecision(2) << price << ", qty: " << qty << ", cost: " << std::fixed << std::setprecision(2) << cost << ", new cash: " << std::fixed << std::setprecision(2) << cash << std::endl; // Log SHORT info
            debugDetailTicks = true;
        } else {
            std::cout << "WARNING: Not enough cash for transaction cost to SELL (SHORT) at " << std::fixed << std::setprecision(2) << price << ", qty: " << qty << ", cost: " << std::fixed << std::setprecision(2) << cost << ". Current cash: " << std::fixed << std::setprecision(2) << cash << std::endl;
        }
    }

    // MACD crossover buy signal (for exiting short position)
    bool exitShortSignal = (currentMACD > currentSignal);
    if (timeStep % 10 == 0 || debugDetailTicks) {
        std::cout << "  DEBUG: " << timestamp << " - EXIT SHORT Signal Check - MACD > Signal: (" << std::fixed << std::setprecision(6) << currentMACD << " > " << std::fixed << std::setprecision(6) << currentSignal << ") - " << (exitShortSignal ? "TRUE" : "FALSE") << std::endl;
    }
    if (exitShortSignal && position < 0) { // Only exit short if currently in a short position
        double proceeds = std::abs(position) * (entryPrice - price) * (1 - transactionCostRate); // Profit/Loss on short position
        cash += proceeds; // Add profit/loss to cash
        trades.push_back({timeStep, "EXIT_SHORT", "BUY", price, std::abs(position)});
        std::cout << "DEBUG: " << timestamp << " - INFO: BUY (EXIT SHORT) at " << std::fixed << std::setprecision(2) << price << ", qty: " << std::abs(position) << ", proceeds: " << std::fixed << std::setprecision(2) << proceeds << ", new cash: " << std::fixed << std::setprecision(2) << cash << std::endl; // Log EXIT SHORT info
        position = 0;
        entryPrice = 0.0;
        debugDetailTicks = true;
    }


    // stop loss check
    if (position != 0 && entryPrice > 0) {
        bool stopLossCondition = false;
        std::string tradeType = "";
        if (position > 0) { // Long position stop loss
            stopLossCondition = (price < entryPrice * (1 - stopLossPct));
            tradeType = "SELL (Stop Loss Long)";
        } else { // Short position stop loss
            stopLossCondition = (price > entryPrice * (1 + stopLossPct));
            tradeType = "BUY (Stop Loss Short)";
        }

         if (timeStep % 10 == 0 || debugDetailTicks) {
            std::cout << "  DEBUG: " << timestamp << " - STOP LOSS Conditions Check - " << tradeType << ": " << (stopLossCondition ? "TRUE" : "FALSE") << std::endl;
        }
        if (stopLossCondition) {
            double quantity = std::abs(position);
            double proceeds = 0.0;
            if (position > 0) { // Exiting long stop loss
                 proceeds = quantity * price * (1 - transactionCostRate);
                 cash += proceeds;
            } else { // Exiting short stop loss
                 proceeds = quantity * (entryPrice - price) * (1 - transactionCostRate);
                 cash += proceeds;
            }

            trades.push_back({timeStep, (position > 0 ? "EXIT_LONG" : "EXIT_SHORT"), (position > 0 ? "SELL" : "BUY"), price, quantity});
            std::cout << "DEBUG: " << timestamp << " - INFO: STOP LOSS triggered (" << tradeType << ") at " << std::fixed << std::setprecision(2) << price << ", qty: " << quantity << ", proceeds: " << std::fixed << std::setprecision(2) << proceeds << ", new cash: " << std::fixed << std::setprecision(2) << cash << std::endl; // Log STOP LOSS info
            position = 0;
            entryPrice = 0.0;
            debugDetailTicks = true;
        }
    }


    if (debugDetailTicks && (trades.size() > 0) && (trades.back().timeStep <= timeStep) && (trades.back().timeStep + 5 < timeStep)) {
        debugDetailTicks = false;
    }
     if (timeStep % 10 == 0 || debugDetailTicks) {
        std::cout << "DEBUG: " << timestamp << " - TICK END - Tick " << timeStep <<  " - Position: " << position <<  " - Cash: " << std::fixed << std::setprecision(2) << cash << " - Portfolio Value: " << std::fixed << std::setprecision(2) << cash + (position * price) << std::endl; // Debug log at tick end
    }
}

/**
 * @brief Gets the current MACD value.
 *
 * @return The current MACD value (difference between fast and slow EMAs)
 */
double MACDStrategy::getCurrentMACD() const {
    return currentMACD;
}

/**
 * @brief Gets the current signal line value.
 *
 * @return The current signal line value (EMA of the MACD)
 */
double MACDStrategy::getCurrentSignal() const {
    return currentSignal;
}

}
