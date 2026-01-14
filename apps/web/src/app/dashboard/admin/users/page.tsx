'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Mail,
  Calendar,
  Loader2,
  Shield,
  Store,
  User,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Phone,
  MapPin,
  Globe,
  Clock,
  CheckCircle,
  XCircle,
  Star,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api, { adminApi } from '@/lib/api';

interface ShopData {
  id: string;
  shopName: string;
  city: string;
  address: string;
  country: string;
  contactPhone: string;
  contactEmail: string;
  websiteUrl?: string;
  isVerified: boolean;
  isActive: boolean;
  rating?: number;
  totalReviews?: number;
  createdAt: string;
  updatedAt: string;
  supportedMaterials?: string[];
  supportedJewelleryTypes?: string[];
  supportedMethods?: string[];
  codMaxValueNpr?: number;
}

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'ADMIN' | 'SHOPKEEPER' | 'CUSTOMER' | 'SUPPORT';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION' | 'DEACTIVATED';
  preferredLanguage?: string;
  preferredCurrency?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  shop?: ShopData;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Create user dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'CUSTOMER' as 'ADMIN' | 'SHOPKEEPER' | 'CUSTOMER' | 'SUPPORT',
  });

  // View/Edit user dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [editForm, setEditForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'CUSTOMER' as string,
    status: 'ACTIVE' as string,
  });
  const [savingUser, setSavingUser] = useState(false);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, statusFilter]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/users');
      let usersArr = response.data?.data || response.data?.users || response.data || [];
      if (!Array.isArray(usersArr)) {
        usersArr = [];
      }
      setUsers(usersArr);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load users',
        description: 'Could not fetch user data',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter((u) => u.status === 'ACTIVE');
    } else if (statusFilter === 'suspended') {
      filtered = filtered.filter((u) => u.status === 'SUSPENDED');
    } else if (statusFilter === 'pending') {
      filtered = filtered.filter((u) => u.status === 'PENDING_VERIFICATION');
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          u.firstName?.toLowerCase().includes(query) ||
          u.lastName?.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleViewUser = async (user: UserData) => {
    setSelectedUser(null);
    setViewDialogOpen(true);
    setLoadingUserDetails(true);
    
    try {
      const response = await adminApi.getUserDetails(user.id);
      setSelectedUser(response.data);
    } catch (error) {
      console.error('Failed to load user details:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load user details',
        description: 'Could not fetch full user information',
      });
      setViewDialogOpen(false);
    } finally {
      setLoadingUserDetails(false);
    }
  };

  const handleEditUser = (user: UserData) => {
    setSelectedUser(user);
    setEditForm({
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      role: user.role,
      status: user.status,
    });
    setEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    
    setSavingUser(true);
    try {
      await adminApi.updateUser(selectedUser.id, editForm);
      toast({
        title: 'User Updated',
        description: 'User information has been updated successfully.',
      });
      setEditDialogOpen(false);
      loadUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.response?.data?.message || 'Could not update user',
      });
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setDeletingUser(true);
    try {
      await adminApi.deleteUser(userToDelete.id);
      toast({
        title: 'User Deleted',
        description: 'The user has been deleted successfully.',
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.response?.data?.message || 'Could not delete user',
      });
    } finally {
      setDeletingUser(false);
    }
  };

  const handleSuspend = async (userId: string) => {
    setProcessingId(userId);
    try {
      await api.patch(`/users/${userId}/suspend`);
      toast({
        title: 'User Suspended',
        description: 'The user has been suspended.',
      });
      loadUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.response?.data?.message || 'Could not suspend user',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleActivate = async (userId: string) => {
    setProcessingId(userId);
    try {
      await api.patch(`/users/${userId}/activate`);
      toast({
        title: 'User Activated',
        description: 'The user has been activated.',
      });
      loadUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.response?.data?.message || 'Could not activate user',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.firstName) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill in all required fields.',
      });
      return;
    }

    setCreatingUser(true);
    try {
      await adminApi.createUser(newUser);
      toast({
        title: 'User Created',
        description: 'The user has been created successfully.',
      });
      setCreateDialogOpen(false);
      setNewUser({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        role: 'CUSTOMER',
      });
      loadUsers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: error.response?.data?.message || 'Could not create user.',
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="h-4 w-4 text-purple-600" />;
      case 'SHOPKEEPER':
        return <Store className="h-4 w-4 text-gold-600" />;
      case 'CUSTOMER':
        return <User className="h-4 w-4 text-blue-600" />;
      default:
        return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-700';
      case 'SHOPKEEPER':
        return 'bg-gold-100 text-gold-700';
      case 'CUSTOMER':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const userStats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'ADMIN').length,
    shopkeepers: users.filter((u) => u.role === 'SHOPKEEPER').length,
    customers: users.filter((u) => u.role === 'CUSTOMER').length,
    active: users.filter((u) => u.status === 'ACTIVE').length,
    suspended: users.filter((u) => u.status === 'SUSPENDED').length,
    pending: users.filter((u) => u.status === 'PENDING_VERIFICATION').length,
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">User Management</h1>
              <p className="text-muted-foreground">
                View and manage platform users
              </p>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user to the platform. They will receive a welcome email.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={newUser.firstName}
                        onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={newUser.lastName}
                        onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={newUser.phone}
                      onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+977 98XXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CUSTOMER">Customer</SelectItem>
                        <SelectItem value="SHOPKEEPER">Shopkeeper</SelectItem>
                        <SelectItem value="SUPPORT">Support</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser} disabled={creatingUser}>
                    {creatingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{userStats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold text-purple-600">{userStats.admins}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Shopkeepers</p>
                <p className="text-2xl font-bold text-gold-600">{userStats.shopkeepers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Customers</p>
                <p className="text-2xl font-bold text-blue-600">{userStats.customers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{userStats.active}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Suspended</p>
                <p className="text-2xl font-bold text-red-600">{userStats.suspended}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="SHOPKEEPER">Shopkeeper</SelectItem>
                    <SelectItem value="CUSTOMER">Customer</SelectItem>
                    <SelectItem value="SUPPORT">Support</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending Verification</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Shop</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                              {getRoleIcon(user.role)}
                            </div>
                            <div>
                              <p className="font-medium">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.status === 'ACTIVE' ? (
                            <Badge className="bg-green-100 text-green-700">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : user.status === 'PENDING_VERIFICATION' ? (
                            <Badge className="bg-amber-100 text-amber-700">
                              Pending
                            </Badge>
                          ) : user.status === 'SUSPENDED' ? (
                            <Badge variant="destructive">
                              <UserX className="h-3 w-3 mr-1" />
                              Suspended
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              {user.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.shop ? (
                            <span className="text-sm">{user.shop.shopName}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(user.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {/* View Details */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewUser(user)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {/* Edit User */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditUser(user)}
                              title="Edit User"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            
                            {/* Suspend/Activate */}
                            {user.role !== 'ADMIN' && (
                              user.status === 'ACTIVE' ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSuspend(user.id)}
                                  disabled={processingId === user.id}
                                  className="text-amber-600 hover:text-amber-700"
                                  title="Suspend User"
                                >
                                  {processingId === user.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <UserX className="h-4 w-4" />
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleActivate(user.id)}
                                  disabled={processingId === user.id}
                                  className="text-green-600 hover:text-green-700"
                                  title="Activate User"
                                >
                                  {processingId === user.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <UserCheck className="h-4 w-4" />
                                  )}
                                </Button>
                              )
                            )}
                            
                            {/* Delete User */}
                            {user.role !== 'ADMIN' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setUserToDelete(user);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-red-600 hover:text-red-700"
                                title="Delete User"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* View User Details Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                Complete information about this user
              </DialogDescription>
            </DialogHeader>
            
            {loadingUserDetails ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : selectedUser ? (
              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  {selectedUser.shop && (
                    <TabsTrigger value="shop">Shop Details</TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="profile" className="space-y-4 mt-4">
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center">
                      {getRoleIcon(selectedUser.role)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </h3>
                      <Badge className={getRoleBadgeColor(selectedUser.role)}>
                        {selectedUser.role}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-sm">Email</Label>
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {selectedUser.email}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-sm">Phone</Label>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {selectedUser.phone || '—'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-sm">Status</Label>
                      <p>
                        {selectedUser.status === 'ACTIVE' ? (
                          <Badge className="bg-green-100 text-green-700">Active</Badge>
                        ) : selectedUser.status === 'SUSPENDED' ? (
                          <Badge variant="destructive">Suspended</Badge>
                        ) : (
                          <Badge variant="secondary">{selectedUser.status}</Badge>
                        )}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-sm">Language</Label>
                      <p>{selectedUser.preferredLanguage || 'en'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-sm">Currency</Label>
                      <p>{selectedUser.preferredCurrency || 'NPR'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-sm">Joined</Label>
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDateTime(selectedUser.createdAt)}
                      </p>
                    </div>
                    {selectedUser.lastLoginAt && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Last Login</Label>
                        <p className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatDateTime(selectedUser.lastLoginAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                {selectedUser.shop && (
                  <TabsContent value="shop" className="space-y-4 mt-4">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-white flex items-center justify-center">
                          <Store className="h-6 w-6 text-gold-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{selectedUser.shop.shopName}</h3>
                          <div className="flex items-center gap-2">
                            {selectedUser.shop.isVerified ? (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="h-3 w-3 mr-1" />
                                Unverified
                              </Badge>
                            )}
                            {selectedUser.shop.isActive ? (
                              <Badge className="bg-blue-100 text-blue-700">Active</Badge>
                            ) : (
                              <Badge variant="destructive">Inactive</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">{selectedUser.shop.rating?.toFixed(1) || '0.0'}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {selectedUser.shop.totalReviews || 0} reviews
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Location</Label>
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {selectedUser.shop.city}, {selectedUser.shop.country}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Address</Label>
                        <p>{selectedUser.shop.address}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Contact Phone</Label>
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {selectedUser.shop.contactPhone || '—'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-sm">Contact Email</Label>
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {selectedUser.shop.contactEmail || '—'}
                        </p>
                      </div>
                      {selectedUser.shop.websiteUrl && (
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">Website</Label>
                          <p className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <a href={selectedUser.shop.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {selectedUser.shop.websiteUrl}
                            </a>
                          </p>
                        </div>
                      )}
                      {selectedUser.shop.codMaxValueNpr && (
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-sm">COD Max Value</Label>
                          <p>NPR {selectedUser.shop.codMaxValueNpr.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                    
                    {(selectedUser.shop.supportedMaterials?.length || selectedUser.shop.supportedJewelleryTypes?.length || selectedUser.shop.supportedMethods?.length) && (
                      <div className="space-y-4 pt-4 border-t">
                        <h4 className="font-semibold">Supported Services</h4>
                        
                        {(selectedUser.shop.supportedMaterials?.length ?? 0) > 0 && (
                          <div className="space-y-2">
                            <Label className="text-muted-foreground text-sm">Materials</Label>
                            <div className="flex flex-wrap gap-2">
                              {selectedUser.shop.supportedMaterials?.map((material) => (
                                <Badge key={material} variant="outline">{material}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {(selectedUser.shop.supportedJewelleryTypes?.length ?? 0) > 0 && (
                          <div className="space-y-2">
                            <Label className="text-muted-foreground text-sm">Jewellery Types</Label>
                            <div className="flex flex-wrap gap-2">
                              {selectedUser.shop.supportedJewelleryTypes?.map((type) => (
                                <Badge key={type} variant="outline">{type}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {(selectedUser.shop.supportedMethods?.length ?? 0) > 0 && (
                          <div className="space-y-2">
                            <Label className="text-muted-foreground text-sm">Build Methods</Label>
                            <div className="flex flex-wrap gap-2">
                              {selectedUser.shop.supportedMethods?.map((method) => (
                                <Badge key={method} variant="outline">{method}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="text-sm text-muted-foreground pt-4 border-t">
                      <p>Shop created: {formatDateTime(selectedUser.shop.createdAt)}</p>
                      {selectedUser.shop.updatedAt && (
                        <p>Last updated: {formatDateTime(selectedUser.shop.updatedAt)}</p>
                      )}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            ) : null}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
              {selectedUser && (
                <Button onClick={() => {
                  setViewDialogOpen(false);
                  handleEditUser(selectedUser);
                }}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit User
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input
                    id="edit-firstName"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input
                    id="edit-lastName"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOMER">Customer</SelectItem>
                    <SelectItem value="SHOPKEEPER">Shopkeeper</SelectItem>
                    <SelectItem value="SUPPORT">Support</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="PENDING_VERIFICATION">Pending Verification</SelectItem>
                    <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveUser} disabled={savingUser}>
                {savingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the user{' '}
                <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong>{' '}
                ({userToDelete?.email}).
                {userToDelete?.shop && (
                  <span className="block mt-2 text-amber-600">
                    ⚠️ This user has a shop ({userToDelete.shop.shopName}) which will also be deleted.
                  </span>
                )}
                <span className="block mt-2">
                  This action cannot be undone.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingUser}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                disabled={deletingUser}
                className="bg-red-600 hover:bg-red-700"
              >
                {deletingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DashboardLayout>
    </AdminGuard>
  );
}
