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
  Modal,
  List,
  Divider,
} from '@mantine/core';
import { DateInput, DatePickerInput } from '@mantine/dates';
import { IconInfoCircle } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { TradingChart } from './TradingChart';
import { TradeHistory } from './TradeHistory';
import { useTradingSimulation } from '@/hooks/useTradingSimulation';
import { useStrategies } from '@/hooks/useStrategies';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/700.css';

type IntervalOption = {
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


function isMarketHoliday(date: Date): boolean {
  const easternDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const year = easternDate.getFullYear();
  const month = easternDate.getMonth();
  const day = easternDate.getDate();
  
  const newYearsDay = new Date(year, 0, 1);
  if (newYearsDay.getDay() === 0) newYearsDay.setDate(2);
  
  const mlkDay = new Date(year, 0, 1);
  mlkDay.setDate(1 + (15 - mlkDay.getDay() + 7) % 7 + 14);
  
  const presidentsDay = new Date(year, 1, 1);
  presidentsDay.setDate(1 + (15 - presidentsDay.getDay() + 7) % 7 + 14);
  
  const goodFriday = new Date(year, 2, 22);
  
  const memorialDay = new Date(year, 5, 0);
  memorialDay.setDate(memorialDay.getDate() - (memorialDay.getDay() + 6) % 7);
  
  const juneteenth = new Date(year, 5, 19);
  if (juneteenth.getDay() === 0) juneteenth.setDate(20);
  if (juneteenth.getDay() === 6) juneteenth.setDate(18);
  
  const independenceDay = new Date(year, 6, 4);
  if (independenceDay.getDay() === 0) independenceDay.setDate(5);
  if (independenceDay.getDay() === 6) independenceDay.setDate(3);
  
  const laborDay = new Date(year, 8, 1);
  laborDay.setDate(1 + (8 - laborDay.getDay()) % 7);
  
  const thanksgiving = new Date(year, 10, 1);
  thanksgiving.setDate(1 + (4 - thanksgiving.getDay() + 7) % 7 + 21);
  
  const christmas = new Date(year, 11, 25);
  if (christmas.getDay() === 0) christmas.setDate(26);
  if (christmas.getDay() === 6) christmas.setDate(24);
  
  const holidays = [
    newYearsDay, mlkDay, presidentsDay, goodFriday, memorialDay, 
    juneteenth, independenceDay, laborDay, thanksgiving, christmas
  ];
  
  return holidays.some(holiday => 
    holiday.getDate() === day && 
    holiday.getMonth() === month && 
    holiday.getFullYear() === year
  );
}

function getEasternTime(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
}

function isValidTradingTime(date: Date): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) {
    return false;
  }
  
  if (isMarketHoliday(date)) {
    return false;
  }
  
  const today = new Date();
  const isToday = date.getDate() === today.getDate() && 
                 date.getMonth() === today.getMonth() && 
                 date.getFullYear() === today.getFullYear();
  
  if (!isToday) {
    return true;
  }
  
  const easternTime = getEasternTime(date);
  const hours = easternTime.getHours();
  const minutes = easternTime.getMinutes();
  
  const marketHasOpened = hours > 9 || (hours === 9 && minutes >= 30);
  
  return marketHasOpened;
}

function getNextValidTradingDay(fromDate: Date): Date {
  const nextDay = new Date(fromDate);
  nextDay.setDate(nextDay.getDate() + 1);
  
  while (
    nextDay.getDay() === 0 || 
    nextDay.getDay() === 6 || 
    isMarketHoliday(nextDay)
  ) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
}

