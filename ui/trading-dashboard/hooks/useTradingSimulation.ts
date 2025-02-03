import { useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { TradingData, SimulationParams } from '../types/types';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { AxiosError } from 'axios';
dayjs.extend(isSameOrBefore);

export function useTradingSimulation() {
    const [data, setData] = useState<TradingData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runSimulation = async (params: SimulationParams) => {
        setError(null);
        setLoading(true);
        setData(null);
        console.log("useTradingSimulation: runSimulation START - Clearing error, setting loading to true.");

        let dates: string[] = [];

        if (params.startDate && params.endDate) {
            let currentDate = dayjs(params.startDate);
            const endDate = dayjs(params.endDate);

            while (currentDate.isSameOrBefore(endDate)) {
                dates.push(currentDate.format('YYYY-MM-DD'));
                currentDate = currentDate.add(1, 'day');
            }
        } else {
            let currentDate = dayjs(params.date);
            for (let i = 0; i < (params.days || 1); i++) {
                dates.push(currentDate.format('YYYY-MM-DD'));
                currentDate = currentDate.subtract(1, 'day');
            }
            dates.reverse();
        }

        let combinedData: TradingData | null = null;
        let runningCapital = params.initial_capital || 100000;
        let isTodayIncluded = false;

        isTodayIncluded = dates.some(date => dayjs(date).isSame(dayjs(), 'day'));


        for (const date of dates) {
            try {
                const requestUrl = `/api/simulate?${new URLSearchParams({
                    symbol: params.symbol,
                    date: date,
                    interval: params.interval,
                    strategy: params.strategy,
                    days: params.days?.toString() || '',
                    startDate: params.startDate || '',
                    endDate: params.endDate || '',
                    initial_capital: runningCapital.toString(),
                }).toString()}`;

                console.log("Sending API Request:", requestUrl);

                const response = await axios.get<TradingData>('/api/simulate', {
                    params: {
                        symbol: params.symbol,
                        date: date,
                        interval: params.interval,
                        strategy: params.strategy,
                        days: params.days,
                        startDate: params.startDate,
                        endDate: params.endDate,
                        initial_capital: runningCapital,
                    }
                });

                console.log("API Response Data:", response.data);


                if (!combinedData) {
                    combinedData = response.data;
                } else {
                    const dayOffset = combinedData.historical_data.length;

                    const adjustedHistorical = response.data.historical_data.map(point => ({
                        ...point,
                        timestamp: point.timestamp
                    }));

                    const adjustedTrades = response.data.trades.map(trade => ({
                        ...trade,
                        time_step: trade.time_step + dayOffset
                    }));

                    combinedData.historical_data.push(...adjustedHistorical);
                    combinedData.trades.push(...adjustedTrades);
                    combinedData.profit_loss += response.data.profit_loss;
                    combinedData.final_portfolio_value = response.data.final_portfolio_value;
                }
                runningCapital = combinedData ? combinedData.final_portfolio_value : runningCapital;


            } catch (err) {
                const axiosError = err as AxiosError;
                const errorMessage = axiosError.response ? `API Error ${axiosError.response.status}` : 'Failed to fetch data';
                console.warn(`Failed to fetch data for ${date}:`, errorMessage);
                continue;
            }
        }

        if (combinedData && combinedData.historical_data?.length > 0) {
            setData(combinedData);
            setError(null);
            console.log("useTradingSimulation: runSimulation SUCCESS - Data fetched, error cleared.");
        } else {
            const errorMessage = 'API Data Fetch Failed';
            console.log("useTradingSimulation: runSimulation - NO DATA, setting GENERIC error:", errorMessage);
            setError(errorMessage); 
        }
        console.log("useTradingSimulation: runSimulation FINALLY - Setting loading to false.");
        setLoading(false); 

    };

    return { data, loading, error, runSimulation };
}