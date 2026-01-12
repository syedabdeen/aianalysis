import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange, ProcurementMetrics, BudgetMetrics, VendorMetrics, InventoryMetrics } from '@/types/reports';
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export function useProcurementAnalytics(dateRange: DateRange) {
  return useQuery({
    queryKey: ['procurement-analytics', dateRange.from, dateRange.to],
    queryFn: async (): Promise<ProcurementMetrics> => {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Fetch all procurement documents
      const [rfisRes, rfqsRes, prsRes, posRes] = await Promise.all([
        supabase.from('rfis').select('id, status, procurement_type, created_at').gte('created_at', fromDate).lte('created_at', toDate),
        supabase.from('rfqs').select('id, status, procurement_type, rfi_id, created_at').gte('created_at', fromDate).lte('created_at', toDate),
        supabase.from('purchase_requests').select('id, status, procurement_type, rfq_id, created_at').gte('created_at', fromDate).lte('created_at', toDate),
        supabase.from('purchase_orders').select('id, status, procurement_type, pr_id, created_at').gte('created_at', fromDate).lte('created_at', toDate),
      ]);

      const rfis = rfisRes.data || [];
      const rfqs = rfqsRes.data || [];
      const prs = prsRes.data || [];
      const pos = posRes.data || [];

      // Count by status
      const countByStatus = (items: any[]) => {
        const counts: Record<string, number> = {};
        items.forEach(item => {
          counts[item.status] = (counts[item.status] || 0) + 1;
        });
        return Object.entries(counts).map(([status, count]) => ({ status, count }));
      };

      // Count by type
      const countByType = (items: any[]) => {
        const counts: Record<string, number> = {};
        items.forEach(item => {
          const type = item.procurement_type || 'unknown';
          counts[type] = (counts[type] || 0) + 1;
        });
        return Object.entries(counts).map(([type, count]) => ({ type, count }));
      };

      // Monthly trend
      const monthlyData: Record<string, { rfis: number; rfqs: number; prs: number; pos: number }> = {};
      
      const addToMonth = (items: any[], key: 'rfis' | 'rfqs' | 'prs' | 'pos') => {
        items.forEach(item => {
          const month = format(parseISO(item.created_at), 'MMM yyyy');
          if (!monthlyData[month]) {
            monthlyData[month] = { rfis: 0, rfqs: 0, prs: 0, pos: 0 };
          }
          monthlyData[month][key]++;
        });
      };

      addToMonth(rfis, 'rfis');
      addToMonth(rfqs, 'rfqs');
      addToMonth(prs, 'prs');
      addToMonth(pos, 'pos');

      // Conversion rates
      const rfqsFromRfi = rfqs.filter(r => r.rfi_id).length;
      const prsFromRfq = prs.filter(p => p.rfq_id).length;
      const posFromPr = pos.filter(p => p.pr_id).length;

      return {
        totalRFIs: rfis.length,
        totalRFQs: rfqs.length,
        totalPRs: prs.length,
        totalPOs: pos.length,
        rfiByStatus: countByStatus(rfis),
        rfqByStatus: countByStatus(rfqs),
        prByStatus: countByStatus(prs),
        poByStatus: countByStatus(pos),
        byType: countByType([...rfis, ...rfqs, ...prs, ...pos]),
        monthlyTrend: Object.entries(monthlyData).map(([month, data]) => ({ month, ...data })),
        conversionRates: {
          rfiToRfq: rfis.length > 0 ? (rfqsFromRfi / rfis.length) * 100 : 0,
          rfqToPr: rfqs.length > 0 ? (prsFromRfq / rfqs.length) * 100 : 0,
          prToPo: prs.length > 0 ? (posFromPr / prs.length) * 100 : 0,
        },
      };
    },
  });
}

