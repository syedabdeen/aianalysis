import { WifiOff, RefreshCw } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OfflineIndicatorProps {
  className?: string;
}

export const OfflineIndicator = ({ className }: OfflineIndicatorProps) => {
  const { isOnline, checkConnection } = useOnlineStatus(false);

  if (isOnline) return null;

  const handleRetry = async () => {
    const connected = await checkConnection();
    if (connected) {
      window.location.reload();
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "bg-destructive text-destructive-foreground",
        "px-4 py-2 rounded-full shadow-lg",
        "flex items-center gap-2 text-sm font-medium",
        "animate-in slide-in-from-bottom-4 duration-300",
        className
      )}
    >
      <WifiOff className="h-4 w-4" />
      <span>You're offline</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-destructive-foreground hover:bg-destructive-foreground/10"
        onClick={handleRetry}
      >
        <RefreshCw className="h-3 w-3 mr-1" />
        Retry
      </Button>
    </div>
  );
};
