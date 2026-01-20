import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsersExtended, UserExtended } from '@/hooks/useUsersExtended';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  CalendarIcon, 
  Edit, 
  LogOut, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Key,
  Eye,
  EyeOff,
  Smartphone,
  RotateCcw,
  Shield,
  ShieldOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { users, loading, fetchUsers, updateUser, deleteUser, extendValidity, resetPassword, resetDevice, toggleWhitelist } = useUsersExtended();
  
  const [selectedUser, setSelectedUser] = useState<UserExtended | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetDeviceDialogOpen, setResetDeviceDialogOpen] = useState(false);
  const [whitelistDialogOpen, setWhitelistDialogOpen] = useState(false);
  const [isResettingDevice, setIsResettingDevice] = useState(false);
  const [isTogglingWhitelist, setIsTogglingWhitelist] = useState(false);
  
  // Edit form state
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editValidUntil, setEditValidUntil] = useState<Date | undefined>();
  
  // Extend form state
  const [extendDays, setExtendDays] = useState<number>(0);
  const [extendDate, setExtendDate] = useState<Date | undefined>();
  
  // Reset password form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated');
    navigate('/admin/login', { replace: true });
  };

  const handleEdit = (user: UserExtended) => {
    setSelectedUser(user);
    setEditEmail(user.email);
    setEditUsername(user.username);
    setEditValidUntil(new Date(user.valid_until));
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    
    const result = await updateUser(selectedUser.user_id, {
      email: editEmail,
      username: editUsername,
      valid_until: editValidUntil?.toISOString() || selectedUser.valid_until,
    });

    if (result.success) {
      toast.success('User updated successfully');
      setEditDialogOpen(false);
    } else {
      toast.error(result.error || 'Failed to update user');
    }
  };

  const handleDelete = (user: UserExtended) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    
    const result = await deleteUser(selectedUser.user_id);

    if (result.success) {
      toast.success('User deleted successfully');
      setDeleteDialogOpen(false);
    } else {
      toast.error(result.error || 'Failed to delete user');
    }
  };

  const handleExtend = (user: UserExtended) => {
    setSelectedUser(user);
    setExtendDays(0);
    setExtendDate(undefined);
    setExtendDialogOpen(true);
  };

  const handleResetPassword = (user: UserExtended) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setResetPasswordDialogOpen(true);
  };

  const handleResetDevice = (user: UserExtended) => {
    setSelectedUser(user);
    setResetDeviceDialogOpen(true);
  };

  const handleToggleWhitelist = (user: UserExtended) => {
    setSelectedUser(user);
    setWhitelistDialogOpen(true);
  };

  const handleConfirmResetDevice = async () => {
    if (!selectedUser) return;
    
    setIsResettingDevice(true);
    const result = await resetDevice(selectedUser.user_id);

    if (result.success) {
      toast.success('Device binding reset successfully. User can now login from a new device.');
      setResetDeviceDialogOpen(false);
    } else {
      toast.error(result.error || 'Failed to reset device binding');
    }
    setIsResettingDevice(false);
  };

  const handleConfirmToggleWhitelist = async () => {
    if (!selectedUser) return;
    
    setIsTogglingWhitelist(true);
    const result = await toggleWhitelist(selectedUser.user_id);

    if (result.success) {
      toast.success(
        result.is_whitelisted 
          ? 'User whitelisted - can now login from any device'
          : 'User whitelist removed - device binding active'
      );
      setWhitelistDialogOpen(false);
    } else {
      toast.error(result.error || 'Failed to update whitelist status');
    }
    setIsTogglingWhitelist(false);
  };

  const handleConfirmResetPassword = async () => {
    if (!selectedUser) return;
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsResettingPassword(true);
    const result = await resetPassword(selectedUser.user_id, newPassword);

    if (result.success) {
      toast.success('Password reset successfully');
      setResetPasswordDialogOpen(false);
    } else {
      toast.error(result.error || 'Failed to reset password');
    }
    setIsResettingPassword(false);
  };

  const handleConfirmExtend = async () => {
    if (!selectedUser) return;
    
    const result = await extendValidity(
      selectedUser.user_id,
      extendDays > 0 ? extendDays : undefined,
      extendDate
    );

    if (result.success) {
      toast.success('Validity extended successfully');
      setExtendDialogOpen(false);
    } else {
      toast.error(result.error || 'Failed to extend validity');
    }
  };

  const isExpired = (validUntil: string) => new Date(validUntil) < new Date();

  const activeUsers = users.filter(u => !isExpired(u.valid_until)).length;
  const expiredUsers = users.filter(u => isExpired(u.valid_until)).length;
  const whitelistedUsers = users.filter(u => u.is_whitelisted).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{expiredUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Whitelisted</CardTitle>
              <ShieldOff className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{whitelistedUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and validity periods</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
                <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Whitelist</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{format(new Date(user.registered_at), 'PPp')}</TableCell>
                      <TableCell>{format(new Date(user.valid_until), 'PPp')}</TableCell>
                      <TableCell>
                        {user.device_id ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-500/10 text-blue-600">
                            <Smartphone className="mr-1 h-3 w-3" />
                            Bound
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                            Not bound
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.is_whitelisted ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-amber-500/10 text-amber-600">
                            <ShieldOff className="mr-1 h-3 w-3" />
                            Whitelisted
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                            <Shield className="mr-1 h-3 w-3" />
                            Normal
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isExpired(user.valid_until) ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-destructive/10 text-destructive">
                            <XCircle className="mr-1 h-3 w-3" />
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/10 text-green-600">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Active
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExtend(user)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Extend
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleWhitelist(user)}
                            title={user.is_whitelisted ? "Remove Whitelist" : "Add to Whitelist"}
                            className={user.is_whitelisted ? "text-amber-600 border-amber-300 hover:bg-amber-50" : ""}
                          >
                            {user.is_whitelisted ? <ShieldOff className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                          </Button>
                          {user.device_id && !user.is_whitelisted && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResetDevice(user)}
                              title="Reset Device Binding"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResetPassword(user)}
                            title="Reset Password"
                          >
                            <Key className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(user)}
                            title="Edit User"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(user)}
                            className="text-destructive hover:text-destructive"
                            title="Delete User"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and validity period
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Valid Until</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editValidUntil && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editValidUntil ? format(editValidUntil, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={editValidUntil}
                    onSelect={setEditValidUntil}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.email}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Extend Dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Validity</DialogTitle>
            <DialogDescription>
              Extend access for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="extend-days">Add Days</Label>
              <Input
                id="extend-days"
                type="number"
                min={0}
                placeholder="Number of days to add"
                value={extendDays || ''}
                onChange={(e) => {
                  setExtendDays(parseInt(e.target.value) || 0);
                  if (e.target.value) setExtendDate(undefined);
                }}
              />
            </div>
            <div className="text-center text-sm text-muted-foreground">OR</div>
            <div className="space-y-2">
              <Label>Set Specific Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !extendDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {extendDate ? format(extendDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={extendDate}
                    onSelect={(date) => {
                      setExtendDate(date);
                      if (date) setExtendDays(0);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmExtend}
              disabled={!extendDays && !extendDate}
            >
              <Clock className="mr-2 h-4 w-4" />
              Extend Validity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-destructive">Passwords do not match</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmResetPassword}
              disabled={!newPassword || newPassword.length < 6 || newPassword !== confirmPassword || isResettingPassword}
            >
              <Key className="mr-2 h-4 w-4" />
              {isResettingPassword ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Device Dialog */}
      <AlertDialog open={resetDeviceDialogOpen} onOpenChange={setResetDeviceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Reset Device Binding
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to reset the device binding for <strong>{selectedUser?.email}</strong>?</p>
              <p className="text-sm">This will allow the user to login from a new device. Their current device will no longer have access until they login again.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmResetDevice}
              disabled={isResettingDevice}
            >
              {isResettingDevice ? 'Resetting...' : 'Reset Device'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Whitelist Toggle Dialog */}
      <AlertDialog open={whitelistDialogOpen} onOpenChange={setWhitelistDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {selectedUser?.is_whitelisted ? (
                <>
                  <Shield className="h-5 w-5" />
                  Remove Whitelist
                </>
              ) : (
                <>
                  <ShieldOff className="h-5 w-5 text-amber-600" />
                  Add to Whitelist
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {selectedUser?.is_whitelisted ? (
                <>
                  <p>Remove <strong>{selectedUser?.email}</strong> from whitelist?</p>
                  <p className="text-sm">They will be bound to one device on their next login.</p>
                </>
              ) : (
                <>
                  <p>Whitelist <strong>{selectedUser?.email}</strong>?</p>
                  <p className="text-sm">They will be able to login from any device without restrictions.</p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmToggleWhitelist}
              disabled={isTogglingWhitelist}
              className={selectedUser?.is_whitelisted ? "" : "bg-amber-600 hover:bg-amber-700"}
            >
              {isTogglingWhitelist ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboardPage;
