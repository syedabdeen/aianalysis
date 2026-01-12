import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ModuleKPIDashboard, KPIItem } from '@/components/layout/ModuleKPIDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AIInsightsPanel } from '@/components/ai/AIInsightsPanel';
import { useLicenseExpiryCheck } from '@/hooks/useLicenseExpiryCheck';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  FolderKanban,
  Package,
  Users,
  ShoppingCart,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const { t, language, isRTL } = useLanguage();
  
  // Check license expiry on dashboard load (for admin users)
  useLicenseExpiryCheck();

  const kpiItems: KPIItem[] = [
    {
      title: 'Active Projects',
      titleAr: 'المشاريع النشطة',
      value: '12',
      subtitle: '3 pending approval',
      subtitleAr: '3 في انتظار الموافقة',
      icon: FolderKanban,
      trend: 'up',
      trendValue: '+2 this week',
      trendValueAr: '+2 هذا الأسبوع',
      color: 'primary',
    },
    {
      title: 'Inventory Items',
      titleAr: 'عناصر المخزون',
      value: '2,456',
      subtitle: '45 low stock alerts',
      subtitleAr: '45 تنبيه نقص مخزون',
      icon: Package,
      color: 'warning',
    },
    {
      title: 'Active Vendors',
      titleAr: 'الموردين النشطين',
      value: '89',
      subtitle: '5 pending registration',
      subtitleAr: '5 في انتظار التسجيل',
      icon: Users,
      trend: 'up',
      trendValue: '+8 this month',
      trendValueAr: '+8 هذا الشهر',
      color: 'success',
    },
    {
      title: 'Open POs',
      titleAr: 'أوامر الشراء المفتوحة',
      value: '34',
      subtitle: 'Worth SAR 1.2M',
      subtitleAr: 'بقيمة 1.2 مليون ريال',
      icon: ShoppingCart,
      color: 'info',
    },
  ];

  const recentActivities = [
    { id: 1, action: 'PO-0023 approved', actionAr: 'تم اعتماد PO-0023', time: '2 minutes ago', timeAr: 'منذ دقيقتين', status: 'success' },
    { id: 2, action: 'RFQ-0045 submitted', actionAr: 'تم تقديم RFQ-0045', time: '15 minutes ago', timeAr: 'منذ 15 دقيقة', status: 'pending' },
    { id: 3, action: 'Vendor ABC registered', actionAr: 'تم تسجيل المورد ABC', time: '1 hour ago', timeAr: 'منذ ساعة', status: 'success' },
    { id: 4, action: 'Material MAT-0089 low stock', actionAr: 'مخزون منخفض MAT-0089', time: '2 hours ago', timeAr: 'منذ ساعتين', status: 'warning' },
    { id: 5, action: 'PR-0012 pending review', actionAr: 'PR-0012 في انتظار المراجعة', time: '3 hours ago', timeAr: 'منذ 3 ساعات', status: 'pending' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const quickActions = [
    { icon: ShoppingCart, label: 'New PR', labelAr: 'طلب شراء جديد', path: '/procurement/pr/new' },
    { icon: Users, label: 'Add Vendor', labelAr: 'إضافة مورد', path: '/vendors/new' },
    { icon: Package, label: 'Stock Check', labelAr: 'فحص المخزون', path: '/inventory' },
    { icon: FolderKanban, label: 'View Projects', labelAr: 'عرض المشاريع', path: '/projects' },
  ];

  return (
    <DashboardLayout>
      <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        <PageHeader
          title={`${t('dashboard.welcome')}, ${profile?.full_name || 'User'}!`}
          titleAr={`${t('dashboard.welcome')}، ${profile?.full_name || 'المستخدم'}!`}
          description={role ? `${t(`role.${role}`)} • ${t('dashboard.overview')}` : t('dashboard.overview')}
          icon={LayoutDashboard}
          showBackButton={false}
        />

        {/* KPI Dashboard */}
        <ModuleKPIDashboard items={kpiItems} />

        {/* AI Insights & Recent Activity */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* AI Insights Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <AIInsightsPanel />
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-card/50 border-border/50 h-full">
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'النشاط الأخير' : 'Recent Activity'}</CardTitle>
                <CardDescription>{language === 'ar' ? 'آخر التحديثات في النظام' : 'Latest updates across the system'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivities.map((activity, index) => (
                    <motion.div 
                      key={activity.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-all duration-200 group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-full bg-muted/50 group-hover:bg-muted transition-colors">
                        {getStatusIcon(activity.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {language === 'ar' ? activity.actionAr : activity.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {language === 'ar' ? activity.timeAr : activity.time}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}</CardTitle>
              <CardDescription>{language === 'ar' ? 'المهام والاختصارات الشائعة' : 'Common tasks and shortcuts'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {quickActions.map((action, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className="p-4 cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 group hover:shadow-lg"
                      onClick={() => navigate(action.path)}
                    >
                      <div className="flex flex-col items-center gap-2 text-center">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 transition-all duration-300">
                          <action.icon className="h-6 w-6 text-primary" />
                        </div>
                        <span className="text-sm font-medium group-hover:text-primary transition-colors">
                          {language === 'ar' ? action.labelAr : action.label}
                        </span>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
