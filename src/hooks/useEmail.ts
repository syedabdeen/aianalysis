import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface EmailRecipient {
  email: string;
  name?: string;
}

interface SendEmailParams {
  to: EmailRecipient[];
  subject: string;
  htmlBody: string;
  textBody?: string;
  from?: { address: string; name?: string };
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  replyTo?: { address: string; name?: string };
}

export const useEmail = () => {
  const sendEmail = useMutation({
    mutationFn: async (params: SendEmailParams) => {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: params,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to send email");
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Email sent successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to send email: ${error.message}`);
    },
  });

  return { sendEmail };
};
