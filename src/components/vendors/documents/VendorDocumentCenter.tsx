import { useState } from 'react';
import { Upload, FileText, AlertTriangle, Filter, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  VendorDocumentWithExtraction, 
  DocumentClassification,
  DOCUMENT_CLASSIFICATIONS 
} from '@/types/document';
import { useVendorDocuments, useVendorDocumentAlerts, useDocumentUpload } from '@/hooks/useDocumentUpload';
import { DocumentUploadZone } from './DocumentUploadZone';
import { DocumentCard } from './DocumentCard';
import { ExtractionReviewPanel } from './ExtractionReviewPanel';
import { differenceInDays } from 'date-fns';

interface VendorDocumentCenterProps {
  vendorId: string;
  onApplyMappings?: (document: VendorDocumentWithExtraction) => void;
}

export function VendorDocumentCenter({ vendorId, onApplyMappings }: VendorDocumentCenterProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const { data: documents = [], isLoading } = useVendorDocuments(vendorId);
  const { data: alerts = [] } = useVendorDocumentAlerts(vendorId);
  const documentUpload = useDocumentUpload(vendorId);

  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [selectedDocument, setSelectedDocument] = useState<VendorDocumentWithExtraction | null>(null);
  const [isUploadSheetOpen, setIsUploadSheetOpen] = useState(false);

  // Group documents by classification
  const documentsByClassification = documents.reduce((acc, doc) => {
    const classification = doc.classification || 'miscellaneous';
    if (!acc[classification]) acc[classification] = [];
    acc[classification].push(doc);
    return acc;
  }, {} as Record<string, VendorDocumentWithExtraction[]>);

  // Get expiring documents
  const expiringDocuments = documents.filter(doc => {
    if (!doc.expiry_date) return false;
    const daysUntilExpiry = differenceInDays(new Date(doc.expiry_date), new Date());
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
  });

  // Get expired documents
  const expiredDocuments = documents.filter(doc => {
    if (!doc.expiry_date) return false;
    return new Date(doc.expiry_date) < new Date();
  });

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    if (filterClassification === 'all') return true;
    return doc.classification === filterClassification;
  });

  const handleFilesAdded = (files: File[]) => {
    documentUpload.addFiles(files);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{isRTL ? 'مركز المستندات' : 'Document Center'}</h2>
          <p className="text-sm text-muted-foreground">
            {isRTL 
              ? `${documents.length} مستند${documents.length !== 1 ? 'ات' : ''} مرفوع${documents.length !== 1 ? 'ة' : ''}`
              : `${documents.length} document${documents.length !== 1 ? 's' : ''} uploaded`}
          </p>
        </div>
        <Button onClick={() => setIsUploadSheetOpen(true)}>
          <Upload className="h-4 w-4 me-2" />
          {isRTL ? 'رفع مستندات' : 'Upload Documents'}
        </Button>
      </div>

      {/* Alerts */}
      {(expiringDocuments.length > 0 || expiredDocuments.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {expiredDocuments.length > 0 && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    {isRTL 
                      ? `${expiredDocuments.length} مستند منتهي الصلاحية`
                      : `${expiredDocuments.length} expired document${expiredDocuments.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {expiringDocuments.length > 0 && (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardContent className="p-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-yellow-600">
                    {isRTL 
                      ? `${expiringDocuments.length} مستند تنتهي صلاحيته قريباً`
                      : `${expiringDocuments.length} document${expiringDocuments.length !== 1 ? 's' : ''} expiring soon`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tabs and Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">
              {isRTL ? 'الكل' : 'All'}
              <Badge variant="secondary" className="ms-2">{documents.length}</Badge>
            </TabsTrigger>
            {Object.entries(documentsByClassification).slice(0, 4).map(([classification, docs]) => {
              const classInfo = DOCUMENT_CLASSIFICATIONS.find(c => c.value === classification);
              return (
                <TabsTrigger key={classification} value={classification}>
                  {classInfo?.icon} {isRTL ? classInfo?.labelAr : classInfo?.labelEn}
                  <Badge variant="secondary" className="ms-2">{docs.length}</Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="flex items-center gap-2">
            <Select value={filterClassification} onValueChange={setFilterClassification}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 me-2" />
                <SelectValue placeholder={isRTL ? 'تصفية حسب النوع' : 'Filter by type'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'الكل' : 'All Types'}</SelectItem>
                {DOCUMENT_CLASSIFICATIONS.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.icon} {isRTL ? c.labelAr : c.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-e-none"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-s-none"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <TabsContent value="all" className="mt-4">
          <DocumentList 
            documents={filteredDocuments} 
            viewMode={viewMode}
            isRTL={isRTL}
            onReview={setSelectedDocument}
          />
        </TabsContent>

        {Object.entries(documentsByClassification).map(([classification, docs]) => (
          <TabsContent key={classification} value={classification} className="mt-4">
            <DocumentList 
              documents={docs} 
              viewMode={viewMode}
              isRTL={isRTL}
              onReview={setSelectedDocument}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Upload Sheet */}
      <Sheet open={isUploadSheetOpen} onOpenChange={setIsUploadSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{isRTL ? 'رفع المستندات' : 'Upload Documents'}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <DocumentUploadZone
              uploadStates={documentUpload.uploadStates}
              onFilesAdded={handleFilesAdded}
              onRemove={documentUpload.removeFile}
              onRename={documentUpload.renameFile}
              onUploadAll={documentUpload.uploadAll}
              onClearCompleted={documentUpload.clearCompleted}
              isUploading={documentUpload.isUploading}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Review Panel Sheet */}
      <Sheet open={!!selectedDocument} onOpenChange={(open) => !open && setSelectedDocument(null)}>
        <SheetContent side="right" className="w-full sm:max-w-4xl p-0">
          {selectedDocument && (
            <ExtractionReviewPanel
              document={selectedDocument}
              onClose={() => setSelectedDocument(null)}
              onApplyToVendor={onApplyMappings}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Document List Component
function DocumentList({ 
  documents, 
  viewMode,
  isRTL,
  onReview 
}: { 
  documents: VendorDocumentWithExtraction[];
  viewMode: 'grid' | 'list';
  isRTL: boolean;
  onReview: (doc: VendorDocumentWithExtraction) => void;
}) {
  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {isRTL ? 'لا توجد مستندات' : 'No documents found'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn(
      viewMode === 'grid' 
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
        : 'space-y-3'
    )}>
      {documents.map(doc => (
        <DocumentCard 
          key={doc.id} 
          document={doc} 
          onReview={onReview}
        />
      ))}
    </div>
  );
}
