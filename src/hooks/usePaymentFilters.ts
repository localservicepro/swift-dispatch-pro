
import { useState, useMemo } from "react";

interface PaymentOrder {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  total_amount: number;
  payment_status: string;
  payment_method?: string;
  payment_date?: string;
  created_at: string;
  products: any;
  delivery_fee?: number;
  subtotal?: number;
}

interface Filters {
  status: string;
  dateRange: string;
  amountRange: string;
  paymentMethod: string;
}

export function usePaymentFilters(payments: PaymentOrder[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    dateRange: 'all',
    amountRange: 'all',
    paymentMethod: 'all'
  });

  const filteredPayments = useMemo(() => {
    let filtered = payments;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(payment => 
        payment.order_number.toLowerCase().includes(searchLower) ||
        payment.customer_name.toLowerCase().includes(searchLower) ||
        payment.customer_email?.toLowerCase().includes(searchLower) ||
        payment.customer_phone?.includes(searchTerm) ||
        payment.payment_method?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(payment => payment.payment_status === filters.status);
    }

    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      
      filtered = filtered.filter(payment => {
        const createdAt = new Date(payment.created_at);
        
        switch (filters.dateRange) {
          case 'today':
            return createdAt.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return createdAt >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            return createdAt >= monthAgo;
          case 'quarter':
            const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            return createdAt >= quarterAgo;
          default:
            return true;
        }
      });
    }

    // Apply amount range filter
    if (filters.amountRange !== 'all') {
      filtered = filtered.filter(payment => {
        const amount = payment.total_amount;
        switch (filters.amountRange) {
          case 'under-100':
            return amount < 100;
          case '100-500':
            return amount >= 100 && amount <= 500;
          case '500-1000':
            return amount >= 500 && amount <= 1000;
          case 'over-1000':
            return amount > 1000;
          default:
            return true;
        }
      });
    }

    // Apply payment method filter
    if (filters.paymentMethod !== 'all') {
      filtered = filtered.filter(payment => {
        const method = payment.payment_method?.toLowerCase();
        switch (filters.paymentMethod) {
          case 'card':
            return method?.includes('card') || method?.includes('stripe');
          case 'cash':
            return method?.includes('cash');
          case 'bank-transfer':
            return method?.includes('bank') || method?.includes('transfer');
          case 'check':
            return method?.includes('check') || method?.includes('cheque');
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [payments, searchTerm, filters]);

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setFilters({
      status: 'all',
      dateRange: 'all',
      amountRange: 'all',
      paymentMethod: 'all'
    });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (filters.status !== 'all') count++;
    if (filters.dateRange !== 'all') count++;
    if (filters.amountRange !== 'all') count++;
    if (filters.paymentMethod !== 'all') count++;
    return count;
  }, [searchTerm, filters]);

  return {
    searchTerm,
    setSearchTerm,
    filters,
    filteredPayments,
    handleFilterChange,
    clearAllFilters,
    activeFilterCount
  };
}
