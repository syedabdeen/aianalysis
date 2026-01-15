import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceFingerprint } from '@/lib/deviceFingerprint';

interface UserExtended {
  user_id: string;
  email: string;
  username: string;
  registered_at: string;
  valid_until: string;
  device_id?: string | null;
  device_bound_at?: string | null;
}

type SignInResult = { 
  error: Error | null; 
  deviceError: 'DEVICE_MISMATCH' | null;
};

interface SimpleAuthContextType {
  user: User | null;
  session: Session | null;
  userExtended: UserExtended | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isValidityExpired: () => boolean;
  refreshUserExtended: () => Promise<void>;
  getTrialDaysRemaining: () => number | null;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

export const SimpleAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userExtended, setUserExtended] = useState<UserExtended | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserExtended = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users_extended')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user extended:', error);
        return null;
      }
      return data as UserExtended;
    } catch (err) {
      console.error('Error in fetchUserExtended:', err);
      return null;
    }
  };

  const refreshUserExtended = async () => {
    if (user) {
      const extended = await fetchUserExtended(user.id);
      setUserExtended(extended);
    }
  };

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid potential deadlocks
          setTimeout(async () => {
            const extended = await fetchUserExtended(session.user.id);
            setUserExtended(extended);
            setLoading(false);
          }, 0);
        } else {
          setUserExtended(null);
          setLoading(false);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserExtended(session.user.id).then((extended) => {
          setUserExtended(extended);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    try {
      // Step 1: Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError) {
        return { error: authError as Error, deviceError: null };
      }

      // Step 2: Get device fingerprint
      const { visitorId, components } = await getDeviceFingerprint();

      // Step 3: Validate device with edge function
      const { data: deviceData, error: deviceFuncError } = await supabase.functions.invoke('validate-device', {
        body: {
          action: 'validate',
          userId: authData.user?.id,
          deviceId: visitorId,
          deviceInfo: components,
        }
      });

      if (deviceFuncError) {
        console.error('Device validation function error:', deviceFuncError);
        // Allow login if edge function fails (graceful degradation)
        return { error: null, deviceError: null };
      }

      // Step 4: Handle device mismatch
      if (deviceData?.error === 'DEVICE_MISMATCH') {
        // Sign out the user since they're on the wrong device
        await supabase.auth.signOut();
        return { error: null, deviceError: 'DEVICE_MISMATCH' };
      }

      return { error: null, deviceError: null };
    } catch (err) {
      console.error('Sign in error:', err);
      return { error: err as Error, deviceError: null };
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: window.location.origin,
        },
      });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserExtended(null);
  };

  const isValidityExpired = () => {
    // If no userExtended data yet, assume NOT expired (loading state)
    if (!userExtended?.valid_until) return false;
    return new Date(userExtended.valid_until) < new Date();
  };

  const getTrialDaysRemaining = (): number | null => {
    if (!userExtended?.valid_until) return null;
    const validUntil = new Date(userExtended.valid_until);
    const now = new Date();
    const diffTime = validUntil.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <SimpleAuthContext.Provider
      value={{
        user,
        session,
        userExtended,
        loading,
        signIn,
        signUp,
        signOut,
        isValidityExpired,
        refreshUserExtended,
        getTrialDaysRemaining,
      }}
    >
      {children}
    </SimpleAuthContext.Provider>
  );
};

export const useSimpleAuth = () => {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
};
