import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Edit, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface FailedExtraction {
  index: number;
  supplierName: string;
  issue: string;
  fileName?: string;
}

interface ExtractionWarningBannerProps {
  extractedQuotations: any[];
  uploadedFiles?: { file: { name: string } }[];
  onRetryExtraction: (supplierIndex: number) => void;
  onManualEntry: (supplierIndex: number) => void;
  isRetrying?: boolean;
  retryingIndex?: number | null;
}

export function ExtractionWarningBanner({ 
  extractedQuotations,
  uploadedFiles,
  onRetryExtraction,
  onManualEntry,
  isRetrying = false,
  retryingIndex = null
}: ExtractionWarningBannerProps) {
  const { language } = useLanguage();
  
  // Identify failed extractions
  const failedExtractions: FailedExtraction[] = extractedQuotations
    .map((q, idx) => ({
      index: idx,
      supplierName: q.supplier?.name || `Supplier ${idx + 1}`,
      issue: q._extractionIssue || '',
      fileName: uploadedFiles?.[idx]?.file?.name,
      hasIssue: Boolean(q._extractionIssue) || 
                (q.items?.length === 0 && q.commercial?.total === 0) ||
                q.pricedItemsCount === 0
    }))
    .filter(q => q.hasIssue) as FailedExtraction[];
  
  if (failedExtractions.length === 0) return null;
  
  const getIssueMessage = (issue: string): string => {
    if (!issue) {
      return language === 'ar' 
        ? 'لم يتم استخراج أي بيانات'
        : 'No data could be extracted';
    }
    
    // Translate common issues
    if (issue.includes('timeout') || issue.includes('timed out')) {
      return language === 'ar'
        ? 'انتهت مهلة المعالجة - المستند معقد جداً'
        : 'Processing timed out - document too complex';
    }
    if (issue.includes('rate limit') || issue.includes('Rate limit')) {
      return language === 'ar'
        ? 'تم تجاوز الحد الأقصى - يرجى المحاولة لاحقاً'
        : 'Rate limit reached - please try again later';
    }
    if (issue.includes('credits') || issue.includes('Payment required')) {
      return language === 'ar'
        ? 'نفاد الرصيد - يرجى إضافة رصيد'
        : 'Credits exhausted - please add credits';
    }
    if (issue.includes('empty') || issue.includes('No content')) {
      return language === 'ar'
        ? 'الملف فارغ أو تالف'
        : 'File appears empty or corrupted';
    }
    if (issue.includes('No items')) {
      return language === 'ar'
        ? 'لم يتم العثور على بنود في العرض'
        : 'No line items found in quotation';
    }
    
    return issue;
  };
  
  return (
    <Alert variant="destructive" className="mb-4 border-orange-300 bg-orange-50 dark:bg-orange-950/20">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800 dark:text-orange-400">
        {language === 'ar' 
          ? `تم اكتشاف مشاكل في الاستخراج (${failedExtractions.length})`
          : `Extraction Issues Detected (${failedExtractions.length})`}
      </AlertTitle>
      <AlertDescription>
        <p className="mb-3 text-orange-700 dark:text-orange-300">
          {language === 'ar'
            ? 'بعض عروض الأسعار لم يتم استخراجها بالكامل. يمكنك إعادة المحاولة أو إدخال البيانات يدوياً.'
            : 'Some quotations could not be fully extracted. You can retry or enter data manually.'}
        </p>
        <ul className="space-y-2">
          {failedExtractions.map(({ index, supplierName, issue, fileName }) => (
            <li 
              key={index} 
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-md bg-orange-100/50 dark:bg-orange-900/20"
            >
              <div className="flex-1">
                <span className="font-medium text-orange-800 dark:text-orange-300">
                  {supplierName}
                </span>
                {fileName && (
                  <span className="text-xs text-orange-600 dark:text-orange-400 ml-2">
                    ({fileName})
                  </span>
                )}
                <p className="text-sm text-orange-700 dark:text-orange-400">
                  {getIssueMessage(issue)}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onRetryExtraction(index)}
                  disabled={isRetrying}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying && retryingIndex === index ? 'animate-spin' : ''}`} />
                  {isRetrying && retryingIndex === index 
                    ? (language === 'ar' ? 'جاري...' : 'Retrying...') 
                    : (language === 'ar' ? 'إعادة' : 'Retry')}
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => onManualEntry(index)}
                  disabled={isRetrying}
                  className="bg-orange-200 text-orange-800 hover:bg-orange-300"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  {language === 'ar' ? 'يدوي' : 'Manual'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
