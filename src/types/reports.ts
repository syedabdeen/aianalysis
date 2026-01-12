export interface DateRange {
  from: Date;
  to: Date;
}

export interface ProcurementMetrics {
  totalRFIs: number;
  totalRFQs: number;
  totalPRs: number;
  totalPOs: number;
  rfiByStatus: { status: string; count: number }[];
  rfqByStatus: { status: string; count: number }[];
  prByStatus: { status: string; count: number }[];
  poByStatus: { status: string; count: number }[];
  byType: { type: string; count: number }[];
  monthlyTrend: { month: string; rfis: number; rfqs: number; prs: number; pos: number }[];
  conversionRates: {
    rfiToRfq: number;
    rfqToPr: number;
    prToPo: number;
  };
}

export interface BudgetMetrics {
  totalOriginalBudget: number;
  totalRevisedBudget: number;
  totalCommitted: number;
  totalConsumed: number;
  availableBudget: number;
  utilizationPercentage: number;
  projectsByHealth: { health: string; count: number }[];
  topProjectsBySpend: { name: string; consumed: number; budget: number }[];
  monthlyConsumption: { month: string; consumed: number; committed: number }[];
  varianceByProject: { name: string; variance: number; variancePercent: number }[];
}

export interface VendorMetrics {
  totalVendors: number;
  byStatus: { status: string; count: number }[];
  byType: { type: string; count: number }[];
  topBySpend: { name: string; totalSpend: number; poCount: number }[];
  avgDeliveryDays: number;
  quotationMetrics: {
    totalQuotations: number;
    avgResponseTime: number;
    selectionRate: number;
  };
}

export interface InventoryMetrics {
  totalItems: number;
  totalValue: number;
  byStockStatus: { status: string; count: number }[];
  byCategory: { category: string; count: number; value: number }[];
  lowStockItems: { name: string; currentStock: number; minLevel: number; unit: string }[];
  movementTrend: { date: string; inbound: number; outbound: number }[];
  turnoverRate: number;
}

export type ReportTab = 'procurement' | 'budget' | 'vendor' | 'inventory';

export type DatePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
