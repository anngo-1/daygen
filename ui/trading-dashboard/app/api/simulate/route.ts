import { NextRequest } from 'next/server';

interface SimulationParams {
  symbol: string | null;
  date: string | null;
  interval: string | null;
  strategy: string | null;
  initial_capital: string | null;
}

const TRADING_SERVER_URL = process.env.TRADING_SERVER_URL || 'http://localhost:18080';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const params: SimulationParams = {
    symbol: searchParams.get('symbol'),
    date: searchParams.get('date'),
    interval: searchParams.get('interval'),
    strategy: searchParams.get('strategy'),
    initial_capital: searchParams.get('initial_capital'),
  };

  if (!params.symbol || !params.date || !params.interval) {
    return Response.json(
      { error: 'Missing required parameters: symbol, date, and interval are required' },
      { status: 400 }
    );
  }

  try {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([value]) => value !== null)
    ) as Record<string, string>;

    const response = await fetch(
      `${TRADING_SERVER_URL}/simulate?${new URLSearchParams(cleanParams)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Error:', error);

    if (error instanceof Error && 'code' in error && error.code === 'ECONNREFUSED') {
      return Response.json(
        { error: 'Trading server is not running. Please start the server first.' },
        { status: 503 }
      );
    }

    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch data from trading server' },
      { status: 500 }
    );
  }
}
