import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import {
  LayoutDashboard,
  FolderKanban,
  Package,
  Users,
  ShoppingCart,
  FileText,
  Settings,
  Shield,
  Building2,
  Landmark,
  GitBranch,
  ClipboardCheck,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import procuremindLogo from '@/assets/procuremind-logo.jpeg';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  roles?: Array<'admin' | 'manager' | 'buyer' | 'approver' | 'viewer'>;
  description?: string;
  descriptionAr?: string;
}

const mainNavItems: NavItem[] = [
  { 
    title: 'nav.dashboard', 
    url: '/dashboard', 
    icon: LayoutDashboard,
    description: 'Overview of all activities and quick stats',
    descriptionAr: 'نظرة عامة على جميع الأنشطة والإحصائيات السريعة'
  },
  { 
    title: 'nav.approvals', 
    url: '/approvals', 
    icon: ClipboardCheck,
    description: 'View and manage document approvals',
    descriptionAr: 'عرض وإدارة موافقات المستندات'
  },
  { 
    title: 'nav.projects', 
    url: '/projects', 
    icon: FolderKanban,
    description: 'Manage projects, budgets, and milestones',
    descriptionAr: 'إدارة المشاريع والميزانيات والمراحل'
  },
  { 
    title: 'nav.inventory', 
    url: '/inventory', 
    icon: Package,
    description: 'Track inventory items and stock levels',
    descriptionAr: 'تتبع عناصر المخزون ومستويات المخزون'
  },
  { 
    title: 'nav.vendors', 
    url: '/vendors', 
    icon: Users,
    description: 'Manage vendor database and documents',
    descriptionAr: 'إدارة قاعدة بيانات الموردين والمستندات'
  },
  { 
    title: 'nav.procurement', 
    url: '/procurement', 
    icon: ShoppingCart,
    description: 'Handle RFI, RFQ, PR, and PO workflow',
    descriptionAr: 'التعامل مع طلبات المعلومات والعروض والشراء'
  },
  { 
    title: 'nav.reports', 
    url: '/reports-centre', 
    icon: FileText,
    description: 'Comprehensive Reports Centre with all analytics',
    descriptionAr: 'مركز التقارير الشامل مع جميع التحليلات'
  },
];

const adminNavItems: NavItem[] = [
  { 
    title: 'nav.users', 
    url: '/admin/users', 
    icon: Shield, 
    roles: ['admin'],
    description: 'Manage user accounts and permissions',
    descriptionAr: 'إدارة حسابات المستخدمين والصلاحيات'
  },
  { 
    title: 'nav.departments', 
    url: '/admin/departments', 
    icon: Building2, 
    roles: ['admin'],
    description: 'Configure organizational departments',
    descriptionAr: 'تكوين الأقسام التنظيمية'
  },
  { 
    title: 'nav.costCenters', 
    url: '/admin/cost-centers', 
    icon: Landmark, 
    roles: ['admin'],
    description: 'Manage cost centers for budgeting',
    descriptionAr: 'إدارة مراكز التكلفة للميزانية'
  },
  { 
    title: 'nav.approvalMatrix', 
    url: '/admin/approval-matrix', 
    icon: GitBranch, 
    roles: ['admin'],
    description: 'Configure approval workflows and rules',
    descriptionAr: 'تكوين سير عمل الموافقة والقواعد'
  },
];

export const AppSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const { companySettings } = useCompanySettings();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const companyName = language === 'ar'
    ? companySettings?.company_name_ar || companySettings?.company_name_en
    : companySettings?.company_name_en;

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const renderNavButton = (item: NavItem) => {
    const active = isActive(item.url);
    const Icon = item.icon;

    return (
      <SidebarMenuButton
        type="button"
        isActive={active}
        aria-current={active ? 'page' : undefined}
        onClick={() => navigate(item.url)}
        className={cn(
          'transition-all duration-200 rounded-lg relative group/navitem gap-3',
          active
            ? 'bg-primary/10 border border-primary/20 shadow-sm'
            : 'hover:bg-muted/50 border border-transparent'
        )}
      >
        {/* Active indicator */}
        {active && (
          <div
            className={cn(
              'absolute h-8 w-1 rounded-full bg-primary shadow-lg shadow-primary/50',
              isRTL ? 'right-0 -mr-3' : 'left-0 -ml-3'
            )}
          />
        )}

        <div
          className={cn(
            'p-1.5 rounded-lg transition-all duration-200',
            active
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground group-hover/navitem:bg-primary/10 group-hover/navitem:text-primary'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
        </div>

        {!collapsed && (
          <span
            className={cn(
              'transition-colors duration-200',
              active ? 'text-primary' : 'text-foreground group-hover/navitem:text-primary'
            )}
          >
            {t(item.title)}
          </span>
        )}
      </SidebarMenuButton>
    );
  };

  return (
    <Sidebar collapsible="icon" className={isRTL ? 'border-l border-r-0' : ''}>
      <SidebarHeader className="border-b border-border/50 p-3">
        {/* App Branding with Logo */}
        <div className="flex items-center gap-3 mb-3">
          <img
            src={procuremindLogo}
            alt="ProcureMind Logo"
            className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-lg"
          />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-base text-primary">ProcureMind AI</span>
              <span className="text-xs text-muted-foreground">
                {language === 'ar' ? 'نظام المشتريات الذكي' : 'Intelligent Procurement'}
              </span>
            </div>
          )}
        </div>

        {/* Company Branding */}
        {companySettings && (
          <>
            <Separator className="my-2" />
            <div className="flex items-center gap-2 mt-2">
              {companySettings.logo_url ? (
                <img
                  src={companySettings.logo_url}
                  alt="Company Logo"
                  className="h-9 w-9 object-contain rounded-md shrink-0 border border-border/50"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-9 h-9 bg-muted rounded-md flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              {!collapsed && companyName && (
                <span className="font-bold text-sm text-foreground truncate max-w-[140px]">
                  {companyName}
                </span>
              )}
            </div>
          </>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className={cn('text-xs uppercase tracking-wider text-muted-foreground/70', collapsed && 'sr-only')}>
            {language === 'ar' ? 'القائمة الرئيسية' : 'Main Menu'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.url} className="mb-1">
                  {renderNavButton(item)}
                </SidebarMenuItem>
              ))}
             </SidebarMenu>
           </SidebarGroupContent>
         </SidebarGroup>

         {isAdmin && (
           <SidebarGroup className="mt-4">
             <SidebarGroupLabel className={cn('text-xs uppercase tracking-wider text-muted-foreground/70', collapsed && 'sr-only')}>
               {language === 'ar' ? 'الإدارة' : 'Administration'}
             </SidebarGroupLabel>
             <SidebarGroupContent>
               <SidebarMenu>
                 {adminNavItems.map((item) => (
                   <SidebarMenuItem key={item.url} className="mb-1">
                     {renderNavButton(item)}
                   </SidebarMenuItem>
                 ))}
               </SidebarMenu>
             </SidebarGroupContent>
           </SidebarGroup>
         )}
       </SidebarContent>

       <SidebarFooter className="border-t border-border/50 p-2">
         <SidebarMenu>
           <SidebarMenuItem>
             {renderNavButton({
               title: 'nav.settings',
               url: '/settings',
               icon: Settings,
               description: 'Configure system preferences',
               descriptionAr: 'تكوين تفضيلات النظام',
             })}
           </SidebarMenuItem>
         </SidebarMenu>
       </SidebarFooter>
    </Sidebar>
  );
};
