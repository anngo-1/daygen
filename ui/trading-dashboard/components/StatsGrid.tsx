import { Grid, Paper, Text, Title, Group, Stack } from '@mantine/core';
import { IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react';
import { TradingData } from '../types/types';

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  color?: string;
  isPositive?: boolean;
}

const StatCard = ({
  title,
  value,
  description,
  color,
  isPositive
}: StatCardProps) => (
  <Paper
    withBorder
    p="md"
    radius="md"
    shadow="sm"
  >
    <Stack gap="xs">
      <Text size="sm" c="dimmed" fw={500} tt="uppercase">
        {title}
      </Text>
      <Group align="center" gap="xs">
        <Title order={3} fw={700} c={color}>
          {value}
        </Title>
        {(isPositive !== undefined) && (
          <Text
            c={isPositive ? 'teal' : 'red'}
            size="sm"
            fw={500}
          >
            {isPositive ? (
              <IconArrowUpRight size={20} stroke={2} />
            ) : (
              <IconArrowDownRight size={20} stroke={2} />
            )}
          </Text>
        )}
      </Group>
      <Text size="sm" c="dimmed" fw={500}>
        {description}
      </Text>
    </Stack>
  </Paper>
);

interface StatsGridProps {
  data: TradingData;
}

export function StatsGrid({ data }: StatsGridProps) {
  const profitPercent = (data.profit_loss / data.initial_capital) * 100;
  const isProfit = data.profit_loss >= 0;
  const avgProfitLoss = data.trades.length > 0
    ? data.profit_loss / data.trades.length
    : 0;

  const stats = [
    {
      title: 'Portfolio Value',
      value: `$${data.final_portfolio_value.toLocaleString()}`,
      description: `Started with $${data.initial_capital.toLocaleString()}`,
      isPositive: data.final_portfolio_value > data.initial_capital
    },
    {
      title: 'Total Profit/Loss',
      value: `$${Math.abs(data.profit_loss).toLocaleString()}`,
      description: `${Math.abs(profitPercent).toFixed(2)}% ${isProfit ? 'gain' : 'loss'}`,
      color: isProfit ? 'teal' : 'red',
      isPositive: isProfit
    },
    {
      title: 'Total Trades',
      value: data.trades.length.toString(),
      description: `${data.trades.filter(t => t.profit_loss > 0).length} profitable trades`,
      isPositive: data.trades.filter(t => t.profit_loss > 0).length > data.trades.length / 2
    },
    {
      title: 'Average P/L per Trade',
      value: data.trades.length > 0
        ? `$${Math.abs(avgProfitLoss).toLocaleString()}`
        : 'N/A',
      description: data.trades.length > 0
        ? `${avgProfitLoss >= 0 ? 'Profit' : 'Loss'} per trade`
        : 'No trades executed',
      color: avgProfitLoss >= 0 ? 'teal' : 'red',
      isPositive: avgProfitLoss >= 0
    },
  ];

  return (
    <Grid gutter="md" mb="xl">
      {stats.map((stat) => (
        <Grid.Col span={{ base: 12, xs: 6, md: 3 }} key={stat.title}>
          <StatCard {...stat} />
        </Grid.Col>
      ))}
    </Grid>
  );
}