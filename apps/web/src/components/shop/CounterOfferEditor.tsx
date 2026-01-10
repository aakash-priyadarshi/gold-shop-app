'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Edit,
  Plus,
  Minus,
  DollarSign,
  Clock,
  Gem,
  Sparkles,
  Scale,
  AlertTriangle,
  Send,
  Info,
  Check,
  X,
  History,
  Loader2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';

// Types
interface Material {
  metalType: string;
  purity: string;
  weight: number;
}

interface Gemstone {
  type: string;
  count: number;
  carats?: number;
  quality?: string;
}

interface Finishes {
  polish?: string;
  texture?: string;
  plating?: string;
}

interface Timeline {
  estimatedDays: number;
  rushAvailable?: boolean;
  rushDays?: number;
}

interface Pricing {
  subtotalNpr: number;
  makingChargesNpr: number;
  taxNpr: number;
  totalNpr: number;
}

interface OrderVersion {
  id: string;
  versionNumber: number;
  createdByRole: string;
  status: string;
  materials?: Material;
  gemstones?: Gemstone[];
  finishes?: Finishes;
  timeline?: Timeline;
  totalNpr: number;
  changeSummary?: string;
  customerResponse?: string;
  customerNotes?: string;
  createdAt: string;
}

interface CounterOfferEditorProps {
  orderId: string;
  orderNumber: string;
  currentSpecs: {
    materials?: Material;
    gemstones?: Gemstone[];
    finishes?: Finishes;
    timeline?: Timeline;
    pricing?: Pricing;
  };
  versions?: OrderVersion[];
  onSuccess?: () => void;
}

// Metal types and purities
const METAL_TYPES = ['Gold', 'Silver', 'Platinum', 'White Gold', 'Rose Gold'];
const GOLD_PURITIES = ['24K', '22K', '18K', '14K', '10K'];
const SILVER_PURITIES = ['999', '925', '900'];
const GEMSTONE_TYPES = ['Diamond', 'Ruby', 'Emerald', 'Sapphire', 'Pearl', 'Topaz', 'Amethyst', 'Opal'];
const GEMSTONE_QUALITIES = ['AAA', 'AA', 'A', 'B', 'C'];
const POLISH_TYPES = ['High Polish', 'Matte', 'Brushed', 'Satin', 'Hammered'];
const TEXTURE_TYPES = ['Smooth', 'Textured', 'Engraved', 'Filigree', 'Milgrain'];

