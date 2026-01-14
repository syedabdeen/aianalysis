import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserExtended {
  user_id: string;
  email: string;
  username: string;
  registered_at: string;
  valid_until: string;
}

export const useUsersExtended = () => {
  const [users, setUsers] = useState<UserExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list' }
      });

      if (error) throw error;
      setUsers(data?.data || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      // Fallback to direct query if edge function fails
      try {
        const { data, error } = await supabase
          .from('users_extended')
          .select('*')
          .order('registered_at', { ascending: false });

        if (error) throw error;
        setUsers(data || []);
      } catch (fallbackErr: any) {
        setError(fallbackErr.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateUser = async (userId: string, updates: Partial<UserExtended>) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'update', userId, updates }
      });

      if (error) throw error;
      await fetchUsers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'delete', userId }
      });

      if (error) throw error;
      await fetchUsers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const extendValidity = async (userId: string, daysToAdd?: number, specificDate?: Date) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { 
          action: 'extend', 
          userId, 
          daysToAdd,
          specificDate: specificDate?.toISOString()
        }
      });

      if (error) throw error;
      await fetchUsers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const resetPassword = async (userId: string, newPassword: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'reset-password', userId, newPassword }
      });

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    users,
    loading,
    error,
    fetchUsers,
    updateUser,
    deleteUser,
    extendValidity,
    resetPassword,
  };
};
