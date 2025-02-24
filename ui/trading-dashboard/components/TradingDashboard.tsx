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

function isValidTradingTime(date: Date): boolean {
  // Convert to Eastern Time
  const easternTime = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hours = easternTime.getHours();
  const minutes = easternTime.getMinutes();
  const today = new Date();
  const isToday = date.getDate() === today.getDate() && 
                 date.getMonth() === today.getMonth() && 
                 date.getFullYear() === today.getFullYear();

  // For today, if after market close (after 4:00 PM ET), data is still available
  if (isToday && (hours > 16 || (hours === 16 && minutes > 0))) {
    return true;
  }

  // Normal trading hours check (9:30 AM - 4:00 PM ET)
  const marketOpen = hours === 9 ? minutes >= 30 : hours > 9;
  const marketClose = hours < 16; // Before 4:00 PM

  return marketOpen && marketClose;
}

function getLastWeekday(): Date {
  const today = dayjs();
  let date = today;

  // First check if current time is valid for today
  if (today.day() >= 1 && today.day() <= 5 && isValidTradingTime(today.toDate())) {
    return today.toDate();
  }

  // If not valid, start looking backwards
  while (true) {
    date = date.subtract(1, 'day');

    // Check if it's a weekday
    if (date.day() >= 1 && date.day() <= 5) {
      // For past dates, set time to 3:59 PM ET (just before market close)
      const tradingTime = date
        .hour(15)  // 3 PM
        .minute(59)
        .second(0);

      return tradingTime.toDate();
    }
  }
}

const minDate = dayjs().subtract(60, 'days').toDate();
const maxDate = new Date();

const isDateWithinRange = (dateToCheck: Date | null | [Date | null, Date | null]): boolean => {
  if (!dateToCheck) return false;

  if (Array.isArray(dateToCheck)) { // Date range
    const startDate = dateToCheck[0];
    const endDate = dateToCheck[1];
    if (!startDate || !endDate) return false;
    return dayjs(startDate).isAfter(dayjs(minDate).subtract(1, 'day')) && dayjs(endDate).isBefore(dayjs(maxDate).add(1, 'day'));
  } else { // Single date
    return dayjs(dateToCheck).isAfter(dayjs(minDate).subtract(1, 'day')) && dayjs(dateToCheck).isBefore(dayjs(maxDate).add(1, 'day'));
  }
};


