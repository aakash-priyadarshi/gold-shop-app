'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ShopGuard } from '@/components/auth/RouteGuard';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Gem,
  ArrowRight,
  ArrowLeft,
  Upload,
  X,
  Info,
  Check,
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  Phone,
  User,
  MapPin,
  Mail,
  Store,
  Globe,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { usePreferencesStore, CURRENCIES, COUNTRIES, type CurrencyCode, type CountryCode } from '@/store/preferences';
import { useMarket, WEIGHT_UNIT_SYMBOLS, type WeightUnit } from '@/hooks/useMarket';
import { toGrams, fromGrams } from '@gold-shop/shared';
import { useImageUpload } from '@/hooks/useImageUpload';
import { getImageUrl } from '@/lib/image-upload';
import { getApiUrl } from '@/lib/api';

// Pricing components
import { AlloyBuilder, type AlloyConfig } from '@/components/pricing/AlloyBuilder';
import { MethodCSelector, type MethodCConfig } from '@/components/pricing/MethodCSelector';
import { GemstoneEditorV2, type GemstoneEntry as GemstoneEntryV2 } from '@/components/pricing/GemstoneEditorV2';
import { LivePricingPanel } from '@/components/pricing/LivePricingPanel';
import { 
  calculateEstimate, 
  type BuildMethod,
  type EstimateRequest,
} from '@/lib/pricing/calculate-estimate';

const API_URL = getApiUrl();

const JEWELLERY_TYPES = [
  { value: 'RING', label: 'Ring' },
  { value: 'NECKLACE', label: 'Necklace' },
  { value: 'BRACELET', label: 'Bracelet' },
  { value: 'EARRING', label: 'Earrings' },
  { value: 'PENDANT', label: 'Pendant' },
  { value: 'BANGLE', label: 'Bangle' },
  { value: 'CHAIN', label: 'Chain' },
  { value: 'ANKLET', label: 'Anklet' },
  { value: 'NOSE_PIN', label: 'Nose Pin' },
  { value: 'MANGALSUTRA', label: 'Mangalsutra' },
  { value: 'MAANG_TIKKA', label: 'Maang Tikka' },
  { value: 'OTHER', label: 'Other' },
];

const BUILD_METHODS = [
  { value: 'METHOD_A', label: 'Method A: Solid Precious Metal', description: 'Pure gold, silver, or platinum throughout' },
  { value: 'METHOD_B', label: 'Method B: Precious Metal Alloy', description: 'Gold/silver mixed with other metals for durability' },
  { value: 'METHOD_C', label: 'Method C: Base Metal + Plating', description: 'Not solid gold. Plated/Coated.' },
  { value: 'METHOD_D', label: 'Method D: Italian Machine Made', description: 'Machine-made chains, bangles, and intricate patterns' },
];

const WEIGHT_CATEGORIES = [
  { value: 'LIGHT', label: 'Light', description: 'Delicate, everyday wear' },
  { value: 'MEDIUM', label: 'Medium', description: 'Standard weight' },
  { value: 'HEAVY', label: 'Heavy', description: 'Statement piece' },
];

// Country codes for phone
const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵' },
  { code: '+1', country: 'USA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
];

interface Template {
  id: string;
  name: string;
  jewelleryType: string;
  lightWeightGrams: number;
  mediumWeightGrams: number;
  heavyWeightGrams: number;
  recommendedMaterials: string[];
}

interface GemstonePreset {
  id: string;
  stoneType: string;
  sizeOptions: string[];
  colorOptions: string[];
  basePriceNpr: number;
}

interface PlatingOption {
  id: string;
  platingType: string;
  tier: string;
  displayName: string;
  basePriceNpr: number;
  goldContent: string;
}

interface GemstoneEntry {
  presetId: string;
  stoneType: string;
  shape: string;
  size: string;
  colour: string;
  settingStyle: string;
  count: number;
}

interface PriceEstimate {
  metalCost: number;
  makingCharge: number;
  platingCost: number;
  gemstoneCost: number;
  subtotal: number;
  tax: number;
  total: number;
  breakdown: {
    metalType: string;
    weightGrams: number;
    ratePerGram: number;
    makingChargePercent: number;
  };
}

