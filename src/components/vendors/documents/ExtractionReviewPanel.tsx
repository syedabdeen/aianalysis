import { useState } from 'react';
import { Check, X, Edit2, RefreshCw, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  VendorDocumentWithExtraction, 
  DocumentClassification,
  DOCUMENT_CLASSIFICATIONS,
  ExtractedField
} from '@/types/document';
import { useUpdateDocument, useReExtractDocument, useVerifyDocument } from '@/hooks/useDocumentUpload';
import { supabase } from '@/integrations/supabase/client';

interface ExtractionReviewPanelProps {
  document: VendorDocumentWithExtraction;
  onClose: () => void;
  onApplyToVendor?: (document: VendorDocumentWithExtraction) => void;
}

export function ExtractionReviewPanel({ 
  document, 
  onClose,
  onApplyToVendor 
}: ExtractionReviewPanelProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const updateDocument = useUpdateDocument();
  const reExtract = useReExtractDocument();
  const verifyDocument = useVerifyDocument();

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const extractedData = document.extracted_data as {
    classification?: string;
    confidence?: number;
    extractedFields?: ExtractedField[];
    suggestedMappings?: Array<{ vendorField: string; extractedValue: string; confidence: number }>;
  } | null;

  const extractedFields = extractedData?.extractedFields || [];
  const suggestedMappings = extractedData?.suggestedMappings || [];

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 80) return 'default';
    if (confidence >= 50) return 'secondary';
    return 'destructive';
  };

  const loadPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const { data } = await supabase.storage
        .from('vendor-documents')
        .createSignedUrl(document.file_path, 3600);
      
      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl);
      }
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleUpdateField = (fieldKey: string, newValue: string) => {
    const updatedFields = extractedFields.map(f => 
      f.key === fieldKey ? { ...f, value: newValue } : f
    );
    
    updateDocument.mutate({
      id: document.id,
      updates: {
        extracted_data: {
          ...extractedData,
          extractedFields: updatedFields,
        },
      },
    });
    
    setEditingField(null);
    setEditValue('');
  };

  const handleUpdateClassification = (newClassification: DocumentClassification) => {
    updateDocument.mutate({
      id: document.id,
      updates: { classification: newClassification },
    });
  };

  const handleReExtract = () => {
    reExtract.mutate({
      id: document.id,
      vendorId: document.vendor_id,
      filePath: document.file_path,
    });
  };

  const handleVerify = () => {
    verifyDocument.mutate({
      id: document.id,
      vendorId: document.vendor_id,
    });
  };

  const handleApplyMappings = () => {
    // Pass the full document so the parent can extract what it needs
    onApplyToVendor?.(document);
  };

  return (
    <div className="flex h-full">
      {/* Document Preview */}
      <div className="w-1/2 border-e bg-muted/30 p-4">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{isRTL ? 'معاينة المستند' : 'Document Preview'}</h3>
            {!previewUrl && (
              <Button variant="outline" size="sm" onClick={loadPreview} disabled={isLoadingPreview}>
                {isLoadingPreview ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Eye className="h-4 w-4 me-2" />
                    {isRTL ? 'تحميل المعاينة' : 'Load Preview'}
                  </>
                )}
              </Button>
            )}
          </div>
          
          <div className="flex-1 rounded-lg border bg-background overflow-hidden">
            {previewUrl ? (
              document.mime_type?.startsWith('image/') ? (
                <img 
                  src={previewUrl} 
                  alt={document.file_name}
                  className="w-full h-full object-contain"
                />
              ) : document.mime_type === 'application/pdf' ? (
                <iframe 
                  src={previewUrl} 
                  className="w-full h-full"
                  title={document.file_name}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {isRTL ? 'لا يمكن معاينة هذا النوع من الملفات' : 'Preview not available for this file type'}
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {isRTL ? 'انقر لتحميل المعاينة' : 'Click to load preview'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Extraction Results */}
      <div className="w-1/2 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">{isRTL ? 'نتائج الاستخراج' : 'Extraction Results'}</h3>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReExtract}
              disabled={reExtract.isPending}
            >
              <RefreshCw className={cn('h-4 w-4 me-2', reExtract.isPending && 'animate-spin')} />
              {isRTL ? 'إعادة الاستخراج' : 'Re-scan'}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            {/* Document Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  {isRTL ? 'معلومات المستند' : 'Document Info'}
                  {document.is_verified && (
                    <Badge variant="default" className="bg-green-500">
                      <Check className="h-3 w-3 me-1" />
                      {isRTL ? 'تم التحقق' : 'Verified'}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{isRTL ? 'التصنيف' : 'Classification'}</span>
                  <Select 
                    value={document.classification || 'miscellaneous'} 
                    onValueChange={(v) => handleUpdateClassification(v as DocumentClassification)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CLASSIFICATIONS.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          <span className="flex items-center gap-2">
                            <span>{c.icon}</span>
                            <span>{isRTL ? c.labelAr : c.labelEn}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{isRTL ? 'درجة الثقة' : 'Confidence Score'}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={document.ai_confidence_score} className="w-24 h-2" />
                    <span className={cn('text-sm font-medium', getConfidenceColor(document.ai_confidence_score))}>
                      {document.ai_confidence_score}%
                    </span>
                  </div>
                </div>

                {document.expiry_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'}</span>
                    <Badge 
                      variant={new Date(document.expiry_date) < new Date() ? 'destructive' : 'secondary'}
                    >
                      {new Date(document.expiry_date).toLocaleDateString()}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Extracted Fields */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{isRTL ? 'الحقول المستخرجة' : 'Extracted Fields'}</CardTitle>
              </CardHeader>
              <CardContent>
                {extractedFields.length > 0 ? (
                  <div className="space-y-3">
                    {extractedFields.map((field, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{field.key}</p>
                          {editingField === field.key ? (
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-8 text-sm"
                                autoFocus
                              />
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8"
                                onClick={() => handleUpdateField(field.key, editValue)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8"
                                onClick={() => setEditingField(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">{field.value}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getConfidenceBadgeVariant(field.confidence)}>
                            {Math.round(field.confidence)}%
                          </Badge>
                          {editingField !== field.key && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingField(field.key);
                                setEditValue(field.value);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {isRTL ? 'لم يتم استخراج أي حقول' : 'No fields extracted'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Suggested Mappings */}
            {suggestedMappings.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{isRTL ? 'التعيينات المقترحة' : 'Suggested Mappings'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {suggestedMappings.map((mapping, index) => (
                      <div key={index} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{mapping.vendorField}</p>
                          <p className="text-xs text-muted-foreground">{mapping.extractedValue}</p>
                        </div>
                        <Badge variant={getConfidenceBadgeVariant(mapping.confidence)}>
                          {Math.round(mapping.confidence)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <Button 
                    className="w-full" 
                    onClick={handleApplyMappings}
                    disabled={!onApplyToVendor}
                  >
                    <Check className="h-4 w-4 me-2" />
                    {isRTL ? 'تطبيق على ملف المورد' : 'Apply to Vendor Profile'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Actions Footer */}
        <div className="p-4 border-t flex gap-2">
          {!document.is_verified && (
            <Button 
              variant="default" 
              className="flex-1"
              onClick={handleVerify}
              disabled={verifyDocument.isPending}
            >
              <Check className="h-4 w-4 me-2" />
              {isRTL ? 'تحقق من المستند' : 'Verify Document'}
            </Button>
          )}
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {isRTL ? 'إغلاق' : 'Close'}
          </Button>
        </div>
      </div>
    </div>
  );
}
