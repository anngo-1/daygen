#include "data/data_fetcher.h"
#include <cstdio>
#include <memory>
#include <stdexcept>
#include <string>
#include <array>
#include <iostream>
#include <algorithm>
#include <chrono>
#include <iomanip>
#include <sstream>

namespace trading {

namespace {
    std::string execPythonScript(const std::string& symbol, const std::string& interval, const std::string& date) {
        std::string cmd = "python yfinance_fetcher.py " + symbol + " " + interval + " " + date;
        std::array<char, 128> buffer;
        std::string result;
        FILE* pipe = popen(cmd.c_str(), "r");
        
        if (!pipe) {
            throw std::runtime_error("popen() failed!");
        }
        
        while (fgets(buffer.data(), buffer.size(), pipe) != nullptr) {
            result += buffer.data();
        }
        
        pclose(pipe);
        return result;
    }
}

DataFetcher::DataFetcher() {}

json DataFetcher::fetchDailyDataFull(const std::string& symbol, const std::string& date) {
    try {
        std::string result = execPythonScript(symbol, "1d", date);
        return json::parse(result);
    } catch (const std::exception& e) {
        throw std::runtime_error("Failed to fetch daily data: " + std::string(e.what()));
    }
}

json DataFetcher::fetchIntradayData(const std::string& symbol, const std::string& interval, const std::string& date) {
    try {
        std::string result = execPythonScript(symbol, interval, date);
        return json::parse(result);
    } catch (const std::exception& e) {
        throw std::runtime_error("Failed to fetch intraday data: " + std::string(e.what()));
    }
}

MarketData DataFetcher::parseIntradayData(const json& data,
                                         const std::string& /* interval */,
                                         const std::string& date) {
    MarketData marketData;
    
    if (!data.contains("data")) {
        if (data.contains("error")) {
            throw std::runtime_error(data["error"].get<std::string>());
        }
        throw std::runtime_error("Invalid data format: missing data field");
    }
    
    const auto& timeSeriesData = data["data"];
    
    for (const auto& entry : timeSeriesData) {
        std::string timestampStr = entry["timestamp"];
        if (timestampStr.substr(0, 10) == date) {
            marketData.timestamps.push_back(timestampStr);
            marketData.prices.push_back(entry["close"].get<double>());
        }
    }

    
    return marketData;
}

} 