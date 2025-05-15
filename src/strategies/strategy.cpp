#include "strategies/strategy.h"

namespace trading {

/**
 * @brief Retrieves the global strategy registry.
 * 
 * This static method maintains a single registry of all trading strategies
 * throughout the application lifecycle. It follows the singleton pattern to
 * ensure a single source of truth for available strategies.
 * 
 * @return Reference to the global map of strategy IDs to their corresponding info
 */
std::unordered_map<std::string, StrategyInfo>& Strategy::getStrategyRegistry() {
    static std::unordered_map<std::string, StrategyInfo> registry;
    return registry;
}

/**
 * @brief Registers a new trading strategy in the global registry.
 * 
 * This method adds a strategy to the registry if it doesn't already exist.
 * Each strategy is uniquely identified by its ID.
 * 
 * @param info The strategy information containing ID, name, description, and parameters
 * @return true if registration was successful, false if the strategy ID was already registered
 */
bool Strategy::registerStrategy(const StrategyInfo& info) {
    auto& registry = getStrategyRegistry();
    if (registry.find(info.id) != registry.end()) {
        return false; // Already registered
    }
    registry[info.id] = info;
    return true;
}

/**
 * @brief Gets all registered trading strategies.
 * 
 * This method provides read-only access to the complete strategy registry,
 * allowing components to enumerate available strategies, display them in
 * UIs, or select specific strategies by ID.
 * 
 * @return Const reference to the map of all registered strategies
 */
const std::unordered_map<std::string, StrategyInfo>& Strategy::getRegisteredStrategies() {
    return getStrategyRegistry();
}

} // namespace trading