export function useBudgetAnalytics(dateRange: DateRange) {
  return useQuery({
    queryKey: ['budget-analytics', dateRange.from, dateRange.to],
    queryFn: async (): Promise<BudgetMetrics> => {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name_en, original_budget, revised_budget, budget_committed, budget_consumed, status');

      if (error) throw error;

      const projectList = projects || [];

      // Aggregate totals
      const totalOriginalBudget = projectList.reduce((sum, p) => sum + (p.original_budget || 0), 0);
      const totalRevisedBudget = projectList.reduce((sum, p) => sum + (p.revised_budget || p.original_budget || 0), 0);
      const totalCommitted = projectList.reduce((sum, p) => sum + (p.budget_committed || 0), 0);
      const totalConsumed = projectList.reduce((sum, p) => sum + (p.budget_consumed || 0), 0);
      const availableBudget = totalRevisedBudget - totalCommitted - totalConsumed;
      const utilizationPercentage = totalRevisedBudget > 0 ? ((totalCommitted + totalConsumed) / totalRevisedBudget) * 100 : 0;

      // Projects by health
      const healthCounts = { healthy: 0, warning: 0, critical: 0 };
      projectList.forEach(p => {
        const budget = p.revised_budget || p.original_budget || 1;
        const used = (p.budget_committed || 0) + (p.budget_consumed || 0);
        const utilization = (used / budget) * 100;
        if (utilization < 75) healthCounts.healthy++;
        else if (utilization < 90) healthCounts.warning++;
        else healthCounts.critical++;
      });

      // Top projects by spend
      const topProjectsBySpend = [...projectList]
        .sort((a, b) => (b.budget_consumed || 0) - (a.budget_consumed || 0))
        .slice(0, 5)
        .map(p => ({
          name: p.name_en,
          consumed: p.budget_consumed || 0,
          budget: p.revised_budget || p.original_budget || 0,
        }));

      // Variance by project
      const varianceByProject = projectList
        .filter(p => p.revised_budget && p.original_budget)
        .map(p => ({
          name: p.name_en,
          variance: (p.revised_budget || 0) - (p.original_budget || 0),
          variancePercent: p.original_budget ? (((p.revised_budget || 0) - p.original_budget) / p.original_budget) * 100 : 0,
        }))
        .slice(0, 10);

      // Fetch budget transactions for monthly consumption
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');
      
      const { data: transactions } = await supabase
        .from('project_budget_transactions')
        .select('amount, transaction_type, created_at')
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      const monthlyData: Record<string, { consumed: number; committed: number }> = {};
      (transactions || []).forEach(t => {
        const month = format(parseISO(t.created_at), 'MMM yyyy');
        if (!monthlyData[month]) {
          monthlyData[month] = { consumed: 0, committed: 0 };
        }
        if (t.transaction_type === 'expense') {
          monthlyData[month].consumed += t.amount;
        } else if (t.transaction_type === 'commitment') {
          monthlyData[month].committed += t.amount;
        }
      });

      return {
        totalOriginalBudget,
        totalRevisedBudget,
        totalCommitted,
        totalConsumed,
        availableBudget,
        utilizationPercentage,
        projectsByHealth: Object.entries(healthCounts).map(([health, count]) => ({ health, count })),
        topProjectsBySpend,
        monthlyConsumption: Object.entries(monthlyData).map(([month, data]) => ({ month, ...data })),
        varianceByProject,
      };
    },
  });
}

