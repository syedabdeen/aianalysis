import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'buyer' | 'approver' | 'viewer' | Array<'admin' | 'manager' | 'buyer' | 'approver' | 'viewer'>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading, hasRole, isTrialExpired, profile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Allow access to trial-expired page
  if (location.pathname === '/trial-expired') {
    return <>{children}</>;
  }

  // Redirect to trial-expired page if trial has expired and user is not subscribed
  if (isTrialExpired && !profile?.is_subscribed) {
    return <Navigate to="/trial-expired" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
