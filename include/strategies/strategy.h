#pragma once
#include "strategies/base_types.h"
#include <functional>
#include <memory>
#include <string>
#include <unordered_map>

namespace trading {

// Forward declaration
class Strategy;

// Strategy factory function type
using StrategyFactory = std::function<std::unique_ptr<Strategy>()>;

// Parameter definition for strategy configuration
struct StrategyParam {
    std::string name;
    std::string type;  // "number", "boolean", etc.
    std::string description;
    std::string defaultValue;
    std::vector<std::string> options; // For enum types
};

// Strategy metadata structure
struct StrategyInfo {
    std::string id;           // Unique identifier for the strategy
    std::string name;         // Display name
    std::string description;  // Detailed description
    std::vector<StrategyParam> parameters; // Configuration parameters
    StrategyFactory factory;  // Factory function to create the strategy
};

class Strategy {
public:
    virtual ~Strategy() = default;
    
    // Core strategy methods
    virtual SimulationResult execute(const MarketData& data, double initialCash) = 0;
    
    // Static registration helper
    static bool registerStrategy(const StrategyInfo& info);
    
    // Static method to get all registered strategies
    static const std::unordered_map<std::string, StrategyInfo>& getRegisteredStrategies();

protected:
    virtual void onTick(double price, int timeStep, const std::string& tickTimestamp = "") = 0;
    
private:
    // Registry of all available strategies
    static std::unordered_map<std::string, StrategyInfo>& getStrategyRegistry();
};

// Helper macro for easy strategy registration
#define REGISTER_STRATEGY(id, name, description, factoryFunc, ...) \
    namespace { \
        static bool registered_##id = Strategy::registerStrategy({ \
            id, name, description, __VA_ARGS__, factoryFunc \
        }); \
    }

}
