import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Edit, AlertCircle, TrendingDown, BarChart3 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Progress } from '@/components/ui/progress';

interface ExtractionIssue {
  index: number;
  supplierName: string;
  issue: string;
  fileName?: string;
  issueType: 'extraction_failed' | 'price_anomaly' | 'item_count_anomaly' | 'total_mismatch';
  severity: 'critical' | 'warning' | 'info';
  priceAnomalyPct?: number;
  extractionConfidence?: number;
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
  
  // Identify all extraction issues including price anomalies
  const allIssues: ExtractionIssue[] = extractedQuotations
    .map((q, idx) => {
      const issues: ExtractionIssue[] = [];
      const supplierName = q.supplier?.name || `Supplier ${idx + 1}`;
      const fileName = uploadedFiles?.[idx]?.file?.name;
      
      // Critical: Extraction failed completely
      if (q._extractionIssue || (q.items?.length === 0 && q.commercial?.total === 0) || q.pricedItemsCount === 0) {
        issues.push({
          index: idx,
          supplierName,
          issue: q._extractionIssue || 'No data could be extracted',
          fileName,
          issueType: 'extraction_failed',
          severity: 'critical',
          extractionConfidence: q._extractionConfidence,
        });
      }
      
      // Critical: Price anomaly (suspiciously low)
      if (q._priceAnomaly === 'suspiciously_low' && q._priceAnomalyPct < 50) {
        issues.push({
          index: idx,
          supplierName,
          issue: `Total is ${q._priceAnomalyPct?.toFixed(0)}% of expected - likely extraction error`,
          fileName,
          issueType: 'price_anomaly',
          severity: q._priceAnomalyPct < 20 ? 'critical' : 'warning',
          priceAnomalyPct: q._priceAnomalyPct,
          extractionConfidence: q._extractionConfidence,
        });
      }
      
      // Warning: Item count anomaly
      const itemCountWarning = q._extractionWarnings?.find((w: string) => 
        w.includes('Item count') && w.includes('higher than median')
      );
      if (itemCountWarning) {
        issues.push({
          index: idx,
          supplierName,
          issue: itemCountWarning,
          fileName,
          issueType: 'item_count_anomaly',
          severity: 'warning',
          extractionConfidence: q._extractionConfidence,
        });
      }
      
      // Warning: Total mismatch
      if (q._totalReconciliation?.mismatchPct > 10) {
        issues.push({
          index: idx,
          supplierName,
          issue: `Total mismatch: ${q._totalReconciliation.mismatchPct.toFixed(1)}% difference between line items and grand total`,
          fileName,
          issueType: 'total_mismatch',
          severity: q._totalReconciliation.mismatchPct > 20 ? 'warning' : 'info',
          extractionConfidence: q._extractionConfidence,
        });
      }
      
      return issues;
    })
    .flat();
  
  // Separate by severity
  const criticalIssues = allIssues.filter(i => i.severity === 'critical');
  const warningIssues = allIssues.filter(i => i.severity === 'warning');
  const infoIssues = allIssues.filter(i => i.severity === 'info');
  
  if (allIssues.length === 0) return null;
  
