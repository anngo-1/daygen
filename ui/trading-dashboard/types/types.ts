export interface Trade {
    profit_loss: number;
    time_step: number;
    side: string;
    price: number;
    quantity: number;
    timestamp?: string;
    portfolio_value_after?: number;
  }

  export interface HistoricalDataPoint {
    timestamp: string;
    price: number;
    indicators: {
      macd: number;
      signal: number;
      portfolio_value: number;
      position: number;
      cash: number;
      trend: number;
      volatility: number;
    };
    trade?: {
      side: string;
      quantity: number;
      price: number;
    };
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