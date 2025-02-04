import { useEffect, useState, useCallback } from 'react';
import {
  Container,
  TextInput,
  Button,
  Group,
  Paper,
  Title,
  Text,
  Select,
  NumberInput,
  Loader,
  Tooltip,
  Grid,
  SegmentedControl,
  Stack,
  rem,
  Card,
  Box,
  createTheme,
  MantineProvider,
} from '@mantine/core';
import { DateInput, DatePickerInput } from '@mantine/dates';
import { IconInfoCircle } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { TradingChart } from './TradingChart';
import { TradeHistory } from './TradeHistory';
import { useTradingSimulation } from '@/hooks/useTradingSimulation';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/700.css';

type IntervalOption = {
  value: string;
  label: string;
};

type StrategyOption = {
  value: string;
  label: string;
};

const theme = createTheme({
  fontFamily: 'Roboto, sans-serif',
  headings: {
    fontFamily: 'Roboto, sans-serif'
  },
  primaryColor: 'green',
  components: {
    Button: {
      defaultProps: {
        variant: 'filled',
        size: 'md',
      },
      styles: {
        root: {
          fontWeight: 600,
          '&:hover': {
            backgroundColor: 'var(--mantine-color-green-8)',
            transform: 'translateY(-1px)',
          },
          transition: 'transform 0.2s ease'
        }
      }
    },
    Card: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
        withBorder: true,
      },
      styles: {
        root: {
          borderWidth: '2px',
          borderColor: 'var(--mantine-color-gray-3)',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'var(--mantine-color-green-5)',
            transform: 'translateY(-2px)',
            boxShadow: 'var(--mantine-shadow-md)',
          }
        }
      }
    },
    TextInput: {
      styles: {
        input: {
          borderWidth: '2px',
          '&:focus': {
            borderColor: 'var(--mantine-color-green-5)',
            borderWidth: '2px',
          }
        }
      }
    },
    Select: {
      styles: {
        input: {
          borderWidth: '2px',
          '&:focus': {
            borderColor: 'var(--mantine-color-green-5)',
            borderWidth: '2px',
          }
        }
      }
    },
    NumberInput: {
      styles: {
        input: {
          borderWidth: '2px',
          '&:focus': {
            borderColor: 'var(--mantine-color-green-5)',
            borderWidth: '2px',
          }
        }
      }
    },
    SegmentedControl: {
      styles: {
        root: {
          borderWidth: '2px',
          borderColor: 'var(--mantine-color-gray-3)',
        },
        control: {
          borderWidth: '2px',
        },
        label: {
          fontWeight: 500,
        }
      }
    },
  },
});

const INTERVALS: IntervalOption[] = [
  { value: '1m', label: '1 Minute' },
  { value: '2m', label: '2 Minutes' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '30m', label: '30 Minutes' },
  { value: '60m', label: '1 Hour' },
  { value: '90m', label: '90 Minutes' },
  { value: '1d', label: '1 Day' },
];

const STRATEGIES: StrategyOption[] = [
  { value: 'macd', label: 'MACD Strategy' },
];

function getLastWeekday(): Date {
  const today = dayjs();
  let date = today;
  while (date.day() === 0 || date.day() === 6) {
    date = date.subtract(1, 'day');
  }
  return date.toDate();
}

