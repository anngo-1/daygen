#include "http/server.h"
#include "data/data_fetcher.h"
#include "strategies/macd_strategy.h"
#include <algorithm>
#include <iostream> 

namespace trading {

TradingServer::TradingServer() {
    server.Get("/simulate", [this](const httplib::Request& req, httplib::Response& res) {
        return handleSimulate(req, res);
    });
}

void TradingServer::run() {
    std::cout << "Starting trading server on port 18080...\n";
    server.listen("0.0.0.0", 18080);
}

std::unique_ptr<Strategy> TradingServer::createStrategy(const std::string& name) {
    if (name == "macd" || name.empty()) {
        return std::make_unique<MACDStrategy>(
            0.02,  // volEstimate
            0.3,   // trendAlpha
            1e-6,  // garchOmega
            0.1,   // garchAlpha
            0.85,  // garchBeta
            12,    // macdFastPeriod
            26,    // macdSlowPeriod
            9,     // signalPeriod
            0.05,  // tradeThresholdFactor
            0.02,  // stopLossPercentage (e.g., 2%)
            0.001  // transactionCost (e.g., 0.1%)
        );
    }
    throw std::runtime_error("Unknown strategy: " + name);
}

std::string TradingServer::handleSimulate(const httplib::Request& req, httplib::Response& res) {
    try {
        std::cout << "\nDEBUG: Received /simulate request with parameters:\n"; // Debug print start
        for (const auto& param : req.params) { // REMOVED THE PARENTHESES HERE: req.params (not req.params())
            std::cout << "DEBUG:   " << param.first << " = " << param.second << "\n"; // Print each parameter
        }
        std::cout << "DEBUG: End of request parameters.\n"; // Debug print end


        std::string symbol = req.has_param("symbol") ? req.get_param_value("symbol") : "AAPL";
        std::string interval = req.has_param("interval") ? req.get_param_value("interval") : "5min";
        std::string strategyName = req.has_param("strategy") ? req.get_param_value("strategy") : "macd";
        std::string dateStr = req.has_param("date") ? req.get_param_value("date") : "";
        double initialCash = 100000.0; // Default value

        if (req.has_param("initial_capital")) {
            try {
                initialCash = std::stod(req.get_param_value("initial_capital"));
            } catch (const std::invalid_argument& e) {
                res.status = 400;
                res.set_content("Invalid 'initial_capital' parameter. Must be a number.", "text/plain");
                return "";
            }
        }


        if (dateStr.empty()) {
            res.status = 400;
            res.set_content("Please provide a 'date' parameter in YYYY-MM-DD format.", "text/plain");
            return "";
        }

        DataFetcher fetcher;
        json intradayData = fetcher.fetchIntradayData(symbol, interval, dateStr);
        auto marketData = fetcher.parseIntradayData(intradayData, interval, dateStr);

        if (marketData.prices.empty()) {
            res.status = 404;
            res.set_content("No data found for the specified date.", "text/plain");
            return "";
        }


        auto strategy = createStrategy(strategyName);
        auto result = strategy->execute(marketData, initialCash); // Pass initialCash


        json response;
        response["symbol"] = symbol;
        response["strategy"] = strategyName;
        response["interval"] = interval;
        response["date"] = dateStr;
        response["initial_capital"] = initialCash;
        response["final_portfolio_value"] = result.finalPortfolioValue;
        response["profit_loss"] = result.profitLoss;
        response["num_trades"] = result.trades.size();


        response["historical_data"] = json::array();

        for (size_t i = 0; i < marketData.timestamps.size(); i++) {
            json timestepData;
            timestepData["timestamp"] = marketData.timestamps[i];
            timestepData["price"] = marketData.prices[i];

            timestepData["indicators"] = {
                {"macd", result.historical[i].macd},
                {"signal", result.historical[i].signal},
                {"portfolio_value", result.historical[i].portfolioValue},
                {"position", result.historical[i].position},
                {"cash", result.historical[i].cash}
            };

            auto trade_it = std::find_if(result.trades.begin(), result.trades.end(),
                [i](const Trade& trade) { return trade.timeStep == static_cast<int>(i); });

            if (trade_it != result.trades.end()) {
                timestepData["trade"] = {
                    {"side", trade_it->side},
                    {"quantity", trade_it->quantity},
                    {"price", trade_it->price}
                };
            }

            response["historical_data"].push_back(timestepData);
        }


        response["trades"] = json::array();
        for (const auto& trade : result.trades) {
            response["trades"].push_back({
                {"time_step", trade.timeStep},
                {"side", trade.side},
                {"price", trade.price},
                {"quantity", trade.quantity}
            });
        }

        res.set_content(response.dump(), "application/json");
        return "";

    } catch (const std::exception& ex) {
        res.status = 500;
        res.set_content(ex.what(), "text/plain");
        return "";
    }
}

}