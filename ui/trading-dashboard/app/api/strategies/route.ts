import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    const response = await axios.get(`${process.env.TRADING_SERVER_URL}/strategies`, {
      headers: process.env.TRADING_API_TOKEN
        ? { Authorization: `Bearer ${process.env.TRADING_API_TOKEN}` }
        : undefined,
    });
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching strategies:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch strategies' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
