import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  DocumentUploadState, 
  DocumentExtractionResult, 
  VendorDocumentWithExtraction,
  DocumentAlert,
  ALLOWED_FILE_TYPES, 
  MAX_FILE_SIZE 
} from '@/types/document';
import { toast } from 'sonner';

// Fetch vendor documents with extraction data
export function useVendorDocuments(vendorId: string) {
  return useQuery({
    queryKey: ['vendor-documents', vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_documents')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as VendorDocumentWithExtraction[];
    },
    enabled: !!vendorId,
  });
}

// Fetch document alerts for a vendor
export function useVendorDocumentAlerts(vendorId: string) {
  return useQuery({
    queryKey: ['vendor-document-alerts', vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_document_alerts')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('alert_date', { ascending: true });

      if (error) throw error;
      return data as DocumentAlert[];
    },
    enabled: !!vendorId,
  });
}

// Upload and extract document
export function useDocumentUpload(vendorId: string) {
  const queryClient = useQueryClient();
  const [uploadStates, setUploadStates] = useState<DocumentUploadState[]>([]);

  const updateUploadState = useCallback((id: string, updates: Partial<DocumentUploadState>) => {
    setUploadStates(prev => 
      prev.map(state => state.id === id ? { ...state, ...updates } : state)
    );
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const newStates: DocumentUploadState[] = files
      .filter(file => {
        // Validate file type
        if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
          toast.error(`Unsupported file type: ${file.name}`);
          return false;
        }
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`File too large: ${file.name} (max 20MB)`);
          return false;
        }
        return true;
      })
      .map(file => ({
        file,
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'pending' as const,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      }));

    setUploadStates(prev => [...prev, ...newStates]);
    return newStates;
  }, []);

  const removeFile = useCallback((id: string) => {
    setUploadStates(prev => {
      const state = prev.find(s => s.id === id);
      if (state?.previewUrl) {
        URL.revokeObjectURL(state.previewUrl);
      }
      return prev.filter(s => s.id !== id);
    });
  }, []);

  const renameFile = useCallback((id: string, newName: string) => {
    updateUploadState(id, { name: newName });
  }, [updateUploadState]);

  const uploadAndExtract = useMutation({
    mutationFn: async (uploadState: DocumentUploadState) => {
      const { file, id } = uploadState;
      
      // Update status to uploading
      updateUploadState(id, { status: 'uploading', progress: 10 });

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${vendorId}/${crypto.randomUUID()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('vendor-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      updateUploadState(id, { progress: 50, status: 'extracting' });

      // Convert file to base64 for AI extraction
      const base64 = await fileToBase64(file);

      // Call AI extraction edge function
      const { data: extractionData, error: extractionError } = await supabase.functions
        .invoke('vendor-ai', {
          body: {
            action: 'extract_document_advanced',
            imageBase64: base64,
            fileName: file.name,
            mimeType: file.type,
          },
        });

      updateUploadState(id, { progress: 80 });

      let extractionResult: DocumentExtractionResult | undefined;
      let classification = 'miscellaneous';
      let confidence = 0;
      let expiryDate: string | undefined;

      if (!extractionError && extractionData?.result) {
        extractionResult = extractionData.result;
        classification = extractionData.result.classification || 'miscellaneous';
        confidence = extractionData.result.confidence || 0;
        
        // Extract expiry date if found
        const expiryField = extractionData.result.extractedFields?.find(
          (f: any) => f.key.toLowerCase().includes('expiry') || f.key.toLowerCase().includes('expiration')
        );
        if (expiryField?.value) {
          expiryDate = expiryField.value;
        }
      }

      // Get document type from classification
      const documentType = mapClassificationToDocumentType(classification) as 'trade_license' | 'tax_certificate' | 'bank_letter' | 'insurance' | 'other';
      const validClassification = classification as 'trade_license' | 'establishment_card' | 'vat_certificate' | 'insurance' | 'bank_details' | 'compliance_certificate' | 'quality_certification' | 'identity_document' | 'contract_agreement' | 'miscellaneous';

      // Insert document record
      const { data: docData, error: docError } = await supabase
        .from('vendor_documents')
        .insert({
          vendor_id: vendorId,
          document_type: documentType,
          classification: validClassification,
          file_path: fileName,
          file_name: uploadState.name,
          file_size: file.size,
          mime_type: file.type,
          extracted_data: extractionData?.result || {},
          expiry_date: expiryDate,
          ai_confidence_score: Math.round(confidence),
          extraction_status: extractionResult ? 'completed' : 'failed',
          original_filename: file.name,
        })
        .select()
        .single();

      if (docError) throw docError;

      updateUploadState(id, { 
        progress: 100, 
        status: 'completed',
        extractionResult 
      });

      return { document: docData, extractionResult };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-documents', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-document-alerts', vendorId] });
    },
    onError: (error, variables) => {
      updateUploadState(variables.id, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Upload failed' 
      });
    },
  });

  const uploadAll = useCallback(async () => {
    const pending = uploadStates.filter(s => s.status === 'pending');
    for (const state of pending) {
      await uploadAndExtract.mutateAsync(state);
    }
  }, [uploadStates, uploadAndExtract]);

  const clearCompleted = useCallback(() => {
    setUploadStates(prev => prev.filter(s => s.status !== 'completed'));
  }, []);

  return {
    uploadStates,
    addFiles,
    removeFile,
    renameFile,
    uploadAndExtract,
    uploadAll,
    clearCompleted,
    isUploading: uploadAndExtract.isPending,
  };
}