export function TradingDashboard() {
  const [symbol, setSymbol] = useState<string>('AAPL');
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [date, setDate] = useState<Date>(dayjs('2025-01-31').toDate());
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    dayjs().subtract(7, 'days').toDate(),
    getLastWeekday()
  ]);
  const [interval, setInterval] = useState<string>('5m');
  const [strategy, setStrategy] = useState<string>('macd');
  const [days, setDays] = useState<number>(1);
  const [initialCapital, setInitialCapital] = useState<number>(100000);
  const [currentError, setCurrentError] = useState<string | null>(null);

  const {
    data,
    loading,
    error,
    runSimulation
  } = useTradingSimulation();

  const submitSimulation = useCallback(() => {
    if (dateMode === 'single' && !date) return;
    if (dateMode === 'range' && (!dateRange[0] || !dateRange[1])) return;

    if (dateMode === 'single') {
      runSimulation({
        symbol,
        date: dayjs(date).format('YYYY-MM-DD'),
        interval,
        strategy,
        days,
        startDate: '',
        endDate: '',   
        initial_capital: initialCapital,
      });
    } else {
      if (!dateRange[0] || !dateRange[1]) return;
      runSimulation({
        symbol,
        date: '',     
        interval,
        strategy,
        days: 1,      
        startDate: dayjs(dateRange[0]).format('YYYY-MM-DD'),
        endDate: dayjs(dateRange[1]).format('YYYY-MM-DD'),
        initial_capital: initialCapital,
      });
    }
  }, [dateMode, date, dateRange, symbol, interval, strategy, days, initialCapital, runSimulation]);

  const handleSubmit = useCallback(() => {
    setCurrentError(null);
    submitSimulation();
  }, [submitSimulation]);

  useEffect(() => {
    if (error) {
      setCurrentError(error);
    } else {
      submitSimulation()
    }
  }, [error]);


  const minDate = dayjs().subtract(60, 'days').toDate();

  return (
    <MantineProvider theme={theme}>
      <Box
        p={{ base: "md", md: "xl" }}
        pt={100}
        bg="white"
        mih="100vh"
      >
        <Container size="md">
          <Stack gap="xl">
            <Stack gap="xs" align="center" mb="xl">
              <Title order={1} size={42} fw={800}>daygen</Title>
              <Text c="dimmed" size="lg" fw={500}>
                Implementing & backtesting algorithmic day trading strategies (for fun)
              </Text>
            </Stack>

            <Card>
              <Stack gap="md">
                <SegmentedControl
                  fullWidth
                  value={dateMode}
                                      onChange={(value) => setDateMode(value as 'single' | 'range')}
                  data={[
                    { label: 'Single Date + Days', value: 'single' },
                    { label: 'Date Range', value: 'range' },
                  ]}
                />

                <Grid>
                  <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                    <TextInput
                      label="Symbol"
                      placeholder="Enter stock symbol"
                      value={symbol}
                      onChange={(e) => setSymbol(e.currentTarget.value.toUpperCase())}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                    <Select
                      label="Trading Strategy"
                      value={strategy}
                      onChange={(value) => setStrategy(value || 'macd')}
                      data={STRATEGIES}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                    <Select
                      label="Time Interval"
                      value={interval}
                      onChange={(value) => setInterval(value || '5m')}
                      data={INTERVALS}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                    {dateMode === 'single' ? (
                      <DateInput
                        label="Trading Date"
                        placeholder="Select date"
                        value={date}
                        onChange={(value: Date | null) => value && setDate(value)}
                        minDate={minDate}
                      />
                    ) : (
                      <DatePickerInput
                        type="range"
                        label="Date Range"
                        placeholder="Select dates"
                        value={dateRange}
                        onChange={(value: [Date | null, Date | null]) => setDateRange(value)}
                        minDate={minDate}
                      />
                    )}
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                    <NumberInput
                      label="Initial Capital"
                      value={initialCapital}
                      onChange={(value: number | string) => setInitialCapital(typeof value === 'number' ? value : 100000)}
                      min={1000}
                      prefix="$"
                      thousandSeparator=","
                    />
                  </Grid.Col>

                  {dateMode === 'single' && (
                    <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                      <NumberInput
                        label={
                          <Group gap={5}>
                            <span>Trading Days</span>
                            <Tooltip label="Number of consecutive trading days to simulate">
                              <IconInfoCircle style={{ width: rem(16), height: rem(16) }} />
                            </Tooltip>
                          </Group>
                        }
                        value={days}
                        onChange={(value: number | string) => setDays(typeof value === 'number' ? value : 1)}
                        min={1}
                        max={30}
                      />
                    </Grid.Col>
                  )}
                </Grid>

                <Group justify="space-between" pt="md">
                  <Text size="sm" c="dimmed">
                    Note: Intraday data available for last 60 days only
                  </Text>
                  <Button
                    onClick={handleSubmit}
                    loading={loading}
                    leftSection={loading ? <Loader size="xs" color="white" /> : null}
                  >
                    Run Simulation
                  </Button>
                </Group>
              </Stack>
            </Card>

            {currentError && (
              <Paper withBorder p="md" bg="red.0" radius="md" style={{ borderWidth: '2px', borderColor: 'var(--mantine-color-red-5)' }}>
                <Text c="red.7" fw={500}>No data returned - Check Stock Ticker or Change Date</Text>
              </Paper>
            )}

            {loading && !data && (
              <Paper radius="md" p="xl" withBorder style={{ borderWidth: '2px' }}>
                <Group justify="center">
                  <Loader size="xl" />
                  <Text size="lg" fw={500}>Running simulation...</Text>
                </Group>
              </Paper>
            )}

            {data && (
              <Stack gap="xl" style={{ opacity: data ? 1 : 0, transition: 'opacity 0.5s ease' }}>
                <Card>
                  <TradingChart data={data} />
                </Card>
                <Card>
                  <TradeHistory trades={data.trades} historicalData={data.historical_data} />
                </Card>
              </Stack>
            )}
          </Stack>
        </Container>
      </Box>
    </MantineProvider>
  );
}