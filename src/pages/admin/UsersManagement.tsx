import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ModuleKPIDashboard, KPIItem } from '@/components/layout/ModuleKPIDashboard';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, UserCheck, ClipboardList } from 'lucide-react';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { RoleRequestsPanel } from '@/components/admin/RoleRequestsPanel';

type AppRole = 'admin' | 'manager' | 'buyer' | 'approver' | 'viewer';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole | null;
  department_name: string | null;
}

const UsersManagement: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          department_id,
          departments (name_en, name_ar)
        `);

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const rolesMap = new Map(roles?.map((r) => [r.user_id, r.role as AppRole]));

      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => ({
        id: profile.id,
        email: profile.email || '',
        full_name: profile.full_name,
        role: rolesMap.get(profile.id) || null,
        department_name: profile.departments
          ? (profile.departments as any).name_en
          : null,
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    setUpdating(userId);
    try {
      // Check if user already has a role
      const existingUser = users.find((u) => u.id === userId);

      if (existingUser?.role) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      toast({
        title: t('common.success'),
        description: 'User role updated successfully',
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const getRoleBadgeVariant = (role: AppRole | null) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'manager':
        return 'default';
      case 'buyer':
        return 'secondary';
      case 'approver':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const roles: AppRole[] = ['admin', 'manager', 'buyer', 'approver', 'viewer'];

  const kpiItems: KPIItem[] = [
    {
      title: 'Total Users',
      titleAr: 'إجمالي المستخدمين',
      value: users.length.toString(),
      icon: Shield,
      color: 'primary',
    },
    {
      title: 'Admins',
      titleAr: 'المشرفين',
      value: users.filter(u => u.role === 'admin').length.toString(),
      icon: Shield,
      color: 'danger',
    },
    {
      title: 'Managers',
      titleAr: 'المديرين',
      value: users.filter(u => u.role === 'manager').length.toString(),
      icon: Shield,
      color: 'success',
    },
    {
      title: 'Unassigned',
      titleAr: 'بدون دور',
      value: users.filter(u => !u.role).length.toString(),
      icon: Shield,
      color: 'warning',
    },
  ];

  return (
    <DashboardLayout>
      <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        <PageHeader
          title={t('admin.userManagement')}
          titleAr="إدارة المستخدمين"
          description="Manage user roles and permissions"
          descriptionAr="إدارة أدوار وصلاحيات المستخدمين"
          icon={Shield}
          actions={<CreateUserDialog onUserCreated={fetchUsers} />}
        />

        <ModuleKPIDashboard items={kpiItems} />

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <UserCheck className="h-4 w-4" />
              {t('admin.userManagement')}
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              {isRTL ? 'طلبات الأدوار' : 'Role Requests'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? 'جميع المستخدمين' : 'All Users'}</CardTitle>
                <CardDescription>
                  {users.length} {isRTL ? 'مستخدم مسجل في النظام' : 'users registered in the system'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('auth.fullName')}</TableHead>
                        <TableHead>{t('auth.email')}</TableHead>
                        <TableHead>{t('admin.department')}</TableHead>
                        <TableHead>{t('admin.role')}</TableHead>
                        <TableHead>{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            {t('common.noData')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.full_name || '-'}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.department_name || '-'}</TableCell>
                            <TableCell>
                              {user.role ? (
                                <Badge variant={getRoleBadgeVariant(user.role)}>
                                  {t(`role.${user.role}`)}
                                </Badge>
                              ) : (
                                <Badge variant="outline">No Role</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={user.role || ''}
                                onValueChange={(value) =>
                                  handleRoleChange(user.id, value as AppRole)
                                }
                                disabled={updating === user.id}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Assign role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {t(`role.${role}`)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <RoleRequestsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default UsersManagement;