// Update document
export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Record<string, any>
    }) => {
      const { data, error } = await supabase
        .from('vendor_documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-documents', data.vendor_id] });
      toast.success('Document updated');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update document');
    },
  });
}

// Delete document
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, filePath, vendorId }: { id: string; filePath: string; vendorId: string }) => {
      // Delete from storage
      await supabase.storage.from('vendor-documents').remove([filePath]);

      // Delete record
      const { error } = await supabase
        .from('vendor_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { vendorId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-documents', data.vendorId] });
      toast.success('Document deleted');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete document');
    },
  });
}

// Re-extract document
export function useReExtractDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, vendorId, filePath }: { id: string; vendorId: string; filePath: string }) => {
      // Get file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('vendor-documents')
        .download(filePath);

      if (downloadError) throw downloadError;

      const base64 = await fileToBase64(fileData as File);

      // Re-run extraction
      const { data: extractionData, error: extractionError } = await supabase.functions
        .invoke('vendor-ai', {
          body: {
            action: 'extract_document_advanced',
            imageBase64: base64,
            fileName: filePath,
          },
        });

      if (extractionError) throw extractionError;

      // Update document
      const { data, error } = await supabase
        .from('vendor_documents')
        .update({
          extracted_data: extractionData.result || {},
          classification: extractionData.result?.classification || 'miscellaneous',
          ai_confidence_score: Math.round(extractionData.result?.confidence || 0),
          extraction_status: 'completed',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-documents', data.vendor_id] });
      toast.success('Document re-extracted successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Re-extraction failed');
    },
  });
}

// Verify document
export function useVerifyDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, vendorId }: { id: string; vendorId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('vendor_documents')
        .update({
          is_verified: true,
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-documents', data.vendor_id] });
      toast.success('Document verified');
    },
  });
}

// Helper functions
async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function mapClassificationToDocumentType(classification: string): string {
  const mapping: Record<string, string> = {
    'trade_license': 'trade_license',
    'establishment_card': 'other',
    'vat_certificate': 'tax_certificate',
    'insurance': 'insurance',
    'bank_details': 'bank_letter',
    'compliance_certificate': 'other',
    'quality_certification': 'other',
    'identity_document': 'other',
    'contract_agreement': 'other',
    'miscellaneous': 'other',
  };
  return mapping[classification] || 'other';
}
