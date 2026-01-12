import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApprovalRoles, useEditApprovalRole } from '@/hooks/useApprovalMatrix';
import { ApprovalRole } from '@/types/approval';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, CheckCircle2, XCircle } from 'lucide-react';

interface ApprovalRolesTableProps {
  onEdit: (role: ApprovalRole) => void;
}

export const ApprovalRolesTable: React.FC<ApprovalRolesTableProps> = ({
  onEdit,
}) => {
  const { language } = useLanguage();
  const { data: roles, isLoading } = useApprovalRoles();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead>{language === 'ar' ? 'الدور' : 'Role'}</TableHead>
            <TableHead>{language === 'ar' ? 'الرمز' : 'Code'}</TableHead>
            <TableHead>{language === 'ar' ? 'المستوى' : 'Level'}</TableHead>
            <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
            <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles?.map((role) => (
            <TableRow key={role.id} className="hover:bg-muted/20">
              <TableCell>
                <div>
                  <p className="font-medium">{language === 'ar' ? role.name_ar : role.name_en}</p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? role.name_en : role.name_ar}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono">
                  {role.code}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  Level {role.hierarchy_level}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {role.description || '—'}
                </span>
              </TableCell>
              <TableCell>
                {role.is_active ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {language === 'ar' ? 'نشط' : 'Active'}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircle className="h-3 w-3 mr-1" />
                    {language === 'ar' ? 'معطل' : 'Inactive'}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(role)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
