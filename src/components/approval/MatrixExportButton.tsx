import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useExportMatrix } from '@/hooks/useApprovalMatrix';
import { Button } from '@/components/ui/button';
import { Download, FileJson } from 'lucide-react';
import { toast } from 'sonner';

export const MatrixExportButton: React.FC = () => {
  const { language } = useLanguage();
  const exportMatrix = useExportMatrix();

  const handleExport = async () => {
    try {
      const data = await exportMatrix.mutateAsync();
      
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `approval-matrix-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(language === 'ar' ? 'تم تصدير المصفوفة بنجاح' : 'Matrix exported successfully');
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل التصدير' : 'Export failed');
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={exportMatrix.isPending}
      className="gap-2"
    >
      <FileJson className="h-4 w-4" />
      {language === 'ar' ? 'تصدير JSON' : 'Export JSON'}
    </Button>
  );
};
