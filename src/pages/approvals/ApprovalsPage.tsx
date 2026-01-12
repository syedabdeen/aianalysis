import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingApprovals, PendingApprovalItem } from '@/hooks/usePendingApprovals';
import { useApprovedDocuments, ApprovedDocumentItem } from '@/hooks/useApprovedDocuments';
import { useApproveWorkflowStep, useRejectWorkflow } from '@/hooks/useApprovalWorkflow';
import { useUpdatePurchaseRequest } from '@/hooks/usePurchaseRequest';
import { useUpdatePurchaseOrder } from '@/hooks/usePurchaseOrder';
import { ApprovalActionsDialog } from '@/components/approval/ApprovalActionsDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  ClipboardCheck,
  FileText,
  ShoppingCart,
  Users,
  Send,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  ClipboardList,
  History,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

const DOCUMENT_TYPE_CONFIG = {
  vendor: { 
    icon: Users, 
    label: 'Vendor Registration', 
    labelAr: 'تسجيل مورد',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    route: '/vendors'
  },
  rfi: { 
    icon: FileText, 
    label: 'RFI', 
    labelAr: 'طلب معلومات',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    route: '/procurement/rfi'
  },
  rfq: { 
    icon: Send, 
    label: 'RFQ', 
    labelAr: 'طلب عرض أسعار',
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    route: '/procurement/rfq'
  },
  purchase_request: { 
    icon: ShoppingCart, 
    label: 'Purchase Request', 
    labelAr: 'طلب شراء',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    route: '/procurement/pr'
  },
  purchase_order: { 
    icon: ClipboardCheck, 
    label: 'Purchase Order', 
    labelAr: 'أمر شراء',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    route: '/procurement/po'
  }
};

