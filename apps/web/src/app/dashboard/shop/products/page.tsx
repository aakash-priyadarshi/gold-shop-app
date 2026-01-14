'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ShopGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Package,
  Loader2,
  Search,
  Image as ImageIcon,
  DollarSign,
  Scale,
  Tag,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { inventoryApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useImageUpload } from '@/hooks/useImageUpload';
import { getImageUrl } from '@/lib/image-upload';

interface InventoryItem {
  id: string;
  sku: string;
  nameEn: string;
  descriptionEn?: string;
  jewelleryType: string;
  buildMethod: string;
  composition: any;
  totalWeightGrams: number;
  metalValueNpr: number;
  makingChargeNpr: number;
  gemstoneValueNpr: number;
  totalPriceNpr: number;
  images: string[];
  status: string;
  stockQuantity: number;
  createdAt: string;
}

const jewelleryTypes = [
  'RING',
  'NECKLACE',
  'PENDANT',
  'EARRING',
  'BRACELET',
  'BANGLE',
  'CHAIN',
  'ANKLET',
  'BROOCH',
  'NOSE_PIN',
  'MAANG_TIKKA',
  'OTHER',
];

const buildMethods = [
  { value: 'METHOD_A', label: 'Method A - Solid Gold/Silver' },
  { value: 'METHOD_B', label: 'Method B - Gold Alloy' },
  { value: 'METHOD_C', label: 'Method C - Plated/Coated' },
  { value: 'METHOD_D', label: 'Method D - Machine Made' },
];

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  SOLD: 'bg-blue-100 text-blue-700',
  RESERVED: 'bg-amber-100 text-amber-700',
  UNAVAILABLE: 'bg-gray-100 text-gray-700',
};

// Gemstone types (same as RFQ)
const gemstoneTypes = [
  { code: 'DIAMOND', name: 'Diamond' },
  { code: 'RUBY', name: 'Ruby' },
  { code: 'EMERALD', name: 'Emerald' },
  { code: 'SAPPHIRE', name: 'Sapphire' },
  { code: 'PEARL', name: 'Pearl' },
  { code: 'AMETHYST', name: 'Amethyst' },
  { code: 'TOPAZ', name: 'Topaz' },
  { code: 'OPAL', name: 'Opal' },
  { code: 'GARNET', name: 'Garnet' },
  { code: 'TURQUOISE', name: 'Turquoise' },
  { code: 'CORAL', name: 'Coral' },
  { code: 'JADE', name: 'Jade' },
  { code: 'CITRINE', name: 'Citrine' },
  { code: 'PERIDOT', name: 'Peridot' },
  { code: 'AQUAMARINE', name: 'Aquamarine' },
  { code: 'OTHER', name: 'Other' },
];

// Gemstone cuts
const gemstoneCuts = [
  'Round', 'Princess', 'Oval', 'Marquise', 'Pear', 'Cushion', 
  'Emerald Cut', 'Asscher', 'Radiant', 'Heart', 'Cabochon', 'Other'
];

// Weight unit conversion
const TOLA_TO_GRAM = 11.6638;

interface GemstoneData {
  type: string;
  cut: string;
  caratWeight: number;
  color?: string;
  clarity?: string;
  valueNpr: number;
}

interface ProductFormData {
  nameEn: string;
  descriptionEn: string;
  sku: string;
  jewelleryType: string;
  buildMethod: string;
  metalType: string;
  purity: string;
  totalWeightGrams: string;
  metalValueNpr: string;
  makingChargeNpr: string;
  gemstoneValueNpr: string;
  stockQuantity: string;
  images: string[];
  gemstones: GemstoneData[];
}

const emptyForm: ProductFormData = {
  nameEn: '',
  descriptionEn: '',
  sku: '',
  jewelleryType: '',
  buildMethod: 'METHOD_A',
  metalType: 'GOLD',
  purity: '22K',
  totalWeightGrams: '',
  metalValueNpr: '',
  makingChargeNpr: '',
  gemstoneValueNpr: '0',
  stockQuantity: '1',
  images: [],
  gemstones: [],
};

// Currency based on country
const getCurrencyFromCountry = (country: string) => {
  const currencies: Record<string, { code: string; symbol: string }> = {
    NP: { code: 'NPR', symbol: 'रू' },
    IN: { code: 'INR', symbol: '₹' },
    AE: { code: 'AED', symbol: 'د.إ' },
    US: { code: 'USD', symbol: '$' },
    UK: { code: 'GBP', symbol: '£' },
  };
  return currencies[country] || currencies['NP'];
};

