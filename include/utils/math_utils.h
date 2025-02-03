#ifndef MATH_UTILS_H
#define MATH_UTILS_H

#include <vector>
#include <cmath>
#include <iostream>
#include <limits> 
#include <stdexcept> 

namespace trading {

template <typename T = double>
class TrendEstimator {
private:
    T trend;
    T alpha;

public:
    TrendEstimator(T initTrend, T alpha) : trend(initTrend), alpha(alpha) {
        if (alpha <= 0 || alpha > 1.0) {
            throw std::invalid_argument("TrendEstimator: alpha must be in the range (0, 1]");
        }
    }

    void update(T price) {
        trend = alpha * price + (1 - alpha) * trend;
    }

    T getTrend() const {
        return trend;
    }

    T getAlpha() const {
        return alpha;
    }
};

template <typename T = double>
class GARCHEstimator {
private:
    T sigma;
    T prevSigma2;
    T prevR2;
    T omega;
    T alpha;
    T beta;

public:
    GARCHEstimator(T initSigma, T omega, T alpha, T beta)
        : sigma(initSigma)
        , prevSigma2(initSigma * initSigma)
        , prevR2(0.0) 
        , omega(omega)
        , alpha(alpha)
        , beta(beta)
    {
        if (initSigma <= 0) {
            throw std::invalid_argument("GARCHEstimator: initSigma must be positive");
        }
        if (omega <= 0 || alpha <= 0 || beta <= 0) {
            throw std::invalid_argument("GARCHEstimator: omega, alpha, and beta must be positive");
        }
        if (alpha + beta >= 1) {
            std::cerr << "Warning: GARCH parameters alpha + beta >= 1, may lead to non-stationarity" << std::endl; 
        }
    }

    void update(T r) {
        if (std::isnan(r) || std::isinf(r)) {
            throw std::invalid_argument("GARCHEstimator: Invalid return value (NaN or Inf)");
        }

        T sigma2 = omega + alpha * prevR2 + beta * prevSigma2;

        if (sigma2 <= 0) {
            std::cerr << "Warning: GARCH variance became non-positive (" << sigma2 << "), clamping to a small positive value." << std::endl;
            sigma2 = std::numeric_limits<T>::epsilon(); 
        }

        prevSigma2 = sigma2;
        prevR2 = r * r;
        sigma = std::sqrt(sigma2);
    }

    T getSigma() const {
        return sigma;
    }

    T getOmega() const {
        return omega;
    }

    T getAlpha() const {
        return alpha;
    }

    T getBeta() const {
        return beta;
    }
};

template <typename T = double>
std::vector<T> calculateEMA(const std::vector<T>& prices, int period) {
    if (prices.empty()) {
        return {}; 
    }
    if (period <= 0) {
        throw std::invalid_argument("calculateEMA: period must be positive");
    }
    if (period > static_cast<int>(prices.size())) {
        std::cerr << "Warning: EMA period is longer than the price series, EMA may be unstable initially." << std::endl;
    }

    std::vector<T> ema(prices.size());
    T alpha = 2.0 / (period + 1);

    ema[0] = prices[0];

    for (size_t i = 1; i < prices.size(); ++i) {
        ema[i] = alpha * prices[i] + (1 - alpha) * ema[i - 1];
    }
    return ema;
}

template <typename T = double>
std::vector<T> calculateMACD(const std::vector<T>& prices, int fastPeriod, int slowPeriod) {
    if (prices.empty()) {
        return {}; 
    }
    if (fastPeriod <= 0 || slowPeriod <= 0) {
        throw std::invalid_argument("calculateMACD: fastPeriod and slowPeriod must be positive");
    }
    if (fastPeriod >= slowPeriod) {
        throw std::invalid_argument("calculateMACD: fastPeriod must be smaller than slowPeriod");
    }

    std::vector<T> emaFast = calculateEMA<T>(prices, fastPeriod);
    std::vector<T> emaSlow = calculateEMA<T>(prices, slowPeriod);
    std::vector<T> macdLine(prices.size());

    for (size_t i = 0; i < prices.size(); ++i) {
        macdLine[i] = emaFast[i] - emaSlow[i];
    }
    return macdLine;
}

template <typename T = double>
std::vector<T> calculateSignalLine(const std::vector<T>& macdLine, int signalPeriod) {
    if (macdLine.empty()) {
        return {}; 
    }
    if (signalPeriod <= 0) {
        throw std::invalid_argument("calculateSignalLine: signalPeriod must be positive");
    }
    return calculateEMA<T>(macdLine, signalPeriod);
}

} 

#endif 