  const getIssueIcon = (type: ExtractionIssue['issueType']) => {
    switch (type) {
      case 'price_anomaly':
        return <TrendingDown className="h-3 w-3" />;
      case 'item_count_anomaly':
        return <BarChart3 className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };
  
  const getIssueMessage = (issue: ExtractionIssue): string => {
    // Translate common issues
    if (issue.issue.includes('timeout') || issue.issue.includes('timed out')) {
      return language === 'ar'
        ? 'انتهت مهلة المعالجة - المستند معقد جداً'
        : 'Processing timed out - document too complex';
    }
    if (issue.issue.includes('rate limit') || issue.issue.includes('Rate limit')) {
      return language === 'ar'
        ? 'تم تجاوز الحد الأقصى - يرجى المحاولة لاحقاً'
        : 'Rate limit reached - please try again later';
    }
    if (issue.issue.includes('credits') || issue.issue.includes('Payment required')) {
      return language === 'ar'
        ? 'نفاد الرصيد - يرجى إضافة رصيد'
        : 'Credits exhausted - please add credits';
    }
    if (issue.issue.includes('empty') || issue.issue.includes('No content')) {
      return language === 'ar'
        ? 'الملف فارغ أو تالف'
        : 'File appears empty or corrupted';
    }
    if (issue.issue.includes('No items') || issue.issue.includes('No data could be extracted')) {
      return language === 'ar'
        ? 'لم يتم العثور على بنود في العرض'
        : 'No line items found in quotation';
    }
    
    return issue.issue;
  };
  
  const renderIssueItem = (issue: ExtractionIssue) => {
    const bgColor = issue.severity === 'critical' 
      ? 'bg-red-100/50 dark:bg-red-900/30' 
      : issue.severity === 'warning'
        ? 'bg-orange-100/50 dark:bg-orange-900/20'
        : 'bg-yellow-100/50 dark:bg-yellow-900/20';
    
    const textColor = issue.severity === 'critical'
      ? 'text-red-800 dark:text-red-300'
      : issue.severity === 'warning'
        ? 'text-orange-800 dark:text-orange-300'
        : 'text-yellow-800 dark:text-yellow-300';
    
    return (
      <li 
        key={`${issue.index}-${issue.issueType}`} 
        className={`flex flex-col gap-2 p-3 rounded-md ${bgColor}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-medium ${textColor}`}>
                {issue.supplierName}
              </span>
              {issue.severity === 'critical' && (
                <Badge variant="destructive" className="text-xs">
                  {language === 'ar' ? 'حرج' : 'Critical'}
                </Badge>
              )}
              {issue.issueType === 'price_anomaly' && issue.priceAnomalyPct && (
                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {issue.priceAnomalyPct.toFixed(0)}% {language === 'ar' ? 'من المتوقع' : 'of expected'}
                </Badge>
              )}
              {issue.extractionConfidence !== undefined && issue.extractionConfidence < 70 && (
                <Badge variant="outline" className="text-xs">
                  {language === 'ar' ? 'الثقة:' : 'Confidence:'} {issue.extractionConfidence}%
                </Badge>
              )}
            </div>
            {issue.fileName && (
              <span className="text-xs text-muted-foreground ml-0 block mt-0.5">
                ({issue.fileName})
              </span>
            )}
            <div className={`text-sm mt-1 flex items-start gap-1 ${textColor}`}>
              {getIssueIcon(issue.issueType)}
              <span>{getIssueMessage(issue)}</span>
            </div>
            
            {/* Confidence indicator bar */}
            {issue.extractionConfidence !== undefined && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'جودة الاستخراج:' : 'Extraction quality:'}
                </span>
                <Progress 
                  value={issue.extractionConfidence} 
                  className="h-1.5 w-20"
                />
                <span className={`text-xs font-medium ${
                  issue.extractionConfidence >= 70 ? 'text-green-600' :
                  issue.extractionConfidence >= 40 ? 'text-orange-600' : 'text-red-600'
                }`}>
                  {issue.extractionConfidence}%
                </span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 flex-shrink-0">
            <Button 
              size="sm" 
              variant={issue.severity === 'critical' ? 'destructive' : 'outline'}
              onClick={() => onRetryExtraction(issue.index)}
              disabled={isRetrying}
              className={issue.severity !== 'critical' ? 'border-orange-300 text-orange-700 hover:bg-orange-100' : ''}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying && retryingIndex === issue.index ? 'animate-spin' : ''}`} />
              {isRetrying && retryingIndex === issue.index 
                ? (language === 'ar' ? 'جاري...' : 'Verifying...') 
                : (language === 'ar' ? 'تحقق' : issue.severity === 'critical' ? 'Re-verify' : 'Retry')}
            </Button>
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => onManualEntry(issue.index)}
              disabled={isRetrying}
              className="bg-orange-200 text-orange-800 hover:bg-orange-300"
            >
              <Edit className="h-3 w-3 mr-1" />
              {language === 'ar' ? 'يدوي' : 'Manual'}
            </Button>
          </div>
        </div>
      </li>
    );
  };
  
  return (
    <div className="space-y-3 mb-4">
      {/* Critical Issues - Red Alert */}
      {criticalIssues.length > 0 && (
        <Alert variant="destructive" className="border-red-400 bg-red-50 dark:bg-red-950/30">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800 dark:text-red-400">
            {language === 'ar' 
              ? `مشاكل حرجة في الاستخراج (${criticalIssues.length})`
              : `Critical Extraction Issues (${criticalIssues.length})`}
          </AlertTitle>
          <AlertDescription>
            <p className="mb-3 text-red-700 dark:text-red-300">
              {language === 'ar'
                ? 'هذه العروض تحتاج إلى تحقق فوري - الأسعار قد تكون خاطئة'
                : 'These quotations require immediate verification - prices may be incorrect'}
            </p>
            <ul className="space-y-2">
              {criticalIssues.map(renderIssueItem)}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Warning Issues - Orange Alert */}
      {warningIssues.length > 0 && (
        <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800 dark:text-orange-400">
            {language === 'ar' 
              ? `تحذيرات الاستخراج (${warningIssues.length})`
              : `Extraction Warnings (${warningIssues.length})`}
          </AlertTitle>
          <AlertDescription>
            <p className="mb-3 text-orange-700 dark:text-orange-300">
              {language === 'ar'
                ? 'بعض العروض قد تحتاج إلى مراجعة'
                : 'Some quotations may need review'}
            </p>
            <ul className="space-y-2">
              {warningIssues.map(renderIssueItem)}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Info Issues - Yellow/Muted Alert */}
      {infoIssues.length > 0 && criticalIssues.length === 0 && warningIssues.length === 0 && (
        <Alert className="border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/10">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-400">
            {language === 'ar' 
              ? `ملاحظات (${infoIssues.length})`
              : `Notes (${infoIssues.length})`}
          </AlertTitle>
          <AlertDescription>
            <ul className="space-y-2">
              {infoIssues.map(renderIssueItem)}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}