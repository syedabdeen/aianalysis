import { ReactNode, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Mail, Phone } from 'lucide-react';

interface ValidityGuardProps {
  children: ReactNode;
}

export const ValidityGuard = ({ children }: ValidityGuardProps) => {
  const { user, loading, isValidityExpired, signOut, userExtended } = useSimpleAuth();
  const [showExpiredDialog, setShowExpiredDialog] = useState(true);

  // Show loading while user data is being fetched
  if (loading || (user && !userExtended)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isValidityExpired()) {
    return (
      <AlertDialog open={showExpiredDialog} onOpenChange={setShowExpiredDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Account Expired
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p className="text-foreground">
                Your account access has expired. Please contact us to extend your access.
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-foreground">
                  <Mail className="h-4 w-4 text-primary" />
                  <a 
                    href="mailto:cmc@widelens.info" 
                    className="hover:text-primary transition-colors"
                  >
                    cmc@widelens.info
                  </a>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Phone className="h-4 w-4 text-primary" />
                  <a 
                    href="https://wa.me/971588325147" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    +971 58 832 5147 (WhatsApp)
                  </a>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => {
                signOut();
              }}
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return <>{children}</>;
};
