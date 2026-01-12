import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, FileText, Download, Eye, Mail, Search, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface POCopy {
  id: string;
  po_id: string;
  po_code: string;
  vendor_name: string | null;
  total_amount: number;
  currency: string;
  pdf_html: string | null;
  generated_at: string;
  email_sent_to: string | null;
  email_sent_at: string | null;
  email_status: string | null;
}

export function POCopiesPanel() {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<POCopy | null>(null);

  const { data: poCopies, isLoading } = useQuery({
    queryKey: ['po-copies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('po_copies')
        .select('*')
        .order('generated_at', { ascending: false });

      if (error) throw error;
      return data as POCopy[];
    },
  });

  const filteredCopies = poCopies?.filter(copy => 
    copy.po_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    copy.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePreview = (copy: POCopy) => {
    setSelectedPO(copy);
    setPreviewOpen(true);
  };

  const handleDownload = (copy: POCopy) => {
    if (!copy.pdf_html) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(copy.pdf_html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const getEmailStatusBadge = (status: string | null) => {
    switch (status) {
      case 'sent':
        return (
          <Badge className="bg-green-500/10 text-green-600 gap-1">
            <CheckCircle className="h-3 w-3" />
            {language === 'ar' ? 'تم الإرسال' : 'Sent'}
          </Badge>
        );
      case 'email_not_configured':
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            {language === 'ar' ? 'غير مُعد' : 'Not Configured'}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            {language === 'ar' ? 'في الانتظار' : 'Pending'}
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'نسخ أوامر الشراء المُصدرة' : 'Released Purchase Order Copies'}
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredCopies && filteredCopies.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'ar' ? 'رقم أمر الشراء' : 'PO Number'}</TableHead>
                <TableHead>{language === 'ar' ? 'المورد' : 'Vendor'}</TableHead>
                <TableHead className="text-right">{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                <TableHead>{language === 'ar' ? 'تاريخ الإصدار' : 'Release Date'}</TableHead>
                <TableHead>{language === 'ar' ? 'حالة الإرسال' : 'Email Status'}</TableHead>
                <TableHead className="text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCopies.map((copy) => (
                <TableRow key={copy.id}>
                  <TableCell className="font-medium">{copy.po_code}</TableCell>
                  <TableCell>{copy.vendor_name || '-'}</TableCell>
                  <TableCell className="text-right font-medium">
                    {copy.total_amount.toLocaleString()} {copy.currency}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(copy.generated_at), 'dd/MM/yyyy')}
                      <span className="text-muted-foreground ml-2">
                        {format(new Date(copy.generated_at), 'HH:mm')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getEmailStatusBadge(copy.email_status)}
                      {copy.email_sent_to && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {copy.email_sent_to}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(copy)}
                        disabled={!copy.pdf_html}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(copy)}
                        disabled={!copy.pdf_html}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{language === 'ar' ? 'لا توجد نسخ أوامر شراء حتى الآن' : 'No PO copies available yet'}</p>
            <p className="text-sm mt-2">
              {language === 'ar' 
                ? 'سيتم حفظ نسخ أوامر الشراء هنا تلقائياً عند الموافقة عليها'
                : 'PO copies will be automatically saved here when approved'}
            </p>
          </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {selectedPO?.po_code}
              </DialogTitle>
            </DialogHeader>
            {selectedPO?.pdf_html && (
              <div 
                className="bg-white rounded-lg shadow-inner"
                dangerouslySetInnerHTML={{ __html: selectedPO.pdf_html }}
              />
            )}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
              <Button onClick={() => selectedPO && handleDownload(selectedPO)}>
                <Download className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'طباعة / تحميل' : 'Print / Download'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