export function TradingDashboard() {
  const [symbol, setSymbol] = useState<string>('AAPL');
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const todayOrLastWeekday = getLastWeekday();
  const [date, setDate] = useState<Date>(todayOrLastWeekday);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    dayjs(todayOrLastWeekday).subtract(7, 'days').toDate(),
    todayOrLastWeekday
  ]);
  const [interval, setInterval] = useState<string>('5m');
  const [strategy, setStrategy] = useState<string>('macd');
  const [days, setDays] = useState<number>(1);
  const [initialCapital, setInitialCapital] = useState<number>(100000);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [isDateValid, setIsDateValid] = useState<boolean>(true);
  const [isTradingHoursValid, setIsTradingHoursValid] = useState<boolean>(true);


  const {
    data,
    loading,
    error,
    runSimulation
  } = useTradingSimulation();

  const setDateHandler = (value: Date | null) => {
    if (value) {
      setDate(value);
      setIsDateValid(isDateWithinRange(value));
      
      // For the current day, consider after-hours as valid
      const isCurrentDay = dayjs(value).isSame(dayjs(), 'day');
      if (isCurrentDay) {
        // Always set trading hours as valid for current day (data is available)
        setIsTradingHoursValid(true);
      } else {
        // For other days, use the normal trading hours check
        setIsTradingHoursValid(isValidTradingTime(value));
      }
    }
  };

  const setDateRangeHandler = (value: [Date | null, Date | null]) => {
    setDateRange(value);
    setIsDateValid(isDateWithinRange(value));
    setIsTradingHoursValid(true); // Date ranges are always considered valid trading hours (historical)
  };


  const submitSimulation = useCallback(() => {
    if (!isDateValid) {
      setCurrentError("Date out of range");
      return;
    }
    
    // Allow current day submissions regardless of trading hours
    // since data is available after hours for the current day
    const isCurrentDay = dayjs(date).isSame(dayjs(), 'day');
    if (!isTradingHoursValid && dateMode === 'single' && !isCurrentDay) {
      setCurrentError("Outside trading hours");
      return;
    }
    
    setCurrentError(null); // Clear any previous errors

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
  }, [dateMode, date, dateRange, symbol, interval, strategy, days, initialCapital, runSimulation, isDateValid, isTradingHoursValid, setIsTradingHoursValid]);

  const handleSubmit = useCallback(() => {
    submitSimulation();
  }, [submitSimulation]);

  useEffect(() => {
    if (error) {
      setCurrentError(error);
    } else {
      submitSimulation()
    }
  }, [error]);


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
                    <Stack gap="xs">
                      {dateMode === 'single' ? (
                        <>
                          <DateInput
                            label={
                              <Group gap={5} justify="space-between">
                                <span>Trading Date</span>
                                <Tooltip label="Trading hours: 9:30 AM - 4:00 PM ET">
                                  <IconInfoCircle style={{ width: rem(14), height: rem(14) }} className="cursor-help" />
                                </Tooltip>
                              </Group>
                            }
                            placeholder="Select date"
                            value={date}
                            onChange={setDateHandler}
                            minDate={minDate}
                            maxDate={maxDate}
                          />
                          <Group gap="xs">
                            {!(dayjs(date).isSame(dayjs(), 'day') && !isValidTradingTime(date)) && (
                              <Text size="sm" c={dayjs(date).isSame(dayjs(), 'day') ? "green.6" : "gray.6"}>
                                {dayjs(date).isSame(dayjs(), 'day') ? (
                                  "✓ Using live market data"
                                ) : (
                                  "Using historical data"
                                )}
                              </Text>
                            )}
                          </Group>
                          {!isTradingHoursValid && !dayjs(date).isSame(dayjs(), 'day') && (
                            <Text size="sm" c="red.7">
                              Currently outside trading hours - Please select a different date.
                            </Text>
                          )}
                        </>
                      ) : (
                        <>
                          <DatePickerInput
                            type="range"
                            label="Date Range"
                            placeholder="Select dates"
                            value={dateRange}
                            onChange={setDateRangeHandler}
                            minDate={minDate}
                            maxDate={maxDate}
                          />
                          <Text size="sm" c="gray.6">
                            Using historical data
                          </Text>
                        </>
                      )}
                      {!isDateValid && dateMode === 'single' && (
                        <Text size="sm" c="red.7">
                          Date out of range - Please select a date within the last 60 days.
                        </Text>
                      )}
                      {!isDateValid && dateMode === 'range' && (
                        <Text size="sm" c="red.7">
                          Date range out of range - Please select dates within the last 60 days.
                        </Text>
                      )}
                    </Stack>
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
                    disabled={!isDateValid || (!isTradingHoursValid && dateMode === 'single' && !dayjs(date).isSame(dayjs(), 'day'))}
                  >
                    Run Simulation
                  </Button>
                </Group>
              </Stack>
            </Card>

            {currentError === "Date out of range" && (
              <Paper withBorder p="md" bg="red.0" radius="md" style={{ borderWidth: '2px', borderColor: 'var(--mantine-color-red-5)' }}>
                <Text c="red.7" fw={500}>Date out of range - Please select a date within the last 60 days.</Text>
              </Paper>
            )}
            {currentError === "Outside trading hours" && (
              <Paper withBorder p="md" bg="red.0" radius="md" style={{ borderWidth: '2px', borderColor: 'var(--mantine-color-red-5)' }}>
                <Text c="red.7" fw={500}>Outside trading hours - Run simulation is disabled. Please select a date within trading hours (9:30 AM - 4:00 PM ET) or a different date.</Text>
              </Paper>
            )}

            {currentError && currentError !== "Date out of range" && currentError !== "Outside trading hours" && (
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