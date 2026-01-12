import { useState, useCallback } from "react";
import { Upload, FileText, Image, File, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CompanyDocumentUploadProps {
  onExtracted: (data: Record<string, unknown>) => void;
  disabled?: boolean;
}

const documentTypes = [
  { value: "trade_license", label: "Trade License", labelAr: "الرخصة التجارية" },
  { value: "vat_certificate", label: "VAT Certificate", labelAr: "شهادة ضريبة القيمة المضافة" },
  { value: "commercial_registration", label: "Commercial Registration", labelAr: "السجل التجاري" },
  { value: "establishment_card", label: "Establishment Card", labelAr: "بطاقة المنشأة" },
  { value: "other", label: "Other Document", labelAr: "مستند آخر" },
];

export function CompanyDocumentUpload({ onExtracted, disabled }: CompanyDocumentUploadProps) {
  const { language } = useLanguage();
  const { uploadDocument, companyDocuments } = useCompanySettings();
  const [dragActive, setDragActive] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("trade_license");
  const [isExtracting, setIsExtracting] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const extractDataFromDocument = async (file: File) => {
    setIsExtracting(true);
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
      });

      // Call AI extraction edge function
      const { data, error } = await supabase.functions.invoke("extract-company-document", {
        body: {
          fileBase64: base64,
          fileType: file.type,
          documentType: selectedType,
        },
      });

      if (error) throw error;

      if (data?.extractedData) {
        onExtracted(data.extractedData);
        toast.success(language === "ar" ? "تم استخراج البيانات بنجاح" : "Data extracted successfully");
      }
    } catch (error) {
      console.error("Extraction error:", error);
      toast.error(language === "ar" ? "فشل استخراج البيانات" : "Failed to extract data");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files?.[0]) {
        await handleFile(files[0]);
      }
    },
    [disabled, selectedType]
  );

  const handleFile = async (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error(
        language === "ar"
          ? "نوع الملف غير مدعوم. يرجى تحميل PDF أو صورة أو ملف نصي"
          : "Unsupported file type. Please upload PDF, image, or text file"
      );
      return;
    }

    // Upload the document
    await uploadDocument.mutateAsync({
      file,
      documentType: selectedType,
    });

    // Extract data from document
    await extractDataFromDocument(file);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFile(file);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (type === "application/pdf") return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={selectedType} onValueChange={setSelectedType} disabled={disabled}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {documentTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {language === "ar" ? type.labelAr : type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-border",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {isExtracting ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {language === "ar" ? "جاري استخراج البيانات..." : "Extracting data..."}
            </p>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              {language === "ar"
                ? "اسحب وأفلت الملف هنا أو انقر للتحميل"
                : "Drag and drop file here or click to upload"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {language === "ar"
                ? "PDF، صور، أو ملفات نصية"
                : "PDF, images, or text files"}
            </p>
            <Button variant="outline" disabled={disabled} asChild>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt"
                  onChange={handleFileInput}
                  disabled={disabled}
                />
                {language === "ar" ? "اختر ملف" : "Choose File"}
              </label>
            </Button>
          </>
        )}
      </div>

      {/* Uploaded Documents List */}
      {companyDocuments && companyDocuments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            {language === "ar" ? "المستندات المحملة" : "Uploaded Documents"}
          </h4>
          <div className="grid gap-2">
            {companyDocuments.map((doc) => (
              <Card key={doc.id} className="p-3">
                <CardContent className="p-0 flex items-center gap-3">
                  {getFileIcon(doc.file_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.document_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {documentTypes.find((t) => t.value === doc.document_type)?.[
                        language === "ar" ? "labelAr" : "label"
                      ] || doc.document_type}
                    </p>
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
