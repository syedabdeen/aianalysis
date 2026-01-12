import { StoredReport } from '@/hooks/useAnalysisReports';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { 
  Globe, 
  FileSpreadsheet, 
  Download, 
  Trash2, 
  Eye,
  Calendar,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportCardProps {
  report: StoredReport;
  onView: (report: StoredReport) => void;
  onDownloadPDF: (report: StoredReport) => void;
  onDownloadExcel: (report: StoredReport) => void;
  onDelete: (report: StoredReport) => void;
}

export function ReportCard({ 
  report, 
  onView, 
  onDownloadPDF, 
  onDownloadExcel, 
  onDelete 
}: ReportCardProps) {
  const { language, isRTL } = useLanguage();
  const isMarket = report.type === 'market';
  
  const formattedDate = format(new Date(report.createdAt), 'dd MMM yyyy');
  const formattedTime = format(new Date(report.createdAt), 'hh:mm a');

  return (
    <Card className="group hover:shadow-lg hover:border-primary/30 transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
            isMarket 
              ? 'bg-gradient-to-br from-blue-500 to-cyan-500' 
              : 'bg-gradient-to-br from-purple-500 to-pink-500'
          )}>
            {isMarket ? (
              <Globe className="w-6 h-6 text-white" />
            ) : (
              <FileSpreadsheet className="w-6 h-6 text-white" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <Badge variant="outline" className="mb-1 font-mono text-xs">
                  {report.sequenceNumber}
                </Badge>
                <h3 className="font-semibold text-lg truncate">{report.title}</h3>
              </div>
              <Badge className={cn(
                isMarket 
                  ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' 
                  : 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20'
              )}>
                {isMarket 
                  ? (language === 'ar' ? 'تحليل السوق' : 'Market') 
                  : (language === 'ar' ? 'تحليل العروض' : 'Offer')}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
              {report.inputSummary}
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formattedDate}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formattedTime}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onView(report)}
                className="gap-1"
              >
                <Eye className="w-3 h-3" />
                {language === 'ar' ? 'عرض' : 'View'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onDownloadPDF(report)}
                className="gap-1"
              >
                <Download className="w-3 h-3" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onDownloadExcel(report)}
                className="gap-1"
              >
                <FileSpreadsheet className="w-3 h-3" />
                Excel
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onDelete(report)}
                className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
