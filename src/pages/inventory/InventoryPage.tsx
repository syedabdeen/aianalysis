import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, AlertTriangle, PackageX, DollarSign, LayoutGrid, List } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ModuleKPIDashboard } from '@/components/layout/ModuleKPIDashboard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInventoryItems, useInventoryStats, useStockMovements } from '@/hooks/useInventory';
import { useGoodsReceipts } from '@/hooks/useGoodsReceipt';
import { MaterialCard } from '@/components/inventory/MaterialCard';
import { MaterialFilters } from '@/components/inventory/MaterialFilters';
import { StockMovementTable } from '@/components/inventory/StockMovementTable';
import { Skeleton } from '@/components/ui/skeleton';

export default function InventoryPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('materials');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [stockStatus, setStockStatus] = useState('all');

  const { data: stats, isLoading: loadingStats } = useInventoryStats();
  const { data: items, isLoading: loadingItems } = useInventoryItems({
    search,
    category_id: categoryId === 'all' ? undefined : categoryId,
    stock_status: stockStatus as any,
    is_active: true,
  });
  const { data: movements, isLoading: loadingMovements } = useStockMovements();
  const { data: receipts, isLoading: loadingReceipts } = useGoodsReceipts();

  const kpiItems = [
    {
      title: 'Total Materials',
      titleAr: 'إجمالي المواد',
      value: loadingStats ? '...' : stats?.totalItems.toString() || '0',
      icon: Package,
      color: 'info' as const,
    },
    {
      title: 'Low Stock Items',
      titleAr: 'مواد منخفضة المخزون',
      value: loadingStats ? '...' : stats?.lowStockCount.toString() || '0',
      icon: AlertTriangle,
      color: 'warning' as const,
      trend: stats?.lowStockCount && stats.lowStockCount > 0 ? 'down' as const : undefined,
    },
    {
      title: 'Out of Stock',
      titleAr: 'نفد المخزون',
      value: loadingStats ? '...' : stats?.outOfStockCount.toString() || '0',
      icon: PackageX,
      color: 'danger' as const,
      trend: stats?.outOfStockCount && stats.outOfStockCount > 0 ? 'down' as const : undefined,
    },
    {
      title: 'Total Value',
      titleAr: 'إجمالي القيمة',
      value: loadingStats ? '...' : `${(stats?.totalValue || 0).toLocaleString()} AED`,
      icon: DollarSign,
      color: 'success' as const,
    },
  ];

  const tabs = [
    { id: 'materials', label_en: 'Materials', label_ar: 'المواد', icon: Package },
    { id: 'movements', label_en: 'Stock Movements', label_ar: 'حركات المخزون', icon: List },
    { id: 'receipts', label_en: 'Goods Receipts', label_ar: 'سندات الاستلام', icon: Package },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Inventory Management"
          titleAr="إدارة المخزون"
          description="Manage materials, stock levels, and goods receipts"
          descriptionAr="إدارة المواد ومستويات المخزون وسندات الاستلام"
          actions={
            <div className="flex gap-2">
              <Button onClick={() => navigate('/inventory/new')}>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'مادة جديدة' : 'New Material'}
              </Button>
              <Button variant="outline" onClick={() => navigate('/inventory/adjustment')}>
                {language === 'ar' ? 'تعديل مخزون' : 'Stock Adjustment'}
              </Button>
            </div>
          }
        />

        <ModuleKPIDashboard items={kpiItems} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                  <tab.icon className="h-4 w-4" />
                  {language === 'ar' ? tab.label_ar : tab.label_en}
                </TabsTrigger>
              ))}
            </TabsList>

            {activeTab === 'materials' && (
              <div className="flex items-center gap-2">
                <Toggle
                  pressed={viewMode === 'grid'}
                  onPressedChange={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Toggle>
                <Toggle
                  pressed={viewMode === 'list'}
                  onPressedChange={() => setViewMode('list')}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </Toggle>
              </div>
            )}
          </div>

          <TabsContent value="materials" className="space-y-4">
            <MaterialFilters
              search={search}
              onSearchChange={setSearch}
              categoryId={categoryId}
              onCategoryChange={setCategoryId}
              stockStatus={stockStatus}
              onStockStatusChange={setStockStatus}
            />

            {loadingItems ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-[250px] rounded-lg" />
                ))}
              </div>
            ) : items && items.length > 0 ? (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'flex flex-col gap-4'
              }>
                {items.map((item) => (
                  <MaterialCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'ar' ? 'لا توجد مواد' : 'No materials found'}</p>
                <Button
                  variant="link"
                  onClick={() => navigate('/inventory/new')}
                  className="mt-2"
                >
                  {language === 'ar' ? 'إضافة مادة جديدة' : 'Add new material'}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="movements">
            {loadingMovements ? (
              <Skeleton className="h-[400px]" />
            ) : (
              <StockMovementTable movements={movements || []} showItemColumn />
            )}
          </TabsContent>

          <TabsContent value="receipts">
            {loadingReceipts ? (
              <Skeleton className="h-[400px]" />
            ) : receipts && receipts.length > 0 ? (
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left">{language === 'ar' ? 'رقم السند' : 'Receipt #'}</th>
                      <th className="p-3 text-left">{language === 'ar' ? 'أمر الشراء' : 'PO'}</th>
                      <th className="p-3 text-left">{language === 'ar' ? 'المورد' : 'Vendor'}</th>
                      <th className="p-3 text-left">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                      <th className="p-3 text-left">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt) => (
                      <tr key={receipt.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-mono">{receipt.receipt_code}</td>
                        <td className="p-3">{receipt.purchase_order?.code}</td>
                        <td className="p-3">
                          {language === 'ar' 
                            ? receipt.vendor?.company_name_ar 
                            : receipt.vendor?.company_name_en}
                        </td>
                        <td className="p-3">{receipt.receipt_date}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            receipt.status === 'complete' ? 'bg-green-100 text-green-800' :
                            receipt.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {receipt.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>{language === 'ar' ? 'لا توجد سندات استلام' : 'No goods receipts found'}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
