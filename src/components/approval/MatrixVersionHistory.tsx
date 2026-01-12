import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMatrixVersions } from '@/hooks/useApprovalMatrix';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { 
  GitBranch, 
  Eye,
  Download,
} from 'lucide-react';

interface MatrixVersionHistoryProps {
  onViewVersion?: (versionId: string) => void;
}

export const MatrixVersionHistory: React.FC<MatrixVersionHistoryProps> = ({
  onViewVersion,
}) => {
  const { language } = useLanguage();
  const { data: versions, isLoading } = useMatrixVersions();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            {language === 'ar' ? 'سجل الإصدارات' : 'Version History'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          {language === 'ar' ? 'سجل الإصدارات' : 'Version History'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {versions?.map((version, index) => (
              <div
                key={version.id}
                className="p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={index === 0 ? 'default' : 'outline'}
                      className={index === 0 ? 'bg-primary text-primary-foreground' : ''}
                    >
                      v{version.version_number}
                    </Badge>
                    {index === 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {language === 'ar' ? 'الحالي' : 'Current'}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onViewVersion?.(version.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm mt-2">
                  {version.change_summary || (language === 'ar' ? 'لا يوجد ملخص' : 'No summary')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(version.created_at), 'PPpp')}
                </p>
              </div>
            ))}
            {(!versions || versions.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                {language === 'ar' ? 'لا توجد إصدارات' : 'No versions yet'}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
