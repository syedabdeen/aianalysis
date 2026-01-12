import { useCallback, useRef, useState } from 'react';
import { Upload, X, FileText, Image, File, Loader2, CheckCircle, AlertCircle, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { DocumentUploadState, ALLOWED_FILE_TYPES } from '@/types/document';

interface DocumentUploadZoneProps {
  uploadStates: DocumentUploadState[];
  onFilesAdded: (files: File[]) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onUploadAll: () => void;
  onClearCompleted: () => void;
  isUploading: boolean;
}

export function DocumentUploadZone({
  uploadStates,
  onFilesAdded,
  onRemove,
  onRename,
  onUploadAll,
  onClearCompleted,
  isUploading,
}: DocumentUploadZoneProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    onFilesAdded(files);
  }, [onFilesAdded]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onFilesAdded(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFilesAdded]);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
    if (type === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
    if (type.includes('word')) return <FileText className="h-5 w-5 text-blue-600" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusIcon = (status: DocumentUploadState['status']) => {
    switch (status) {
      case 'uploading':
      case 'extracting':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: DocumentUploadState['status']) => {
    const texts = {
      pending: isRTL ? 'في الانتظار' : 'Pending',
      uploading: isRTL ? 'جاري الرفع...' : 'Uploading...',
      extracting: isRTL ? 'استخراج البيانات...' : 'Extracting data...',
      completed: isRTL ? 'مكتمل' : 'Completed',
      error: isRTL ? 'خطأ' : 'Error',
    };
    return texts[status];
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const pendingCount = uploadStates.filter(s => s.status === 'pending').length;
  const completedCount = uploadStates.filter(s => s.status === 'completed').length;

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const saveEdit = (id: string) => {
    if (editName.trim()) {
      onRename(id, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer',
          isDragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={Object.keys(ALLOWED_FILE_TYPES).join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3 text-center">
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
            isDragOver ? 'bg-primary/20' : 'bg-muted'
          )}>
            <Upload className={cn('h-8 w-8', isDragOver ? 'text-primary' : 'text-muted-foreground')} />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {isRTL ? 'اسحب وأفلت الملفات هنا' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL 
                ? 'أو انقر للاختيار • PDF, Word, صور (حد أقصى 20 ميجابايت)'
                : 'or click to browse • PDF, Word, Images (max 20MB)'}
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {uploadStates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">
              {isRTL ? 'الملفات المحددة' : 'Selected Files'} ({uploadStates.length})
            </h4>
            <div className="flex gap-2">
              {completedCount > 0 && (
                <Button variant="ghost" size="sm" onClick={onClearCompleted}>
                  {isRTL ? 'مسح المكتمل' : 'Clear Completed'}
                </Button>
              )}
              {pendingCount > 0 && (
                <Button size="sm" onClick={onUploadAll} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin me-2" />
                      {isRTL ? 'جاري الرفع...' : 'Uploading...'}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 me-2" />
                      {isRTL ? `رفع الكل (${pendingCount})` : `Upload All (${pendingCount})`}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {uploadStates.map((state) => (
              <Card key={state.id} className={cn(
                'transition-colors',
                state.status === 'error' && 'border-destructive/50',
                state.status === 'completed' && 'border-green-500/50'
              )}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Preview/Icon */}
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {state.previewUrl ? (
                        <img 
                          src={state.previewUrl} 
                          alt={state.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getFileIcon(state.type)
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {editingId === state.id ? (
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={() => saveEdit(state.id)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit(state.id)}
                            className="h-7 text-sm"
                            autoFocus
                          />
                        ) : (
                          <>
                            <span className="font-medium truncate text-sm">{state.name}</span>
                            {state.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => startEditing(state.id, state.name)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(state.size)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {ALLOWED_FILE_TYPES[state.type as keyof typeof ALLOWED_FILE_TYPES]?.name || 'Unknown'}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {getStatusIcon(state.status)}
                          {getStatusText(state.status)}
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      {(state.status === 'uploading' || state.status === 'extracting') && (
                        <Progress value={state.progress} className="h-1 mt-2" />
                      )}
                      
                      {/* Error message */}
                      {state.status === 'error' && state.error && (
                        <p className="text-xs text-destructive mt-1">{state.error}</p>
                      )}
                      
                      {/* Extraction result preview */}
                      {state.status === 'completed' && state.extractionResult && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {state.extractionResult.classification.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {isRTL ? 'ثقة:' : 'Confidence:'} {Math.round(state.extractionResult.confidence)}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {state.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(state.id)}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
