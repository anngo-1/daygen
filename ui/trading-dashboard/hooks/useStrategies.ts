import { useState, useEffect } from 'react';
import axios from 'axios';

// Parameter definition interface matching backend
export interface StrategyParameter {
  name: string;
  type: string;
  description: string;
  defaultValue: string;
  options?: string[];
}

// Strategy information interface matching backend response 
export interface StrategyInfo {
  id: string;
  name: string;
  description: string;
  parameters: StrategyParameter[];
}

export function useStrategies() {
  const [strategies, setStrategies] = useState<StrategyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        setLoading(true);
        const response = await axios.get<StrategyInfo[]>('/api/strategies');
        setStrategies(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch strategies:', err);
        setError('Failed to load trading strategies');
      } finally {
        setLoading(false);
      }
    };

    fetchStrategies();
  }, []);

  return { strategies, loading, error };
}
