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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
  Store,
  CheckCircle,
  XCircle,
  Search,
  MapPin,
  User,
  Calendar,
  Loader2,
  Plus,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api, { adminApi } from '@/lib/api';

interface Shop {
  id: string;
  shopName: string;
  country: string;
  city: string;
  currency: string;
  isVerified: boolean;
  createdAt: string;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function AdminShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [filteredShops, setFilteredShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Create shop dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creatingShop, setCreatingShop] = useState(false);
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');
  const [availableOwners, setAvailableOwners] = useState<any[]>([]);
  const [newShop, setNewShop] = useState({
    shopName: '',
    ownerEmail: '',
    ownerPassword: '',
    ownerFirstName: '',
    ownerLastName: '',
    ownerPhone: '',
    country: 'NP',
    city: '',
    address: '',
    contactPhone: '',
  });

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    filterShops();
  }, [shops, searchQuery, activeTab]);

  const loadShops = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/shops');
      let shopsArr = response.data.shops || response.data || [];
      if (!Array.isArray(shopsArr)) {
        shopsArr = [];
      }
      setShops(shopsArr);
    } catch (error) {
      console.error('Failed to load shops:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load shops',
        description: 'Could not fetch shop data',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterShops = () => {
    let filtered = [...shops];

    // Filter by tab
    if (activeTab === 'pending') {
      filtered = filtered.filter((s) => !s.isVerified);
    } else if (activeTab === 'verified') {
      filtered = filtered.filter((s) => s.isVerified);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.shopName.toLowerCase().includes(query) ||
          s.owner?.email?.toLowerCase().includes(query) ||
          s.city?.toLowerCase().includes(query)
      );
    }

    setFilteredShops(filtered);
  };

  const handleVerify = async (shopId: string, approve: boolean) => {
    setProcessingId(shopId);
    try {
      await api.patch(`/api/shops/${shopId}/verify`, { approved: approve });
      toast({
        title: approve ? 'Shop Verified' : 'Shop Rejected',
        description: approve
          ? 'The shop has been approved and can now operate.'
          : 'The shop verification has been rejected.',
      });
      loadShops();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.response?.data?.message || 'Could not process request',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const searchOwners = async (query: string) => {
    if (query.length < 2) {
      setAvailableOwners([]);
      return;
    }
    try {
      const response = await api.get('/api/users', { params: { search: query, role: 'SHOPKEEPER' } });
      const usersData = response.data.data || response.data || [];
      setAvailableOwners(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error('Failed to search owners:', error);
    }
  };

  const handleCreateShop = async () => {
    if (!newShop.shopName || !newShop.ownerEmail || !newShop.ownerPassword || !newShop.ownerFirstName || !newShop.contactPhone) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill in all required fields.',
      });
      return;
    }

    setCreatingShop(true);
    try {
      await adminApi.createShop(newShop);
      toast({
        title: 'Shop Created',
        description: 'The shop has been created successfully.',
      });
      setCreateDialogOpen(false);
      setNewShop({
        shopName: '',
        ownerEmail: '',
        ownerPassword: '',
        ownerFirstName: '',
        ownerLastName: '',
        ownerPhone: '',
        country: 'NP',
        city: '',
        address: '',
        contactPhone: '',
      });
      loadShops();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: error.response?.data?.message || 'Could not create shop.',
      });
    } finally {
      setCreatingShop(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      NP: '🇳🇵',
      IN: '🇮🇳',
      US: '🇺🇸',
      UK: '🇬🇧',
      AE: '🇦🇪',
      EU: '🇪🇺',
    };
    return flags[country] || '🌍';
  };

  const pendingCount = shops.filter((s) => !s.isVerified).length;
  const verifiedCount = shops.filter((s) => s.isVerified).length;

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Shop Management</h1>
              <p className="text-muted-foreground">
                Review and manage shop registrations
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search shops..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Shop
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New Shop</DialogTitle>
                    <DialogDescription>
                      Add a new shop with a new owner account.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                      <Label htmlFor="shopName">Shop Name *</Label>
                      <Input
                        id="shopName"
                        value={newShop.shopName}
                        onChange={(e) => setNewShop(prev => ({ ...prev, shopName: e.target.value }))}
                        placeholder="e.g., Golden Jewellers"
                      />
                    </div>
                    
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-3">Owner Details</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="ownerFirstName">First Name *</Label>
                          <Input
                            id="ownerFirstName"
                            value={newShop.ownerFirstName}
                            onChange={(e) => setNewShop(prev => ({ ...prev, ownerFirstName: e.target.value }))}
                            placeholder="First name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ownerLastName">Last Name</Label>
                          <Input
                            id="ownerLastName"
                            value={newShop.ownerLastName}
                            onChange={(e) => setNewShop(prev => ({ ...prev, ownerLastName: e.target.value }))}
                            placeholder="Last name"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 mt-3">
                        <Label htmlFor="ownerEmail">Owner Email *</Label>
                        <Input
                          id="ownerEmail"
                          type="email"
                          value={newShop.ownerEmail}
                          onChange={(e) => setNewShop(prev => ({ ...prev, ownerEmail: e.target.value }))}
                          placeholder="owner@example.com"
                        />
                      </div>
                      <div className="space-y-2 mt-3">
                        <Label htmlFor="ownerPassword">Password *</Label>
                        <Input
                          id="ownerPassword"
                          type="password"
                          value={newShop.ownerPassword}
                          onChange={(e) => setNewShop(prev => ({ ...prev, ownerPassword: e.target.value }))}
                          placeholder="Password for owner account"
                        />
                      </div>
                      <div className="space-y-2 mt-3">
                        <Label htmlFor="ownerPhone">Owner Phone</Label>
                        <Input
                          id="ownerPhone"
                          type="tel"
                          value={newShop.ownerPhone}
                          onChange={(e) => setNewShop(prev => ({ ...prev, ownerPhone: e.target.value }))}
                          placeholder="+977 98XXXXXXXX"
                        />
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-3">Shop Details</p>
                      <div className="space-y-2">
                        <Label htmlFor="contactPhone">Contact Phone *</Label>
                        <Input
                          id="contactPhone"
                          type="tel"
                          value={newShop.contactPhone}
                          onChange={(e) => setNewShop(prev => ({ ...prev, contactPhone: e.target.value }))}
                          placeholder="Shop contact number"
                        />
                      </div>
                      <div className="space-y-2 mt-3">
                        <Label htmlFor="country">Country</Label>
                        <Select
                          value={newShop.country}
                          onValueChange={(value) => setNewShop(prev => ({ ...prev, country: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NP">🇳🇵 Nepal</SelectItem>
                            <SelectItem value="IN">🇮🇳 India</SelectItem>
                            <SelectItem value="AE">🇦🇪 UAE</SelectItem>
                            <SelectItem value="US">🇺🇸 USA</SelectItem>
                            <SelectItem value="UK">🇬🇧 UK</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 mt-3">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={newShop.city}
                          onChange={(e) => setNewShop(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="e.g., Kathmandu"
                        />
                      </div>
                      <div className="space-y-2 mt-3">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={newShop.address}
                          onChange={(e) => setNewShop(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Full address"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateShop} disabled={creatingShop}>
                      {creatingShop && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Shop
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending" className="gap-2">
                Pending
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="verified" className="gap-2">
                Verified
                <Badge variant="outline" className="ml-1">
                  {verifiedCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="all">All Shops</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredShops.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No shops found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Shop</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Currency</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Registered</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredShops.map((shop) => (
                          <TableRow key={shop.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-gold-100 flex items-center justify-center">
                                  <Store className="h-5 w-5 text-gold-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{shop.shopName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    ID: {shop.id.slice(0, 8)}...
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {shop.owner ? (
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="text-sm">
                                      {shop.owner.firstName} {shop.owner.lastName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {shop.owner.email}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{getCountryFlag(shop.country)}</span>
                                <div>
                                  <p className="text-sm">{shop.city || 'Not set'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {shop.country}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{shop.currency}</Badge>
                            </TableCell>
                            <TableCell>
                              {shop.isVerified ? (
                                <Badge className="bg-green-100 text-green-700">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatDate(shop.createdAt)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {!shop.isVerified && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleVerify(shop.id, true)}
                                    disabled={processingId === shop.id}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    {processingId === shop.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Approve
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleVerify(shop.id, false)}
                                    disabled={processingId === shop.id}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Deny
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