export function useVendorPerformance(dateRange: DateRange) {
  return useQuery({
    queryKey: ['vendor-performance', dateRange.from, dateRange.to],
    queryFn: async (): Promise<VendorMetrics> => {
      const [vendorsRes, rfqVendorsRes, posRes] = await Promise.all([
        supabase.from('vendors').select('id, company_name_en, status, vendor_type'),
        supabase.from('rfq_vendors').select('id, vendor_id, quotation_received, delivery_days, is_selected, invited_at, quotation_date'),
        supabase.from('purchase_orders').select('id, vendor_id, total_amount, status'),
      ]);

      const vendors = vendorsRes.data || [];
      const rfqVendors = rfqVendorsRes.data || [];
      const pos = posRes.data || [];

      // Count by status
      const statusCounts: Record<string, number> = {};
      (vendors as any[]).forEach(v => {
        statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;
      });

      // Count by type
      const typeCounts: Record<string, number> = {};
      (vendors as any[]).forEach(v => {
        const type = v.vendor_type || 'unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      // Top vendors by PO spend
      const vendorSpend: Record<string, { name: string; totalSpend: number; poCount: number }> = {};
      pos.forEach(po => {
        if (!vendorSpend[po.vendor_id]) {
          const vendor = vendors.find((v: any) => v.id === po.vendor_id);
          vendorSpend[po.vendor_id] = {
            name: vendor?.company_name_en || 'Unknown',
            totalSpend: 0,
            poCount: 0,
          };
        }
        vendorSpend[po.vendor_id].totalSpend += po.total_amount || 0;
        vendorSpend[po.vendor_id].poCount++;
      });

      const topBySpend = Object.values(vendorSpend)
        .sort((a, b) => b.totalSpend - a.totalSpend)
        .slice(0, 10);

      // Calculate average delivery days
      const deliveryDays = rfqVendors.filter(rv => rv.delivery_days).map(rv => rv.delivery_days!);
      const avgDeliveryDays = deliveryDays.length > 0 ? deliveryDays.reduce((a, b) => a + b, 0) / deliveryDays.length : 0;

      // Quotation metrics
      const quotationsReceived = rfqVendors.filter(rv => rv.quotation_received).length;
      const selectedVendors = rfqVendors.filter(rv => rv.is_selected).length;

      return {
        totalVendors: vendors.length,
        byStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
        byType: Object.entries(typeCounts).map(([type, count]) => ({ type, count })),
        topBySpend,
        avgDeliveryDays: Math.round(avgDeliveryDays),
        quotationMetrics: {
          totalQuotations: quotationsReceived,
          avgResponseTime: 0, // Would need timestamp comparison
          selectionRate: rfqVendors.length > 0 ? (selectedVendors / rfqVendors.length) * 100 : 0,
        },
      };
    },
  });
}

export function useInventoryAnalytics() {
  return useQuery({
    queryKey: ['inventory-analytics'],
    queryFn: async (): Promise<InventoryMetrics> => {
      const [itemsRes, categoriesRes, movementsRes] = await Promise.all([
        supabase.from('inventory_items').select('id, name_en, current_stock, min_stock_level, unit, unit_price, category_id'),
        supabase.from('inventory_categories').select('id, name_en'),
        supabase.from('stock_movements').select('id, movement_type, quantity, created_at').order('created_at', { ascending: false }).limit(500),
      ]);

      const items = itemsRes.data || [];
      const categories = categoriesRes.data || [];
      const movements = movementsRes.data || [];

      // Total value
      const totalValue = items.reduce((sum, item) => sum + ((item.current_stock || 0) * (item.unit_price || 0)), 0);

      // Stock status
      const stockStatus = { healthy: 0, low: 0, out: 0 };
      items.forEach(item => {
        if (item.current_stock <= 0) stockStatus.out++;
        else if (item.current_stock <= item.min_stock_level) stockStatus.low++;
        else stockStatus.healthy++;
      });

      // By category
      const categoryData: Record<string, { count: number; value: number }> = {};
      items.forEach(item => {
        const category = categories.find(c => c.id === item.category_id);
        const categoryName = category?.name_en || 'Uncategorized';
        if (!categoryData[categoryName]) {
          categoryData[categoryName] = { count: 0, value: 0 };
        }
        categoryData[categoryName].count++;
        categoryData[categoryName].value += (item.current_stock || 0) * (item.unit_price || 0);
      });

      // Low stock items
      const lowStockItems = items
        .filter(item => item.current_stock <= item.min_stock_level)
        .slice(0, 10)
        .map(item => ({
          name: item.name_en,
          currentStock: item.current_stock,
          minLevel: item.min_stock_level,
          unit: item.unit,
        }));

      // Movement trend (last 30 days)
      const movementByDate: Record<string, { inbound: number; outbound: number }> = {};
      movements.forEach(m => {
        const date = format(parseISO(m.created_at), 'MMM dd');
        if (!movementByDate[date]) {
          movementByDate[date] = { inbound: 0, outbound: 0 };
        }
        const isInbound = ['goods_receipt', 'adjustment_in', 'return'].includes(m.movement_type);
        if (isInbound) {
          movementByDate[date].inbound += m.quantity;
        } else {
          movementByDate[date].outbound += m.quantity;
        }
      });

      return {
        totalItems: items.length,
        totalValue,
        byStockStatus: Object.entries(stockStatus).map(([status, count]) => ({ status, count })),
        byCategory: Object.entries(categoryData).map(([category, data]) => ({ category, ...data })),
        lowStockItems,
        movementTrend: Object.entries(movementByDate).map(([date, data]) => ({ date, ...data })).slice(0, 14),
        turnoverRate: 0, // Would need historical data
      };
    },
  });
}
