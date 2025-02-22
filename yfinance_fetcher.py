import yfinance as yf
import sys
import json
from datetime import datetime, timedelta
import pandas as pd
import pytz

def fetch_yfinance_data(symbol, interval, date):
    try:
        target_date = datetime.strptime(date, '%Y-%m-%d')
        
        # set the time window to cover full trading day
        start_date = target_date
        end_date = target_date + timedelta(days=1)
        
       
        data = yf.download(
            tickers=symbol,
            interval=interval,
            start=start_date,
            end=end_date,
            progress=False,
            auto_adjust=True
        )
        
        if data.empty:
            return {
                "error": f"No data found for symbol: {symbol}, date: {date}, interval: {interval}"
            }
            
        formatted_data = []
        for index, row in data.iterrows():
            # convert UTC timestamp to Eastern Time
            est_time = index.tz_convert('America/New_York')
            
            formatted_data.append({
                "timestamp": est_time.strftime('%Y-%m-%d %H:%M:%S'),
                "open": float(row['Open'].iloc[0]) if isinstance(row['Open'], pd.Series) else float(row['Open']),
                "high": float(row['High'].iloc[0]) if isinstance(row['High'], pd.Series) else float(row['High']),
                "low": float(row['Low'].iloc[0]) if isinstance(row['Low'], pd.Series) else float(row['Low']),
                "close": float(row['Close'].iloc[0]) if isinstance(row['Close'], pd.Series) else float(row['Close']),
                "volume": int(row['Volume'].iloc[0]) if isinstance(row['Volume'], pd.Series) else int(row['Volume'])
            })
            
        return {"data": formatted_data}
        
    except ValueError as ve:
        return {"error": f"Invalid date format. Please use YYYY-MM-DD format: {str(ve)}"}
    except Exception as e:
        return {"error": str(e)}

def main():
    if len(sys.argv) != 4:
        print("Usage: python yfinance_fetcher.py <symbol> <interval> <date>")
        print("Example: python yfinance_fetcher.py AAPL 1d 2024-02-01")
        print("Intervals: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d")
        print("Note: Intraday data (intervals < 1d) is only available for the last 60 days")
        sys.exit(1)

    symbol = sys.argv[1].upper()
    interval = sys.argv[2]
    date = sys.argv[3]

    # validate interval
    valid_intervals = ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d']
    if interval not in valid_intervals:
        print(json.dumps({"error": f"Invalid interval. Must be one of: {', '.join(valid_intervals)}"}))
        sys.exit(1)

    result = fetch_yfinance_data(symbol, interval, date)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()