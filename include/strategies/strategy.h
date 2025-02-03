// include/strategies/strategy.h
#pragma once
#include "strategies/base_types.h" // Corrected include path

namespace trading {

class Strategy {
public:
    virtual ~Strategy() = default;
    virtual SimulationResult execute(const MarketData& data,
                                   double initialCash) = 0;
protected:
    virtual void onTick(double price, int timeStep, const std::string& tickTimestamp = "") = 0; // ADDED tickTimestamp with default value
};

}