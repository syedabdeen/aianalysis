import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DateRangeFilter } from '@/components/reports/DateRangeFilter';
import { POCopiesPanel } from '@/components/reports/POCopiesPanel';
import { ApprovedPettyCashPanel } from '@/components/reports/ApprovedPettyCashPanel';
import { useLanguage } from '@/contexts/LanguageContext';
import { DateRange } from '@/types/reports';
import { 
  BarChart3, Wallet, Users, Package, TrendingUp, Shield, AlertTriangle,
  FileText, Truck, Receipt, Building2, Briefcase, Target, PieChart,
  Clock, CheckCircle, XCircle, ArrowRight, Home, ArrowLeft, Filter, 
  Download, Calendar, LayoutDashboard, FileOutput
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Report category type
type ReportCategory = 'management' | 'operational' | 'supplier' | 'financial' | 'project' | 'advanced';

interface ReportItem {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  icon: typeof BarChart3;
  frequency: string;
  frequencyAr: string;
  users: string[];
  usersAr: string[];
  route?: string;
}

export default function ReportsCentrePage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('management');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const categories = [
    { 
      id: 'management' as ReportCategory, 
      label: 'Management / Executive', 
      labelAr: 'الإدارة التنفيذية',
      icon: Briefcase,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    { 
      id: 'operational' as ReportCategory, 
      label: 'Operational', 
      labelAr: 'التشغيلية',
      icon: BarChart3,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    { 
      id: 'supplier' as ReportCategory, 
      label: 'Supplier Management', 
      labelAr: 'إدارة الموردين',
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    { 
      id: 'financial' as ReportCategory, 
      label: 'Financial & Controls', 
      labelAr: 'المالية والرقابة',
      icon: Wallet,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    },
    { 
      id: 'project' as ReportCategory, 
      label: 'Project / CAPEX', 
      labelAr: 'المشاريع / الإنفاق الرأسمالي',
      icon: Building2,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10'
    },
    { 
      id: 'advanced' as ReportCategory, 
      label: 'Advanced / Strategic', 
      labelAr: 'المتقدمة / الاستراتيجية',
      icon: Target,
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10'
    },
  ];

  const reports: Record<ReportCategory, ReportItem[]> = {
    management: [
      {
        id: 'spend-analysis',
        title: 'Procurement Spend Analysis',
        titleAr: 'تحليل الإنفاق على المشتريات',
        description: 'Total spend by OPEX/CAPEX, category, supplier, and department',
        descriptionAr: 'إجمالي الإنفاق حسب التشغيلي/الرأسمالي والفئة والمورد والقسم',
        icon: PieChart,
        frequency: 'Monthly / Quarterly',
        frequencyAr: 'شهري / ربع سنوي',
        users: ['CEO', 'CFO', 'CPO'],
        usersAr: ['الرئيس التنفيذي', 'المدير المالي', 'مدير المشتريات'],
        route: '/reports/spend-analysis',
      },
      {
        id: 'cost-savings',
        title: 'Cost Savings & Value Report',
        titleAr: 'تقرير توفير التكاليف والقيمة',
        description: 'Negotiated savings, avoided costs, and budget variance',
        descriptionAr: 'المدخرات المتفاوض عليها والتكاليف المتجنبة وانحرافات الميزانية',
        icon: TrendingUp,
        frequency: 'Monthly / Quarterly',
        frequencyAr: 'شهري / ربع سنوي',
        users: ['Board', 'Finance', 'Management'],
        usersAr: ['مجلس الإدارة', 'المالية', 'الإدارة'],
        route: '/reports/cost-savings',
      },
      {
        id: 'performance-dashboard',
        title: 'Procurement Performance KPIs',
        titleAr: 'مؤشرات أداء المشتريات',
        description: 'PR-to-PO cycle time, RFQ turnaround, compliance rates',
        descriptionAr: 'زمن دورة طلب الشراء، وقت استجابة عرض الأسعار، معدلات الامتثال',
        icon: LayoutDashboard,
        frequency: 'Monthly',
        frequencyAr: 'شهري',
        users: ['Senior Management'],
        usersAr: ['الإدارة العليا'],
        route: '/reports/performance-kpis',
      },
      {
        id: 'compliance-governance',
        title: 'Compliance & Governance',
        titleAr: 'الامتثال والحوكمة',
        description: 'SOP adherence, approval matrix compliance, policy deviations',
        descriptionAr: 'التزام الإجراءات، امتثال مصفوفة الموافقات، انحرافات السياسات',
        icon: Shield,
        frequency: 'Quarterly / Annually',
        frequencyAr: 'ربع سنوي / سنوي',
        users: ['Audit', 'Compliance', 'Risk'],
        usersAr: ['التدقيق', 'الامتثال', 'المخاطر'],
        route: '/reports/compliance',
      },
      {
        id: 'supplier-risk',
        title: 'Supplier Risk & Dependency',
        titleAr: 'مخاطر الموردين والاعتماد',
        description: 'Single-source dependency, financial risk, ESG indicators',
        descriptionAr: 'الاعتماد على مورد واحد، المخاطر المالية، مؤشرات ESG',
        icon: AlertTriangle,
        frequency: 'Quarterly',
        frequencyAr: 'ربع سنوي',
        users: ['Risk Committee', 'Management'],
        usersAr: ['لجنة المخاطر', 'الإدارة'],
        route: '/reports/supplier-risk',
      },
    ],
    operational: [
      {
        id: 'pr-status',
        title: 'Purchase Requisition Status',
        titleAr: 'حالة طلبات الشراء',
        description: 'PR raised vs approved, pending with aging, by department',
        descriptionAr: 'طلبات الشراء المقدمة مقابل المعتمدة، المعلقة مع التقادم، حسب القسم',
        icon: FileText,
        frequency: 'Weekly',
        frequencyAr: 'أسبوعي',
        users: ['Department Heads', 'Procurement'],
        usersAr: ['رؤساء الأقسام', 'المشتريات'],
        route: '/reports/pr-status',
      },
      {
        id: 'rfq-analysis',
        title: 'RFQ & Quotation Analysis',
        titleAr: 'تحليل طلبات عروض الأسعار',
        description: 'RFQs issued, vendor responses, price trends, non-responsive vendors',
        descriptionAr: 'طلبات عروض الأسعار الصادرة، استجابات الموردين، اتجاهات الأسعار',
        icon: BarChart3,
        frequency: 'Weekly / Monthly',
        frequencyAr: 'أسبوعي / شهري',
        users: ['Procurement', 'Finance'],
        usersAr: ['المشتريات', 'المالية'],
        route: '/reports/rfq-analysis',
      },
      {
        id: 'po-status',
        title: 'Purchase Order Status',
        titleAr: 'حالة أوامر الشراء',
        description: 'PO issued, pending approval, value by supplier, open vs closed',
        descriptionAr: 'أوامر الشراء الصادرة، المعلقة للموافقة، القيمة حسب المورد',
        icon: FileText,
        frequency: 'Weekly',
        frequencyAr: 'أسبوعي',
        users: ['Procurement', 'Finance'],
        usersAr: ['المشتريات', 'المالية'],
        route: '/reports/po-status',
      },
      {
        id: 'delivery-grn',
        title: 'Delivery & GRN Report',
        titleAr: 'تقرير التسليم والاستلام',
        description: 'On-time, delayed, partial deliveries, GRN pending, rejections',
        descriptionAr: 'في الوقت المحدد، متأخر، جزئي، استلام معلق، مرفوض',
        icon: Truck,
        frequency: 'Weekly',
        frequencyAr: 'أسبوعي',
        users: ['Stores', 'Projects', 'QA/QC'],
        usersAr: ['المستودعات', 'المشاريع', 'الجودة'],
        route: '/reports/delivery-grn',
      },
      {
        id: 'invoice-payment',
        title: 'Invoice & Payment Status',
        titleAr: 'حالة الفواتير والمدفوعات',
        description: 'Invoices received, under verification, pending payments, aging',
        descriptionAr: 'الفواتير المستلمة، قيد التحقق، مدفوعات معلقة، التقادم',
        icon: Receipt,
        frequency: 'Weekly / Monthly',
        frequencyAr: 'أسبوعي / شهري',
        users: ['Finance', 'Procurement'],
        usersAr: ['المالية', 'المشتريات'],
        route: '/reports/invoice-payment',
      },
    ],
    supplier: [
      {
        id: 'supplier-performance',
        title: 'Supplier Performance Evaluation',
        titleAr: 'تقييم أداء الموردين',
        description: 'Price competitiveness, quality, delivery reliability, service',
        descriptionAr: 'تنافسية الأسعار، الجودة، موثوقية التسليم، الخدمة',
        icon: Users,
        frequency: 'Quarterly',
        frequencyAr: 'ربع سنوي',
        users: ['Procurement', 'Management'],
        usersAr: ['المشتريات', 'الإدارة'],
        route: '/reports/supplier-performance',
      },
      {
        id: 'vendor-registration',
        title: 'Vendor Registration Status',
        titleAr: 'حالة تسجيل الموردين',
        description: 'Active, blacklisted, expired documents, pending approvals',
        descriptionAr: 'نشط، محظور، مستندات منتهية، موافقات معلقة',
        icon: CheckCircle,
        frequency: 'Monthly',
        frequencyAr: 'شهري',
        users: ['Procurement', 'Compliance'],
        usersAr: ['المشتريات', 'الامتثال'],
        route: '/reports/vendor-registration',
      },
      {
        id: 'contract-utilization',
        title: 'Contract & Price Agreement',
        titleAr: 'العقود واتفاقيات الأسعار',
        description: 'Contract vs spot buying, expiry alerts, off-contract purchases',
        descriptionAr: 'الشراء التعاقدي مقابل الفوري، تنبيهات الانتهاء، الشراء خارج العقد',
        icon: FileText,
        frequency: 'Monthly / Quarterly',
        frequencyAr: 'شهري / ربع سنوي',
        users: ['Management', 'Audit'],
        usersAr: ['الإدارة', 'التدقيق'],
        route: '/reports/contract-utilization',
      },
    ],
    financial: [
      {
        id: 'budget-actual',
        title: 'Budget vs Actual Spend',
        titleAr: 'الميزانية مقابل الإنفاق الفعلي',
        description: 'Approved budget, actual spend, variance, forecasted overspend',
        descriptionAr: 'الميزانية المعتمدة، الإنفاق الفعلي، الانحراف، التجاوز المتوقع',
        icon: Wallet,
        frequency: 'Monthly',
        frequencyAr: 'شهري',
        users: ['Finance', 'CFO'],
        usersAr: ['المالية', 'المدير المالي'],
        route: '/reports/budget-actual',
      },
      {
        id: 'commitments-accruals',
        title: 'Commitments & Accruals',
        titleAr: 'الالتزامات والمستحقات',
        description: 'Outstanding PO commitments, GRNI, accrued liabilities',
        descriptionAr: 'التزامات أوامر الشراء المفتوحة، البضائع المستلمة غير المفوترة',
        icon: Clock,
        frequency: 'Monthly',
        frequencyAr: 'شهري',
        users: ['Finance'],
        usersAr: ['المالية'],
        route: '/reports/commitments-accruals',
      },
      {
        id: 'petty-cash',
        title: 'Petty Cash / Float Purchase',
        titleAr: 'المصروفات النثرية / العهدة',
        description: 'Float utilization, category spend, replenishment status',
        descriptionAr: 'استخدام العهدة، الإنفاق حسب الفئة، حالة التجديد',
        icon: Receipt,
        frequency: 'Monthly',
        frequencyAr: 'شهري',
        users: ['Finance', 'Audit'],
        usersAr: ['المالية', 'التدقيق'],
        route: '/reports/petty-cash',
      },
    ],
    project: [
      {
        id: 'project-procurement',
        title: 'Project Procurement Status',
        titleAr: 'حالة مشتريات المشروع',
        description: 'Material procurement status, long-lead items, schedule alignment',
        descriptionAr: 'حالة شراء المواد، المواد طويلة التوريد، توافق الجدول',
        icon: Building2,
        frequency: 'Weekly / Monthly',
        frequencyAr: 'أسبوعي / شهري',
        users: ['Project Director', 'PMO'],
        usersAr: ['مدير المشروع', 'مكتب إدارة المشاريع'],
        route: '/reports/project-procurement',
      },
      {
        id: 'capex-summary',
        title: 'CAPEX Procurement Summary',
        titleAr: 'ملخص المشتريات الرأسمالية',
        description: 'Approved CAPEX, awarded contracts, savings, completion status',
        descriptionAr: 'الميزانية الرأسمالية المعتمدة، العقود الممنوحة، التوفير، حالة الإنجاز',
        icon: TrendingUp,
        frequency: 'Monthly / Quarterly',
        frequencyAr: 'شهري / ربع سنوي',
        users: ['CEO', 'CFO'],
        usersAr: ['الرئيس التنفيذي', 'المدير المالي'],
        route: '/reports/capex-summary',
      },
    ],
    advanced: [
      {
        id: 'strategic-sourcing',
        title: 'Strategic Sourcing Pipeline',
        titleAr: 'خط المصادر الاستراتيجية',
        description: 'Long-term sourcing initiatives and category strategies',
        descriptionAr: 'مبادرات التوريد طويلة المدى واستراتيجيات الفئات',
        icon: Target,
        frequency: 'Quarterly',
        frequencyAr: 'ربع سنوي',
        users: ['CPO', 'Category Managers'],
        usersAr: ['مدير المشتريات', 'مديرو الفئات'],
        route: '/reports/strategic-sourcing',
      },
      {
        id: 'make-buy',
        title: 'Make vs Buy Analysis',
        titleAr: 'تحليل التصنيع مقابل الشراء',
        description: 'In-house vs outsourcing cost-benefit analysis',
        descriptionAr: 'تحليل التكلفة والفائدة للتصنيع الداخلي مقابل الاستعانة بمصادر خارجية',
        icon: PieChart,
        frequency: 'As needed',
        frequencyAr: 'حسب الحاجة',
        users: ['Operations', 'Finance'],
        usersAr: ['العمليات', 'المالية'],
        route: '/reports/make-buy',
      },
      {
        id: 'sustainability-esg',
        title: 'Sustainability & ESG Report',
        titleAr: 'تقرير الاستدامة والحوكمة',
        description: 'Environmental, social, governance procurement indicators',
        descriptionAr: 'مؤشرات المشتريات البيئية والاجتماعية والحوكمة',
        icon: Shield,
        frequency: 'Annually',
        frequencyAr: 'سنوي',
        users: ['ESG Committee', 'Board'],
        usersAr: ['لجنة ESG', 'مجلس الإدارة'],
        route: '/reports/sustainability-esg',
      },
      {
        id: 'ai-spend-intelligence',
        title: 'AI Spend Intelligence',
        titleAr: 'ذكاء الإنفاق بالذكاء الاصطناعي',
        description: 'AI-powered spend pattern analysis and anomaly detection',
        descriptionAr: 'تحليل أنماط الإنفاق واكتشاف الشذوذ بالذكاء الاصطناعي',
        icon: TrendingUp,
        frequency: 'Real-time',
        frequencyAr: 'فوري',
        users: ['Management', 'Audit'],
        usersAr: ['الإدارة', 'التدقيق'],
        route: '/reports/ai-spend-intelligence',
      },
    ],
  };

  const handleReportClick = (report: ReportItem) => {
    // Navigate to the legacy reports page with the appropriate tab
    navigate('/reports');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="gap-2">
            <Home className="h-4 w-4" />
            {language === 'ar' ? 'الرئيسية' : 'Home'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {language === 'ar' ? 'رجوع' : 'Back'}
          </Button>
        </div>

        <PageHeader
          title="Reports Centre"
          titleAr="مركز التقارير"
          description="Comprehensive procurement, financial, and operational reports"
          descriptionAr="تقارير شاملة للمشتريات والمالية والتشغيل"
          icon={BarChart3}
          actions={
            <div className="flex items-center gap-2">
              <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                {language === 'ar' ? 'تصدير الكل' : 'Export All'}
              </Button>
            </div>
          }
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إجمالي التقارير' : 'Total Reports'}</p>
                  <p className="text-2xl font-bold">{Object.values(reports).flat().length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'الفئات' : 'Categories'}</p>
                  <p className="text-2xl font-bold">{categories.length}</p>
                </div>
                <LayoutDashboard className="h-8 w-8 text-emerald-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تقارير أسبوعية' : 'Weekly Reports'}</p>
                  <p className="text-2xl font-bold">
                    {Object.values(reports).flat().filter(r => r.frequency.includes('Weekly')).length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ar' ? 'تقارير شهرية' : 'Monthly Reports'}</p>
                  <p className="text-2xl font-bold">
                    {Object.values(reports).flat().filter(r => r.frequency.includes('Monthly')).length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Categories Tabs */}
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as ReportCategory)} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
            {categories.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className={cn(
                  'gap-2 px-4 py-3 border rounded-lg data-[state=active]:border-primary data-[state=active]:bg-primary/10',
                  'hover:bg-muted transition-colors'
                )}
              >
                <category.icon className={cn('h-4 w-4', category.color)} />
                <span className="hidden sm:inline">
                  {language === 'ar' ? category.labelAr : category.label}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category.id} value={category.id} className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn('p-3 rounded-xl', category.bgColor)}>
                  <category.icon className={cn('h-6 w-6', category.color)} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {language === 'ar' ? category.labelAr : category.label}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? `${reports[category.id].length} تقارير متاحة`
                      : `${reports[category.id].length} reports available`
                    }
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports[category.id].map((report) => (
                  <Card 
                    key={report.id}
                    className="hover:shadow-lg transition-all cursor-pointer group hover:border-primary/50"
                    onClick={() => handleReportClick(report)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className={cn('p-2 rounded-lg', category.bgColor)}>
                          <report.icon className={cn('h-5 w-5', category.color)} />
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {language === 'ar' ? report.frequencyAr : report.frequency}
                        </Badge>
                      </div>
                      <CardTitle className="text-base mt-3 group-hover:text-primary transition-colors">
                        {language === 'ar' ? report.titleAr : report.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {language === 'ar' ? report.descriptionAr : report.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {(language === 'ar' ? report.usersAr : report.users).slice(0, 2).map((user, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {user}
                            </Badge>
                          ))}
                          {report.users.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{report.users.length - 2}
                            </Badge>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* PO Copies Section */}
        <div className="mt-8">
          <POCopiesPanel />
        </div>

        {/* Approved Petty Cash Section */}
        <div className="mt-8">
          <ApprovedPettyCashPanel />
        </div>

        {/* Quick Access to Existing Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {language === 'ar' ? 'الوصول السريع للتقارير' : 'Quick Access Reports'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' 
                ? 'الوصول السريع للتقارير التفاعلية مع التحليلات البيانية'
                : 'Quick access to interactive reports with visual analytics'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/reports')}
              >
                <PieChart className="h-6 w-6 text-blue-500" />
                <span>{language === 'ar' ? 'تحليلات المشتريات' : 'Procurement Analytics'}</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/reports')}
              >
                <Wallet className="h-6 w-6 text-amber-500" />
                <span>{language === 'ar' ? 'تحليل الميزانية' : 'Budget Analysis'}</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/reports')}
              >
                <Users className="h-6 w-6 text-purple-500" />
                <span>{language === 'ar' ? 'أداء الموردين' : 'Vendor Performance'}</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/reports')}
              >
                <Package className="h-6 w-6 text-emerald-500" />
                <span>{language === 'ar' ? 'تقارير المخزون' : 'Inventory Reports'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
