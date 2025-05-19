export interface Trade {
    time_step: number;
    type: string; // "LONG", "SHORT", "EXIT_LONG", "EXIT_SHORT"
    side: string; // "BUY", "SELL"
    price: number;
    quantity: number;
  }

  export interface HistoricalDataPoint {
    timestamp: string;
    price: number;
    indicators: {
      macd: number;
      signal: number;
      portfolio_value: number;
      position: number; // Use number to represent long (positive) or short (negative) positions
      cash: number;
      trend: number;
      volatility: number;
    };
    trade?: Trade; // Use the updated Trade interface
  }

  export interface TradingData {
    message: TradingData;
    symbol: string;
    strategy: string;
    interval: string;
    date: string;
    initial_capital: number;
    final_portfolio_value: number;
    profit_loss: number;
    historical_data: HistoricalDataPoint[];
    trades: Trade[];
    total_trades: number;
    win_rate?: number;
    average_profit_per_trade?: number;
    max_drawdown?: number;
  }

  export interface SimulationParams {
    symbol: string;
    date: string;
    interval: string;
    strategy: string;
    days?: number;
    startDate?: string;
    endDate?: string;
    initial_capital?: number; 
  }
