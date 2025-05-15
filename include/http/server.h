#pragma once
#include "../../httplib.h"
#include <memory>
#include <string>
#include "strategies/strategy.h"

namespace trading {

class TradingServer {
public:
    TradingServer();
    void run();

private:
    std::string handleSimulate(const httplib::Request& req, 
                              httplib::Response& res);
    std::string handleStrategies(const httplib::Request& req,
                               httplib::Response& res);
    
    httplib::Server server;
};

} // namespace trading
