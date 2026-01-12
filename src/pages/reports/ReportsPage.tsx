import { useState } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangeFilter } from '@/components/reports/DateRangeFilter';
import { EnhancedReportExportButton } from '@/components/reports/EnhancedReportExportButton';
import { ReportHeader } from '@/components/reports/ReportHeader';
import { ProcurementCharts } from '@/components/reports/ProcurementCharts';
import { BudgetCharts } from '@/components/reports/BudgetCharts';
import { VendorCharts } from '@/components/reports/VendorCharts';
import { InventoryCharts } from '@/components/reports/InventoryCharts';
import { useProcurementAnalytics, useBudgetAnalytics, useVendorPerformance, useInventoryAnalytics } from '@/hooks/useReports';
import { useLanguage } from '@/contexts/LanguageContext';
import { DateRange, ReportTab } from '@/types/reports';
import { BarChart3, Wallet, Users, Package, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function ReportsPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ReportTab>('procurement');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Fetch data based on active tab
  const procurementQuery = useProcurementAnalytics(dateRange);
  const budgetQuery = useBudgetAnalytics(dateRange);
  const vendorQuery = useVendorPerformance(dateRange);
  const inventoryQuery = useInventoryAnalytics();

  const tabs: { key: ReportTab; label: { en: string; ar: string }; icon: typeof BarChart3 }[] = [
    { key: 'procurement', label: { en: 'Procurement Analytics', ar: 'تحليلات المشتريات' }, icon: BarChart3 },
    { key: 'budget', label: { en: 'Budget Analysis', ar: 'تحليل الميزانية' }, icon: Wallet },
    { key: 'vendor', label: { en: 'Vendor Performance', ar: 'أداء الموردين' }, icon: Users },
    { key: 'inventory', label: { en: 'Inventory Reports', ar: 'تقارير المخزون' }, icon: Package },
  ];

  const getReportConfig = () => {
    const reportNames: Record<ReportTab, { en: string; ar: string }> = {
      procurement: { en: 'Procurement Analytics', ar: 'تحليلات المشتريات' },
      budget: { en: 'Budget Analysis', ar: 'تحليل الميزانية' },
      vendor: { en: 'Vendor Performance', ar: 'أداء الموردين' },
      inventory: { en: 'Inventory Reports', ar: 'تقارير المخزون' },
    };
    return {
      reportType: activeTab,
      reportName: reportNames[activeTab][language],
      data: getCurrentData(),
      dateRange,
    };
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'procurement':
        return procurementQuery.data;
      case 'budget':
        return budgetQuery.data;
      case 'vendor':
        return vendorQuery.data;
      case 'inventory':
        return inventoryQuery.data;
      default:
        return null;
    }
  };

  const getReportTitle = () => {
    const titles: Record<ReportTab, { en: string; ar: string }> = {
      procurement: { en: 'Procurement Analytics Report', ar: 'تقرير تحليلات المشتريات' },
      budget: { en: 'Budget Analysis Report', ar: 'تقرير تحليل الميزانية' },
      vendor: { en: 'Vendor Performance Report', ar: 'تقرير أداء الموردين' },
      inventory: { en: 'Inventory Report', ar: 'تقرير المخزون' },
    };
    return titles[activeTab];
  };

  return (
    <DashboardLayout>
      {/* Print Header - Only visible when printing */}
      <ReportHeader 
        reportTitle={getReportTitle().en}
        reportTitleAr={getReportTitle().ar}
        dateRange={dateRange}
      />

      <div className="space-y-6 print:space-y-4">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="gap-2">
            <Home className="h-4 w-4" />
            {language === 'en' ? 'Home' : 'الرئيسية'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {language === 'en' ? 'Back' : 'رجوع'}
          </Button>
        </div>

        <PageHeader
          title={language === 'en' ? 'Reports & Analytics' : 'التقارير والتحليلات'}
          description={language === 'en' ? 'Comprehensive insights into your procurement, budget, vendors, and inventory' : 'رؤى شاملة حول المشتريات والميزانية والموردين والمخزون'}
        />

        {/* Filters and Export - Hidden when printing */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 print:hidden">
          <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
          <EnhancedReportExportButton 
            reportType={activeTab}
            reportName={getReportConfig().reportName}
            data={getCurrentData() as unknown as Record<string, unknown> | null}
            dateRange={dateRange}
          />
        </div>

        {/* Report Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportTab)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-2 bg-muted/30 p-2 print:hidden">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label[language]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="procurement">
            <div id="procurement-charts-container">
              <ProcurementCharts data={procurementQuery.data!} isLoading={procurementQuery.isLoading} />
            </div>
          </TabsContent>

          <TabsContent value="budget">
            <div id="budget-charts-container">
              <BudgetCharts data={budgetQuery.data!} isLoading={budgetQuery.isLoading} />
            </div>
          </TabsContent>

          <TabsContent value="vendor">
            <div id="vendor-charts-container">
              <VendorCharts data={vendorQuery.data!} isLoading={vendorQuery.isLoading} />
            </div>
          </TabsContent>

          <TabsContent value="inventory">
            <div id="inventory-charts-container">
              <InventoryCharts data={inventoryQuery.data!} isLoading={inventoryQuery.isLoading} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
