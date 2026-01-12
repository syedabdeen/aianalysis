import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { 
  FileText, Image, File, Download, Trash2, Eye, RefreshCw, 
  CheckCircle, AlertTriangle, Clock, MoreVertical, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { VendorDocumentWithExtraction, DOCUMENT_CLASSIFICATIONS } from '@/types/document';
import { useDeleteDocument } from '@/hooks/useDocumentUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DocumentCardProps {
  document: VendorDocumentWithExtraction;
  onReview: (doc: VendorDocumentWithExtraction) => void;
  onReExtract?: (doc: VendorDocumentWithExtraction) => void;
}

export function DocumentCard({ document, onReview, onReExtract }: DocumentCardProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const deleteDocument = useDeleteDocument();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const getFileIcon = () => {
    if (document.mime_type?.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
    if (document.mime_type === 'application/pdf') return <FileText className="h-8 w-8 text-red-500" />;
    if (document.mime_type?.includes('word')) return <FileText className="h-8 w-8 text-blue-600" />;
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  const classification = DOCUMENT_CLASSIFICATIONS.find(c => c.value === document.classification);

  const getExpiryStatus = () => {
    if (!document.expiry_date) return null;
    
    const expiryDate = new Date(document.expiry_date);
    const daysUntilExpiry = differenceInDays(expiryDate, new Date());

    if (daysUntilExpiry < 0) {
      return { 
        status: 'expired', 
        label: isRTL ? 'منتهي الصلاحية' : 'Expired',
        variant: 'destructive' as const,
        icon: <AlertTriangle className="h-3 w-3" />
      };
    }
    if (daysUntilExpiry <= 7) {
      return { 
        status: 'critical', 
        label: isRTL ? `${daysUntilExpiry} أيام` : `${daysUntilExpiry} days`,
        variant: 'destructive' as const,
        icon: <Clock className="h-3 w-3" />
      };
    }
    if (daysUntilExpiry <= 30) {
      return { 
        status: 'warning', 
        label: isRTL ? `${daysUntilExpiry} يوم` : `${daysUntilExpiry} days`,
        variant: 'secondary' as const,
        icon: <Clock className="h-3 w-3" />
      };
    }
    return { 
      status: 'valid', 
      label: format(expiryDate, 'MMM dd, yyyy'),
      variant: 'outline' as const,
      icon: <CheckCircle className="h-3 w-3" />
    };
  };

  const expiryStatus = getExpiryStatus();

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('vendor-documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(isRTL ? 'فشل التحميل' : 'Download failed');
    }
  };

  const handleDelete = () => {
    deleteDocument.mutate({
      id: document.id,
      filePath: document.file_path,
      vendorId: document.vendor_id,
    });
    setDeleteDialogOpen(false);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* File Icon */}
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              {getFileIcon()}
            </div>

            {/* Document Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium truncate">{document.file_name}</h4>
                {document.is_verified && (
                  <Shield className="h-4 w-4 text-green-500 flex-shrink-0" />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-2">
                {/* Classification Badge */}
                {classification && (
                  <Badge variant="outline" className="text-xs">
                    <span className="me-1">{classification.icon}</span>
                    {isRTL ? classification.labelAr : classification.labelEn}
                  </Badge>
                )}

                {/* Confidence Score */}
                {document.ai_confidence_score > 0 && (
                  <Badge 
                    variant={document.ai_confidence_score >= 80 ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {isRTL ? 'ثقة' : 'Conf'}: {document.ai_confidence_score}%
                  </Badge>
                )}

                {/* Expiry Badge */}
                {expiryStatus && (
                  <Badge variant={expiryStatus.variant} className="text-xs">
                    {expiryStatus.icon}
                    <span className="ms-1">{expiryStatus.label}</span>
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{formatFileSize(document.file_size)}</span>
                <span>{format(new Date(document.uploaded_at), 'MMM dd, yyyy')}</span>
                {document.version > 1 && (
                  <span className="text-primary">v{document.version}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" onClick={() => onReview(document)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onReview(document)}>
                    <Eye className="h-4 w-4 me-2" />
                    {isRTL ? 'مراجعة الاستخراج' : 'Review Extraction'}
                  </DropdownMenuItem>
                  {onReExtract && (
                    <DropdownMenuItem onClick={() => onReExtract(document)}>
                      <RefreshCw className="h-4 w-4 me-2" />
                      {isRTL ? 'إعادة الاستخراج' : 'Re-extract'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleDownload}>
                    <Download className="h-4 w-4 me-2" />
                    {isRTL ? 'تحميل' : 'Download'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 me-2" />
                    {isRTL ? 'حذف' : 'Delete'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'حذف المستند' : 'Delete Document'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL 
                ? 'هل أنت متأكد من حذف هذا المستند؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this document? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {isRTL ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
