import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DocumentExtractionResult, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/types/document';

interface ExtractionState {
  file: File;
  id: string;
  name: string;
  status: 'pending' | 'extracting' | 'completed' | 'error';
  result?: DocumentExtractionResult;
  error?: string;
}

export function useDocumentExtraction(onExtractComplete?: (result: DocumentExtractionResult) => void) {
  const [extractionStates, setExtractionStates] = useState<ExtractionState[]>([]);

  const updateState = useCallback((id: string, updates: Partial<ExtractionState>) => {
    setExtractionStates(prev => 
      prev.map(state => state.id === id ? { ...state, ...updates } : state)
    );
  }, []);

  const extractMutation = useMutation({
    mutationFn: async (state: ExtractionState) => {
      const { file, id } = state;
      
      updateState(id, { status: 'extracting' });

      // Convert file to base64
      const base64 = await fileToBase64(file);
      
      console.log(`Extracting data from: ${file.name}, type: ${file.type}`);

      // Call AI extraction
      const { data, error } = await supabase.functions.invoke('vendor-ai', {
        body: {
          action: 'extract_document_advanced',
          imageBase64: base64,
          fileName: file.name,
          mimeType: file.type,
        },
      });

      if (error) {
        console.error('Extraction error:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      console.log('Raw extraction result:', data);

      // Normalize the response - AI returns snake_case but our types expect camelCase
      const rawResult = data?.result;
      const result: DocumentExtractionResult = {
        classification: rawResult?.classification || 'miscellaneous',
        confidence: rawResult?.confidence || 0,
        // Handle both snake_case and camelCase field names
        extractedFields: rawResult?.extractedFields || rawResult?.extracted_fields || [],
        suggestedMappings: rawResult?.suggestedMappings || rawResult?.suggested_mappings || [],
        rawData: rawResult?.rawData || rawResult?.raw_data,
      };

      console.log('Normalized extraction result:', result);
      console.log('Extracted fields:', result.extractedFields);
      
      updateState(id, { 
        status: 'completed', 
        result 
      });

      // Call the callback with extraction result
      if (result && result.extractedFields?.length > 0 && onExtractComplete) {
        console.log('Calling onExtractComplete with result');
        onExtractComplete(result);
      }

      return result;
    },
    onError: (error, variables) => {
      console.error('Extraction failed:', error);
      updateState(variables.id, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Extraction failed' 
      });
      toast.error(`Failed to extract data from ${variables.name}`);
    },
  });

  const addAndExtract = useCallback(async (files: File[]) => {
    const validFiles = files.filter(file => {
      if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
        toast.error(`Unsupported file type: ${file.name}`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File too large: ${file.name} (max 20MB)`);
        return false;
      }
      return true;
    });

    const newStates: ExtractionState[] = validFiles.map(file => ({
      file,
      id: crypto.randomUUID(),
      name: file.name,
      status: 'pending' as const,
    }));

    setExtractionStates(prev => [...prev, ...newStates]);

    // Start extraction for each file
    for (const state of newStates) {
      try {
        await extractMutation.mutateAsync(state);
      } catch {
        // Error handling is done in onError
      }
    }

    return newStates;
  }, [extractMutation]);

  const removeFile = useCallback((id: string) => {
    setExtractionStates(prev => prev.filter(s => s.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setExtractionStates(prev => prev.filter(s => s.status !== 'completed'));
  }, []);

  return {
    extractionStates,
    addAndExtract,
    removeFile,
    clearCompleted,
    isExtracting: extractMutation.isPending,
  };
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}
