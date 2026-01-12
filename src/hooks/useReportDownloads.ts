import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ReportDownload {
  id: string;
  report_type: string;
  report_name: string;
  file_format: string;
  file_path: string | null;
  downloaded_by: string | null;
  downloaded_at: string;
  parameters: Record<string, unknown> | null;
}

export function useReportDownloads() {
  const queryClient = useQueryClient();

  const { data: downloads, isLoading } = useQuery({
    queryKey: ["report-downloads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_downloads")
        .select("*")
        .order("downloaded_at", { ascending: false });

      if (error) throw error;
      return data as ReportDownload[];
    },
  });

  const recordDownload = useMutation({
    mutationFn: async ({
      reportType,
      reportName,
      fileFormat,
      parameters,
    }: {
      reportType: string;
      reportName: string;
      fileFormat: string;
      parameters?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("report_downloads")
        .insert({
          report_type: reportType,
          report_name: reportName,
          file_format: fileFormat,
          downloaded_by: user?.id,
          parameters,
        } as never)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-downloads"] });
    },
    onError: (error) => {
      console.error("Failed to record download:", error);
    },
  });

  return {
    downloads,
    isLoading,
    recordDownload,
  };
}
