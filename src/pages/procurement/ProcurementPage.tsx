import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ModuleKPIDashboard, KPIItem } from '@/components/layout/ModuleKPIDashboard';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, FileSearch, FileQuestion, FileText, ShoppingCart, Clock, 
  CheckCircle, List, LayoutGrid, Sparkles, Globe, Brain, ArrowRight, Wallet 
} from 'lucide-react';
import { RFIList } from '@/components/procurement/rfi/RFIList';
import { RFQList } from '@/components/procurement/rfq/RFQList';
import { PRList } from '@/components/procurement/pr/PRList';
import { POList } from '@/components/procurement/po/POList';
import { KanbanBoard } from '@/components/procurement/KanbanBoard';
import { usePurchaseRequests } from '@/hooks/usePurchaseRequest';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrder';
import { useRFQs } from '@/hooks/useRFQ';
import { useRFIs } from '@/hooks/useRFI';
import { cn } from '@/lib/utils';

export default function ProcurementPage() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('rfi');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Fetch all procurement items for Kanban view
  const { data: purchaseRequests, isLoading: prLoading } = usePurchaseRequests();
  const { data: purchaseOrders, isLoading: poLoading } = usePurchaseOrders();
  const { data: rfqs, isLoading: rfqLoading } = useRFQs();
  const { data: rfis, isLoading: rfiLoading } = useRFIs();

  const kanbanItems = useMemo(() => {
    const items: any[] = [];
    
    purchaseRequests?.forEach(pr => {
      items.push({
        id: pr.id,
        code: pr.code,
        title: language === 'ar' ? pr.title_ar : pr.title_en,
        status: pr.status,
        total_amount: pr.total_amount,
        currency: pr.currency,
        created_at: pr.created_at,
        type: 'pr' as const,
      });
    });

    purchaseOrders?.forEach(po => {
      items.push({
        id: po.id,
        code: po.code,
        title: language === 'ar' ? po.title_ar : po.title_en,
        status: po.status,
        total_amount: po.total_amount,
        currency: po.currency,
        created_at: po.created_at,
        type: 'po' as const,
      });
    });

    rfqs?.forEach(rfq => {
      items.push({
        id: rfq.id,
        code: rfq.code,
        title: language === 'ar' ? rfq.title_ar : rfq.title_en,
        status: rfq.status,
        created_at: rfq.created_at,
        type: 'rfq' as const,
      });
    });

    rfis?.forEach(rfi => {
      items.push({
        id: rfi.id,
        code: rfi.code,
        title: language === 'ar' ? rfi.title_ar : rfi.title_en,
        status: rfi.status,
        created_at: rfi.created_at,
        type: 'rfi' as const,
      });
    });

    return items;
  }, [purchaseRequests, purchaseOrders, rfqs, rfis, language]);

  const tabs = [
    { id: 'rfi', labelEn: 'RFI', labelAr: 'طلب معلومات', icon: FileQuestion, description: 'Request for Information', descriptionAr: 'طلبات المعلومات من الموردين' },
    { id: 'rfq', labelEn: 'RFQ', labelAr: 'طلب عرض أسعار', icon: FileSearch, description: 'Request for Quotation', descriptionAr: 'طلب عروض الأسعار' },
    { id: 'pr', labelEn: 'Purchase Requests', labelAr: 'طلبات الشراء', icon: FileText, description: 'Internal purchase requests', descriptionAr: 'طلبات الشراء الداخلية' },
    { id: 'po', labelEn: 'Purchase Orders', labelAr: 'أوامر الشراء', icon: ShoppingCart, description: 'Issued purchase orders', descriptionAr: 'أوامر الشراء الصادرة' },
  ];

  // Quick action boxes configuration
  const quickActions = [
    {
      id: 'rfi',
      icon: FileQuestion,
      title: language === 'ar' ? 'طلب معلومات جديد' : 'New RFI',
      subtitle: language === 'ar' ? 'Request for Information' : 'Request for Information',
      description: language === 'ar' ? 'إنشاء طلب معلومات من الموردين' : 'Create request for vendor information',
      color: 'from-blue-500/20 to-blue-600/10',
      iconColor: 'text-blue-500',
      borderColor: 'hover:border-blue-500/50',
      route: '/procurement/rfi/new',
    },
    {
      id: 'rfq',
      icon: FileSearch,
      title: language === 'ar' ? 'طلب عرض أسعار جديد' : 'New RFQ',
      subtitle: language === 'ar' ? 'Request for Quotation' : 'Request for Quotation',
      description: language === 'ar' ? 'إنشاء طلب عروض أسعار' : 'Create quotation request',
      color: 'from-purple-500/20 to-purple-600/10',
      iconColor: 'text-purple-500',
      borderColor: 'hover:border-purple-500/50',
      route: '/procurement/rfq/new',
    },
    {
      id: 'pr',
      icon: FileText,
      title: language === 'ar' ? 'طلب شراء جديد' : 'New PR',
      subtitle: language === 'ar' ? 'Purchase Request' : 'Purchase Request',
      description: language === 'ar' ? 'إنشاء طلب شراء للموافقة' : 'Create purchase request for approval',
      color: 'from-amber-500/20 to-amber-600/10',
      iconColor: 'text-amber-500',
      borderColor: 'hover:border-amber-500/50',
      route: '/procurement/pr/new',
    },
    {
      id: 'po',
      icon: ShoppingCart,
      title: language === 'ar' ? 'أمر شراء جديد' : 'New PO',
      subtitle: language === 'ar' ? 'Purchase Order' : 'Purchase Order',
      description: language === 'ar' ? 'إصدار أمر شراء للمورد' : 'Issue purchase order to vendor',
      color: 'from-emerald-500/20 to-emerald-600/10',
      iconColor: 'text-emerald-500',
      borderColor: 'hover:border-emerald-500/50',
      route: '/procurement/po/new',
    },
    {
      id: 'petty-cash',
      icon: Wallet,
      title: language === 'ar' ? 'مطالبة مصروفات نثرية' : 'Petty Cash Claim',
      subtitle: language === 'ar' ? 'Petty Cash Replenishment' : 'Petty Cash Replenishment',
      description: language === 'ar' ? 'إنشاء مطالبة تعويض المصروفات النثرية' : 'Create petty cash replenishment request',
      color: 'from-pink-500/20 to-pink-600/10',
      iconColor: 'text-pink-500',
      borderColor: 'hover:border-pink-500/50',
      route: '/procurement/petty-cash/new',
    },
  ];

  const kpiItems: KPIItem[] = [
    {
      title: 'Open RFIs',
      titleAr: 'طلبات المعلومات المفتوحة',
      value: String(rfis?.filter(r => r.status === 'draft' || r.status === 'submitted').length || 0),
      subtitle: 'Pending response',
      subtitleAr: 'في انتظار الرد',
      icon: FileQuestion,
      trend: 'up',
      trendValue: '+2 this week',
      trendValueAr: '+2 هذا الأسبوع',
      color: 'info',
    },
    {
      title: 'Active RFQs',
      titleAr: 'طلبات الأسعار النشطة',
      value: String(rfqs?.filter(r => r.status === 'submitted' || r.status === 'under_review').length || 0),
      subtitle: 'Awaiting quotes',
      subtitleAr: 'في انتظار العروض',
      icon: FileSearch,
      trend: 'up',
      trendValue: '+4 this week',
      trendValueAr: '+4 هذا الأسبوع',
      color: 'primary',
    },
    {
      title: 'Pending PRs',
      titleAr: 'طلبات الشراء المعلقة',
      value: String(purchaseRequests?.filter(pr => pr.status === 'under_review' || pr.status === 'submitted').length || 0),
      subtitle: 'Awaiting approval',
      subtitleAr: 'في انتظار الموافقة',
      icon: Clock,
      trend: 'neutral',
      trendValue: 'Same as last week',
      trendValueAr: 'مثل الأسبوع الماضي',
      color: 'warning',
    },
    {
      title: 'Active POs',
      titleAr: 'أوامر الشراء النشطة',
      value: String(purchaseOrders?.filter(po => po.status === 'approved' || po.status === 'submitted').length || 0),
      subtitle: 'In progress',
      subtitleAr: 'قيد التنفيذ',
      icon: CheckCircle,
      trend: 'up',
      trendValue: '+8 this month',
      trendValueAr: '+8 هذا الشهر',
      color: 'success',
    },
  ];

  const handleCreate = () => {
    switch (activeTab) {
      case 'rfi':
        navigate('/procurement/rfi/new');
        break;
      case 'rfq':
        navigate('/procurement/rfq/new');
        break;
      case 'pr':
        navigate('/procurement/pr/new');
        break;
      case 'po':
        navigate('/procurement/po/new');
        break;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Procurement Cycle"
          titleAr="دورة المشتريات"
          description="Manage RFIs, RFQs, Purchase Requests, and Purchase Orders"
          descriptionAr="إدارة طلبات المعلومات وعروض الأسعار وطلبات الشراء وأوامر الشراء"
          icon={ShoppingCart}
          actions={
            <div className="flex items-center gap-2">
              <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'list' | 'kanban')}>
                <ToggleGroupItem value="list" aria-label="List view" className="px-3">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="kanban" aria-label="Kanban view" className="px-3">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
              <Button onClick={handleCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                {language === 'ar' ? 'إنشاء جديد' : 'Create New'}
              </Button>
            </div>
          }
        />

        {/* Quick Action Boxes - Primary Creation Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {quickActions.map((action) => (
            <Card
              key={action.id}
              className={cn(
                'cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group border-2',
                action.borderColor
              )}
              onClick={() => navigate(action.route)}
            >
              <CardContent className="p-5">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={cn(
                    'p-4 rounded-2xl bg-gradient-to-br transition-transform group-hover:scale-110',
                    action.color
                  )}>
                    <action.icon className={cn('h-8 w-8', action.iconColor)} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base mb-1 group-hover:text-primary transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {action.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>{language === 'ar' ? 'إنشاء' : 'Create'}</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI Modules Section */}
        <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-primary" />
              {language === 'ar' ? 'أدوات الذكاء الاصطناعي' : 'AI-Powered Tools'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' 
                ? 'استخدم قوة الذكاء الاصطناعي لتحليل العروض والسوق' 
                : 'Leverage AI for intelligent offer analysis and market research'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 group"
                onClick={() => navigate('/procurement/ai/offer-analysis')}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
                      <Sparkles className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">
                        {language === 'ar' ? 'تحليل العروض' : 'AI Offer Analysis'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' 
                          ? 'قم بتحميل عروض الموردين للمقارنة الذكية' 
                          : 'Upload quotations for intelligent comparison'}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">PDF</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">Excel</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">Images</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-500/50 group"
                onClick={() => navigate('/procurement/ai/market-analysis')}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 group-hover:from-blue-500/30 group-hover:to-blue-500/20 transition-colors">
                      <Globe className="h-7 w-7 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">
                        {language === 'ar' ? 'تحليل السوق' : 'AI Market Analysis'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' 
                          ? 'اعثر على المصنعين والموردين في منطقتك' 
                          : 'Find manufacturers & suppliers in your region'}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">Image Search</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">Text Search</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <ModuleKPIDashboard items={kpiItems} />

        {viewMode === 'kanban' ? (
          <KanbanBoard 
            items={kanbanItems} 
            isLoading={prLoading || poLoading || rfqLoading || rfiLoading} 
          />
        ) : (
          /* Sub-module Tabs */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid h-auto p-1 bg-card/50 border border-border/50">
              {tabs.map((tab) => {
                const isActiveTab = activeTab === tab.id;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      'gap-2 py-3 px-4 relative transition-all duration-300 data-[state=active]:shadow-lg',
                      isActiveTab && 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:border-primary/30'
                    )}
                    title={language === 'ar' ? tab.descriptionAr : tab.description}
                  >
                    <tab.icon className={cn('h-4 w-4', isActiveTab && 'text-primary')} />
                    <span className={cn('hidden sm:inline', isActiveTab && 'text-primary font-medium')}>
                      {language === 'ar' ? tab.labelAr : tab.labelEn}
                    </span>
                    {isActiveTab && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="rfi" className="space-y-4 animate-fade-in">
              <RFIList />
            </TabsContent>

            <TabsContent value="rfq" className="space-y-4 animate-fade-in">
              <RFQList />
            </TabsContent>

            <TabsContent value="pr" className="space-y-4 animate-fade-in">
              <PRList />
            </TabsContent>

            <TabsContent value="po" className="space-y-4 animate-fade-in">
              <POList />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
