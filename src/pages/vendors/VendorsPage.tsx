import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ModuleKPIDashboard, KPIItem } from '@/components/layout/ModuleKPIDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useVendors } from '@/hooks/useVendors';
import { VendorCard } from '@/components/vendors/VendorCard';
import { VendorFilters } from '@/components/vendors/VendorFilters';
import { VendorStatus, VendorType } from '@/types/vendor';
import { Plus, Building2, Loader2, CheckCircle, Clock, AlertTriangle, Users } from 'lucide-react';

export default function VendorsPage() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<VendorStatus | undefined>();
  const [vendorType, setVendorType] = useState<VendorType | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();

  const { data: vendors = [], isLoading } = useVendors({
    search: search || undefined,
    status,
    vendor_type: vendorType,
    category_id: categoryId,
  });

  const clearFilters = () => {
    setSearch('');
    setStatus(undefined);
    setVendorType(undefined);
    setCategoryId(undefined);
  };

  const kpiItems: KPIItem[] = [
    {
      title: 'Total Vendors',
      titleAr: 'إجمالي الموردين',
      value: vendors.length.toString(),
      subtitle: 'Registered vendors',
      subtitleAr: 'الموردين المسجلين',
      icon: Users,
      color: 'primary',
    },
    {
      title: 'Active Vendors',
      titleAr: 'الموردين النشطين',
      value: vendors.filter(v => v.status === 'approved').length.toString(),
      subtitle: 'Ready for orders',
      subtitleAr: 'جاهزون للطلبات',
      icon: CheckCircle,
      trend: 'up',
      trendValue: '+5 this month',
      trendValueAr: '+5 هذا الشهر',
      color: 'success',
    },
    {
      title: 'Pending Approval',
      titleAr: 'في انتظار الموافقة',
      value: vendors.filter(v => v.status === 'pending').length.toString(),
      subtitle: 'Awaiting review',
      subtitleAr: 'في انتظار المراجعة',
      icon: Clock,
      color: 'warning',
    },
    {
      title: 'Expiring Documents',
      titleAr: 'مستندات منتهية الصلاحية',
      value: '3',
      subtitle: 'Within 30 days',
      subtitleAr: 'خلال 30 يوم',
      icon: AlertTriangle,
      trend: 'down',
      trendValue: '-2 vs last month',
      trendValueAr: '-2 مقارنة بالشهر الماضي',
      color: 'danger',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Vendor Management"
          titleAr="إدارة الموردين"
          description="Manage your vendor database"
          descriptionAr="إدارة قاعدة بيانات الموردين"
          icon={Building2}
          actions={
            <Button asChild>
              <Link to="/vendors/new">
                <Plus className="h-4 w-4 me-2" />
                {isRTL ? 'إضافة مورد' : 'Add Vendor'}
              </Link>
            </Button>
          }
        />

        {/* KPI Dashboard */}
        <ModuleKPIDashboard items={kpiItems} />

        {/* Filters */}
        <VendorFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          vendorType={vendorType}
          onVendorTypeChange={setVendorType}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          onClear={clearFilters}
        />

        {/* Vendors Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : vendors.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {isRTL ? 'لا يوجد موردين' : 'No vendors found'}
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {isRTL
                  ? 'ابدأ بإضافة مورد جديد لبناء قاعدة بياناتك'
                  : 'Start by adding a new vendor to build your database'}
              </p>
              <Button asChild>
                <Link to="/vendors/new">
                  <Plus className="h-4 w-4 me-2" />
                  {isRTL ? 'إضافة أول مورد' : 'Add First Vendor'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
