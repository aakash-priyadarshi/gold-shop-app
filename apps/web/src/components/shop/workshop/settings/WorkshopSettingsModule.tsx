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
  const [recipeComponents, setRecipeComponents] = useState<Array<{ materialKey: string; percentage: string }>>([
    { materialKey: "", percentage: "100" },
  ]);

  // Process & Workstation modals
  const [showAddProcessModal, setShowAddProcessModal] = useState(false);
  const [procName, setProcName] = useState("");
  const [procDept, setProcDept] = useState("");

  const [showAddWorkstationModal, setShowAddWorkstationModal] = useState(false);
  const [wsName, setWsName] = useState("");
  const [wsDept, setWsDept] = useState("");
  const [wsDefinitionId, setWsDefinitionId] = useState("");
  const [toleranceKind, setToleranceKind] = useState("TRANSFER_RECEIPT");
  const [toleranceMaterialKey, setToleranceMaterialKey] = useState("");
  const [toleranceDefinitionId, setToleranceDefinitionId] = useState("");
  const [tolerancePurpose, setTolerancePurpose] = useState<"GOLD" | "STONE">("GOLD");
  const [toleranceGrams, setToleranceGrams] = useState("0.01");
  const [tolerancePolicy, setTolerancePolicy] = useState<"REQUIRE_CLASSIFICATION" | "ACCEPT_WITHIN_TOLERANCE">("REQUIRE_CLASSIFICATION");
  const [settingsError, setSettingsError] = useState<string | null>(null);

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
                : { port: scalePort, baudRate: parseInt(scaleBaud, 10) || 9600, dataBits: 8, stopBits: 1, parity: "none" },
          },
        };
        const res = await readPhysicalWorkshopScale(dummyDevice);
        setTestResult({
          stable: res.stable,
          sample: res.rawFrame,
          weight: res.weightGrams,
        });
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
        profile: {
          parser: { kind: "ASCII_LINE", stableToken: scaleStableToken, unstableToken: scaleUnstableToken },
          transport: scaleAdapter === "SERIAL"
            ? { port: scalePort, baudRate: parseInt(scaleBaud, 10) || 9600, dataBits: 8, stopBits: 1, parity: "none" }
            : { host: scaleTcpHost, port: parseInt(scaleTcpPort, 10) || 4001 },
        },
      });
      setShowAddScaleModal(false);
      setScaleName("");
      loadCatalog();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to register scale");
    }
  };

  const handleSaveMaterial = async () => {
    if (!matName.trim() || !matKey.trim()) return;
    try {
      await workshopApi.createMaterial({
        name: matName.trim(),
        key: matKey.trim(),
        kind: matKind,
        scalePurpose: matPurpose,
        theoreticalPurity: matKind === "GOLD" && matPurity ? matPurity : undefined,
      });
      setShowAddMaterialModal(false);
      setMatName("");
      setMatKey("");
      setMatKind("GOLD");
      setMatPurpose("GOLD");
      setMatPurity("0.995");
      loadCatalog();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to create material");
    }
  };

  // Recipe Component calculations
  const recipeTotalMicros = useMemo(() => {
    return recipeComponents.reduce((sum, c) => sum + Math.round(Number(c.percentage || 0) * 10000), 0);
  }, [recipeComponents]);

  const handleSaveRecipe = async () => {
    if (!recipeName.trim()) return;
    if (recipeTotalMicros !== 1000000 || recipeComponents.some((c) => !c.materialKey || !Number.isFinite(Number(c.percentage)) || Number(c.percentage) <= 0 || !/^\d+(\.\d{1,4})?$/.test(c.percentage)) ||
        new Set(recipeComponents.map((c) => c.materialKey)).size !== recipeComponents.length) {
      alert(t("Recipe alloy components must total exactly 100%"));
      return;
    }
    try {
      await workshopApi.createRecipe({
        name: recipeName.trim(),
        targetFineGoldFraction: recipeTargetFineGold,
        alloyFineGoldFraction: recipeAlloyFineGold,
        components: recipeComponents.map((c) => ({ materialKey: c.materialKey, fraction: (Number(c.percentage) / 100).toFixed(6) })),
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
    const alloyMaterials = catalog?.materials.filter((material) => material.isActive && material.scalePurpose === "GOLD" && material.kind === "ALLOY") || [];
    const color = preset === "22K_YELLOW" ? "yellow" : preset === "18K_ROSE" ? "rose" : "white";
    const alloy = alloyMaterials.find((material) => `${material.key} ${material.name}`.toLowerCase().includes(color))
      || alloyMaterials.find((material) => material.key === "masterAlloy") || alloyMaterials[0];
    setRecipeComponents([{ materialKey: alloy?.key || "", percentage: "100" }]);
    if (preset === "22K_YELLOW") {
      setRecipeName("22K Yellow Gold (Standard)");
      setRecipeTargetFineGold("0.916667");
      setRecipeAlloyFineGold("0.000000");
    } else if (preset === "18K_ROSE") {
      setRecipeName("18K Rose Gold");
      setRecipeTargetFineGold("0.750000");
      setRecipeAlloyFineGold("0.000000");
    } else if (preset === "18K_WHITE") {
      setRecipeName("18K White Gold");
      setRecipeTargetFineGold("0.750000");
      setRecipeAlloyFineGold("0.000000");
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

  const saveSetting = async (save: () => Promise<unknown>) => {
    setSettingsError(null);
    try {
      await save();
      await loadCatalog();
    } catch (err: any) {
      setSettingsError(err?.response?.data?.message || err?.message || t("Unable to save workshop setting"));
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
                      <div><T>Adapter:</T> {dev.adapterKind}</div>
                      {dev.profile?.transport?.port && dev.adapterKind === "SERIAL" && <div><T>Port:</T> {dev.profile.transport.port} · <T>Baud:</T> {dev.profile.transport.baudRate}</div>}
                      {dev.profile?.transport?.host && <div><T>Host:</T> {dev.profile.transport.host}:{dev.profile.transport.port}</div>}
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
                    <T>Key:</T> {mat.key} · <T>Kind:</T> {mat.kind}
                  </div>
                  {mat.theoreticalPurity && (
                    <div className="text-[11px] font-mono text-amber-600 font-semibold">
                      <T>Purity:</T> {mat.theoreticalPurity}
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
                      <div><T>Target Fine Gold:</T> {parseFloat(rcp.targetFineGoldFraction).toFixed(4)}</div>
                      <div><T>Alloy Fine Gold:</T> {parseFloat(rcp.alloyFineGoldFraction || "0").toFixed(4)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {settingsError && <p role="alert" className="text-xs text-destructive">{settingsError}</p>}

      {activeTab === "PROCESSES" && (
        <Card><CardHeader><CardTitle><T>Manufacturing processes</T></CardTitle></CardHeader><CardContent className="space-y-3">
          {catalog?.processes.map((process) => <div key={process.id} className="text-xs border-b py-2">{process.name} · {process.department || "—"}</div>)}
          {canApprove && <div className="grid gap-2 sm:grid-cols-3"><Input value={procName} onChange={(e) => setProcName(e.target.value)} placeholder={t("Process name")} /><Input value={procDept} onChange={(e) => setProcDept(e.target.value)} placeholder={t("Department")} /><Button disabled={!procName.trim()} onClick={() => saveSetting(async () => { await workshopApi.createProcess({ name: procName.trim(), department: procDept.trim() || undefined }); setProcName(""); setProcDept(""); })}><T>Add process</T></Button></div>}
        </CardContent></Card>
      )}

      {activeTab === "WORKSTATIONS" && (
        <Card><CardHeader><CardTitle><T>Machines and workstations</T></CardTitle></CardHeader><CardContent className="space-y-3">
          {catalog?.workstations.map((workstation) => <div key={workstation.id} className="text-xs border-b py-2">{workstation.name} · {workstation.department || "—"}</div>)}
          {canApprove && <div className="grid gap-2 sm:grid-cols-4"><Input value={wsName} onChange={(e) => setWsName(e.target.value)} placeholder={t("Workstation name")} /><Input value={wsDept} onChange={(e) => setWsDept(e.target.value)} placeholder={t("Department")} /><select value={wsDefinitionId} onChange={(e) => setWsDefinitionId(e.target.value)} className="rounded-md border bg-background p-2 text-xs"><option value=""><T>Any process</T></option>{catalog?.processes.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><Button disabled={!wsName.trim()} onClick={() => saveSetting(async () => { await workshopApi.createWorkstation({ name: wsName.trim(), department: wsDept.trim() || undefined, definitionId: wsDefinitionId || undefined }); setWsName(""); setWsDept(""); setWsDefinitionId(""); })}><T>Add workstation</T></Button></div>}
        </CardContent></Card>
      )}

      {activeTab === "TOLERANCES" && (
        <Card><CardHeader><CardTitle><T>Movement tolerances</T></CardTitle></CardHeader><CardContent className="space-y-3">
          {catalog?.tolerances.map((rule) => <div key={rule.id} className="text-xs border-b py-2">{rule.movementKind} · {rule.materialKey || rule.scalePurpose} · {rule.maxDifferenceGrams} g · {rule.policy}</div>)}
          {canApprove && <div className="grid gap-2 sm:grid-cols-3">
            <select value={toleranceKind} onChange={(e) => setToleranceKind(e.target.value)} className="rounded-md border bg-background p-2 text-xs">{["TRANSFER_RECEIPT", "PROCESS_OUTPUT", "RECOVERY_RESULT", "FINISHED_RECEIPT", "STONE_SETTING", "STONE_RETURN"].map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select>
            <select value={tolerancePurpose} onChange={(e) => { setTolerancePurpose(e.target.value as "GOLD" | "STONE"); setToleranceMaterialKey(""); }} className="rounded-md border bg-background p-2 text-xs"><option value="GOLD"><T>Gold scale</T></option><option value="STONE"><T>Stone scale</T></option></select>
            <select value={toleranceDefinitionId} onChange={(e) => setToleranceDefinitionId(e.target.value)} className="rounded-md border bg-background p-2 text-xs"><option value=""><T>All processes</T></option>{catalog?.processes.filter((process) => process.isActive).map((process) => <option key={process.id} value={process.id}>{process.name}</option>)}</select>
            <select value={toleranceMaterialKey} onChange={(e) => setToleranceMaterialKey(e.target.value)} className="rounded-md border bg-background p-2 text-xs"><option value=""><T>All materials of scale type</T></option>{catalog?.materials.filter((m) => m.isActive && m.scalePurpose === tolerancePurpose).map((m) => <option key={m.id} value={m.key}>{m.name}</option>)}</select>
            <Input value={toleranceGrams} onChange={(e) => setToleranceGrams(e.target.value)} placeholder={t("Maximum difference in grams")} />
            <select value={tolerancePolicy} onChange={(e) => setTolerancePolicy(e.target.value as typeof tolerancePolicy)} className="rounded-md border bg-background p-2 text-xs"><option value="REQUIRE_CLASSIFICATION"><T>Require classification</T></option><option value="ACCEPT_WITHIN_TOLERANCE"><T>Accept within tolerance</T></option></select>
            <Button disabled={!/^\d+(\.\d{1,6})?$/.test(toleranceGrams)} onClick={() => saveSetting(() => workshopApi.configureTolerance({ movementKind: toleranceKind, definitionId: toleranceDefinitionId || undefined, materialKey: toleranceMaterialKey || undefined, scalePurpose: tolerancePurpose, maxDifferenceGrams: toleranceGrams, policy: tolerancePolicy }))}><T>Save tolerance</T></Button>
          </div>}
        </CardContent></Card>
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
                    placeholder={t("operator@workshop.com")}
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
                    placeholder={t("e.g. Mettler Toledo MS303TS")}
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
                    <option value="GOLD"><T>Gold Scale (0.01g)</T></option>
                    <option value="STONE"><T>Stone Scale (0.001g)</T></option>
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
                    <option value="SERIAL"><T>Serial COM Port</T></option>
                    <option value="TCP"><T>TCP / IP Network Socket</T></option>
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
                      <span className="text-muted-foreground"><T>Status:</T></span>
                      <span className={testResult.stable ? "text-emerald-600 font-bold" : "text-amber-600"}>
                        {testResult.stable ? "STABLE" : "UNSTABLE"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground"><T>Reading:</T></span>
                      <span className="font-bold text-foreground">{testResult.weight} g</span>
                    </div>
                    <div className="truncate text-muted-foreground/80"><T>Raw:</T> {testResult.sample}</div>
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

      {/* Material Builder Modal */}
      {showAddMaterialModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background border rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-500" />
              <T>Add Manufacturing Material</T>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block"><T>Material Name</T></Label>
                  <Input
                    placeholder={t("e.g. Gold 995 Bullion")}
                    value={matName}
                    onChange={(e) => {
                      setMatName(e.target.value);
                      if (!matKey) {
                        setMatKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 40));
                      }
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block"><T>Material Key (Code)</T></Label>
                  <Input
                    placeholder={t("e.g. gold_995_bullion")}
                    value={matKey}
                    onChange={(e) => setMatKey(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block"><T>Material Kind</T></Label>
                  <select
                    value={matKind}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMatKind(val);
                      if (val === "DIAMOND" || val === "STONE") {
                        setMatPurpose("STONE");
                      } else {
                        setMatPurpose("GOLD");
                      }
                    }}
                    className="w-full rounded-md border border-input bg-background p-2 text-xs"
                  >
                    <option value="GOLD"><T>GOLD (Gold / Alloyed Gold)</T></option>
                    <option value="ALLOY"><T>ALLOY (Master Alloy)</T></option>
                    <option value="SOLDER"><T>SOLDER (Soldering Alloy)</T></option>
                    <option value="MIXED"><T>MIXED (Mixed Melt Output)</T></option>
                    <option value="RECOVERED"><T>RECOVERED (Sweeps / Polish / Recovery)</T></option>
                    <option value="REFINERY"><T>REFINERY (Refinery Result)</T></option>
                    <option value="DIAMOND"><T>DIAMOND (Natural / Lab Diamond)</T></option>
                    <option value="STONE"><T>STONE (Gemstone / Color Stone)</T></option>
                    <option value="OTHER"><T>OTHER (Consumable / Other)</T></option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block"><T>Scale Purpose</T></Label>
                  <select
                    value={matPurpose}
                    onChange={(e: any) => setMatPurpose(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-2 text-xs"
                  >
                    <option value="GOLD"><T>Gold Scale (0.01g)</T></option>
                    <option value="STONE"><T>Stone Scale (0.001g)</T></option>
                  </select>
                </div>
              </div>

              {matKind === "GOLD" && (
                <div>
                  <Label className="text-xs mb-1 block"><T>Theoretical Fine Gold Fraction (Purity)</T></Label>
                  <Input
                    placeholder="0.995000"
                    value={matPurity}
                    onChange={(e) => setMatPurity(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    <T>For Gold 995 use 0.995, for 22K use 0.916667, for 24K use 0.999</T>
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => setShowAddMaterialModal(false)}>
                <T>Cancel</T>
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleSaveMaterial}
                disabled={!matName.trim() || !matKey.trim()}
              >
                <T>Save Material</T>
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
                <T>22K Yellow</T>
              </Button>
              <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => applyRecipePreset("18K_ROSE")}>
                <T>18K Rose</T>
              </Button>
              <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => applyRecipePreset("18K_WHITE")}>
                <T>18K White</T>
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-xs mb-1 block"><T>Recipe Name</T></Label>
                <Input
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  placeholder={t("e.g. 22K Yellow Gold (Export Grade)")}
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
                    onClick={() => setRecipeComponents([...recipeComponents, { materialKey: "", percentage: "0" }])}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    <T>Add Element</T>
                  </Button>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {recipeComponents.map((comp, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select value={comp.materialKey} onChange={(e) => setRecipeComponents(recipeComponents.map((part, i) => i === idx ? { ...part, materialKey: e.target.value } : part))} className="h-8 text-xs flex-1 rounded-md border bg-background">
                        <option value=""><T>Select material</T></option>
                        {catalog?.materials.filter((m) => m.isActive && m.scalePurpose === "GOLD").map((m) => <option key={m.id} value={m.key}>{m.name}</option>)}
                      </select>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={comp.percentage}
                        onChange={(e) => {
                          setRecipeComponents(recipeComponents.map((part, i) => i === idx ? { ...part, percentage: e.target.value } : part));
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
                      recipeTotalMicros === 1000000 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {(recipeTotalMicros / 10000).toFixed(4)}% / 100%
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
                disabled={!recipeName.trim() || recipeTotalMicros !== 1000000 || recipeComponents.some((c) => !c.materialKey || Number(c.percentage) <= 0)}
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
