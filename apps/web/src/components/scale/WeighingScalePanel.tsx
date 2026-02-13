"use client";

/**
 * WeighingScalePanel — Visual UI for the digital weighing scale
 *
 * Features:
 * - Connect/disconnect to USB scale via Web Serial API
 * - Live weight display with unit conversion
 * - Tare (zero) button
 * - Scale preset selector (Shimadzu, CAS, Mettler, etc.)
 * - Stability indicator (green = stable, yellow = unstable)
 * - Simulated scale mode for testing
 * - "Use this weight" callback to populate forms
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useWeighingScale,
  useSimulatedScale,
  SCALE_PRESETS,
  type WeightUnit,
} from "@/hooks/useWeighingScale";
import {
  Activity,
  Cable,
  Check,
  Loader2,
  RotateCcw,
  Scale,
  Unplug,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useState } from "react";

interface WeighingScalePanelProps {
  /** Called when user clicks "Use this weight" with weight in grams */
  onWeightCapture?: (weightGrams: number) => void;
  /** Whether to show the simulated scale (for demo/testing) */
  allowSimulated?: boolean;
  /** Compact mode for embedding in forms */
  compact?: boolean;
}

export function WeighingScalePanel({
  onWeightCapture,
  allowSimulated = true,
  compact = false,
}: WeighingScalePanelProps) {
  const [scalePreset, setScalePreset] = useState("default");
  const [useSimulated, setUseSimulated] = useState(false);
  const [displayUnit, setDisplayUnit] = useState<WeightUnit>("g");

  // Real scale hook
  const realScale = useWeighingScale(SCALE_PRESETS[scalePreset]);
  // Simulated scale hook
  const simScale = useSimulatedScale();

  // Use either real or simulated based on toggle
  const scale = useSimulated ? simScale : realScale;
  const {
    connected,
    connecting,
    lastReading,
    error,
    supported,
    connect,
    disconnect,
    tare,
    setUnit,
    getWeightInGrams,
  } = scale;

  const handleConnect = async () => {
    await connect();
  };

  const handleUseWeight = () => {
    const grams = getWeightInGrams();
    if (grams > 0 && onWeightCapture) {
      onWeightCapture(grams);
    }
  };

  const handleUnitChange = (unit: WeightUnit) => {
    setDisplayUnit(unit);
    setUnit(unit);
  };

  // Format weight for display
  const formatWeight = (reading: typeof lastReading) => {
    if (!reading) return "0.000";
    return reading.weight.toFixed(3);
  };

  if (compact) {
    return (
      <div className="border rounded-lg p-3 bg-gradient-to-r from-slate-50 to-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-medium">Scale</span>
            {connected ? (
              <Badge className="bg-green-100 text-green-700 text-xs">
                <Wifi className="h-2.5 w-2.5 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                <WifiOff className="h-2.5 w-2.5 mr-1" />
                Disconnected
              </Badge>
            )}
          </div>
          {!connected ? (
            <div className="flex gap-1">
              {allowSimulated && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7"
                  onClick={() => {
                    setUseSimulated(true);
                    connect();
                  }}
                >
                  Demo
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => {
                  setUseSimulated(false);
                  handleConnect();
                }}
                disabled={connecting || !supported}
              >
                {connecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Cable className="h-3 w-3 mr-1" />}
                Connect
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={disconnect}>
              <Unplug className="h-3 w-3 mr-1" />
              Disconnect
            </Button>
          )}
        </div>
        {connected && (
          <div className="flex items-center gap-2">
            <div
              className={`flex-1 text-center py-2 rounded-md font-mono text-2xl font-bold ${
                lastReading?.stable
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-yellow-50 text-yellow-800 border border-yellow-200"
              }`}
            >
              {formatWeight(lastReading)} {displayUnit}
              {lastReading?.stable && <Check className="inline h-4 w-4 ml-1 text-green-600" />}
            </div>
            <div className="flex flex-col gap-1">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={tare}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Tare
              </Button>
              {onWeightCapture && (
                <Button
                  size="sm"
                  className="h-7 text-xs bg-amber-500 hover:bg-amber-600"
                  onClick={handleUseWeight}
                  disabled={!lastReading || lastReading.weight <= 0}
                >
                  Use
                </Button>
              )}
            </div>
          </div>
        )}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <Card className="border-slate-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-5 w-5 text-slate-600" />
          Digital Weighing Scale
        </CardTitle>
        <CardDescription className="text-xs">
          Connect your USB jeweler scale for live weight readings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Controls */}
        <div className="flex items-center gap-2">
          {!connected ? (
            <>
              <Select value={scalePreset} onValueChange={setScalePreset}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Scale model" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(SCALE_PRESETS).map((preset) => (
                    <SelectItem key={preset} value={preset}>
                      {preset.charAt(0).toUpperCase() + preset.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => {
                  setUseSimulated(false);
                  handleConnect();
                }}
                disabled={connecting || !supported}
                size="sm"
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Cable className="h-4 w-4 mr-2" />
                )}
                Connect Scale
              </Button>
              {allowSimulated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUseSimulated(true);
                    connect();
                  }}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Demo Mode
                </Button>
              )}
            </>
          ) : (
            <>
              <Badge className="bg-green-100 text-green-700">
                <Wifi className="h-3 w-3 mr-1" />
                {useSimulated ? "Simulated" : "Connected"}
              </Badge>
              <Button variant="outline" size="sm" onClick={disconnect}>
                <Unplug className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </>
          )}
        </div>

        {!supported && !useSimulated && (
          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
            Web Serial API not supported in this browser. Use Chrome or Edge, or try Demo Mode.
          </p>
        )}

        {/* Live Weight Display */}
        {connected && (
          <div className="space-y-3">
            <div
              className={`text-center py-6 rounded-xl border-2 font-mono ${
                lastReading?.stable
                  ? "bg-green-50 border-green-300 text-green-900"
                  : "bg-yellow-50 border-yellow-300 text-yellow-900"
              }`}
            >
              <div className="text-5xl font-bold tracking-tight">
                {formatWeight(lastReading)}
              </div>
              <div className="text-lg mt-1 text-muted-foreground">
                {displayUnit}
              </div>
              {lastReading?.stable ? (
                <Badge className="mt-2 bg-green-200 text-green-800 text-xs">
                  <Check className="h-3 w-3 mr-1" /> Stable
                </Badge>
              ) : (
                <Badge className="mt-2 bg-yellow-200 text-yellow-800 text-xs">
                  <Activity className="h-3 w-3 mr-1" /> Measuring...
                </Badge>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <Select value={displayUnit} onValueChange={(v) => handleUnitChange(v as WeightUnit)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="g">Grams (g)</SelectItem>
                  <SelectItem value="oz">Troy Oz</SelectItem>
                  <SelectItem value="tola">Tola</SelectItem>
                  <SelectItem value="dwt">DWT</SelectItem>
                  <SelectItem value="kg">Kg</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={tare} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />
                Tare (Zero)
              </Button>
              {onWeightCapture && (
                <Button
                  onClick={handleUseWeight}
                  disabled={!lastReading || lastReading.weight <= 0}
                  className="flex-1 bg-amber-500 hover:bg-amber-600"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Use This Weight
                </Button>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500 bg-red-50 p-2 rounded">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default WeighingScalePanel;