function getLastWeekday(): Date {
  const today = dayjs();
  let date = today;

  if (today.day() >= 1 && today.day() <= 5 && isValidTradingTime(today.toDate())) {
    return today.toDate();
  }

  while (true) {
    date = date.subtract(1, 'day');

    if (date.day() >= 1 && date.day() <= 5 && !isMarketHoliday(date.toDate())) {
      const tradingTime = date
        .hour(15)
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

  if (Array.isArray(dateToCheck)) {
    const startDate = dateToCheck[0];
    const endDate = dateToCheck[1];
    if (!startDate || !endDate) return false;
    return dayjs(startDate).isAfter(dayjs(minDate).subtract(1, 'day')) && dayjs(endDate).isBefore(dayjs(maxDate).add(1, 'day'));
  } else {
    return dayjs(dateToCheck).isAfter(dayjs(minDate).subtract(1, 'day')) && dayjs(dateToCheck).isBefore(dayjs(maxDate).add(1, 'day'));
  }
};

function validateDateRange(startDate: Date | null, endDate: Date | null): string | null {
  if (!startDate || !endDate) return "Please select both start and end dates";
  
  if (startDate > endDate) return "Start date must be before end date";
  
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 60) return "Date range cannot exceed 60 days";
  
  const currentDate = new Date(startDate.getTime());
  let hasValidTradingDay = false;
  
  while (currentDate <= endDate) {
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6 && !isMarketHoliday(currentDate)) {
      hasValidTradingDay = true;
      break;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  if (!hasValidTradingDay) return "Selected range contains no trading days";
  
  return null;
}

export function TradingDashboard() {
  const { strategies, loading: loadingStrategies } = useStrategies();
  const [symbol, setSymbol] = useState<string>('AAPL');
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [strategyModalOpen, setStrategyModalOpen] = useState<boolean>(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const todayOrLastWeekday = getLastWeekday();
  const [date, setDate] = useState<Date>(todayOrLastWeekday);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    dayjs(todayOrLastWeekday).subtract(7, 'days').toDate(),
    todayOrLastWeekday
  ]);
  const [interval, setInterval] = useState<string>('5m');
  const [strategy, setStrategy] = useState<string>('mean_reversion');
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
      
      const day = value.getDay();
      if (day === 0 || day === 6) {
        setIsTradingHoursValid(false);
        return;
      }
      
      if (isMarketHoliday(value)) {
        setIsTradingHoursValid(false);
        return;
      }
      
      const isCurrentDay = dayjs(value).isSame(dayjs(), 'day');
      if (!isCurrentDay) {
        setIsTradingHoursValid(true);
        return;
      }
      
      const easternTime = getEasternTime(value);
      const hours = easternTime.getHours();
      const minutes = easternTime.getMinutes();
      
      const marketHasOpened = hours > 9 || (hours === 9 && minutes >= 30);
      
      setIsTradingHoursValid(marketHasOpened);
    }
  };

  const setDateRangeHandler = (value: [Date | null, Date | null]) => {
    setDateRange(value);
    setIsDateValid(isDateWithinRange(value));
    
    if (value[0] && value[1]) {
      const rangeError = validateDateRange(value[0], value[1]);
      if (rangeError) {
        setCurrentError(rangeError);
        setIsTradingHoursValid(false);
      } else {
        setCurrentError(null);
        setIsTradingHoursValid(true);
      }
    } else {
      setIsTradingHoursValid(true);
    }
  };

  const submitSimulation = useCallback(() => {
    if (!isDateValid) {
      setCurrentError("Date out of range");
      return;
    }
    
    if (dateMode === 'single') {
      const day = date.getDay();
      if (day === 0 || day === 6) {
        setCurrentError("Weekend - Markets closed");
        return;
      }
      
      if (isMarketHoliday(date)) {
        setCurrentError("Holiday - Markets closed");
        return;
      }
      
      const isCurrentDay = dayjs(date).isSame(dayjs(), 'day');
      if (isCurrentDay) {
        const easternTime = getEasternTime(date);
        const hours = easternTime.getHours();
        const minutes = easternTime.getMinutes();
        
        const marketHasOpened = hours > 9 || (hours === 9 && minutes >= 30);
        
        if (!marketHasOpened) {
          setCurrentError("Market not yet open today");
          return;
        }
      }
    } else {
      if (!dateRange[0] || !dateRange[1]) return;
      
      const rangeError = validateDateRange(dateRange[0], dateRange[1]);
      if (rangeError) {
        setCurrentError(rangeError);
        return;
      }
    }
    
    setCurrentError(null);

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
  }, [dateMode, date, dateRange, symbol, interval, strategy, days, initialCapital, runSimulation, isDateValid, isTradingHoursValid]);

  const handleSubmit = useCallback(() => {
    submitSimulation();
  }, [submitSimulation]);

  useEffect(() => {
    if (error) {
      setCurrentError(error);
    } else {
      submitSimulation();
    }
  }, [error]);

  useEffect(() => {
    submitSimulation();
  }, []);

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
                      label={
                        <Group gap={5} justify="space-between">
                          <span>Trading Strategy</span>
                          <Tooltip label="Choose a trading strategy algorithm">
                            <IconInfoCircle style={{ width: rem(14), height: rem(14) }} className="cursor-help" />
                          </Tooltip>
                        </Group>
                      }
                      value={strategy}
                      onChange={(value) => setStrategy(value || 'macd')}
                      data={loadingStrategies ? 
                        [{ value: 'macd', label: 'Loading strategies...' }] : 
                        strategies.map(s => ({
                          value: s.id,
                          label: s.name,
                        }))}
                    />
                    {!loadingStrategies && strategy && (
                      <Text 
                        size="xs" 
                        mt="xs" 
                        c="blue" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedStrategyId(strategy);
                          setStrategyModalOpen(true);
                        }}
                      >
                        Click for strategy information
                      </Text>
                    )}
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
                          {!isTradingHoursValid && dayjs(date).isSame(dayjs(), 'day') && (
                            <Text size="sm" c="red.7">
                              Market not yet open today - Please wait until 9:30 AM ET.
                            </Text>
                          )}
                          {!isTradingHoursValid && !dayjs(date).isSame(dayjs(), 'day') && (
                            <Text size="sm" c="red.7">
                              Weekend or holiday - Markets closed on this date.
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
                      {!isTradingHoursValid && (
                        <Group gap="apart" mt="xs">
                          <Button 
                            variant="subtle" 
                            size="sm"
                            onClick={() => {
                              const nextTradingDay = getNextValidTradingDay(date);
                              setDate(nextTradingDay);
                              setIsDateValid(isDateWithinRange(nextTradingDay));
                              setIsTradingHoursValid(true);
                            }}
                          >
                            Use next trading day
                          </Button>
                        </Group>
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
                    disabled={!isDateValid || (!isTradingHoursValid && dateMode === 'single')}
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
            {currentError === "Market not yet open today" && (
              <Paper withBorder p="md" bg="red.0" radius="md" style={{ borderWidth: '2px', borderColor: 'var(--mantine-color-red-5)' }}>
                <Text c="red.7" fw={500}>Market not yet open today - Please wait until 9:30 AM ET or select a previous trading day.</Text>
              </Paper>
            )}
            {currentError === "Weekend - Markets closed" && (
              <Paper withBorder p="md" bg="red.0" radius="md" style={{ borderWidth: '2px', borderColor: 'var(--mantine-color-red-5)' }}>
                <Text c="red.7" fw={500}>Weekend - Markets closed. Please select a weekday.</Text>
              </Paper>
            )}
            {currentError === "Holiday - Markets closed" && (
              <Paper withBorder p="md" bg="red.0" radius="md" style={{ borderWidth: '2px', borderColor: 'var(--mantine-color-red-5)' }}>
                <Text c="red.7" fw={500}>Holiday - Markets closed on this date. Please select a different date.</Text>
              </Paper>
            )}
            {currentError === "Selected range contains no trading days" && (
              <Paper withBorder p="md" bg="red.0" radius="md" style={{ borderWidth: '2px', borderColor: 'var(--mantine-color-red-5)' }}>
                <Text c="red.7" fw={500}>Selected range contains no trading days. Please select a different range.</Text>
              </Paper>
            )}
            {currentError === "Start date must be before end date" && (
              <Paper withBorder p="md" bg="red.0" radius="md" style={{ borderWidth: '2px', borderColor: 'var(--mantine-color-red-5)' }}>
                <Text c="red.7" fw={500}>Start date must be before end date. Please adjust your selection.</Text>
              </Paper>
            )}
            {currentError === "Date range cannot exceed 60 days" && (
              <Paper withBorder p="md" bg="red.0" radius="md" style={{ borderWidth: '2px', borderColor: 'var(--mantine-color-red-5)' }}>
                <Text c="red.7" fw={500}>Date range cannot exceed 60 days. Please select a shorter range.</Text>
              </Paper>
            )}
            {currentError && ![
              "Date out of range", 
              "Market not yet open today", 
              "Weekend - Markets closed", 
              "Holiday - Markets closed",
              "Selected range contains no trading days",
              "Start date must be before end date",
              "Date range cannot exceed 60 days"
            ].includes(currentError) && (
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

      {/* Strategy Information Modal */}
      <Modal 
        opened={strategyModalOpen && selectedStrategyId !== null} 
        onClose={() => setStrategyModalOpen(false)}
        title={
          <Text size="lg" fw={700}>
            {strategies.find(s => s.id === selectedStrategyId)?.name} Details
          </Text>
        }
        size="lg"
      >
        <Stack gap="md">
          <Text fw={500} size="sm">Description</Text>
          <Paper p="md" withBorder>
            <Text size="sm">
              {strategies.find(s => s.id === selectedStrategyId)?.description || ''}
            </Text>
          </Paper>
          
          <Text fw={500} size="sm" mt="md">Parameters</Text>
          <Paper p="md" withBorder>
            <Stack gap="md">
              {strategies.find(s => s.id === selectedStrategyId)?.parameters.map((param, index) => (
                <div key={param.name}>
                  {index > 0 && <Divider my="xs" />}
                  <Text fw={700} size="sm">{param.name}</Text>
                  <Text size="sm">{param.description}</Text>
                  <Text size="sm" c="dimmed">Default: {param.defaultValue}</Text>
                  {param.options && param.options.length > 0 && (
                    <>
                      <Text size="sm" fw={500}>Options:</Text>
                      <List size="sm" spacing="xs">
                        {param.options.map(option => (
                          <List.Item key={option}>{option}</List.Item>
                        ))}
                      </List>
                    </>
                  )}
                </div>
              ))}
            </Stack>
          </Paper>
        </Stack>
      </Modal>
    </MantineProvider>
  );
}
