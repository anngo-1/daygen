import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  try {
    const response = await axios.get('http://localhost:18080/strategies');
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
