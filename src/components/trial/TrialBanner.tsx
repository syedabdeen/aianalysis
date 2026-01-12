import { AlertTriangle, Clock, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TrialBanner() {
  const { isTrialExpired, trialDaysRemaining, profile } = useAuth();

  // Don't show banner for subscribed users
  if (profile?.is_subscribed) return null;
  
  // Don't show if no trial info
  if (trialDaysRemaining === null) return null;

  const isUrgent = trialDaysRemaining <= 2;
  const isWarning = trialDaysRemaining <= 5 && trialDaysRemaining > 2;

  if (isTrialExpired) {
    return (
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              Your free trial has expired. Subscribe to continue using ProcureMind.
            </p>
          </div>
          <Button
            size="sm"
            className="bg-destructive hover:bg-destructive/90"
            onClick={() => window.location.href = "mailto:sales@procuremind.ai?subject=Subscription%20Inquiry"}
          >
            <Crown className="w-4 h-4 mr-2" />
            Subscribe Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "border-b px-4 py-2",
      isUrgent && "bg-destructive/10 border-destructive/20",
      isWarning && "bg-amber-500/10 border-amber-500/20",
      !isUrgent && !isWarning && "bg-primary/5 border-primary/10"
    )}>
      <div className="container mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Clock className={cn(
            "w-4 h-4",
            isUrgent && "text-destructive",
            isWarning && "text-amber-500",
            !isUrgent && !isWarning && "text-primary"
          )} />
          <p className={cn(
            "text-sm",
            isUrgent && "text-destructive font-medium",
            isWarning && "text-amber-600 dark:text-amber-400",
            !isUrgent && !isWarning && "text-muted-foreground"
          )}>
            {trialDaysRemaining === 1 
              ? "Your free trial expires tomorrow!" 
              : `${trialDaysRemaining} days remaining in your free trial`
            }
          </p>
        </div>
        <Button
          size="sm"
          variant={isUrgent ? "destructive" : "outline"}
          onClick={() => window.location.href = "mailto:sales@procuremind.ai?subject=Subscription%20Inquiry"}
        >
          <Crown className="w-4 h-4 mr-2" />
          Upgrade Plan
        </Button>
      </div>
    </div>
  );
}
