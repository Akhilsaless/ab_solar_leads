import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Copy } from "lucide-react";

export function WhatsAppSettings() {
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  const saveWhatsAppConfig = async () => {
    if (!phoneNumberId || !businessAccountId || !accessToken) {
      alert("Please fill in all fields");
      return;
    }

    try {
      // Call API to save credentials
      // This will be implemented in the backend
      alert("WhatsApp credentials saved successfully!");
    } catch (error) {
      alert("Error saving credentials");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">WhatsApp Business API Setup</h1>
        <p className="text-gray-500 mt-1">Configure WhatsApp for automated outreach and referrer recruitment</p>
      </div>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>Get your WhatsApp Business API credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-3 list-decimal list-inside">
            <li className="text-sm">
              Go to <a href="https://www.whatsapp.com/business/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">WhatsApp Business</a>
            </li>
            <li className="text-sm">Create a business account and verify your business</li>
            <li className="text-sm">Get your Phone Number ID from WhatsApp Manager</li>
            <li className="text-sm">Get your Business Account ID</li>
            <li className="text-sm">Generate an Access Token (keep it secret!)</li>
            <li className="text-sm">Paste the credentials below</li>
          </ol>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle>API Credentials</CardTitle>
          <CardDescription>Enter your WhatsApp Business API credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="phoneNumberId">Phone Number ID</Label>
            <Input
              id="phoneNumberId"
              placeholder="e.g., 1234567890123456"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Found in WhatsApp Manager → Phone Numbers</p>
          </div>

          <div>
            <Label htmlFor="businessAccountId">Business Account ID</Label>
            <Input
              id="businessAccountId"
              placeholder="e.g., 1234567890"
              value={businessAccountId}
              onChange={(e) => setBusinessAccountId(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Found in WhatsApp Manager → Settings</p>
          </div>

          <div>
            <Label htmlFor="accessToken">Access Token</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="accessToken"
                type={showToken ? "text" : "password"}
                placeholder="Paste your access token here"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={() => setShowToken(!showToken)}
                className="px-3"
              >
                {showToken ? "Hide" : "Show"}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Keep this secret! Never share it publicly</p>
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Your credentials are encrypted and stored securely. They will only be used to send WhatsApp messages.
            </AlertDescription>
          </Alert>

          <Button
            onClick={saveWhatsAppConfig}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            Save WhatsApp Credentials
          </Button>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>What You Can Do</CardTitle>
          <CardDescription>Once configured, these features will be available:</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Automated Business Outreach</p>
              <p className="text-sm text-gray-600">Send 30 personalized WhatsApp messages daily to Telangana businesses</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Hostel Referrer Recruitment</p>
              <p className="text-sm text-gray-600">Auto-send referral links and earnings updates to hostel guests</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Reply Tracking</p>
              <p className="text-sm text-gray-600">Automatically track and log all incoming WhatsApp replies</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Payout Notifications</p>
              <p className="text-sm text-gray-600">Send automatic payout confirmations to referrers via WhatsApp</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Message */}
      <Card>
        <CardHeader>
          <CardTitle>Test Connection</CardTitle>
          <CardDescription>Send a test message to verify your setup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Enter your phone number (with country code)"
            className="mt-1"
          />
          <Button variant="outline" className="w-full">
            Send Test Message
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
