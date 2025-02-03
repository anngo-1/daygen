import React, { useState, useRef, ReactElement, ReactNode, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
  ArcElement,
  BarElement,
  BarController,
  BubbleController,
  DoughnutController,
  LineController,
  PieController,
  PolarAreaController,
  RadarController,
  ScatterController,
  ChartOptions,
  ChartData,
  Chart,
  TooltipItem,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Line } from 'react-chartjs-2';
import { Text, Group, Stack, Tabs, Card, Title as MantineTitle, RingProgress, Grid } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { TradingData, HistoricalDataPoint } from '../types/types';

ChartJS.register(
  annotationPlugin,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  BubbleController,
  DoughnutController,
  LineController,
  PieController,
  PolarAreaController,
  RadarController,
  ScatterController,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

interface TradingChartProps {
  data: TradingData;
}

const chartBaseStyle = {
  background: '#f8f9fa',
  borderRadius: 8,
  padding: 20,
  height: '100%',
  width: '100%',
};

interface StatCardProps {
  title: string;
  value: ReactNode;
  subtitle: string;
  icon: ReactElement;
  color: string;
}

interface TradeAnnotation {
  type: 'point' | 'line';
  xValue?: number;
  yValue?: number;
  mode?: 'vertical';
  scaleID?: string;
  value?: number;
  borderColor: string;
  backgroundColor?: string;
  borderWidth: number;
  pointStyle?: 'circle';
  radius?: number;
  label?: {
    content: string;
    display: boolean;
  };
}


interface EnrichedDataPoint extends HistoricalDataPoint {
  baseline: number;
}

const StatCard = ({ title, value, subtitle, icon, color }: StatCardProps) => (
  <Card withBorder p="md" radius="md" className="h-full" style={{ borderWidth: '2px' }}>
    <Group gap="sm" align="flex-start" wrap="nowrap">
      {icon}
      <div className="min-w-0">
        <Text size="sm" c="dimmed" fw={500} truncate>{title}</Text>
        <Text fw={700} size="lg" truncate>{value}</Text>
        <Text size="xs" c={color} fw={600} truncate>{subtitle}</Text>
      </div>
    </Group>
  </Card>
);

export function TradingChart({ data }: TradingChartProps) {
  const [activeTab, setActiveTab] = useState<string | null>('performance');
  const chartRef = useRef<Chart<'line'> | null>(null);

  const percentageChange = ((data.profit_loss / data.initial_capital) * 100).toFixed(2);
  const isProfit = data.profit_loss >= 0;

  const portfolioValues = data.historical_data.map(d => d.indicators.portfolio_value);
  const priceValues = data.historical_data.map(d => d.price);
  const highestValue = Math.max(...portfolioValues);
  const lowestValue = Math.min(...portfolioValues);
  const highestTime = data.historical_data.find(d => d.indicators.portfolio_value === highestValue)?.timestamp;
  const lowestTime = data.historical_data.find(d => d.indicators.portfolio_value === lowestValue)?.timestamp;

  const enrichedData: EnrichedDataPoint[] = data.historical_data.map(point => ({ ...point, baseline: data.initial_capital }));

  const xAxisTicksCallback = (tickValue: string | number): string => {
    const indexValue = typeof tickValue === 'string' ? parseInt(tickValue, 10) : tickValue;
    return dayjs(enrichedData?.[indexValue]?.timestamp).format('HH:mm') || '';
  };

  const yAxisTicksCallback = (tickValue: string | number): string => {
    return `$${Number(tickValue).toFixed(0)}`;
  };

  const chartOptionsBase: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { left: 10, right: 20, top: 10, bottom: 0 } },
    scales: {
      x: {
        type: 'category',
        ticks: {
          callback: xAxisTicksCallback,
          autoSkipPadding: 50,
          maxRotation: 0,
          minRotation: 0,
        },
        grid: { display: false },
      },
      y: {
        type: 'linear',
        position: 'left',
        ticks: {
          callback: yAxisTicksCallback,
          padding: 10
        },
        grid: { color: '#ced4da' },
      },
    },
    elements: { line: { tension: 0.4, borderWidth: 2 }, point: { radius: 0, hitRadius: 10 } },
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#6c757d',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        titleFont: { weight: 'bold', size: 14 },
        bodyFont: { weight: 'normal', size: 14 },
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            const label = context.dataset.label || '';
            const value = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
            return `${label}: ${value}`;
          },
          title: (tooltipItems: TooltipItem<'line'>[]) =>
            dayjs(tooltipItems[0].label).format('MMM D, YYYY HH:mm:ss'),
          afterLabel: (context: TooltipItem<'line'>) => {
            const dataIndex = context.dataIndex;
            const point = enrichedData[dataIndex];
            if (point.trade) {
              const trade = point.trade;
              return [
                `Trade: ${trade.side === 'BUY' ? 'Buy' : 'Sell'}`,
                `Price: $${trade.price.toFixed(2)}`,
              ];
            }
            return [];
          },
        },
      },
    },
    interaction: {
      mode: 'nearest',
      intersect: true
    },
    hover: {
      mode: 'nearest',
      intersect: true
    }
  };

  const tradeAnnotations: { annotation: { annotations: TradeAnnotation[] } } = {
    annotation: {
      annotations: enrichedData.reduce((annotations: TradeAnnotation[], point, index) => {
        if (point.trade) {
          const isBuy = point.trade.side === 'BUY';
          const yValue = activeTab === 'price' ? point.price : point.indicators.portfolio_value;

          annotations.push({
            type: 'point',
            xValue: index,
            yValue,
            borderColor: isBuy ? 'lime' : 'magenta',
            backgroundColor: isBuy ? 'green' : 'red',
            borderWidth: 0,
            pointStyle: 'circle',
            radius: 5,
          });
          annotations.push({
            type: 'line',
            mode: 'vertical',
            scaleID: 'x',
            value: index,
            borderColor: isBuy ? 'rgba(0, 200, 0, 0.7)' : 'rgba(200, 0, 0, 0.7)',
            borderWidth: 1,
            label: {
              content: point.trade.side === 'BUY' ? 'Buy' : 'Sell',
              display: false,
            },
          });
        }
        return annotations;
      }, [])
    }
  };

  const performanceChartData: ChartData<'line'> = {
    labels: enrichedData.map(d => d.timestamp),
    datasets: [
      {
        label: 'Baseline',
        data: enrichedData.map(d => d.baseline),
        borderColor: '#adb5bd',
        borderDash: [5, 5],
        fill: false,
        pointRadius: enrichedData.map(point => point.trade ? 0 : 0),
      },
      {
        label: 'Portfolio Value',
        data: enrichedData.map(d => d.indicators.portfolio_value),
        borderColor: '#40c057',
        backgroundColor: 'rgba(64, 192, 87, 0.2)',
        fill: 'origin',
        pointRadius: enrichedData.map(point => point.trade ? 0 : 0),
      },
    ],
  };

  const priceChartData: ChartData<'line'> = {
    labels: enrichedData.map(d => d.timestamp),
    datasets: [{
      label: 'Price',
      data: enrichedData.map(d => d.price),
      borderColor: '#228be6',
      fill: false,
      pointRadius: enrichedData.map(point => point.trade ? 0 : 0),
    }],
  };

  const performanceChartOptions: ChartOptions<'line'> = useMemo(() => {
    const baseline = data.initial_capital;
    let maxDeviation = 0;
    portfolioValues.forEach(value => {
      maxDeviation = Math.max(maxDeviation, Math.abs(value - baseline));
    });

    const yAxisMin = baseline - maxDeviation * 1.1; 
    const yAxisMax = baseline + maxDeviation * 1.1;

    return {
      ...chartOptionsBase,
      plugins: { ...chartOptionsBase.plugins, ...tradeAnnotations },
      scales: {
        ...chartOptionsBase.scales!,
        y: {
          ...chartOptionsBase.scales!.y,
          title: { display: true, text: 'Portfolio Value ($)', align: 'end' },
          min: yAxisMin,
          max: yAxisMax,
        },
      },
    };
  }, [data, portfolioValues, tradeAnnotations, chartOptionsBase]);


  const priceChartOptions: ChartOptions<'line'> = useMemo(() => {
    const baseline = enrichedData[0]?.price || 0; // use first price as baseline for price chart, or 0 if no data
    let maxDeviation = 0;
    priceValues.forEach(value => {
      maxDeviation = Math.max(maxDeviation, Math.abs(value - baseline));
    });

    const yAxisMin = baseline === 0 ? 0 : baseline - maxDeviation * 1.1; // adjust min if baseline is 0
    const yAxisMax = baseline + maxDeviation * 1.1;

    return {
      ...chartOptionsBase,
      plugins: { ...chartOptionsBase.plugins, ...tradeAnnotations },
      scales: {
        ...chartOptionsBase.scales!,
        y: {
          ...chartOptionsBase.scales!.y,
          title: { display: true, text: 'Price ($)', align: 'end' },
          min: yAxisMin,
          max: yAxisMax,
        },
      },
    };
  }, [chartOptionsBase, priceValues, tradeAnnotations, enrichedData]);


  return (
    <Stack gap="xl">
      <Card withBorder shadow="md" p="md" radius="md" style={{
        borderWidth: '2px',
        borderColor: isProfit ? 'var(--mantine-color-green-4)' : 'var(--mantine-color-red-4)',
        background: 'linear-gradient(to right, white, var(--mantine-color-gray-0))'
      }}>
        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="lg">
              <div>
                <MantineTitle order={2} size="h3">Trading Performance</MantineTitle>
                <Text c="dimmed" size="sm">Strategy: {data.strategy}</Text>
              </div>

              <Group gap="xs" wrap="nowrap">
                <RingProgress
                  size={80}
                  thickness={8}
                  sections={[{ value: Math.min(Math.abs(Number(percentageChange)), 100), color: isProfit ? 'green' : 'red' }]}
                  label={<Text ta="center" fz="lg" fw={700}>{isProfit ? '▲' : '▼'}</Text>}
                />
                <div>
                  <Text size="xl" fw={700}>
                    {isProfit ? '+' : '-'}${Math.abs(data.profit_loss).toLocaleString()}
                  </Text>
                  <Text size="sm" c={isProfit ? 'green' : 'red'} fw={600}>
                    {percentageChange}% Return
                  </Text>
                </div>
              </Group>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 8 }}>
            <Grid gutter="md">
              <Grid.Col span={{ base: 12, xs: 6, md: 6 }}>
                <StatCard
                  title="Portfolio High"
                  value={`$${highestValue.toLocaleString()}`}
                  subtitle={highestTime ? dayjs(highestTime).format('HH:mm:ss') : ''}
                  icon={<IconTrendingUp size={24} color="var(--mantine-color-green-6)" />}
                  color="green"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, xs: 6, md: 6 }}>
                <StatCard
                  title="Portfolio Low"
                  value={`$${lowestValue.toLocaleString()}`}
                  subtitle={lowestTime ? dayjs(lowestTime).format('HH:mm:ss') : ''}
                  icon={<IconTrendingDown size={24} color="var(--mantine-color-red-6)" />}
                  color="red"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, xs: 6, md: 6 }}>
                <StatCard
                  title="Initial Capital"
                  value={`$${data.initial_capital.toLocaleString()}`}
                  subtitle="Starting Balance"
                  icon={<IconTrendingUp size={24} color="var(--mantine-color-blue-6)" />}
                  color="blue"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, xs: 6, md: 6 }}>
                <StatCard
                  title="Final Value"
                  value={`$${data.final_portfolio_value.toLocaleString()}`}
                  subtitle="Ending Balance"
                  icon={<IconTrendingUp size={24} color="var(--mantine-color-cyan-6)" />}
                  color="cyan"
                />
              </Grid.Col>
            </Grid>
          </Grid.Col>
        </Grid>
      </Card>

      <Card withBorder shadow="sm" style={{ borderWidth: '2px' }}>
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List grow>
            <Tabs.Tab value="performance" fw={500}>Portfolio Analysis</Tabs.Tab>
            <Tabs.Tab value="price" fw={500}>Stock Price</Tabs.Tab>
          </Tabs.List>

          <div style={{ height: 500, marginTop: 20 }}>
            {activeTab === 'performance' && (
              <div style={chartBaseStyle}>
                <Line ref={chartRef} data={performanceChartData} options={performanceChartOptions} />
              </div>
            )}
            {activeTab === 'price' && (
              <div style={chartBaseStyle}>
                <Line ref={chartRef} data={priceChartData} options={priceChartOptions} />
              </div>
            )}
          </div>
        </Tabs>
      </Card>
    </Stack>
  );
}