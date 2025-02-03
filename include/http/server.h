#pragma once
#include <httplib.h>
#include <memory>
#include <string>
#include "strategies/strategy.h" 
#include "strategies/macd_strategy.h"  

namespace trading {

class TradingServer {
public:
    TradingServer();
    void run();

private:
    std::string handleSimulate(const httplib::Request& req, 
                              httplib::Response& res);
    std::unique_ptr<Strategy> createStrategy(const std::string& name);
    
    httplib::Server server;
};

} // namespace trading