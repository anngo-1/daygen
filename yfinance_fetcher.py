import yfinance as yf
import sys
import json
from datetime import datetime, timedelta
import pandas as pd
import pytz

def fetch_yfinance_data(symbol, interval, date_str):
    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d')
        eastern = pytz.timezone('America/New_York')

        if interval == '1d':
            start_date = target_date
            end_date = target_date + timedelta(days=1)
        else:
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
                "error": f"No data found for symbol: {symbol}, date: {date_str}, interval: {interval}"
            }

        formatted_data = []
        for index_ts, row in data.iterrows():
            timestamp_to_process = index_ts

            if timestamp_to_process.tzinfo is None:
                if interval == '1d':
                    dt_naive_for_day = datetime(timestamp_to_process.year, timestamp_to_process.month, timestamp_to_process.day)
                    final_est_time = eastern.localize(dt_naive_for_day)
                else:
                    final_est_time = timestamp_to_process.replace(tzinfo=pytz.utc).astimezone(eastern)
            else:
                final_est_time = timestamp_to_process.astimezone(eastern)

            if final_est_time.date() != target_date.date() and interval != '1d':
                continue

            formatted_data.append({
                "timestamp": final_est_time.strftime('%Y-%m-%d %H:%M:%S'),
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close']),
                "volume": int(row['Volume'])
            })

        if not formatted_data:
             return {
                "error": f"No data found for symbol: {symbol}, date: {date_str} (ET), interval: {interval} after filtering"
            }

        return {"data": formatted_data}

    except ValueError as ve:
        if 'does not match format' in str(ve) or 'unconverted data remains' in str(ve) :
             return {"error": f"Invalid date format. Please use YYYY-MM-DD format. Detail: {str(ve)}"}
        return {"error": f"ValueError encountered: {str(ve)}"}
    except Exception as e:
        return {"error": f"An unexpected error occurred: {str(e)}"}

def main():
    if len(sys.argv) != 4:
        print(json.dumps({
            "error": "Usage: python yfinance_fetcher.py <symbol> <interval> <date>. "
                     "Example: python yfinance_fetcher.py AAPL 1d 2024-02-01. "
                     "Intervals: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d. "
                     "Note: Intraday data (intervals < 1d) is only available for the last 60 days."
        }))
        sys.exit(1)

    symbol = sys.argv[1].upper()
    interval = sys.argv[2]
    date_str = sys.argv[3]

    valid_intervals = ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d']
    if interval not in valid_intervals:
        print(json.dumps({"error": f"Invalid interval. Must be one of: {', '.join(valid_intervals)}"}))
        sys.exit(1)

    result = fetch_yfinance_data(symbol, interval, date_str)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()