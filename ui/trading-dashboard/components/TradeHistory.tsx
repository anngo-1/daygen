import { useState } from 'react';
import { Table, Badge, Text, Group, Pagination, ScrollArea } from '@mantine/core'; // Import ScrollArea
import { Trade, HistoricalDataPoint } from '../types/types';
import React from 'react';

interface TradeHistoryProps {
  trades: Trade[];
  historicalData: HistoricalDataPoint[];
}

export function TradeHistory({ trades, historicalData }: TradeHistoryProps) {
  const [activePage, setPage] = useState(1);
  const tradesPerPage = 10;
  const totalPages = Math.ceil(trades.length / tradesPerPage);
  const startIndex = (activePage - 1) * tradesPerPage;
  const endIndex = startIndex + tradesPerPage;
  const paginatedTrades = trades.slice(startIndex, endIndex);

  const rows = paginatedTrades.map((trade, index) => {
    const entryTimestamp = historicalData[trade.time_step]?.timestamp;

    const priceFormatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const quantityFormatter = new Intl.NumberFormat('en-US');

    return (
      <Table.Tr key={index}>
        <Table.Td>
          {entryTimestamp ? new Date(entryTimestamp).toLocaleString() : 'N/A'}
        </Table.Td>
        <Table.Td>
          <Badge
            color={trade.side === 'BUY' ? 'green' : 'red'}
            variant="light"
            style={{ minWidth: '120px', display: 'inline-block', textAlign: 'center' }} // Adjusted width for longer text
          >
            {trade.type.replace('_', ' ')} {trade.side}
          </Badge>
        </Table.Td>
        <Table.Td ta="right">
          {priceFormatter.format(trade.price)}
        </Table.Td>
        <Table.Td ta="right">
          {quantityFormatter.format(trade.quantity)}
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <>
      <ScrollArea> 
        <Table striped highlightOnHover>
          <Table.Caption>
            <Group justify="space-between">
              <Text fw={500} fz="lg">Trade History</Text>
              <Text fz="sm" color="dimmed">Total Trades: {trades.length}</Text>
            </Group>
          </Table.Caption>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Time</Table.Th>
              <Table.Th>Type / Side</Table.Th>
              <Table.Th ta="right">Price</Table.Th>
              <Table.Th ta="right">Quantity</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedTrades.length > 0 ? rows : (
              <Table.Tr>
                <Table.Td colSpan={4} ta="center">
                  <Text fz="sm" color="dimmed">No trades executed during this simulation.</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
          <Table.Tfoot>
            <Table.Tr>
              <Table.Th colSpan={4} ta="right">
                <Text fz="sm" color="dimmed">End of Trade History</Text>
              </Table.Th>
            </Table.Tr>
          </Table.Tfoot>
        </Table>
      </ScrollArea>
      {trades.length > tradesPerPage && (
        <Pagination
          value={activePage}
          onChange={setPage}
          total={totalPages}
          boundaries={1}
          size="sm"
          style={{ marginTop: 15, display: 'flex', justifyContent: 'center' }}
        />
      )}
    </>
  );
}
