import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import {
  exportBookingsCsv,
  getBookings,
  getBookingServiceTypes,
  getBookingStatusCountsApi,
} from '@race/api';
import type { BookingListFilters } from '@race/types';
import { exportToCsv } from '@race/utils';

const PAGE_SIZE = 10;

export function useBookings() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('ALL');
  const [serviceType, setServiceType] = useState<string>('ALL');
  const [bookingType, setBookingType] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<string>('ALL');

  const tabStatus = activeTab === 'ALL' ? status : activeTab;

  const filters: BookingListFilters = useMemo(
    () => ({
      search,
      status: tabStatus as BookingListFilters['status'],
      serviceType,
      type: bookingType as BookingListFilters['type'],
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, tabStatus, serviceType, bookingType, dateFrom, dateTo, page],
  );

  const query = useQuery({
    queryKey: ['bookings', filters],
    queryFn: () => getBookings(filters),
    placeholderData: (prev) => prev,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  const countsQuery = useQuery({
    queryKey: ['booking-status-counts'],
    queryFn: getBookingStatusCountsApi,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,

  const serviceTypes = useMemo(() => getBookingServiceTypes(), []);

  const resetPage = () => setPage(1);

  const handleExport = async () => {
    const rows = await exportBookingsCsv({
      search,
      status: tabStatus as BookingListFilters['status'],
      serviceType,
      type: bookingType as BookingListFilters['type'],
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    exportToCsv('bookings.csv', rows, [
      { key: 'bookingNumber', header: 'Booking ID' },
      { key: 'customerName', header: 'Customer' },
      { key: 'vendorName', header: 'Vendor' },
      { key: 'driverName', header: 'Driver' },
      { key: 'service', header: 'Service' },
      { key: 'amount', header: 'Amount' },
      { key: 'status', header: 'Status' },
      { key: 'date', header: 'Date' },
    ]);
  };

  return {
    ...query,
    counts: countsQuery.data,
    search,
    setSearch: (v: string) => {
      setSearch(v);
      resetPage();
    },
    bookingType,
    setBookingType: (v: string) => {
      setBookingType(v);
      resetPage();
    },
    status,
    setStatus: (v: string) => {
      setStatus(v);
      resetPage();
    },
    serviceType,
    setServiceType: (v: string) => {
      setServiceType(v);
      resetPage();
    },
    dateFrom,
    setDateFrom: (v: string) => {
      setDateFrom(v);
      resetPage();
    },
    dateTo,
    setDateTo: (v: string) => {
      setDateTo(v);
      resetPage();
    },
    page,
    setPage,
    pageSize: PAGE_SIZE,
    serviceTypes,
    activeTab,
    setActiveTab: (tab: string) => {
      setActiveTab(tab);
      resetPage();
    },
    handleExport,
  };
}
