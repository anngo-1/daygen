import React, { useState, useRef, ReactElement, ReactNode, useMemo, useEffect } from 'react';
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
  ScriptableTooltipContext,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Line } from 'react-chartjs-2';
import { Text, Group, Stack, Tabs, Title as MantineTitle, RingProgress, Grid, Box } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { TradingData, HistoricalDataPoint } from '../types/types';

const customDrawPlugin = {
  id: 'customDraw',
  beforeTooltipDraw: (chart: Chart) => {
    const activeElements = chart.getActiveElements();
    if (activeElements && activeElements.length > 0) {
      const activePoint = activeElements[0];
      const { ctx } = chart;
      const x = activePoint.element.x;
      const topY = chart.scales.y.top;
      const bottomY = chart.scales.y.bottom;
      
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x, bottomY);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.stroke();
      ctx.restore();
    }
  }
};

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
  Filler,
  customDrawPlugin
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
  profit?: number;
  profitPercentage?: number;
  date?: string;
}

const StatCard = ({ title, value, subtitle, icon, color }: StatCardProps) => (
  <Box p="md" className="h-full" style={{ borderWidth: '2px', border: '1px solid #e0e0e0', borderRadius: '8px' }}> 
    <Group gap="sm" align="flex-start" wrap="nowrap">
      {icon}
      <div className="min-w-0">
        <Text size="sm" c="dimmed" fw={500} truncate>{title}</Text>
        <Text fw={700} size="lg" truncate>{value}</Text>
        <Text size="xs" c={color} fw={600} truncate>{subtitle}</Text>
      </div>
    </Group>
  </Box>
);

const addCustomStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    .chart-container .chartjs-tooltip {
      opacity: 0.95 !important;
      background: rgba(33, 37, 41, 0.8) !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
      letter-spacing: normal !important;
      pointer-events: none !important;
      z-index: 20 !important;
      max-width: 220px !important;
    }
  `;
  document.head.appendChild(style);
};

export function TradingChart({ data }: TradingChartProps) {
  const [activeTab, setActiveTab] = useState<string | null>('performance');
  const chartRef = useRef<Chart<'line'> | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    addCustomStyles();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const percentageChange = ((data.profit_loss / data.initial_capital) * 100).toFixed(2);
  const isProfit = data.profit_loss >= 0;

  const portfolioValues = data.historical_data.map(d => d.indicators.portfolio_value);
  const priceValues = data.historical_data.map(d => d.price);
  const highestValue = Math.max(...portfolioValues);
  const lowestValue = Math.min(...portfolioValues);
  const highestTime = data.historical_data.find(d => d.indicators.portfolio_value === highestValue)?.timestamp;
  const lowestTime = data.historical_data.find(d => d.indicators.portfolio_value === lowestValue)?.timestamp;

  const enrichedData: EnrichedDataPoint[] = data.historical_data.map(point => {
    const profit = point.indicators.portfolio_value - data.initial_capital;
    const profitPercentage = (profit / data.initial_capital) * 100;
    const date = dayjs(point.timestamp).format('MMM D, YYYY HH:mm:ss');
    
    return {
      ...point,
      baseline: data.initial_capital,
      profit,
      profitPercentage,
      date
    };
  });

  const xAxisTicksCallback = (tickValue: string | number): string => {
    const indexValue = typeof tickValue === 'string' ? parseInt(tickValue, 10) : tickValue;
    const timestamp = enrichedData[indexValue]?.timestamp;
    return timestamp ? dayjs(timestamp).format('HH:mm') : '';
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
          display: !isMobile,
        },
        grid: { display: !isMobile },
      },
      y: {
        type: 'linear',
        position: 'left',
        ticks: {
          callback: yAxisTicksCallback,
          padding: 10,
          display: !isMobile,
        },
        grid: { color: isMobile ? 'transparent' : '#ced4da', display: !isMobile },
      },
    },
    elements: { 
      line: { tension: 0.4, borderWidth: 2 }, 
      point: { 
        radius: 0, 
        hitRadius: 10,
        hoverRadius: 6,
        hoverBackgroundColor: 'white',  
        hoverBorderColor: '#228be6',
        hoverBorderWidth: 2,
      } 
    },
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        position: 'nearest',
        yAlign: 'bottom',
        xAlign: 'center',
        backgroundColor: 'rgba(33, 37, 41, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#adb5bd',
        borderWidth: 1,
        padding: 10,
        boxPadding: 6,
        cornerRadius: 4,
        titleFont: { weight: 'bold', size: 14 },
        bodyFont: { weight: 'normal', size: 13 },
        caretSize: 6,
        caretPadding: 6,
        displayColors: false,
        usePointStyle: true,
        boxWidth: 0,
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            const datasetLabel = context.dataset.label || '';
            const value = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
            
            if (datasetLabel === 'Portfolio Value') {
              const point = enrichedData[context.dataIndex];
              const isProfit = (point.profit || 0) > 0;
              return `${datasetLabel}: ${value}${isProfit ? ' ▲' : ' ▼'}`;
            }
            
            return `${datasetLabel}: ${value}`;
          },
          title: (tooltipItems: TooltipItem<'line'>[]) => {
            const index = tooltipItems[0].dataIndex;
            return enrichedData[index]?.date || '';
          },
          afterLabel: (context: TooltipItem<'line'>) => {
            const dataIndex = context.dataIndex;
            const point = enrichedData[dataIndex];
            const lines: string[] = [];
            
            if (context.dataset.label === 'Portfolio Value' && point.profit !== undefined && point.profitPercentage !== undefined) {
              const isPointProfit = point.profit > 0;
              const profitFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(point.profit));
              lines.push(`P/L: ${isPointProfit ? '▲ +' : '▼ -'}${profitFormatted} (${point.profitPercentage.toFixed(2)}%)`);
            }
            
            if (point.trade && context.dataset.label === 'Price') {
              const isBuy = point.trade.side === 'BUY';
              lines.push(`${isBuy ? '▲ Buy' : '▼ Sell'}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(point.trade.price)}`);
              
              if (point.trade.quantity) {
                lines.push(`Size: ${point.trade.quantity} shares`);
                const tradeValue = point.trade.quantity * point.trade.price;
                lines.push(`Value: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tradeValue)}`);
              }
            }
            
            return lines;
          },
        },
      },
    },
    interaction: {
      mode: 'index',
      intersect: false
    },
    hover: {
      mode: 'index',
      intersect: false
    },
    animation: {
      duration: 400,
    }
  };

  const tradeAnnotations = {
    annotation: {
      annotations: enrichedData.reduce<TradeAnnotation[]>((annotations, point, index) => {
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
        pointRadius: 0,
        order: 2,
      },
      {
        label: 'Portfolio Value',
        data: enrichedData.map(d => d.indicators.portfolio_value),
        borderColor: '#40c057',
        backgroundColor: 'rgba(64, 192, 87, 0.2)',
        fill: 'origin',
        pointRadius: 0,
        pointHoverBackgroundColor: '#40c057',
        pointHoverBorderColor: 'white',
        order: 1,
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
      pointRadius: 0,
      pointHoverBackgroundColor: '#228be6',
      pointHoverBorderColor: 'white',
    }],
  };

  const performanceChartOptions = useMemo<ChartOptions<'line'>>(() => {
    const baseline = data.initial_capital;
    let maxDeviation = 0;
    portfolioValues.forEach(value => {
      maxDeviation = Math.max(maxDeviation, Math.abs(value - baseline));
    });

    const yAxisMin = baseline - maxDeviation * 1.1;
    const yAxisMax = baseline + maxDeviation * 1.1;

    const scales: ChartOptions<'line'>['scales'] = {
      x: {
        type: 'category',
        ticks: {
          callback: xAxisTicksCallback,
          autoSkipPadding: 50,
          maxRotation: 0,
          minRotation: 0,
          display: !isMobile,
        },
        grid: {
          display: !isMobile,
        },
      },
      y: {
        type: 'linear',
        position: 'left',
        title: {
          display: !isMobile,
          text: 'Portfolio Value ($)',
          align: 'end',
        },
        min: yAxisMin,
        max: yAxisMax,
        ticks: {
          callback: yAxisTicksCallback,
          padding: 10,
          display: !isMobile,
        },
        grid: {
          color: isMobile ? 'transparent' : '#ced4da',
          display: !isMobile,
        },
      },
    };

    return {
      ...chartOptionsBase,
      plugins: {
        ...chartOptionsBase.plugins,
        ...tradeAnnotations,
      },
      scales,
    };
  }, [data, portfolioValues, tradeAnnotations, chartOptionsBase, isMobile, xAxisTicksCallback, yAxisTicksCallback]);

  const priceChartOptions = useMemo<ChartOptions<'line'>>(() => {
    const baseline = enrichedData[0]?.price || 0;
    let maxDeviation = 0;
    priceValues.forEach(value => {
      maxDeviation = Math.max(maxDeviation, Math.abs(value - baseline));
    });

    const yAxisMin = baseline === 0 ? 0 : baseline - maxDeviation * 1.1;
    const yAxisMax = baseline + maxDeviation * 1.1;

    const scales: ChartOptions<'line'>['scales'] = {
      x: {
        type: 'category',
        ticks: {
          callback: xAxisTicksCallback,
          autoSkipPadding: 50,
          maxRotation: 0,
          minRotation: 0,
          display: !isMobile,
        },
        grid: {
          display: !isMobile,
        },
      },
      y: {
        type: 'linear',
        position: 'left',
        title: {
          display: !isMobile,
          text: 'Price ($)',
          align: 'end',
        },
        min: yAxisMin,
        max: yAxisMax,
        ticks: {
          callback: yAxisTicksCallback,
          padding: 10,
          display: !isMobile,
        },
        grid: {
          color: isMobile ? 'transparent' : '#ced4da',
          display: !isMobile,
        },
      },
    };

    return {
      ...chartOptionsBase,
      plugins: {
        ...chartOptionsBase.plugins,
        ...tradeAnnotations,
      },
      scales,
    };
  }, [chartOptionsBase, priceValues, tradeAnnotations, enrichedData, isMobile, xAxisTicksCallback, yAxisTicksCallback]);

  return (
    <Stack gap="xl">
      <Box p="md" style={{
        borderWidth: '2px',
        borderColor: isProfit ? 'var(--mantine-color-green-4)' : 'var(--mantine-color-red-4)',
        background: 'linear-gradient(to right, white, var(--mantine-color-gray-0))',
        borderRadius: '8px',
        padding: '20px'
      }}>
        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="lg">
              <div>
                <MantineTitle order={2} size="h3">Trading Performance</MantineTitle>
                <Text c="dimmed" size="sm">Strategy: {data.strategy}</Text>
                <Text c="dimmed" size="sm">0.1% fee taken from each transaction</Text>
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
      </Box>

      <Box style={{ marginTop: '20px' }}>
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
      </Box>
    </Stack>
  );
}