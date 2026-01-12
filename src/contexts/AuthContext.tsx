import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'manager' | 'buyer' | 'approver' | 'viewer';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  department_id: string | null;
  preferred_language: string;
  avatar_url: string | null;
  trial_started_at: string | null;
  trial_expires_at: string | null;
  is_subscribed: boolean;
  subscription_plan: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (requiredRole: AppRole | AppRole[]) => boolean;
  isAdmin: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number | null;
  refreshRole: () => Promise<void>;
  setRoleOverride: (role: AppRole | null) => void;
  roleOverride: AppRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roleOverride, setRoleOverride] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else if (profileData) {
        setProfile(profileData as Profile);
      }

      // Fetch role from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError) {
        console.error('Error fetching role:', roleError);
        // Default to viewer if no role found
        setRole(null);
      } else if (roleData) {
        console.log('Fetched role:', roleData.role);
        setRole(roleData.role as AppRole);
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer data fetching
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setRoleOverride(null);
  };

  const refreshRole = async () => {
    if (!user?.id) return;
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (roleData) {
      setRole(roleData.role as AppRole);
    }
  };

  // Use role override if set, otherwise use actual role
  const effectiveRole = roleOverride ?? role;

  const hasRole = (requiredRole: AppRole | AppRole[]): boolean => {
    if (!effectiveRole) return false;
    if (effectiveRole === 'admin') return true; // Admin has access to everything
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(effectiveRole);
    }
    return effectiveRole === requiredRole;
  };

  const isAdmin = effectiveRole === 'admin';

  // Trial status calculations
  const getTrialStatus = () => {
    if (!profile) return { isActive: false, isExpired: false, daysRemaining: null };
    
    // Subscribed users bypass trial
    if (profile.is_subscribed) return { isActive: true, isExpired: false, daysRemaining: null };
    
    if (!profile.trial_expires_at) return { isActive: false, isExpired: true, daysRemaining: 0 };
    
    const expiresAt = new Date(profile.trial_expires_at);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    return {
      isActive: daysRemaining > 0,
      isExpired: daysRemaining <= 0,
      daysRemaining: Math.max(0, daysRemaining)
    };
  };

  const trialStatus = getTrialStatus();
  const isTrialActive = trialStatus.isActive;
  const isTrialExpired = trialStatus.isExpired;
  const trialDaysRemaining = trialStatus.daysRemaining;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      role: effectiveRole,
      loading,
      signIn,
      signUp,
      signOut,
      hasRole,
      isAdmin,
      isTrialActive,
      isTrialExpired,
      trialDaysRemaining,
      refreshRole,
      setRoleOverride,
      roleOverride
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
