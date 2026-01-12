import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnline: Date | null;
}

export const useOnlineStatus = (showToasts: boolean = true) => {
  const [status, setStatus] = useState<OnlineStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    wasOffline: false,
    lastOnline: null,
  });

  const handleOnline = useCallback(() => {
    setStatus(prev => ({
      isOnline: true,
      wasOffline: !prev.isOnline,
      lastOnline: new Date(),
    }));
    
    if (showToasts) {
      toast.success("You're back online", {
        description: "All features are now available",
        duration: 3000,
      });
    }
  }, [showToasts]);

  const handleOffline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: false,
    }));
    
    if (showToasts) {
      toast.warning("You're offline", {
        description: "Some features may be limited",
        duration: 5000,
      });
    }
  }, [showToasts]);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Check connection quality by pinging
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch("/favicon.jpeg", {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  return {
    ...status,
    checkConnection,
  };
};
