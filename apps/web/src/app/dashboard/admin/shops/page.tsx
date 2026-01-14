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
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api, { adminApi } from '@/lib/api';
import { Textarea } from '@/components/ui/textarea';

interface ShopMaterial {
  materialCode: string;
  materialName?: string;
  makingChargePerGram?: number;
  wastagePercentage?: number;
  useCustomPricing: boolean;
  customRatePerGram?: number;
}

interface Shop {
  id: string;
  shopName: string;
  shopNameNe?: string;
  description?: string;
  country: string;
  city: string;
  address?: string;
  state?: string;
  pincode?: string;
  contactPhone?: string;
  contactEmail?: string;
  currency: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  supportedJewelleryTypes?: string[];
  supportedMaterials?: string[];
  supportedMethods?: string[];
  supportedFinishes?: string[];
  makingChargePercent?: number;
  codEnabled?: boolean;
  rating?: number;
  totalReviews?: number;
  shopMaterials?: ShopMaterial[];
  _count?: {
    inventory?: number;
    orders?: number;
    rfqs?: number;
  };
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

  // View/Edit shop dialog state
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Partial<Shop>>({});
  const [isSaving, setIsSaving] = useState(false);

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
      const response = await api.get('/shops');
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
      if (approve) {
        await api.patch(`/shops/${shopId}/verify`);
        toast({
          title: 'Shop Verified',
          description: 'The shop has been approved and can now operate.',
        });
      } else {
        // For rejection, we could add a reason dialog in the future
        toast({
          title: 'Shop Rejected',
          description: 'The shop verification has been rejected.',
        });
      }
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
      const response = await api.get('/users', { params: { search: query, role: 'SHOPKEEPER' } });
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

  const handleViewShop = (shop: Shop) => {
    setSelectedShop(shop);
    setViewDialogOpen(true);
  };

  const handleEditShop = (shop: Shop) => {
    setSelectedShop(shop);
    setEditingShop({
      shopName: shop.shopName,
      shopNameNe: shop.shopNameNe,
      description: shop.description,
      country: shop.country,
      city: shop.city,
      address: shop.address,
      contactPhone: shop.contactPhone,
      contactEmail: shop.contactEmail,
      isActive: shop.isActive,
      makingChargePercent: shop.makingChargePercent,
      codEnabled: shop.codEnabled,
    });
    setEditDialogOpen(true);
  };

