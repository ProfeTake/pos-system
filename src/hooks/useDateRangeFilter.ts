import { useState, useMemo, useCallback } from "react";

interface DateRange {
    from: Date | null;
    to: Date | null;
}

interface UseDateRangeFilterReturn<T> {
    dateFrom: string;
    dateTo: string;
    setDateFrom: (date: string) => void;
    setDateTo: (date: string) => void;
    filteredData: T[];
    clearFilters: () => void;
    hasActiveFilters: boolean;
}

/**
 * Custom hook for date range filtering
 * @param data - Array of items to filter
 * @param getDate - Function to extract date from each item
 * @returns Date filter state and filtered data
 */
export function useDateRangeFilter<T>(
    data: T[],
    getDate: (item: T) => Date
): UseDateRangeFilterReturn<T> {
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");

    const dateRange = useMemo<DateRange>(() => {
        const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
        const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
        return { from, to };
    }, [dateFrom, dateTo]);

    const filteredData = useMemo(() => {
        return data.filter((item) => {
            const itemDate = getDate(item);
            if (dateRange.from && itemDate < dateRange.from) return false;
            if (dateRange.to && itemDate > dateRange.to) return false;
            return true;
        });
    }, [data, dateRange, getDate]);

    const clearFilters = useCallback(() => {
        setDateFrom("");
        setDateTo("");
    }, []);

    const hasActiveFilters = useMemo(() => {
        return dateFrom !== "" || dateTo !== "";
    }, [dateFrom, dateTo]);

    return {
        dateFrom,
        dateTo,
        setDateFrom,
        setDateTo,
        filteredData,
        clearFilters,
        hasActiveFilters,
    };
}
