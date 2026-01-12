import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectTeamMembers, useAddProjectTeamMember, useRemoveProjectTeamMember } from '@/hooks/useProjectTeam';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Users, X, UserPlus, Crown } from 'lucide-react';

interface ProjectTeamSectionProps {
  projectId: string;
  managerId?: string | null;
  isEditable?: boolean;
}

export const ProjectTeamSection: React.FC<ProjectTeamSectionProps> = ({
  projectId,
  managerId,
  isEditable = true,
}) => {
  const { language } = useLanguage();
  const { data: teamMembers, isLoading } = useProjectTeamMembers(projectId);
  const addMember = useAddProjectTeamMember();
  const removeMember = useRemoveProjectTeamMember();
  
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: users } = useQuery({
    queryKey: ['users-for-team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const existingMemberIds = new Set([
    ...(teamMembers?.map(m => m.user_id) || []),
    managerId,
  ].filter(Boolean));

  const availableUsers = users?.filter(u => !existingMemberIds.has(u.id)) || [];

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    await addMember.mutateAsync({
      project_id: projectId,
      user_id: selectedUserId,
    });
    setSelectedUserId('');
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const manager = users?.find(u => u.id === managerId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {language === 'ar' ? 'فريق المشروع' : 'Project Team'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project Manager */}
        {manager && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/20 text-primary">
                {getInitials(manager.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{manager.full_name || manager.email}</p>
              <p className="text-xs text-muted-foreground">{manager.email}</p>
            </div>
            <Badge className="bg-primary/20 text-primary border-primary/30">
              <Crown className="h-3 w-3 mr-1" />
              {language === 'ar' ? 'مدير المشروع' : 'Project Manager'}
            </Badge>
          </div>
        )}

        {/* Team Members */}
        <div className="space-y-2">
          {teamMembers?.map((member) => (
            <div 
              key={member.id} 
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {getInitials(member.user?.full_name || null)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{member.user?.full_name || member.user?.email}</p>
                <p className="text-xs text-muted-foreground">{member.user?.email}</p>
              </div>
              <Badge variant="secondary">
                {language === 'ar' ? 'عضو' : 'Member'}
              </Badge>
              {isEditable && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteId(member.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          {(!teamMembers || teamMembers.length === 0) && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {language === 'ar' ? 'لا يوجد أعضاء في الفريق' : 'No team members added yet'}
            </p>
          )}
        </div>

        {/* Add Member */}
        {isEditable && (
          <div className="flex gap-2 pt-4 border-t border-border">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={language === 'ar' ? 'اختر عضواً' : 'Select member'} />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddMember}
              disabled={!selectedUserId || addMember.isPending}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {language === 'ar' ? 'إضافة' : 'Add'}
            </Button>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'إزالة العضو' : 'Remove Team Member'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar'
                ? 'هل أنت متأكد من إزالة هذا العضو من فريق المشروع؟'
                : 'Are you sure you want to remove this member from the project team?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  removeMember.mutate({ id: deleteId, projectId });
                  setDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {language === 'ar' ? 'إزالة' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
