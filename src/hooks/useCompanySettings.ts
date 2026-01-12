import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CompanySettings {
  id: string;
  company_name_en: string;
  company_name_ar: string | null;
  trade_license_number: string;
  trade_license_expiry: string;
  address_en: string | null;
  address_ar: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  vat_number: string | null;
  logo_url: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_type: string;
  extracted_data: Record<string, unknown> | null;
  uploaded_by: string | null;
  created_at: string;
}

export function useCompanySettings() {
  const queryClient = useQueryClient();

  const { data: companySettings, isLoading, error } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as CompanySettings | null;
    },
  });

  const { data: companyDocuments } = useQuery({
    queryKey: ["company-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CompanyDocument[];
    },
  });

  const saveSettings = useMutation({
    mutationFn: async (settings: Partial<CompanySettings>) => {
      const { data: existing } = await supabase
        .from("company_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("company_settings")
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("company_settings")
          .insert(settings as never)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Company settings saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save company settings: " + error.message);
    },
  });

  const uploadDocument = useMutation({
    mutationFn: async ({
      file,
      documentType,
    }: {
      file: File;
      documentType: string;
    }) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("company-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("company_documents")
        .insert({
          document_type: documentType,
          document_name: file.name,
          file_path: filePath,
          file_type: file.type,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-documents"] });
      toast.success("Document uploaded successfully");
    },
    onError: (error) => {
      toast.error("Failed to upload document: " + error.message);
    },
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("company-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("company-documents")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    },
    onError: (error) => {
      toast.error("Failed to upload logo: " + error.message);
    },
  });

  const checkLicenseExpiry = () => {
    if (!companySettings?.trade_license_expiry) return null;
    
    const expiryDate = new Date(companySettings.trade_license_expiry);
    const today = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      daysUntilExpiry,
      isExpiringSoon: daysUntilExpiry <= 15 && daysUntilExpiry > 0,
      isExpired: daysUntilExpiry <= 0,
    };
  };

  return {
    companySettings,
    companyDocuments,
    isLoading,
    error,
    saveSettings,
    uploadDocument,
    uploadLogo,
    checkLicenseExpiry,
    isSetupComplete: !!companySettings,
  };
}