export default function ApprovalsPage() {
  const { language, isRTL } = useLanguage();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: pendingItems, isLoading: pendingLoading } = usePendingApprovals();
  const { data: approvedItems, isLoading: approvedLoading } = useApprovedDocuments();

  const [activeTab, setActiveTab] = useState('pending');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPendingItems = pendingItems?.filter(item => {
    if (typeFilter !== 'all' && item.documentType !== typeFilter) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        item.documentCode.toLowerCase().includes(search) ||
        item.documentTitle.toLowerCase().includes(search) ||
        item.initiatorName.toLowerCase().includes(search)
      );
    }
    return true;
  }) || [];

  const filteredApprovedItems = approvedItems?.filter(item => {
    if (typeFilter !== 'all' && item.documentType !== typeFilter) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        item.documentCode.toLowerCase().includes(search) ||
        item.documentTitle.toLowerCase().includes(search) ||
        item.initiatorName.toLowerCase().includes(search)
      );
    }
    return true;
  }) || [];

  const canUserApprove = (item: PendingApprovalItem) => {
    if (isAdmin) return true;
    return item.currentApproverId === user?.id;
  };

  const getAgingBadge = (days: number) => {
    if (days >= 7) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{days}d</Badge>;
    }
    if (days >= 3) {
      return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1"><Clock className="h-3 w-3" />{days}d</Badge>;
    }
    return <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 gap-1"><Clock className="h-3 w-3" />{days}d</Badge>;
  };

  const handleViewDocument = (documentType: string, id: string) => {
    const config = DOCUMENT_TYPE_CONFIG[documentType as keyof typeof DOCUMENT_TYPE_CONFIG];
    navigate(`${config.route}/${id}`);
  };

  // Summary counts
  const typeCounts = pendingItems?.reduce((acc, item) => {
    acc[item.documentType] = (acc[item.documentType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const myPendingCount = pendingItems?.filter(item => item.currentApproverId === user?.id).length || 0;
  const myApprovedCount = approvedItems?.filter(item => item.initiatorId === user?.id).length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Approvals"
          titleAr="الموافقات"
          description="View and manage all document approvals"
          descriptionAr="عرض وإدارة جميع موافقات المستندات"
          icon={ClipboardCheck}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{pendingItems?.length || 0}</div>
              <div className="text-xs text-muted-foreground">
                {language === 'ar' ? 'إجمالي المعلق' : 'Total Pending'}
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-primary/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{myPendingCount}</div>
              <div className="text-xs text-muted-foreground">
                {language === 'ar' ? 'بانتظار موافقتي' : 'Awaiting My Approval'}
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{approvedItems?.length || 0}</div>
              <div className="text-xs text-muted-foreground">
                {language === 'ar' ? 'المعتمدة' : 'Approved'}
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{myApprovedCount}</div>
              <div className="text-xs text-muted-foreground">
                {language === 'ar' ? 'طلباتي المعتمدة' : 'My Approved'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'ar' ? 'بحث بالرمز أو العنوان أو المنشئ...' : 'Search by code, title, or initiator...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={language === 'ar' ? 'نوع المستند' : 'Document Type'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'جميع الأنواع' : 'All Types'}</SelectItem>
                  {Object.entries(DOCUMENT_TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {language === 'ar' ? config.labelAr : config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Pending/Approved */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="pending" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              {language === 'ar' ? 'قيد الموافقة' : 'Pending'}
              <Badge variant="secondary" className="ml-1">{filteredPendingItems.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <History className="h-4 w-4" />
              {language === 'ar' ? 'المعتمدة' : 'Approved'}
              <Badge variant="secondary" className="ml-1">{filteredApprovedItems.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Pending Documents Tab */}
          <TabsContent value="pending">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  {language === 'ar' ? 'المستندات قيد الموافقة' : 'Pending Documents'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredPendingItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{language === 'ar' ? 'لا توجد مستندات معلقة' : 'No pending documents'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الرمز' : 'Reference'}</TableHead>
                          <TableHead className="min-w-[200px]">{language === 'ar' ? 'العنوان' : 'Title'}</TableHead>
                          <TableHead>{language === 'ar' ? 'المنشئ' : 'Initiator'}</TableHead>
                          <TableHead>{language === 'ar' ? 'المعتمد الحالي' : 'Current Approver'}</TableHead>
                          <TableHead>{language === 'ar' ? 'المستوى' : 'Level'}</TableHead>
                          <TableHead>{language === 'ar' ? 'المبلغ' : 'Value'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                          <TableHead>{language === 'ar' ? 'العمر' : 'Aging'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPendingItems.map((item) => {
                          const config = DOCUMENT_TYPE_CONFIG[item.documentType];
                          const Icon = config.icon;
                          const canApprove = canUserApprove(item);

                          return (
                            <TableRow 
                              key={`${item.documentType}-${item.id}`}
                              className={canApprove ? 'bg-primary/5' : ''}
                            >
                              <TableCell>
                                <Badge variant="outline" className={config.color}>
                                  <Icon className="h-3 w-3 mr-1" />
                                  {language === 'ar' ? config.labelAr : config.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{item.documentCode}</TableCell>
                              <TableCell className="font-medium">{item.documentTitle}</TableCell>
                              <TableCell>{item.initiatorName}</TableCell>
                              <TableCell>
                                <span className={canApprove ? 'text-primary font-medium' : ''}>
                                  {item.currentApproverName}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {item.approvalLevel}/{item.totalLevels}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {item.amount > 0 ? (
                                  <span className="font-medium">
                                    {item.currency} {item.amount.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                  {language === 'ar' ? 'قيد الانتظار' : 'Pending'}
                                </Badge>
                              </TableCell>
                              <TableCell>{getAgingBadge(item.agingDays)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewDocument(item.documentType, item.id)}
                                    className="gap-1"
                                  >
                                    <Eye className="h-3 w-3" />
                                    {language === 'ar' ? 'عرض' : 'View'}
                                  </Button>
                                  {canApprove && (
                                    <Button
                                      size="sm"
                                      className="gap-1 bg-primary hover:bg-primary/90"
                                      onClick={() => handleViewDocument(item.documentType, item.id)}
                                    >
                                      <CheckCircle className="h-3 w-3" />
                                      {language === 'ar' ? 'مراجعة وموافقة' : 'Review & Approve'}
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approved Documents Tab */}
          <TabsContent value="approved">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  {language === 'ar' ? 'المستندات المعتمدة' : 'Approved Documents'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {approvedLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredApprovedItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{language === 'ar' ? 'لا توجد مستندات معتمدة' : 'No approved documents'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الرمز' : 'Reference'}</TableHead>
                          <TableHead className="min-w-[200px]">{language === 'ar' ? 'العنوان' : 'Title'}</TableHead>
                          <TableHead>{language === 'ar' ? 'المنشئ' : 'Initiator'}</TableHead>
                          <TableHead>{language === 'ar' ? 'المعتمد النهائي' : 'Final Approver'}</TableHead>
                          <TableHead>{language === 'ar' ? 'المبلغ' : 'Value'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                          <TableHead>{language === 'ar' ? 'تاريخ الاعتماد' : 'Approved Date'}</TableHead>
                          <TableHead>{language === 'ar' ? 'ملاحظات' : 'Remarks'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredApprovedItems.map((item) => {
                          const config = DOCUMENT_TYPE_CONFIG[item.documentType as keyof typeof DOCUMENT_TYPE_CONFIG];
                          const Icon = config?.icon || FileText;

                          return (
                            <TableRow key={`${item.documentType}-${item.id}`}>
                              <TableCell>
                                <Badge variant="outline" className={config?.color || ''}>
                                  <Icon className="h-3 w-3 mr-1" />
                                  {language === 'ar' ? config?.labelAr : config?.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{item.documentCode}</TableCell>
                              <TableCell className="font-medium">{item.documentTitle}</TableCell>
                              <TableCell>{item.initiatorName}</TableCell>
                              <TableCell>{item.finalApproverName || '-'}</TableCell>
                              <TableCell>
                                {item.amount > 0 ? (
                                  <span className="font-medium">
                                    {item.currency} {item.amount.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {language === 'ar' ? 'معتمد' : 'Approved'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {item.approvedAt ? format(new Date(item.approvedAt), 'dd/MM/yyyy') : '-'}
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate">
                                {item.remarks || '-'}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDocument(item.documentType, item.id)}
                                  className="gap-1"
                                >
                                  <Eye className="h-3 w-3" />
                                  {language === 'ar' ? 'عرض' : 'View'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}