interface MarketRates {
  region: string;
  currency: CurrencyCode;
  unit: string;
  updatedAt: string;
  source: string;
  cache: 'fresh' | 'stale' | 'miss' | 'fallback';
  fx: {
    pair: string;
    rate: number;
    source: string;
    updatedAt: string;
  };
  adjustments: {
    importDutyPct?: number;
    customsDutyPct?: number;
    gstPct?: number;
    vatPct?: number;
    localPremiumPct?: number;
    multiplier: number;
  };
  metals: {
    GOLD_24K: number;
    GOLD_22K: number;
    GOLD_18K: number;
    GOLD_14K: number;
    GOLD_10K: number;
    SILVER_999: number;
    SILVER_925: number;
    PLATINUM_PT950: number;
    PLATINUM_PT900: number;
    PALLADIUM_PD950: number;
  };
}

export default function CreateWalkInRfqPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Customer details state
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phoneCountryCode: '+91',
    phone: '',
    email: '',
    address: '',
    city: '',
    country: 'India',
  });

  // Get currency from global preferences store
  const currency = usePreferencesStore((state) => state.currency);
  const currencyInfo = CURRENCIES[currency];
  const country = usePreferencesStore((state) => state.country);
  
  // Get weight unit from market context
  const { selectedWeightUnit, config: marketConfig } = useMarket();
  const [displayWeightUnit, setDisplayWeightUnit] = useState<WeightUnit>(selectedWeightUnit);
  
  useEffect(() => {
    if (marketConfig?.defaultWeightUnit) {
      setDisplayWeightUnit(marketConfig.defaultWeightUnit);
    }
  }, [marketConfig?.defaultWeightUnit]);

  // API data states
  const [templates, setTemplates] = useState<Template[]>([]);
  const [gemstonePresets, setGemstonePresets] = useState<GemstonePreset[]>([]);
  const [platingOptions, setPlatingOptions] = useState<PlatingOption[]>([]);
  const [metalTypes, setMetalTypes] = useState<{ id: string; name: string }[]>([]);
  const [surfaceFinishes, setSurfaceFinishes] = useState<{ id: string; name: string }[]>([]);
  const [gemstoneShapes, setGemstoneShapes] = useState<{ id: string; name: string }[]>([]);
  const [settingStyles, setSettingStyles] = useState<{ id: string; name: string }[]>([]);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  
  // Market rates state
  const [marketRates, setMarketRates] = useState<MarketRates | null>(null);
  const [marketRatesLoading, setMarketRatesLoading] = useState(false);
  const [marketRatesWarning, setMarketRatesWarning] = useState<string | null>(null);
  
  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading: isUploadingImage, progress: uploadProgress, upload: uploadImageToR2 } = useImageUpload({
    type: 'rfq',
    onSuccess: (result) => {
      if (result.url) {
        setFormData(prev => ({
          ...prev,
          referenceImages: [...prev.referenceImages, result.url!],
        }));
      }
    },
    onError: (error) => {
      setError(`Image upload failed: ${error}`);
    },
  });
  
  const handleReferenceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Each image must be smaller than 10MB');
        continue;
      }
      await uploadImageToR2(file);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const removeReferenceImage = (url: string) => {
    setFormData(prev => ({
      ...prev,
      referenceImages: prev.referenceImages.filter(img => img !== url),
    }));
  };

  const [formData, setFormData] = useState({
    jewelleryType: '',
    templateId: '',
    buildMethod: 'METHOD_A' as BuildMethod,
    metalType: '',
    weightCategory: 'MEDIUM',
    estimatedWeight: '',
    surfaceFinish: '',
    description: '',
    alloyConfig: {
      baseMetal: 'GOLD',
      karat: undefined,
      alloyFamily: undefined,
      recipePresetId: undefined,
    } as AlloyConfig,
    methodCConfig: {
      baseMetal: 'BRASS',
      platingType: 'GOLD_PLATED',
      platingTier: 'STANDARD',
    } as MethodCConfig,
    addGoldPlating: false,
    platingType: '',
    platingTier: 'STANDARD',
    hasGemstones: false,
    gemstonesV2: [] as GemstoneEntryV2[],
    gemstones: [] as GemstoneEntry[],
    gemstoneDetails: '',
    referenceImages: [] as string[],
    budgetMin: '',
    budgetMax: '',
    deadline: '',
    specialInstructions: '',
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metalsRes, finishesRes, shapesRes, stylesRes] = await Promise.all([
          fetch(`${API_URL}/materials/precious-metals`),
          fetch(`${API_URL}/materials/surface-finishes`),
          fetch(`${API_URL}/materials/gemstone-shapes`),
          fetch(`${API_URL}/materials/setting-styles`),
        ]);
        if (metalsRes.ok) setMetalTypes(await metalsRes.json());
        if (finishesRes.ok) setSurfaceFinishes(await finishesRes.json());
        if (shapesRes.ok) setGemstoneShapes(await shapesRes.json());
        if (stylesRes.ok) setSettingStyles(await stylesRes.json());
      } catch (err) {
        console.error('Failed to fetch materials data:', err);
      }
    };
    fetchData();
  }, []);

  // Fetch market rates
  useEffect(() => {
    const fetchMarketRates = async () => {
      setMarketRatesLoading(true);
      setMarketRatesWarning(null);
      try {
        const res = await fetch(`${API_URL}/market-rates?currency=${currency}&country=${country}`);
        if (res.ok) {
          const data = await res.json();
          setMarketRates(data);
          
          if (data.cache === 'fallback') {
            setMarketRatesWarning('Using estimated rates - market data temporarily unavailable');
          } else if (data.cache === 'stale') {
            setMarketRatesWarning('Using cached rates - market data may be outdated');
          }
        }
      } catch (err) {
        console.error('Failed to fetch market rates:', err);
        setMarketRatesWarning('Connection error - showing estimated rates');
      } finally {
        setMarketRatesLoading(false);
      }
    };
    fetchMarketRates();
  }, [currency, country]);

  // Fetch templates when jewellery type changes
  useEffect(() => {
    if (!formData.jewelleryType) return;
    const fetchTemplates = async () => {
      try {
        const res = await fetch(`${API_URL}/materials/templates?jewelleryType=${formData.jewelleryType}`);
        if (res.ok) {
          const data = await res.json();
          setTemplates(data);
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      }
    };
    fetchTemplates();
  }, [formData.jewelleryType]);

  // Fetch plating options for Method C
  useEffect(() => {
    if (formData.buildMethod !== 'METHOD_C') return;
    const fetchPlating = async () => {
      try {
        const res = await fetch(`${API_URL}/materials/plating-options`);
        if (res.ok) setPlatingOptions(await res.json());
      } catch (err) {
        console.error('Failed to fetch plating options:', err);
      }
    };
    fetchPlating();
  }, [formData.buildMethod]);

  // Fetch gemstone presets
  useEffect(() => {
    if (!formData.hasGemstones) return;
    const fetchPresets = async () => {
      try {
        const res = await fetch(`${API_URL}/materials/gemstone-presets`);
        if (res.ok) setGemstonePresets(await res.json());
      } catch (err) {
        console.error('Failed to fetch gemstone presets:', err);
      }
    };
    fetchPresets();
  }, [formData.hasGemstones]);

  const hasRealTemplate = formData.templateId && formData.templateId !== 'custom';
  const getTemplateId = () => hasRealTemplate ? formData.templateId : undefined;

  const weightUnitSymbol = WEIGHT_UNIT_SYMBOLS[displayWeightUnit] || 'g';
  
  const displayToGrams = useCallback((displayValue: number): number => {
    return toGrams(displayValue, displayWeightUnit);
  }, [displayWeightUnit]);
  
  const gramsToDisplay = useCallback((grams: number): number => {
    return fromGrams(grams, displayWeightUnit);
  }, [displayWeightUnit]);
  
  const formatWeight = useCallback((grams: number, showUnit = true): string => {
    const displayValue = gramsToDisplay(grams);
    const formatted = displayValue.toLocaleString('en', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return showUnit ? `${formatted} ${weightUnitSymbol}` : formatted;
  }, [gramsToDisplay, weightUnitSymbol]);

  const getWeightFromTemplate = useCallback(() => {
    if (!hasRealTemplate) {
      const displayValue = parseFloat(formData.estimatedWeight) || 0;
      return displayToGrams(displayValue);
    }
    const template = templates.find((t) => t.id === formData.templateId);
    if (!template) {
      const displayValue = parseFloat(formData.estimatedWeight) || 0;
      return displayToGrams(displayValue);
    }
    switch (formData.weightCategory) {
      case 'LIGHT': return template.lightWeightGrams;
      case 'MEDIUM': return template.mediumWeightGrams;
      case 'HEAVY': return template.heavyWeightGrams;
      default: return template.mediumWeightGrams;
    }
  }, [formData.templateId, formData.weightCategory, formData.estimatedWeight, templates, hasRealTemplate, displayToGrams]);

  // Client-side live estimate
  const liveEstimate = useMemo(() => {
    if (!marketRates) return null;
    
    const weight = getWeightFromTemplate();
    if (weight <= 0) return null;
    
    const request: EstimateRequest = {
      buildMethod: formData.buildMethod,
      jewelleryType: formData.jewelleryType,
      country: country,
      currency: currency,
      marketRates: {
        metals: marketRates.metals,
        fx: marketRates.fx,
      },
      makingChargePercent: 12,
    };
    
    if (formData.buildMethod === 'METHOD_A') {
      request.methodA = {
        metal: formData.metalType,
        weightGrams: weight,
      };
    } else if (formData.buildMethod === 'METHOD_B') {
      request.methodB = {
        baseMetal: formData.alloyConfig.baseMetal as 'GOLD' | 'SILVER',
        karat: formData.alloyConfig.karat,
        alloyFamily: formData.alloyConfig.alloyFamily,
        recipePresetId: formData.alloyConfig.recipePresetId,
        weightGrams: weight,
      };
    } else if (formData.buildMethod === 'METHOD_C') {
      request.methodC = {
        baseMetal: formData.methodCConfig.baseMetal,
        platingType: formData.methodCConfig.platingType,
        platingTier: formData.methodCConfig.platingTier,
        weightGrams: weight,
      };
    }
    
    if (formData.gemstonesV2.length > 0) {
      request.gemstones = formData.gemstonesV2.map(gem => ({
        presetId: gem.presetId,
        stoneType: gem.stoneType,
        shape: gem.shape,
        sizeValue: gem.sizeValue,
        sizeUnit: gem.sizeUnit,
        color: gem.color,
        clarity: gem.clarity,
        cut: gem.cut,
        settingStyle: gem.settingStyle,
        count: gem.count,
      }));
    }
    
    return calculateEstimate(request);
  }, [formData, getWeightFromTemplate, country, currency, marketRates]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateCustomerDetails = (field: string, value: string) => {
    setCustomerDetails((prev) => ({ ...prev, [field]: value }));
  };

  // Pure metals for Method A
  const PURE_METAL_IDS = [
    'GOLD_24K', 'GOLD_22K', 'GOLD_18K', 'GOLD_14K', 'GOLD_10K',
    'SILVER_999', 'SILVER_925',
    'PLATINUM_PT950', 'PLATINUM_PT900',
    'PALLADIUM_PD950', 'PALLADIUM_PD500',
  ];

  const getAvailableMetals = () => {
    if (formData.buildMethod === 'METHOD_C') {
      return [
        { id: 'BRASS', name: 'Brass' },
        { id: 'COPPER', name: 'Copper' },
        { id: 'BRONZE', name: 'Bronze' },
        { id: 'STAINLESS_STEEL_316L', name: 'Stainless Steel 316L' },
        { id: 'SILVER_925', name: 'Sterling Silver (for Vermeil)' },
      ];
    }
    return metalTypes.filter(metal => PURE_METAL_IDS.includes(metal.id));
  };

  const handleSubmit = async () => {
    // Validate customer details
    if (!customerDetails.name || !customerDetails.phone || !customerDetails.address || !customerDetails.city) {
      setError('Please fill in all required customer details (name, phone, address, city)');
      return;
    }

    // Validate phone format
    if (!/^\d{7,15}$/.test(customerDetails.phone)) {
      setError('Please enter a valid phone number (7-15 digits)');
      return;
    }

    setLoading(true);
    setError('');

    const weight = getWeightFromTemplate();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    try {
      const response = await fetch(`${API_URL}/rfq/walk-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          customer: {
            name: customerDetails.name,
            phoneCountryCode: customerDetails.phoneCountryCode,
            phone: customerDetails.phone,
            email: customerDetails.email || undefined,
            address: customerDetails.address,
            city: customerDetails.city,
            country: customerDetails.country,
          },
          jewelleryType: formData.jewelleryType,
          buildMethod: formData.buildMethod,
          composition: {
            metalType: formData.metalType,
            buildMethod: formData.buildMethod,
            estimatedWeight: weight,
            surfaceFinish: formData.surfaceFinish,
            hasGemstones: formData.hasGemstones,
            gemstoneDetails: formData.gemstoneDetails,
          },
          targetTotalWeightG: weight,
          budgetMinNpr: parseFloat(formData.budgetMin) || 0,
          budgetMaxNpr: parseFloat(formData.budgetMax) || 0,
          preferredDeliveryDays: formData.deadline 
            ? Math.ceil((new Date(formData.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : undefined,
          specialInstructions: formData.specialInstructions,
          referenceImages: formData.referenceImages,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create walk-in request');
      }

      toast({
        title: 'Walk-in RFQ Created',
        description: `Request created for ${customerDetails.name}`,
      });

      router.push('/dashboard/shop/rfqs');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  // Form validation
  const hasValidMetalSelection = () => {
    if (!formData.buildMethod) return false;
    switch (formData.buildMethod) {
      case 'METHOD_A':
        return !!formData.metalType;
      case 'METHOD_B':
        return !!formData.alloyConfig?.baseMetal && !!formData.alloyConfig?.karat;
      case 'METHOD_C':
        return !!formData.methodCConfig?.baseMetal && !!formData.methodCConfig?.platingType;
      default:
        return !!formData.metalType;
    }
  };

  const canProceedToStep2 = formData.jewelleryType && formData.buildMethod && hasValidMetalSelection();
  const canProceedToStep3 = formData.description && (hasRealTemplate || formData.estimatedWeight);
  const formDataComplete = formData.budgetMin && formData.budgetMax;
  const customerDetailsComplete = customerDetails.name && customerDetails.phone && customerDetails.address && customerDetails.city;
  const canSubmit = formDataComplete && customerDetailsComplete;

  return (
    <ShopGuard>
      <DashboardLayout>
        <TooltipProvider>
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold">Create Walk-in RFQ</h1>
              <p className="text-muted-foreground">
                Create a custom order request for a customer visiting your shop
              </p>
            </div>

            {/* Shop Info Badge */}
            {user?.shop && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
                <Store className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Creating for: {user.shop.shopName}</p>
                  <p className="text-sm text-muted-foreground">{user.shop.city}, {user.shop.country}</p>
                </div>
              </div>
            )}

            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        step >= s
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {step > s ? <Check className="h-5 w-5" /> : s}
                    </div>
                    <span className={`ml-2 hidden sm:inline ${step >= s ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {s === 1 ? 'Jewellery Details' : s === 2 ? 'Design Specs' : 'Customer & Budget'}
                    </span>
                    {s < 3 && (
                      <div className={`w-16 sm:w-24 h-1 mx-4 ${step > s ? 'bg-primary' : 'bg-muted'}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 1: Jewellery Type & Build Method */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gem className="h-6 w-6 text-primary" />
                    What does the customer want?
                  </CardTitle>
                  <CardDescription>
                    Select the type of jewellery and manufacturing method
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Jewellery Type *</Label>
                    <Select
                      value={formData.jewelleryType}
                      onValueChange={(v: string) => {
                        updateFormData('jewelleryType', v);
                        updateFormData('templateId', '');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select jewellery type" />
                      </SelectTrigger>
                      <SelectContent>
                        {JEWELLERY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Template Selector */}
                  {formData.jewelleryType && templates.length > 0 && (
                    <div className="space-y-2">
                      <Label>Choose a Template (Optional)</Label>
                      <Select
                        value={formData.templateId}
                        onValueChange={(v: string) => updateFormData('templateId', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template for pre-defined specs" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Custom (No template)</SelectItem>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Weight Category */}
                  {hasRealTemplate && (
                    <div className="space-y-3">
                      <Label>Weight Category *</Label>
                      <div className="flex gap-2">
                        {WEIGHT_CATEGORIES.map((cat) => {
                          const template = templates.find((t) => t.id === formData.templateId);
                          const weight = template 
                            ? cat.value === 'LIGHT' ? template.lightWeightGrams
                              : cat.value === 'MEDIUM' ? template.mediumWeightGrams
                              : template.heavyWeightGrams
                            : 0;
                          return (
                            <Button
                              key={cat.value}
                              type="button"
                              variant={formData.weightCategory === cat.value ? 'default' : 'outline'}
                              className="flex-1 flex-col h-auto py-3"
                              onClick={() => updateFormData('weightCategory', cat.value)}
                            >
                              <span className="font-semibold">{cat.label}</span>
                              <span className="text-xs opacity-80">{formatWeight(weight)}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Manual weight input */}
                  {!hasRealTemplate && (
                    <div className="space-y-2">
                      <Label>Estimated Weight ({weightUnitSymbol}) *</Label>
                      <Input
                        type="number"
                        placeholder={`e.g., 10 ${weightUnitSymbol}`}
                        value={formData.estimatedWeight}
                        onChange={(e) => updateFormData('estimatedWeight', e.target.value)}
                        step="0.1"
                        min="0.1"
                      />
                    </div>
                  )}

                  {/* Build Method */}
                  <div className="space-y-3">
                    <Label>Manufacturing Method *</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {BUILD_METHODS.map((method) => (
                        <div
                          key={method.value}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            formData.buildMethod === method.value
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => {
                            updateFormData('buildMethod', method.value);
                            updateFormData('metalType', '');
                          }}
                        >
                          <p className="font-medium">{method.label}</p>
                          <p className="text-sm text-muted-foreground">{method.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Metal Selection based on Build Method */}
                  {formData.buildMethod === 'METHOD_A' && (
                    <div className="space-y-2">
                      <Label>Metal Type *</Label>
                      <Select
                        value={formData.metalType}
                        onValueChange={(v) => updateFormData('metalType', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select metal" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableMetals().map((metal) => (
                            <SelectItem key={metal.id} value={metal.id}>
                              {metal.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.buildMethod === 'METHOD_B' && (
                    <AlloyBuilder
                      value={formData.alloyConfig}
                      onChange={(config) => updateFormData('alloyConfig', config)}
                    />
                  )}

                  {formData.buildMethod === 'METHOD_C' && (
                    <MethodCSelector
                      value={formData.methodCConfig}
                      onChange={(config) => updateFormData('methodCConfig', config)}
                    />
                  )}

                  <div className="flex justify-end">
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!canProceedToStep2}
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Design Details */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Design Details</CardTitle>
                  <CardDescription>
                    Add design specifications and any special requirements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Description *</Label>
                    <Textarea
                      rows={3}
                      placeholder="Describe the design - traditional, modern, specific patterns, etc."
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                    />
                  </div>

                  {/* Surface Finish */}
                  {surfaceFinishes.length > 0 && (
                    <div className="space-y-2">
                      <Label>Surface Finish</Label>
                      <Select
                        value={formData.surfaceFinish}
                        onValueChange={(v) => updateFormData('surfaceFinish', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select finish (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {surfaceFinishes.map((finish) => (
                            <SelectItem key={finish.id} value={finish.id}>
                              {finish.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Gemstones Toggle */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="hasGemstones"
                      checked={formData.hasGemstones}
                      onChange={(e) => updateFormData('hasGemstones', e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="hasGemstones" className="cursor-pointer">
                      Include gemstones
                    </Label>
                  </div>

                  {formData.hasGemstones && (
                    <GemstoneEditorV2
                      gemstones={formData.gemstonesV2}
                      onChange={(gems) => updateFormData('gemstonesV2', gems)}
                    />
                  )}

                  {/* Reference Images */}
                  <div className="space-y-2">
                    <Label>Reference Images</Label>
                    <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleReferenceImageUpload}
                        className="hidden"
                        id="rfq-image-upload"
                        disabled={isUploadingImage}
                      />
                      <label htmlFor="rfq-image-upload" className="cursor-pointer block">
                        {isUploadingImage ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Uploading... {uploadProgress}%</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground mb-2">
                              Upload images of designs customer likes
                            </p>
                            <Button type="button" variant="outline" size="sm" asChild>
                              <span>Browse Files</span>
                            </Button>
                          </>
                        )}
                      </label>
                    </div>
                    
                    {formData.referenceImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {formData.referenceImages.map((url, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={getImageUrl(url, 'thumbnail')}
                              alt={`Reference ${idx + 1}`}
                              className="w-20 h-20 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => removeReferenceImage(url)}
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Special Instructions */}
                  <div className="space-y-2">
                    <Label>Special Instructions</Label>
                    <Textarea
                      rows={2}
                      placeholder="Engravings, specific requirements, etc."
                      value={formData.specialInstructions}
                      onChange={(e) => updateFormData('specialInstructions', e.target.value)}
                    />
                  </div>

                  {/* Live Pricing Panel */}
                  <LivePricingPanel
                    buildMethod={formData.buildMethod as BuildMethod}
                    formData={{
                      buildMethod: formData.buildMethod as BuildMethod,
                      jewelleryType: formData.jewelleryType,
                      country,
                      currency,
                      methodA: formData.buildMethod === 'METHOD_A' ? {
                        metal: formData.metalType,
                        weightGrams: getWeightFromTemplate(),
                      } : undefined,
                      methodB: formData.buildMethod === 'METHOD_B' ? {
                        baseMetal: formData.alloyConfig.baseMetal as 'GOLD' | 'SILVER',
                        karat: formData.alloyConfig.karat,
                        alloyFamily: formData.alloyConfig.alloyFamily,
                        recipePresetId: formData.alloyConfig.recipePresetId,
                        weightGrams: getWeightFromTemplate(),
                      } : undefined,
                      methodC: formData.buildMethod === 'METHOD_C' ? {
                        baseMetal: formData.methodCConfig.baseMetal,
                        platingType: formData.methodCConfig.platingType,
                        platingTier: formData.methodCConfig.platingTier,
                        weightGrams: getWeightFromTemplate(),
                      } : undefined,
                      gemstones: formData.gemstonesV2.map(g => ({
                        presetId: g.presetId,
                        stoneType: g.stoneType,
                        shape: g.shape,
                        sizeValue: g.sizeValue,
                        sizeUnit: g.sizeUnit,
                        color: g.color,
                        clarity: g.clarity,
                        cut: g.cut,
                        settingStyle: g.settingStyle,
                        count: g.count,
                      })),
                      surfaceFinish: formData.surfaceFinish ? {
                        finishType: formData.surfaceFinish,
                      } : undefined,
                      marketRates: marketRates ? {
                        metals: marketRates.metals,
                        fx: marketRates.fx,
                      } : undefined,
                    }}
                    marketRates={marketRates}
                    marketRatesLoading={marketRatesLoading}
                    marketRatesWarning={marketRatesWarning}
                    currencySymbol={currencyInfo.symbol}
                  />

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={!canProceedToStep3}
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Customer Details & Budget */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Customer Details & Budget</CardTitle>
                  <CardDescription>
                    Enter customer information and set the budget
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Customer Details Section */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Customer Information
                    </h3>

                    <div className="space-y-2">
                      <Label>Customer Name *</Label>
                      <Input
                        placeholder="Full name"
                        value={customerDetails.name}
                        onChange={(e) => updateCustomerDetails('name', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Phone Number *</Label>
                      <div className="flex gap-2">
                        <Select
                          value={customerDetails.phoneCountryCode}
                          onValueChange={(v) => updateCustomerDetails('phoneCountryCode', v)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRY_CODES.map((cc) => (
                              <SelectItem key={cc.code} value={cc.code}>
                                {cc.flag} {cc.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="tel"
                          placeholder="Phone number"
                          value={customerDetails.phone}
                          onChange={(e) => updateCustomerDetails('phone', e.target.value.replace(/\D/g, ''))}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email (Optional)
                      </Label>
                      <Input
                        type="email"
                        placeholder="customer@example.com"
                        value={customerDetails.email}
                        onChange={(e) => updateCustomerDetails('email', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Address *
                      </Label>
                      <Textarea
                        rows={2}
                        placeholder="Full address"
                        value={customerDetails.address}
                        onChange={(e) => updateCustomerDetails('address', e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>City *</Label>
                        <Input
                          placeholder="City"
                          value={customerDetails.city}
                          onChange={(e) => updateCustomerDetails('city', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Country
                        </Label>
                        <Select
                          value={customerDetails.country}
                          onValueChange={(v) => updateCustomerDetails('country', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="India">India</SelectItem>
                            <SelectItem value="Nepal">Nepal</SelectItem>
                            <SelectItem value="USA">USA</SelectItem>
                            <SelectItem value="UK">UK</SelectItem>
                            <SelectItem value="UAE">UAE</SelectItem>
                            <SelectItem value="Singapore">Singapore</SelectItem>
                            <SelectItem value="Australia">Australia</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Budget Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Budget</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Minimum Budget ({currency}) *</Label>
                        <Input
                          type="number"
                          placeholder="e.g., 50000"
                          value={formData.budgetMin}
                          onChange={(e) => updateFormData('budgetMin', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Maximum Budget ({currency}) *</Label>
                        <Input
                          type="number"
                          placeholder="e.g., 100000"
                          value={formData.budgetMax}
                          onChange={(e) => updateFormData('budgetMax', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Deadline */}
                  <div className="space-y-2">
                    <Label>Preferred Deadline</Label>
                    <Input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => updateFormData('deadline', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty if customer is flexible on timing
                    </p>
                  </div>

                  {/* Live Pricing Panel */}
                  <LivePricingPanel
                    buildMethod={formData.buildMethod as BuildMethod}
                    formData={{
                      buildMethod: formData.buildMethod as BuildMethod,
                      jewelleryType: formData.jewelleryType,
                      country,
                      currency,
                      methodA: formData.buildMethod === 'METHOD_A' ? {
                        metal: formData.metalType,
                        weightGrams: getWeightFromTemplate(),
                      } : undefined,
                      methodB: formData.buildMethod === 'METHOD_B' ? {
                        baseMetal: formData.alloyConfig.baseMetal as 'GOLD' | 'SILVER',
                        karat: formData.alloyConfig.karat,
                        alloyFamily: formData.alloyConfig.alloyFamily,
                        recipePresetId: formData.alloyConfig.recipePresetId,
                        weightGrams: getWeightFromTemplate(),
                      } : undefined,
                      methodC: formData.buildMethod === 'METHOD_C' ? {
                        baseMetal: formData.methodCConfig.baseMetal,
                        platingType: formData.methodCConfig.platingType,
                        platingTier: formData.methodCConfig.platingTier,
                        weightGrams: getWeightFromTemplate(),
                      } : undefined,
                      gemstones: formData.gemstonesV2.map(g => ({
                        presetId: g.presetId,
                        stoneType: g.stoneType,
                        shape: g.shape,
                        sizeValue: g.sizeValue,
                        sizeUnit: g.sizeUnit,
                        color: g.color,
                        clarity: g.clarity,
                        cut: g.cut,
                        settingStyle: g.settingStyle,
                        count: g.count,
                      })),
                      surfaceFinish: formData.surfaceFinish ? {
                        finishType: formData.surfaceFinish,
                      } : undefined,
                      marketRates: marketRates ? {
                        metals: marketRates.metals,
                        fx: marketRates.fx,
                      } : undefined,
                    }}
                    marketRates={marketRates}
                    marketRatesLoading={marketRatesLoading}
                    marketRatesWarning={marketRatesWarning}
                    currencySymbol={currencyInfo.symbol}
                  />

                  {/* Summary */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold">Order Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Type:</span>
                      <span>{JEWELLERY_TYPES.find((t) => t.value === formData.jewelleryType)?.label}</span>
                      
                      <span className="text-muted-foreground">Build Method:</span>
                      <span>{BUILD_METHODS.find((m) => m.value === formData.buildMethod)?.label.split(':')[1]}</span>
                      
                      <span className="text-muted-foreground">Weight:</span>
                      <span>{formatWeight(getWeightFromTemplate())}</span>
                      
                      <span className="text-muted-foreground">Customer:</span>
                      <span>{customerDetails.name || '-'}</span>
                      
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{customerDetails.phoneCountryCode} {customerDetails.phone || '-'}</span>
                      
                      <span className="text-muted-foreground">Budget:</span>
                      <span>{currencyInfo.symbol} {formData.budgetMin} - {formData.budgetMax}</span>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={!canSubmit || loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          Create Walk-in RFQ
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TooltipProvider>
      </DashboardLayout>
    </ShopGuard>
  );
}
