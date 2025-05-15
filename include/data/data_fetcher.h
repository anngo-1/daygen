#pragma once

#include <string>
#include "../../nlohmann_json.hpp"
#include "strategies/base_types.h"

using json = nlohmann::json;

namespace trading {

class DataFetcher {
public:
    DataFetcher();
    
    json fetchDailyDataFull(const std::string& symbol, const std::string& date);
    json fetchIntradayData(const std::string& symbol, const std::string& interval, const std::string& date);
    
    MarketData parseIntradayData(const json& data,
                                const std::string& interval,
                                const std::string& date);
};

}
