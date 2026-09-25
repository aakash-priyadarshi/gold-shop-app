"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import {
  workshopApi,
  type WorkshopCatalogResponse,
  type WorkshopMaterial,
  type WorkshopRecipe,
  type WorkshopProcessDefinition,
  type WorkshopRouteTemplate,
  type WorkshopWorkstation,
  type WorkshopToleranceRule,
} from "@/lib/workshop-api";
import {
  listWorkshopSerialPorts,
  readPhysicalWorkshopScale,
  type RawScaleFrame,
  type WorkshopDevice,
} from "@/lib/workshop-hardware";
import { GoldScaleSimulator, StoneScaleSimulator } from "@gold-shop/shared";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Coins,
  Cpu,
  Edit3,
  GitBranch,
  Layers,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Scale,
  Sliders,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

export function WorkshopSettingsModule({ canApprove = true }: { canApprove?: boolean }) {
  const t = useT();
  const [catalog, setCatalog] = useState<WorkshopCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "SCALES" | "MATERIALS" | "RECIPES" | "PROCESSES" | "ROUTES" | "WORKSTATIONS" | "TOLERANCES" | "STAFF"
  >("SCALES");

  // Scale wizard state
  const [showAddScaleModal, setShowAddScaleModal] = useState(false);
  const [scaleName, setScaleName] = useState("");
  const [scalePurpose, setScalePurpose] = useState<"GOLD" | "STONE">("GOLD");
  const [scaleAdapter, setScaleAdapter] = useState<"SERIAL" | "TCP">("SERIAL");
  const [scalePort, setScalePort] = useState("");
  const [scaleBaud, setScaleBaud] = useState("9600");
  const [scaleTcpHost, setScaleTcpHost] = useState("");
  const [scaleTcpPort, setScaleTcpPort] = useState("4001");
  const [scaleStableToken, setScaleStableToken] = useState("ST");
  const [scaleUnstableToken, setScaleUnstableToken] = useState("US");
  const [serialPorts, setSerialPorts] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<{ stable: boolean; sample: string; weight: string } | null>(null);
  const [testingScale, setTestingScale] = useState(false);

  // Material builder state
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [matKey, setMatKey] = useState("");
  const [matName, setMatName] = useState("");
  const [matKind, setMatKind] = useState("GOLD");
  const [matPurpose, setMatPurpose] = useState<"GOLD" | "STONE">("GOLD");
  const [matPurity, setMatPurity] = useState("0.995");
  const [matElements, setMatElements] = useState<Array<{ element: string; percentage: number }>>([
    { element: "Gold", percentage: 99.5 },
  ]);

  // Recipe builder state
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [recipeName, setRecipeName] = useState("");
  const [recipeTargetFineGold, setRecipeTargetFineGold] = useState("0.916667"); // 22K default
  const [recipeAlloyFineGold, setRecipeAlloyFineGold] = useState("0.000000");
  const [recipeComponents, setRecipeComponents] = useState<Array<{ element: string; percentage: number }>>([
    { element: "Silver", percentage: 55 },
    { element: "Copper", percentage: 35 },
    { element: "Zinc", percentage: 10 },
  ]);

  // Process & Workstation modals
  const [showAddProcessModal, setShowAddProcessModal] = useState(false);
  const [procName, setProcName] = useState("");
  const [procDept, setProcDept] = useState("");

  const [showAddWorkstationModal, setShowAddWorkstationModal] = useState(false);
  const [wsName, setWsName] = useState("");
  const [wsDept, setWsDept] = useState("");

  // Staff invite
  const [staffEmail, setStaffEmail] = useState("");
  const [staffCanCapture, setStaffCanCapture] = useState(true);
  const [staffCanApprove, setStaffCanApprove] = useState(false);
  const [invitingStaff, setInvitingStaff] = useState(false);
  const [staffNotice, setStaffNotice] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await workshopApi.catalog();
      setCatalog(res.data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Detect serial ports when add scale modal opens
  useEffect(() => {
    if (showAddScaleModal) {
      listWorkshopSerialPorts()
        .then((ports) => {
          setSerialPorts(ports);
          if (ports.length && !scalePort) setScalePort(ports[0]);
        })
        .catch(() => setSerialPorts([]));
    }
  }, [showAddScaleModal, scalePort]);

  // Test Scale diagnostic
  const handleTestScale = async () => {
    setTestingScale(true);
    setTestResult(null);
    try {
      if (typeof window !== "undefined" && (window as any).__TAURI__) {
        const dummyDevice: WorkshopDevice = {
          id: "test-device",
          name: scaleName || "Test Scale",
          purpose: scalePurpose,
          adapterKind: scaleAdapter,
          precisionGrams: scalePurpose === "GOLD" ? "0.01" : "0.001",
          profile: {
            parser: {
              kind: "ASCII_LINE",
              stableToken: scaleStableToken,
              unstableToken: scaleUnstableToken,
            },
            transport:
              scaleAdapter === "TCP"
                ? { host: scaleTcpHost, port: parseInt(scaleTcpPort, 10) || 4001 }
                : { port: scalePort, baudRate: parseInt(scaleBaud, 10) || 9600 },
          },
        };
        const res = await readPhysicalWorkshopScale(dummyDevice);
        setTestResult({
          stable: res.stable,
          sample: res.rawFrame,
          weight: res.weightGrams,
        });
      } else {
        // Fallback simulation for browser testing
        const sim = scalePurpose === "STONE" ? new StoneScaleSimulator("5.250") : new GoldScaleSimulator("100.25");
        sim.connect();
        sim.setStable(true);
        const reading = sim.read();
        if (reading) {
          setTestResult({
            stable: true,
            sample: reading.rawFrame,
            weight: reading.weightGrams,
          });
        }
      }
    } catch (err: any) {
      alert(err?.message || "Scale test failed");
    } finally {
      setTestingScale(false);
    }
  };

  const handleSaveScale = async () => {
    if (!scaleName.trim()) return;
    try {
      await workshopApi.registerDevice({
        name: scaleName.trim(),
        purpose: scalePurpose,
        adapterKind: scaleAdapter,
        port: scaleAdapter === "SERIAL" ? scalePort || undefined : undefined,
        baudRate: scaleAdapter === "SERIAL" ? parseInt(scaleBaud, 10) || 9600 : undefined,
        tcpHost: scaleAdapter === "TCP" ? scaleTcpHost || undefined : undefined,
        tcpPort: scaleAdapter === "TCP" ? parseInt(scaleTcpPort, 10) || 4001 : undefined,
        stableTokens: [scaleStableToken],
        unstableTokens: [scaleUnstableToken],
        isPrimary: true,
      });
      setShowAddScaleModal(false);
      setScaleName("");
      loadCatalog();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to register scale");
    }
  };

  // Recipe Component calculations
  const recipeTotalPercentage = useMemo(() => {
    return recipeComponents.reduce((sum, c) => sum + (c.percentage || 0), 0);
  }, [recipeComponents]);

  const handleSaveRecipe = async () => {
    if (!recipeName.trim()) return;
    if (Math.abs(recipeTotalPercentage - 100) > 0.01) {
      alert(t("Recipe alloy components must total exactly 100%"));
      return;
    }
    try {
      await workshopApi.createRecipe({
        name: recipeName.trim(),
        targetFineGoldFraction: recipeTargetFineGold,
        alloyFineGoldFraction: recipeAlloyFineGold,
        components: recipeComponents,
      });
      setShowAddRecipeModal(false);
      setRecipeName("");
      loadCatalog();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to save recipe");
    }
  };

  // Preset recipes
  const applyRecipePreset = (preset: "22K_YELLOW" | "18K_ROSE" | "18K_WHITE") => {
    if (preset === "22K_YELLOW") {
      setRecipeName("22K Yellow Gold (Standard)");
      setRecipeTargetFineGold("0.916667");
      setRecipeAlloyFineGold("0.000000");
      setRecipeComponents([
        { element: "Silver", percentage: 55 },
        { element: "Copper", percentage: 35 },
        { element: "Zinc", percentage: 10 },
      ]);
    } else if (preset === "18K_ROSE") {
      setRecipeName("18K Rose Gold");
      setRecipeTargetFineGold("0.750000");
      setRecipeAlloyFineGold("0.000000");
      setRecipeComponents([
        { element: "Copper", percentage: 80 },
        { element: "Silver", percentage: 20 },
      ]);
    } else if (preset === "18K_WHITE") {
      setRecipeName("18K White Gold");
      setRecipeTargetFineGold("0.750000");
      setRecipeAlloyFineGold("0.000000");
      setRecipeComponents([
        { element: "Nickel", percentage: 50 },
        { element: "Copper", percentage: 35 },
        { element: "Zinc", percentage: 15 },
      ]);
    }
  };

  const handleInviteStaff = async () => {
    if (!staffEmail.trim()) return;
    setInvitingStaff(true);
    setStaffNotice(null);
    try {
      await workshopApi.inviteStaff({
        email: staffEmail.trim(),
        canCapture: staffCanCapture,
        canApprove: staffCanApprove,
      });
      setStaffNotice(t("Staff invitation sent successfully"));
      setStaffEmail("");
      setTimeout(() => setStaffNotice(null), 3500);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to invite staff");
    } finally {
      setInvitingStaff(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
        <T>Loading factory settings…</T>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <div className="flex rounded-lg border bg-muted/40 p-1 text-xs">
          {[
            { id: "SCALES", label: "Scales (Gold & Stone)", icon: Scale },
            { id: "MATERIALS", label: "Materials", icon: Coins },
            { id: "RECIPES", label: "Alloy Recipes", icon: Sparkles },
            { id: "PROCESSES", label: "Processes", icon: GitBranch },
            { id: "WORKSTATIONS", label: "Machines", icon: Cpu },
            { id: "TOLERANCES", label: "Tolerances", icon: Sliders },
            { id: "STAFF", label: "Staff & Operators", icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <T>{tab.label}</T>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Scales Configuration Tab */}
      {activeTab === "SCALES" && (
        <Card className="border-border">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Scale className="h-4 w-4 text-amber-500" />
                <T>Registered Factory Scales</T>
              </CardTitle>
              <CardDescription className="text-xs">
                <T>Gold scales (0.01g precision) and stone scales (0.001g precision) via Serial COM or TCP IP</T>
              </CardDescription>
            </div>
            {canApprove && (
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                onClick={() => setShowAddScaleModal(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <T>Add Scale Device</T>
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {(!catalog?.devices || catalog.devices.length === 0) ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
                <T>No scale hardware devices registered. Click "Add Scale Device" to configure your balance.</T>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {catalog.devices.map((dev: any) => (
                  <div key={dev.id} className="rounded-xl border p-3.5 bg-muted/20 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{dev.name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {dev.purpose} ({dev.purpose === "GOLD" ? "0.01g" : "0.001g"})
                      </Badge>
                    </div>
                    <div className="text-muted-foreground font-mono text-[11px] space-y-0.5">
                      <div>Adapter: {dev.adapterKind}</div>
                      {dev.port && <div>Port: {dev.port} · Baud: {dev.baudRate || 9600}</div>}
                      {dev.tcpHost && <div>Host: {dev.tcpHost}:{dev.tcpPort}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2. Materials Tab with interactive visual composition */}
      {activeTab === "MATERIALS" && (
        <Card className="border-border">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-500" />
                <T>Configured Manufacturing Materials</T>
              </CardTitle>
              <CardDescription className="text-xs">
                <T>Physical metals, alloys, and stones with defined purity and elemental composition</T>
              </CardDescription>
            </div>
            {canApprove && (
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                onClick={() => setShowAddMaterialModal(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <T>Add Material</T>
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(catalog?.materials || []).map((mat) => (
                <div key={mat.id} className="rounded-xl border p-3.5 bg-muted/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{mat.name}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {mat.scalePurpose}
                    </Badge>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    Key: {mat.key} · Kind: {mat.kind}
                  </div>
                  {mat.theoreticalPurity && (
                    <div className="text-[11px] font-mono text-amber-600 font-semibold">
                      Purity: {mat.theoreticalPurity}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Alloy Recipe Builder Tab */}
      {activeTab === "RECIPES" && (
        <Card className="border-border">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <T>Alloy Composition Recipes</T>
              </CardTitle>
              <CardDescription className="text-xs">
                <T>Formula ratios for calculating fine gold and master alloy requirement</T>
              </CardDescription>
            </div>
            {canApprove && (
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                onClick={() => setShowAddRecipeModal(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <T>Create Recipe</T>
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {(!catalog?.recipes || catalog.recipes.length === 0) ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
                <T>No alloy recipes created yet. Build a recipe with 100% component validation.</T>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {catalog.recipes.map((rcp) => (
                  <div key={rcp.id} className="rounded-xl border p-3.5 bg-muted/20 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{rcp.name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        v{rcp.version}
                      </Badge>
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground space-y-0.5">
                      <div>Target Fine Gold: {parseFloat(rcp.targetFineGoldFraction).toFixed(4)}</div>
                      <div>Alloy Fine Gold: {parseFloat(rcp.alloyFineGoldFraction || "0").toFixed(4)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. Staff & Operators Tab */}
      {activeTab === "STAFF" && (
        <Card className="border-border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              <T>Factory Floor Staff & Operators</T>
            </CardTitle>
            <CardDescription className="text-xs">
              <T>Invite operators with capture-only permissions, or supervisors with variance approval rights</T>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {canApprove && (
              <div className="rounded-xl border p-4 bg-muted/20 space-y-3 max-w-lg text-xs">
                <Label className="text-xs font-semibold block"><T>Invite Staff Member</T></Label>
                <div className="space-y-2">
                  <Input
                    placeholder="operator@workshop.com"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="text-xs"
                  />

                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={staffCanCapture}
                        onChange={(e) => setStaffCanCapture(e.target.checked)}
                      />
                      <span><T>Scale Weighing & Capture</T></span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={staffCanApprove}
                        onChange={(e) => setStaffCanApprove(e.target.checked)}
                      />
                      <span><T>Variance & QC Approver</T></span>
                    </label>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                  onClick={handleInviteStaff}
                  disabled={invitingStaff || !staffEmail.trim()}
                >
                  {invitingStaff ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Mail className="h-3.5 w-3.5 mr-1" />}
                  <T>Send Staff Invitation</T>
                </Button>

                {staffNotice && (
                  <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{staffNotice}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Scale Modal Wizard */}
      {showAddScaleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background border rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Scale className="h-4 w-4 text-amber-500" />
              <T>Scale Hardware Setup Wizard</T>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block"><T>Scale Name</T></Label>
                  <Input
                    placeholder="e.g. Mettler Toledo MS303TS"
                    value={scaleName}
                    onChange={(e) => setScaleName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block"><T>Purpose & Precision</T></Label>
                  <select
                    value={scalePurpose}
                    onChange={(e: any) => setScalePurpose(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-2 text-xs"
                  >
                    <option value="GOLD">Gold Scale (0.01g)</option>
                    <option value="STONE">Stone Scale (0.001g)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block"><T>Connection Type</T></Label>
                  <select
                    value={scaleAdapter}
                    onChange={(e: any) => setScaleAdapter(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-2 text-xs"
                  >
                    <option value="SERIAL">Serial COM Port</option>
                    <option value="TCP">TCP / IP Network Socket</option>
                  </select>
                </div>
                {scaleAdapter === "SERIAL" ? (
                  <div>
                    <Label className="text-xs mb-1 block"><T>COM Port</T></Label>
                    <Input
                      placeholder={serialPorts.length ? serialPorts[0] : "COM3"}
                      value={scalePort}
                      onChange={(e) => setScalePort(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs mb-1 block"><T>TCP Host</T></Label>
                    <Input
                      placeholder="192.168.1.150"
                      value={scaleTcpHost}
                      onChange={(e) => setScaleTcpHost(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Diagnostic Test Button */}
              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground"><T>Live Diagnostics Sample</T></span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleTestScale}
                    disabled={testingScale}
                  >
                    {testingScale ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                    <T>Test Scale</T>
                  </Button>
                </div>

                {testResult && (
                  <div className="rounded-lg border bg-muted/40 p-2.5 font-mono text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className={testResult.stable ? "text-emerald-600 font-bold" : "text-amber-600"}>
                        {testResult.stable ? "STABLE" : "UNSTABLE"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reading:</span>
                      <span className="font-bold text-foreground">{testResult.weight} g</span>
                    </div>
                    <div className="truncate text-muted-foreground/80">Raw: {testResult.sample}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => setShowAddScaleModal(false)}>
                <T>Cancel</T>
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleSaveScale}
                disabled={!scaleName.trim()}
              >
                <T>Save Scale Device</T>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Builder Modal */}
      {showAddRecipeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background border rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <T>Alloy Recipe Builder (100% Component Validation)</T>
            </h3>

            {/* Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
              <span className="text-muted-foreground text-xs"><T>Presets</T>:</span>
              <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => applyRecipePreset("22K_YELLOW")}>
                22K Yellow
              </Button>
              <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => applyRecipePreset("18K_ROSE")}>
                18K Rose
              </Button>
              <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => applyRecipePreset("18K_WHITE")}>
                18K White
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-xs mb-1 block"><T>Recipe Name</T></Label>
                <Input
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  placeholder="e.g. 22K Yellow Gold (Export Grade)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block"><T>Target Fine Gold Fraction</T></Label>
                  <Input
                    value={recipeTargetFineGold}
                    onChange={(e) => setRecipeTargetFineGold(e.target.value)}
                    className="font-mono"
                    placeholder="0.916667"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block"><T>Master Alloy Fine Gold Fraction</T></Label>
                  <Input
                    value={recipeAlloyFineGold}
                    onChange={(e) => setRecipeAlloyFineGold(e.target.value)}
                    className="font-mono"
                    placeholder="0.000000"
                  />
                </div>
              </div>

              {/* Master Alloy Components List */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <T>Master Alloy Components</T>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-amber-600"
                    onClick={() => setRecipeComponents([...recipeComponents, { element: "Zinc", percentage: 10 }])}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    <T>Add Element</T>
                  </Button>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {recipeComponents.map((comp, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={comp.element}
                        onChange={(e) => {
                          const updated = [...recipeComponents];
                          updated[idx].element = e.target.value;
                          setRecipeComponents(updated);
                        }}
                        className="h-8 text-xs flex-1"
                        placeholder="Element (e.g. Silver)"
                      />
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={comp.percentage}
                        onChange={(e) => {
                          const updated = [...recipeComponents];
                          updated[idx].percentage = parseFloat(e.target.value) || 0;
                          setRecipeComponents(updated);
                        }}
                        className="h-8 text-xs w-20 font-mono"
                      />
                      <span className="text-muted-foreground">%</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500"
                        onClick={() => {
                          const updated = recipeComponents.filter((_, i) => i !== idx);
                          setRecipeComponents(updated);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t font-mono text-xs">
                  <span><T>Total Components</T>:</span>
                  <span
                    className={`font-bold ${
                      Math.abs(recipeTotalPercentage - 100) < 0.01 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {recipeTotalPercentage.toFixed(1)}% / 100%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => setShowAddRecipeModal(false)}>
                <T>Cancel</T>
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleSaveRecipe}
                disabled={!recipeName.trim() || Math.abs(recipeTotalPercentage - 100) > 0.01}
              >
                <T>Save Recipe</T>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
