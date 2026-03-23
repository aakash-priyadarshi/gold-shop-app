"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/api";
import {
    AlertCircle,
    CheckCircle,
    Copy,
    Loader2,
    MessageSquare,
    Phone,
    Send,
    TestTube2,
} from "lucide-react";
import { useState } from "react";

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  messageSid?: string;
  sentTo?: string;
  timestamp?: string;
  details?: any;
}

export default function SmsTestPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+977"); // Default to Nepal
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const commonCountryCodes = [
    { code: "+977", country: "Nepal" },
    { code: "+91", country: "India" },
    { code: "+88", country: "Bangladesh" },
    { code: "+65", country: "Singapore" },
    { code: "+1", country: "USA/Canada" },
    { code: "+44", country: "UK" },
    { code: "+81", country: "Japan" },
    { code: "+86", country: "China" },
  ];

  const handleSendTest = async () => {
    // Validate phone number
    if (!phoneNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    // Format the full phone number
    const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/[\s\-()]/g, "")}`;

    // Basic E.164 format validation
    if (!/^\+[1-9]\d{6,14}$/.test(fullPhoneNumber)) {
      toast({
        title: "Invalid Phone Number",
        description:
          "Phone number must be in valid international format (7-15 digits after country code)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await adminApi.testSmsSendingWithTwilio(fullPhoneNumber);

      setResult(response.data);

      if (response.data.success) {
        toast({
          title: "✅ Test SMS Sent",
          description: `SMS sent successfully to ${response.data.sentTo}`,
        });
      } else {
        toast({
          title: "❌ Test SMS Failed",
          description: response.data.error || "Failed to send test SMS",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to send test SMS";

      setResult({
        success: false,
        error: errorMessage,
        details: error?.response?.data,
      });

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">Twilio SMS Test</h1>
            <p className="text-muted-foreground">
              Send a test SMS message to verify your Twilio integration is
              working correctly
            </p>
          </div>

          {/* Main Test Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TestTube2 className="h-5 w-5" />
                <div>
                  <CardTitle>Send Test SMS</CardTitle>
                  <CardDescription>
                    Enter a phone number to receive a test SMS
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Phone Number Input */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Phone Number
                </Label>
                <div className="flex gap-2">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonCountryCodes.map((item) => (
                        <SelectItem key={item.code} value={item.code}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{item.code}</span>
                            <span className="text-muted-foreground text-sm">
                              {item.country}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex-1">
                    <Input
                      type="tel"
                      placeholder="9812345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={loading}
                      className="font-mono"
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  💡 Tip: Enter only the local number part (without country
                  code). The full number will be: {countryCode}
                  {phoneNumber.replace(/[\s\-()]/g, "") || "..."}
                </p>
              </div>

              {/* Send Button */}
              <Button
                onClick={handleSendTest}
                disabled={loading || !phoneNumber.trim()}
                className="w-full gap-2"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Test SMS
                  </>
                )}
              </Button>

              {/* Information Box */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <Phone className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-blue-900">
                        The test SMS will confirm that your Twilio API
                        credentials and SMS gateway are working correctly.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {/* Test Result */}
          {result && (
            <Card
              className={
                result.success
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <CardTitle className="text-lg">
                      {result.success ? "✅ SMS Sent Successfully" : "❌ Test Failed"}
                    </CardTitle>
                  </div>
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? "SUCCESS" : "FAILED"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.message && (
                  <div>
                    <p className="text-sm font-medium mb-1">Message</p>
                    <p className="text-sm text-gray-700">{result.message}</p>
                  </div>
                )}

                {result.error && (
                  <div>
                    <p className="text-sm font-medium mb-1">Error</p>
                    <p className="text-sm text-gray-700 font-mono bg-red-100/50 p-2 rounded border border-red-200">
                      {result.error}
                    </p>
                  </div>
                )}

                {result.sentTo && (
                  <div>
                    <p className="text-sm font-medium mb-1">Sent To</p>
                    <div className="flex items-center justify-between bg-gray-100 p-2 rounded text-sm font-mono">
                      <span>{result.sentTo}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(result.sentTo || "")}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {result.messageSid && (
                  <div>
                    <p className="text-sm font-medium mb-1">Message SID</p>
                    <div className="flex items-center justify-between bg-gray-100 p-2 rounded text-sm font-mono text-ellipsis overflow-hidden">
                      <span className="truncate">{result.messageSid}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(result.messageSid || "")}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {result.timestamp && (
                  <div>
                    <p className="text-sm font-medium mb-1">Timestamp</p>
                    <p className="text-xs text-gray-600 font-mono">
                      {new Date(result.timestamp).toLocaleString()}
                    </p>
                  </div>
                )}

                {(result.details || showDetails) && result.details && (
                  <div className="pt-2 border-t">
                    <Button
                      onClick={() => setShowDetails(!showDetails)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {showDetails ? "Hide" : "Show"} Technical Details
                    </Button>
                    {showDetails && (
                      <pre className="mt-2 bg-black/10 p-2 rounded text-xs overflow-auto max-h-40 font-mono">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Help Section */}
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Troubleshooting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium mb-1">SMS not received?</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  <li>Ensure the phone number is in valid international format</li>
                  <li>Check Twilio account has sufficient credits</li>
                  <li>Verify Twilio API credentials in environment variables</li>
                  <li>Check your phone's message filter/spam settings</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">Environment Variables</p>
                <p className="text-muted-foreground">
                  Make sure these are set in your Railway/deployment environment:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2 mt-1 font-mono text-xs">
                  <li>TWILIO_ACCOUNT_SID</li>
                  <li>TWILIO_AUTH_TOKEN</li>
                  <li>TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