export function CounterOfferEditor({
  orderId,
  orderNumber,
  currentSpecs,
  versions = [],
  onSuccess,
}: CounterOfferEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Form state
  const [materials, setMaterials] = useState<Material>(
    currentSpecs.materials || { metalType: 'Gold', purity: '22K', weight: 10 }
  );
  const [gemstones, setGemstones] = useState<Gemstone[]>(
    currentSpecs.gemstones || []
  );
  const [finishes, setFinishes] = useState<Finishes>(
    currentSpecs.finishes || {}
  );
  const [timeline, setTimeline] = useState<Timeline>(
    currentSpecs.timeline || { estimatedDays: 14 }
  );
  const [pricing, setPricing] = useState<Pricing>(
    currentSpecs.pricing || { subtotalNpr: 0, makingChargesNpr: 0, taxNpr: 0, totalNpr: 0 }
  );
  const [changeSummary, setChangeSummary] = useState('');
  const [notes, setNotes] = useState('');

  // Helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateTotal = () => {
    const subtotal = pricing.subtotalNpr;
    const making = pricing.makingChargesNpr;
    const tax = Math.round((subtotal + making) * 0.13); // 13% VAT
    return subtotal + making + tax;
  };

  const addGemstone = () => {
    setGemstones([...gemstones, { type: 'Diamond', count: 1, quality: 'A' }]);
  };

  const removeGemstone = (index: number) => {
    setGemstones(gemstones.filter((_, i) => i !== index));
  };

  const updateGemstone = (index: number, field: keyof Gemstone, value: any) => {
    const updated = [...gemstones];
    updated[index] = { ...updated[index], [field]: value };
    setGemstones(updated);
  };

  const handleSubmit = async () => {
    if (!changeSummary.trim()) {
      toast({
        variant: 'destructive',
        title: 'Required Field',
        description: 'Please provide a summary of changes for the customer.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/api/orders/${orderId}/counter-offer`, {
        orderId,
        materials,
        gemstones: gemstones.length > 0 ? gemstones : undefined,
        finishes: Object.keys(finishes).length > 0 ? finishes : undefined,
        timeline,
        pricing: {
          ...pricing,
          taxNpr: Math.round((pricing.subtotalNpr + pricing.makingChargesNpr) * 0.13),
          totalNpr: calculateTotal(),
        },
        changeSummary,
        notes: notes || undefined,
      });

      toast({
        title: 'Counter-Offer Sent',
        description: 'The customer has been notified about your counter-offer.',
      });

      setIsOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Send',
        description: error.response?.data?.message || 'Could not send counter-offer.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      SUPERSEDED: 'bg-gray-100 text-gray-800',
      EXPIRED: 'bg-gray-100 text-gray-500',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gold-gradient text-white">
                <Edit className="h-4 w-4 mr-2" />
                Create Counter-Offer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-gold-500" />
                  Create Counter-Offer
                </DialogTitle>
                <DialogDescription>
                  Modify the specifications and pricing for order {orderNumber}. The customer will be notified and must accept the changes.
                </DialogDescription>
              </DialogHeader>

              <Accordion type="multiple" defaultValue={['materials', 'pricing']} className="w-full">
                {/* Materials Section */}
                <AccordionItem value="materials">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-gold-500" />
                      Materials
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div>
                        <Label>Metal Type</Label>
                        <Select
                          value={materials.metalType}
                          onValueChange={(v) => setMaterials({ ...materials, metalType: v })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {METAL_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Purity</Label>
                        <Select
                          value={materials.purity}
                          onValueChange={(v) => setMaterials({ ...materials, purity: v })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(materials.metalType.includes('Gold')
                              ? GOLD_PURITIES
                              : SILVER_PURITIES
                            ).map((purity) => (
                              <SelectItem key={purity} value={purity}>{purity}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Weight (grams)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={materials.weight}
                          onChange={(e) => setMaterials({ ...materials, weight: parseFloat(e.target.value) || 0 })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Gemstones Section */}
                <AccordionItem value="gemstones">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Gem className="h-4 w-4 text-gold-500" />
                      Gemstones
                      {gemstones.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {gemstones.length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {gemstones.map((gem, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                          <Select
                            value={gem.type}
                            onValueChange={(v) => updateGemstone(index, 'type', v)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {GEMSTONE_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min="1"
                            value={gem.count}
                            onChange={(e) => updateGemstone(index, 'count', parseInt(e.target.value) || 1)}
                            className="w-20"
                            placeholder="Count"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={gem.carats || ''}
                            onChange={(e) => updateGemstone(index, 'carats', parseFloat(e.target.value) || undefined)}
                            className="w-24"
                            placeholder="Carats"
                          />
                          <Select
                            value={gem.quality || ''}
                            onValueChange={(v) => updateGemstone(index, 'quality', v)}
                          >
                            <SelectTrigger className="w-[80px]">
                              <SelectValue placeholder="Quality" />
                            </SelectTrigger>
                            <SelectContent>
                              {GEMSTONE_QUALITIES.map((q) => (
                                <SelectItem key={q} value={q}>{q}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeGemstone(index)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addGemstone}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Gemstone
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Finishes Section */}
                <AccordionItem value="finishes">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-gold-500" />
                      Finishes
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div>
                        <Label>Polish</Label>
                        <Select
                          value={finishes.polish || ''}
                          onValueChange={(v) => setFinishes({ ...finishes, polish: v })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {POLISH_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Texture</Label>
                        <Select
                          value={finishes.texture || ''}
                          onValueChange={(v) => setFinishes({ ...finishes, texture: v })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {TEXTURE_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Plating</Label>
                        <Input
                          value={finishes.plating || ''}
                          onChange={(e) => setFinishes({ ...finishes, plating: e.target.value })}
                          placeholder="e.g., Rhodium"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Timeline Section */}
                <AccordionItem value="timeline">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gold-500" />
                      Timeline
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <Label>Estimated Days</Label>
                        <Input
                          type="number"
                          min="1"
                          value={timeline.estimatedDays}
                          onChange={(e) => setTimeline({ ...timeline, estimatedDays: parseInt(e.target.value) || 14 })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Rush Days (optional)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={timeline.rushDays || ''}
                          onChange={(e) => setTimeline({
                            ...timeline,
                            rushAvailable: !!e.target.value,
                            rushDays: parseInt(e.target.value) || undefined,
                          })}
                          placeholder="Available for rush?"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Pricing Section */}
                <AccordionItem value="pricing">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gold-500" />
                      Pricing
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Material Cost (NPR)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={pricing.subtotalNpr}
                            onChange={(e) => setPricing({ ...pricing, subtotalNpr: parseFloat(e.target.value) || 0 })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Making Charges (NPR)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={pricing.makingChargesNpr}
                            onChange={(e) => setPricing({ ...pricing, makingChargesNpr: parseFloat(e.target.value) || 0 })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span>{formatCurrency(pricing.subtotalNpr + pricing.makingChargesNpr)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">VAT (13%):</span>
                        <span>{formatCurrency(Math.round((pricing.subtotalNpr + pricing.makingChargesNpr) * 0.13))}</span>
                      </div>
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-gold-600">{formatCurrency(calculateTotal())}</span>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Separator />

              {/* Change Summary - Required */}
              <div className="space-y-2">
                <Label htmlFor="changeSummary" className="flex items-center gap-2">
                  Change Summary *
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      This will be shown to the customer. Clearly explain what changed and why.
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Textarea
                  id="changeSummary"
                  placeholder="e.g., Increased gold weight from 8g to 10g for better durability. Updated pricing accordingly..."
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Optional Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any other information for the customer..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="gold-gradient text-white"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !changeSummary.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Counter-Offer
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {versions.length > 0 && (
            <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
              <History className="h-4 w-4 mr-2" />
              Version History ({versions.length})
            </Button>
          )}
        </div>

        {/* Version History */}
        {showHistory && versions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Counter-Offer History
              </CardTitle>
              <CardDescription>
                All versions and counter-offers for this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`p-4 border rounded-lg ${
                      version.status === 'ACCEPTED' ? 'border-green-200 bg-green-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">v{version.versionNumber}</Badge>
                        <span className="text-sm text-muted-foreground">
                          by {version.createdByRole}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusBadge(version.status)}>
                          {version.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(version.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm mb-2">{version.changeSummary}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{formatCurrency(version.totalNpr)}</span>
                      {version.customerResponse && (
                        <div className="flex items-center gap-1 text-sm">
                          {version.customerResponse === 'ACCEPT' ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                          {version.customerNotes && (
                            <span className="text-muted-foreground">{version.customerNotes}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
