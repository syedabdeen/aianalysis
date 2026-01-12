import { useState, useEffect } from "react";
import { FileText, Download, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SecurePDFViewerProps {
  src: string;
  title?: string;
  className?: string;
  height?: string | number;
  allowDownload?: boolean;
  allowNewTab?: boolean;
}

export const SecurePDFViewer = ({
  src,
  title = "PDF Document",
  className,
  height = "600px",
  allowDownload = true,
  allowNewTab = true,
}: SecurePDFViewerProps) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        // If src is already a blob URL or data URL, use it directly
        if (src.startsWith("blob:") || src.startsWith("data:")) {
          setBlobUrl(src);
          setLoading(false);
          return;
        }

        // Fetch the PDF and create a blob URL for security
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error("Failed to load PDF");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load PDF");
      } finally {
        setLoading(false);
      }
    };

    loadPDF();

    // Cleanup blob URL on unmount
    return () => {
      if (blobUrl && blobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [src]);

  const handleDownload = () => {
    if (blobUrl) {
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/50 rounded-lg",
          className
        )}
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <FileText className="h-8 w-8 animate-pulse" />
          <span className="text-sm">Loading PDF...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-destructive/10 rounded-lg border border-destructive/20",
          className
        )}
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2">
        <span className="text-sm font-medium text-muted-foreground truncate">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {allowDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          )}
          {allowNewTab && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenNewTab}
              className="h-8"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </Button>
          )}
        </div>
      </div>

      {/* Secure iframe with sandbox restrictions */}
      <iframe
        src={blobUrl || ""}
        title={title}
        className="w-full rounded-lg border bg-white"
        style={{ height }}
        sandbox="allow-same-origin"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