  const handleSaveShop = async () => {
    if (!selectedShop) return;

    setIsSaving(true);
    try {
      await api.patch(`/shops/${selectedShop.id}/admin`, editingShop);
      toast({
        title: 'Shop Updated',
        description: 'Shop details have been updated successfully.',
      });
      setEditDialogOpen(false);
      loadShops();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.response?.data?.message || 'Could not update shop.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteShop = async (shopId: string) => {
    if (!confirm('Are you sure you want to delete this shop? This action cannot be undone.')) {
      return;
    }

    setProcessingId(shopId);
    try {
      await api.delete(`/shops/${shopId}/admin`);
      toast({
        title: 'Shop Deleted',
        description: 'The shop has been deleted successfully.',
      });
      loadShops();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.response?.data?.message || 'Could not delete shop.',
      });
    } finally {
      setProcessingId(null);
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
                          <TableHead>Materials</TableHead>
                          <TableHead>Products</TableHead>
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
                              <div className="flex flex-wrap gap-1">
                                {(shop.supportedMaterials || shop.shopMaterials?.map(m => m.materialCode) || []).slice(0, 3).map((material: string) => (
                                  <Badge key={material} variant="outline" className="text-xs">{material}</Badge>
                                ))}
                                {((shop.supportedMaterials?.length || shop.shopMaterials?.length || 0) > 3) && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{(shop.supportedMaterials?.length || shop.shopMaterials?.length || 0) - 3}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <p className="font-medium">{shop._count?.inventory || 0}</p>
                                <p className="text-xs text-muted-foreground">items</p>
                              </div>
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
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewShop(shop)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditShop(shop)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {!shop.isVerified && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleVerify(shop.id, true)}
                                      disabled={processingId === shop.id}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      {processingId === shop.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleVerify(shop.id, false)}
                                      disabled={processingId === shop.id}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteShop(shop.id)}
                                  disabled={processingId === shop.id}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
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

        {/* View Shop Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Shop Details</DialogTitle>
              <DialogDescription>
                Viewing shop information and owner details
              </DialogDescription>
            </DialogHeader>
            {selectedShop && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">Shop Name</Label>
                    <p className="font-medium">{selectedShop.shopName}</p>
                    {selectedShop.shopNameNe && (
                      <p className="text-sm text-muted-foreground">{selectedShop.shopNameNe}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Status</Label>
                    <div className="flex gap-2 mt-1">
                      {selectedShop.isVerified ? (
                        <Badge className="bg-green-100 text-green-700">Verified</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
                      )}
                      {selectedShop.isActive ? (
                        <Badge variant="outline" className="text-green-700">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-700">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {selectedShop.description && (
                  <div>
                    <Label className="text-muted-foreground text-sm">Description</Label>
                    <p className="text-sm">{selectedShop.description}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Owner Information</h4>
                  {selectedShop.owner ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-sm">Name</Label>
                        <p>{selectedShop.owner.firstName} {selectedShop.owner.lastName}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-sm">Email</Label>
                        <p>{selectedShop.owner.email}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No owner information</p>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Location & Contact</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-sm">Country</Label>
                      <p>{getCountryFlag(selectedShop.country)} {selectedShop.country}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">City</Label>
                      <p>{selectedShop.city || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Address</Label>
                      <p>{selectedShop.address || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Currency</Label>
                      <p>{selectedShop.currency}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Contact Phone</Label>
                      <p>{selectedShop.contactPhone || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Contact Email</Label>
                      <p>{selectedShop.contactEmail || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Business Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-sm">Making Charge %</Label>
                      <p>{selectedShop.makingChargePercent || 10}%</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">COD Enabled</Label>
                      <p>{selectedShop.codEnabled ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Rating</Label>
                      <p>{selectedShop.rating?.toFixed(1) || 'N/A'} ({selectedShop.totalReviews || 0} reviews)</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Registered</Label>
                      <p>{formatDate(selectedShop.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                {selectedShop._count && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Statistics</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 rounded-lg bg-muted">
                        <p className="text-2xl font-bold">{selectedShop._count.inventory || 0}</p>
                        <p className="text-sm text-muted-foreground">Products</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted">
                        <p className="text-2xl font-bold">{selectedShop._count.orders || 0}</p>
                        <p className="text-sm text-muted-foreground">Orders</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted">
                        <p className="text-2xl font-bold">{selectedShop._count.rfqs || 0}</p>
                        <p className="text-sm text-muted-foreground">RFQs</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Supported Materials */}
                {(selectedShop.supportedMaterials?.length || selectedShop.shopMaterials?.length) ? (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Supported Materials</h4>
                    {selectedShop.shopMaterials?.length ? (
                      <div className="space-y-2">
                        {selectedShop.shopMaterials.map((material) => (
                          <div key={material.materialCode} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                            <div>
                              <p className="font-medium">{material.materialName || material.materialCode}</p>
                              <div className="text-sm text-muted-foreground">
                                {material.useCustomPricing ? (
                                  <span className="text-amber-600">Custom Rate: {selectedShop.currency} {material.customRatePerGram}/g</span>
                                ) : (
                                  <span>Using market rate</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              <p>Making: {material.makingChargePerGram || 0}/g</p>
                              <p>Wastage: {material.wastagePercentage || 0}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedShop.supportedMaterials?.map((material) => (
                          <Badge key={material} variant="outline">{material}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Supported Jewellery Types */}
                {selectedShop.supportedJewelleryTypes?.length ? (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Jewellery Types</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedShop.supportedJewelleryTypes.map((type) => (
                        <Badge key={type} variant="outline" className="bg-gold-50 text-gold-700">{type}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Build Methods & Finishes */}
                {(selectedShop.supportedMethods?.length || selectedShop.supportedFinishes?.length) ? (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Capabilities</h4>
                    <div className="space-y-3">
                      {selectedShop.supportedMethods?.length ? (
                        <div>
                          <Label className="text-muted-foreground text-sm">Build Methods</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedShop.supportedMethods.map((method) => (
                              <Badge key={method} variant="secondary">{method}</Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {selectedShop.supportedFinishes?.length ? (
                        <div>
                          <Label className="text-muted-foreground text-sm">Finishes</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedShop.supportedFinishes.map((finish) => (
                              <Badge key={finish} variant="secondary">{finish}</Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={() => {
                setViewDialogOpen(false);
                if (selectedShop) handleEditShop(selectedShop);
              }}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Shop Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Shop</DialogTitle>
              <DialogDescription>
                Update shop details. Owner: {selectedShop?.owner?.firstName} {selectedShop?.owner?.lastName} ({selectedShop?.owner?.email})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-shopName">Shop Name *</Label>
                  <Input
                    id="edit-shopName"
                    value={editingShop.shopName || ''}
                    onChange={(e) => setEditingShop(prev => ({ ...prev, shopName: e.target.value }))}
                    placeholder="Shop name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-shopNameNe">Shop Name (Nepali)</Label>
                  <Input
                    id="edit-shopNameNe"
                    value={editingShop.shopNameNe || ''}
                    onChange={(e) => setEditingShop(prev => ({ ...prev, shopNameNe: e.target.value }))}
                    placeholder="दुकानको नाम"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingShop.description || ''}
                  onChange={(e) => setEditingShop(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Shop description..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-country">Country</Label>
                  <Select
                    value={editingShop.country || 'NP'}
                    onValueChange={(value) => setEditingShop(prev => ({ ...prev, country: value }))}
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
                <div className="space-y-2">
                  <Label htmlFor="edit-city">City</Label>
                  <Input
                    id="edit-city"
                    value={editingShop.city || ''}
                    onChange={(e) => setEditingShop(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="e.g., Kathmandu"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={editingShop.address || ''}
                  onChange={(e) => setEditingShop(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Full address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-contactPhone">Contact Phone</Label>
                  <Input
                    id="edit-contactPhone"
                    value={editingShop.contactPhone || ''}
                    onChange={(e) => setEditingShop(prev => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="+977 98XXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contactEmail">Contact Email</Label>
                  <Input
                    id="edit-contactEmail"
                    type="email"
                    value={editingShop.contactEmail || ''}
                    onChange={(e) => setEditingShop(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="shop@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-makingCharge">Making Charge %</Label>
                  <Input
                    id="edit-makingCharge"
                    type="number"
                    value={editingShop.makingChargePercent || 10}
                    onChange={(e) => setEditingShop(prev => ({ ...prev, makingChargePercent: parseFloat(e.target.value) || 10 }))}
                    min={0}
                    max={100}
                  />
                </div>
                <div className="space-y-2 flex items-end gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingShop.codEnabled || false}
                      onChange={(e) => setEditingShop(prev => ({ ...prev, codEnabled: e.target.checked }))}
                      className="rounded"
                    />
                    <span>COD Enabled</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingShop.isActive !== false}
                      onChange={(e) => setEditingShop(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded"
                    />
                    <span>Active</span>
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveShop} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </AdminGuard>
  );
}
