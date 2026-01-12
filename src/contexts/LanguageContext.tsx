import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Auth
    'auth.login': 'Login',
    'auth.signup': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.fullName': 'Full Name',
    'auth.loginTitle': 'Welcome Back',
    'auth.signupTitle': 'Create Account',
    'auth.loginSubtitle': 'Enter your credentials to access your account',
    'auth.signupSubtitle': 'Enter your details to create a new account',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': 'Already have an account?',
    'auth.logout': 'Logout',
    'auth.loggingIn': 'Logging in...',
    'auth.signingUp': 'Signing up...',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.projects': 'Projects',
    'nav.inventory': 'Inventory',
    'nav.vendors': 'Vendors',
    'nav.procurement': 'Procurement',
    'nav.reports': 'Reports',
    'nav.admin': 'Admin',
    'nav.settings': 'Settings',
    'nav.users': 'Users',
    'nav.departments': 'Departments',
    'nav.costCenters': 'Cost Centers',
    'nav.approvalMatrix': 'Approval Matrix',
    'nav.approvals': 'Approvals',
    
    // Dashboard
    'dashboard.welcome': 'Welcome',
    'dashboard.overview': 'Overview',
    'dashboard.recentActivity': 'Recent Activity',
    
    // Admin
    'admin.title': 'Administration',
    'admin.userManagement': 'User Management',
    'admin.departmentManagement': 'Department Management',
    'admin.costCenterManagement': 'Cost Center Management',
    'admin.addUser': 'Add User',
    'admin.addDepartment': 'Add Department',
    'admin.addCostCenter': 'Add Cost Center',
    'admin.edit': 'Edit',
    'admin.delete': 'Delete',
    'admin.save': 'Save',
    'admin.cancel': 'Cancel',
    'admin.code': 'Code',
    'admin.nameEn': 'Name (English)',
    'admin.nameAr': 'Name (Arabic)',
    'admin.department': 'Department',
    'admin.role': 'Role',
    'admin.active': 'Active',
    'admin.inactive': 'Inactive',
    'admin.status': 'Status',
    
    // Roles
    'role.admin': 'Admin',
    'role.manager': 'Manager',
    'role.buyer': 'Buyer',
    'role.approver': 'Approver',
    'role.viewer': 'Viewer',
    
    // Vendors
    'vendor.title': 'Vendor Management',
    'vendor.addVendor': 'Add Vendor',
    'vendor.editVendor': 'Edit Vendor',
    'vendor.newVendor': 'New Vendor',
    'vendor.companyNameEn': 'Company Name (English)',
    'vendor.companyNameAr': 'Company Name (Arabic)',
    'vendor.type': 'Type',
    'vendor.category': 'Category',
    'vendor.email': 'Email',
    'vendor.phone': 'Phone',
    'vendor.website': 'Website',
    'vendor.tradeLicense': 'Trade License No.',
    'vendor.licenseExpiry': 'License Expiry',
    'vendor.taxNumber': 'Tax Registration No.',
    'vendor.address': 'Address',
    'vendor.city': 'City',
    'vendor.country': 'Country',
    'vendor.contacts': 'Contacts',
    'vendor.bankDetails': 'Bank Details',
    'vendor.documents': 'Documents',
    'vendor.aiInsights': 'AI Insights',
    'vendor.pending': 'Pending',
    'vendor.approved': 'Approved',
    'vendor.suspended': 'Suspended',
    'vendor.blacklisted': 'Blacklisted',
    'vendor.material': 'Material Supplier',
    'vendor.service': 'Service Provider',
    'vendor.subcontractor': 'Subcontractor',
    'vendor.rating': 'Rating',
    'vendor.riskScore': 'Risk Score',
    'vendor.approve': 'Approve',
    'vendor.calculateRisk': 'Calculate Risk',
    
    // Common
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.actions': 'Actions',
    'common.loading': 'Loading...',
    'common.noData': 'No data available',
    'common.confirm': 'Confirm',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.language': 'Language',
    'common.view': 'View',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.create': 'Create',
    'common.update': 'Update',
  },
  ar: {
    // Auth
    'auth.login': 'تسجيل الدخول',
    'auth.signup': 'إنشاء حساب',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.fullName': 'الاسم الكامل',
    'auth.loginTitle': 'مرحباً بعودتك',
    'auth.signupTitle': 'إنشاء حساب جديد',
    'auth.loginSubtitle': 'أدخل بياناتك للوصول إلى حسابك',
    'auth.signupSubtitle': 'أدخل بياناتك لإنشاء حساب جديد',
    'auth.noAccount': 'ليس لديك حساب؟',
    'auth.hasAccount': 'لديك حساب بالفعل؟',
    'auth.logout': 'تسجيل الخروج',
    'auth.loggingIn': 'جاري تسجيل الدخول...',
    'auth.signingUp': 'جاري إنشاء الحساب...',
    
    // Navigation
    'nav.dashboard': 'لوحة التحكم',
    'nav.projects': 'المشاريع',
    'nav.inventory': 'المخزون',
    'nav.vendors': 'الموردون',
    'nav.procurement': 'المشتريات',
    'nav.reports': 'التقارير',
    'nav.admin': 'الإدارة',
    'nav.settings': 'الإعدادات',
    'nav.users': 'المستخدمون',
    'nav.departments': 'الأقسام',
    'nav.costCenters': 'مراكز التكلفة',
    'nav.approvalMatrix': 'مصفوفة الموافقات',
    'nav.approvals': 'الموافقات',
    
    // Dashboard
    'dashboard.welcome': 'مرحباً',
    'dashboard.overview': 'نظرة عامة',
    'dashboard.recentActivity': 'النشاط الأخير',
    
    // Admin
    'admin.title': 'الإدارة',
    'admin.userManagement': 'إدارة المستخدمين',
    'admin.departmentManagement': 'إدارة الأقسام',
    'admin.costCenterManagement': 'إدارة مراكز التكلفة',
    'admin.addUser': 'إضافة مستخدم',
    'admin.addDepartment': 'إضافة قسم',
    'admin.addCostCenter': 'إضافة مركز تكلفة',
    'admin.edit': 'تعديل',
    'admin.delete': 'حذف',
    'admin.save': 'حفظ',
    'admin.cancel': 'إلغاء',
    'admin.code': 'الرمز',
    'admin.nameEn': 'الاسم (إنجليزي)',
    'admin.nameAr': 'الاسم (عربي)',
    'admin.department': 'القسم',
    'admin.role': 'الدور',
    'admin.active': 'نشط',
    'admin.inactive': 'غير نشط',
    'admin.status': 'الحالة',
    
    // Roles
    'role.admin': 'مدير النظام',
    'role.manager': 'مدير',
    'role.buyer': 'مشتري',
    'role.approver': 'معتمد',
    'role.viewer': 'مشاهد',
    
    // Vendors
    'vendor.title': 'إدارة الموردين',
    'vendor.addVendor': 'إضافة مورد',
    'vendor.editVendor': 'تعديل المورد',
    'vendor.newVendor': 'مورد جديد',
    'vendor.companyNameEn': 'اسم الشركة (إنجليزي)',
    'vendor.companyNameAr': 'اسم الشركة (عربي)',
    'vendor.type': 'النوع',
    'vendor.category': 'الفئة',
    'vendor.email': 'البريد الإلكتروني',
    'vendor.phone': 'الهاتف',
    'vendor.website': 'الموقع الإلكتروني',
    'vendor.tradeLicense': 'رقم الرخصة التجارية',
    'vendor.licenseExpiry': 'تاريخ انتهاء الرخصة',
    'vendor.taxNumber': 'رقم التسجيل الضريبي',
    'vendor.address': 'العنوان',
    'vendor.city': 'المدينة',
    'vendor.country': 'الدولة',
    'vendor.contacts': 'جهات الاتصال',
    'vendor.bankDetails': 'التفاصيل المصرفية',
    'vendor.documents': 'المستندات',
    'vendor.aiInsights': 'رؤى الذكاء الاصطناعي',
    'vendor.pending': 'معلق',
    'vendor.approved': 'معتمد',
    'vendor.suspended': 'موقوف',
    'vendor.blacklisted': 'محظور',
    'vendor.material': 'مورد مواد',
    'vendor.service': 'مزود خدمات',
    'vendor.subcontractor': 'مقاول باطن',
    'vendor.rating': 'التقييم',
    'vendor.riskScore': 'درجة المخاطر',
    'vendor.approve': 'اعتماد',
    'vendor.calculateRisk': 'حساب المخاطر',
    
    // Common
    'common.search': 'بحث',
    'common.filter': 'تصفية',
    'common.actions': 'الإجراءات',
    'common.loading': 'جاري التحميل...',
    'common.noData': 'لا توجد بيانات',
    'common.confirm': 'تأكيد',
    'common.success': 'نجاح',
    'common.error': 'خطأ',
    'common.language': 'اللغة',
    'common.view': 'عرض',
    'common.back': 'رجوع',
    'common.next': 'التالي',
    'common.create': 'إنشاء',
    'common.update': 'تحديث',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('preferred_language') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'ar')) {
      setLanguageState(savedLang);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('preferred_language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL: language === 'ar' }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