export default function ShopProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Shop-based currency
  const shopCountry = user?.shop?.country || 'NP';
  const currency = getCurrencyFromCountry(shopCountry);
  
  // Weight unit state
  const [weightUnit, setWeightUnit] = useState<'gram' | 'tola'>('gram');
  
  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyForm);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Image upload hook
  const { uploading: isUploadingImage, progress: imageProgress, upload: uploadImage } = useImageUpload({
    type: 'product',
    onSuccess: (result) => {
      if (result.url) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, result.url!],
        }));
        toast({
          title: 'Image Uploaded',
          description: 'Image uploaded to cloud successfully',
        });
      }
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error,
      });
    },
  });
  
  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Weight conversion helpers
  const gramsToTola = (grams: number) => grams / TOLA_TO_GRAM;
  const tolaToGrams = (tola: number) => tola * TOLA_TO_GRAM;
  
  const getDisplayWeight = (grams: number) => {
    if (weightUnit === 'tola') {
      return gramsToTola(grams).toFixed(2);
    }
    return grams.toFixed(2);
  };

  const getWeightLabel = () => weightUnit === 'tola' ? 'tola' : 'g';

  useEffect(() => {
    if (user?.shop?.id) {
      loadProducts();
    }
  }, [user?.shop?.id, statusFilter]);

  const loadProducts = async () => {
    if (!user?.shop?.id) return;
    setIsLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await inventoryApi.getShopInventory(user.shop.id, params);
      const items = response.data?.items || response.data || [];
      setProducts(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load products',
        description: 'Could not fetch your products',
      });
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingProduct(null);
    setFormData({
      ...emptyForm,
      sku: `SKU-${Date.now().toString(36).toUpperCase()}`,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: InventoryItem) => {
    setEditingProduct(product);
    const comp = product.composition || {};
    setFormData({
      nameEn: product.nameEn,
      descriptionEn: product.descriptionEn || '',
      sku: product.sku,
      jewelleryType: product.jewelleryType,
      buildMethod: product.buildMethod,
      metalType: comp.baseAlloy?.metal || comp.metal || 'GOLD',
      purity: comp.baseAlloy?.purity || comp.purity || '22K',
      totalWeightGrams: product.totalWeightGrams.toString(),
      metalValueNpr: product.metalValueNpr.toString(),
      makingChargeNpr: product.makingChargeNpr.toString(),
      gemstoneValueNpr: product.gemstoneValueNpr.toString(),
      stockQuantity: product.stockQuantity.toString(),
      images: product.images || [],
      gemstones: [],
    });
    setIsDialogOpen(true);
  };

  // Handle image file selection and upload to R2
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File Too Large',
        description: 'Please select an image smaller than 10MB',
      });
      return;
    }
    
    // Upload to Cloudflare R2
    await uploadImage(file);
    
    // Reset the input
    e.target.value = '';
  };

  // Gemstone helpers
  const addGemstone = () => {
    setFormData({
      ...formData,
      gemstones: [
        ...formData.gemstones,
        { type: '', cut: '', caratWeight: 0, valueNpr: 0 },
      ],
    });
  };

  const updateGemstone = (index: number, field: string, value: any) => {
    const newGemstones = [...formData.gemstones];
    newGemstones[index] = { ...newGemstones[index], [field]: value };
    setFormData({ ...formData, gemstones: newGemstones });
    
    // Update total gemstone value
    const totalGemstoneValue = newGemstones.reduce((sum, g) => sum + (g.valueNpr || 0), 0);
    setFormData((prev) => ({
      ...prev,
      gemstones: newGemstones,
      gemstoneValueNpr: totalGemstoneValue.toString(),
    }));
  };

  const removeGemstone = (index: number) => {
    const newGemstones = formData.gemstones.filter((_, i) => i !== index);
    const totalGemstoneValue = newGemstones.reduce((sum, g) => sum + (g.valueNpr || 0), 0);
    setFormData({
      ...formData,
      gemstones: newGemstones,
      gemstoneValueNpr: totalGemstoneValue.toString(),
    });
  };

  const handleSubmit = async () => {
    if (!user?.shop?.id) return;

    // Validation
    if (!formData.nameEn || !formData.sku || !formData.jewelleryType || !formData.totalWeightGrams) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill in all required fields',
      });
      return;
    }

    // Convert weight if in tola
    const weightInGrams = weightUnit === 'tola' 
      ? tolaToGrams(parseFloat(formData.totalWeightGrams))
      : parseFloat(formData.totalWeightGrams);

    setIsSubmitting(true);
    try {
      const dto = {
        nameEn: formData.nameEn,
        descriptionEn: formData.descriptionEn || undefined,
        sku: formData.sku,
        jewelleryType: formData.jewelleryType,
        buildMethod: formData.buildMethod,
        composition: {
          baseAlloy: {
            metal: formData.metalType,
            purity: formData.purity,
          },
          gemstones: formData.gemstones.filter((g) => g.type),
        },
        totalWeightGrams: weightInGrams,
        metalValueNpr: parseFloat(formData.metalValueNpr) || 0,
        makingChargeNpr: parseFloat(formData.makingChargeNpr) || 0,
        gemstoneValueNpr: parseFloat(formData.gemstoneValueNpr) || 0,
        stockQuantity: parseInt(formData.stockQuantity) || 1,
        images: formData.images,
      };

      if (editingProduct) {
        await inventoryApi.update(editingProduct.id, dto);
        toast({
          title: 'Product Updated',
          description: 'Your product has been updated successfully',
        });
      } else {
        await inventoryApi.create(user.shop.id, dto);
        toast({
          title: 'Product Created',
          description: 'Your product has been added to inventory',
        });
      }

      setIsDialogOpen(false);
      loadProducts();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: editingProduct ? 'Update Failed' : 'Create Failed',
        description: error.response?.data?.message || 'Could not save product',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await inventoryApi.delete(deleteId);
      toast({
        title: 'Product Deleted',
        description: 'The product has been removed from inventory',
      });
      setDeleteId(null);
      loadProducts();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.response?.data?.message || 'Could not delete product',
      });
    }
  };

  const addImage = () => {
    if (newImageUrl && !formData.images.includes(newImageUrl)) {
      setFormData({
        ...formData,
        images: [...formData.images, newImageUrl],
      });
      setNewImageUrl('');
    }
  };

  const removeImage = (url: string) => {
    setFormData({
      ...formData,
      images: formData.images.filter((img) => img !== url),
    });
  };

  const calculateTotal = () => {
    const metal = parseFloat(formData.metalValueNpr) || 0;
    const making = parseFloat(formData.makingChargeNpr) || 0;
    const gemstone = parseFloat(formData.gemstoneValueNpr) || 0;
    return metal + making + gemstone;
  };

  const filteredProducts = products.filter((p) =>
    p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Products</h1>
              <p className="text-muted-foreground">
                Manage your jewellery inventory and listings
              </p>
            </div>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or SKU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="SOLD">Sold</SelectItem>
                    <SelectItem value="RESERVED">Reserved</SelectItem>
                    <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No products found</p>
                  <p className="text-sm">Add your first product to start selling</p>
                  <Button onClick={openAddDialog} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                              {product.images?.[0] ? (
                                <img
                                  src={getImageUrl(product.images[0], 'thumbnail')}
                                  alt={product.nameEn}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{product.nameEn}</p>
                              <p className="text-xs text-muted-foreground">{product.sku}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {product.jewelleryType?.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Scale className="h-3 w-3 text-muted-foreground" />
                            <span>{getDisplayWeight(product.totalWeightGrams)} {getWeightLabel()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">
                              {currency.symbol} {product.totalPriceNpr?.toLocaleString() || 0}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.stockQuantity > 0 ? 'default' : 'destructive'}>
                            {product.stockQuantity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[product.status] || 'bg-gray-100'}>
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(product)}
                              title="Edit product"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => setDeleteId(product.id)}
                              title="Delete product"
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
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? 'Update your product details'
                  : 'Add a new jewellery item to your inventory'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    placeholder="e.g., 22K Gold Wedding Ring"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="SKU-XXXX"
                    disabled={!!editingProduct}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jewelleryType">Jewellery Type *</Label>
                  <Select
                    value={formData.jewelleryType}
                    onValueChange={(v) => setFormData({ ...formData, jewelleryType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {jewelleryTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.descriptionEn}
                  onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                  placeholder="Describe your product..."
                  rows={3}
                />
              </div>

              {/* Material Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buildMethod">Build Method</Label>
                  <Select
                    value={formData.buildMethod}
                    onValueChange={(v) => setFormData({ ...formData, buildMethod: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {buildMethods.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metalType">Metal Type</Label>
                  <Select
                    value={formData.metalType}
                    onValueChange={(v) => setFormData({ ...formData, metalType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GOLD">Gold</SelectItem>
                      <SelectItem value="SILVER">Silver</SelectItem>
                      <SelectItem value="PLATINUM">Platinum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purity">Purity</Label>
                  <Select
                    value={formData.purity}
                    onValueChange={(v) => setFormData({ ...formData, purity: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24K">24K (Pure)</SelectItem>
                      <SelectItem value="22K">22K</SelectItem>
                      <SelectItem value="18K">18K</SelectItem>
                      <SelectItem value="14K">14K</SelectItem>
                      <SelectItem value="925">925 Sterling</SelectItem>
                      <SelectItem value="999">999 Fine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Weight & Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="weight">Total Weight *</Label>
                    <div className="flex gap-1 text-xs">
                      <Button
                        type="button"
                        variant={weightUnit === 'gram' ? 'default' : 'outline'}
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setWeightUnit('gram')}
                      >
                        Gram
                      </Button>
                      <Button
                        type="button"
                        variant={weightUnit === 'tola' ? 'default' : 'outline'}
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setWeightUnit('tola')}
                      >
                        Tola
                      </Button>
                    </div>
                  </div>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    value={formData.totalWeightGrams}
                    onChange={(e) => setFormData({ ...formData, totalWeightGrams: e.target.value })}
                    placeholder={weightUnit === 'gram' ? 'e.g., 5.5g' : 'e.g., 0.47 tola'}
                  />
                  {formData.totalWeightGrams && (
                    <p className="text-xs text-muted-foreground">
                      = {getDisplayWeight(parseFloat(formData.totalWeightGrams) || 0)} {getWeightLabel()}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    placeholder="1"
                  />
                </div>
              </div>

              {/* Gemstones Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Gemstones</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addGemstone}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Gemstone
                  </Button>
                </div>
                {formData.gemstones.length > 0 && (
                  <div className="space-y-3">
                    {formData.gemstones.map((gem, idx) => (
                      <div key={idx} className="border rounded-lg p-3 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Gemstone #{idx + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 h-6"
                            onClick={() => removeGemstone(idx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Select
                            value={gem.type}
                            onValueChange={(v) => updateGemstone(idx, 'type', v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              {gemstoneTypes.map((type) => (
                                <SelectItem key={type.code} value={type.code}>
                                  {type.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={gem.cut || ''}
                            onValueChange={(v) => updateGemstone(idx, 'cut', v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Cut" />
                            </SelectTrigger>
                            <SelectContent>
                              {gemstoneCuts.map((cut) => (
                                <SelectItem key={cut} value={cut}>
                                  {cut}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Carat weight"
                            className="h-9"
                            value={gem.caratWeight || ''}
                            onChange={(e) => updateGemstone(idx, 'caratWeight', parseFloat(e.target.value) || 0)}
                          />
                          <Input
                            type="number"
                            placeholder={`Value (${currency.code})`}
                            className="h-9"
                            value={gem.valueNpr || ''}
                            onChange={(e) => updateGemstone(idx, 'valueNpr', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="metalValue">Metal Value ({currency.code})</Label>
                  <Input
                    id="metalValue"
                    type="number"
                    value={formData.metalValueNpr}
                    onChange={(e) => setFormData({ ...formData, metalValueNpr: e.target.value })}
                    placeholder="e.g., 50000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="makingCharge">Making Charge ({currency.code})</Label>
                  <Input
                    id="makingCharge"
                    type="number"
                    value={formData.makingChargeNpr}
                    onChange={(e) => setFormData({ ...formData, makingChargeNpr: e.target.value })}
                    placeholder="e.g., 5000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gemstoneValue">Gemstone Value ({currency.code})</Label>
                  <Input
                    id="gemstoneValue"
                    type="number"
                    value={formData.gemstoneValueNpr}
                    onChange={(e) => setFormData({ ...formData, gemstoneValueNpr: e.target.value })}
                    placeholder="e.g., 10000"
                    readOnly={formData.gemstones.length > 0}
                  />
                  {formData.gemstones.length > 0 && (
                    <p className="text-xs text-muted-foreground">Auto-calculated from gemstones</p>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Price</span>
                  <span className="text-xl font-bold">
                    {currency.symbol} {calculateTotal().toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Images */}
              <div className="space-y-3">
                <Label>Product Images</Label>
                
                {/* File Upload */}
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                    disabled={isUploadingImage}
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    {isUploadingImage ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Uploading to cloud... {imageProgress}%</span>
                        <div className="w-full max-w-xs h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300" 
                            style={{ width: `${imageProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload image (max 10MB)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Images are stored on Cloudflare for fast delivery
                        </p>
                      </div>
                    )}
                  </label>
                </div>

                {/* URL Input (fallback) */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Or enter image URL"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={addImage}>
                    Add
                  </Button>
                </div>

                {/* Image Preview Grid */}
                {formData.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.images.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={getImageUrl(url, 'thumbnail')}
                          alt={`Product ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(url)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingProduct ? (
                  'Update Product'
                ) : (
                  'Add Product'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this product? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DashboardLayout>
    </ShopGuard>
  );
}
