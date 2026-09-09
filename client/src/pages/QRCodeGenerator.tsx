import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Copy, CheckCircle } from "lucide-react";

export function QRCodeGenerator() {
  const [hostelName, setHostelName] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const generateQRCode = () => {
    if (!hostelName) {
      alert("Please enter hostel name");
      return;
    }

    // Generate QR code URL pointing to hostel referrer signup
    const referralUrl = `${window.location.origin}/hostel-referrer?hostel=${encodeURIComponent(hostelName)}`;
    
    // Use QR code API (Google Charts API)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(referralUrl)}`;
    
    setQrUrl(qrCodeUrl);
  };

  const downloadQRCode = () => {
    if (!qrUrl) return;
    
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `${hostelName}-referrer-qr.png`;
    link.click();
  };

  const copyLink = () => {
    const referralUrl = `${window.location.origin}/hostel-referrer?hostel=${encodeURIComponent(hostelName)}`;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">QR Code Generator</h1>
        <p className="text-gray-500 mt-1">Create QR codes for hostel referrer recruitment</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate QR Code</CardTitle>
          <CardDescription>Create a QR code to place in your hostel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="hostelName">Hostel Name</Label>
            <Input
              id="hostelName"
              placeholder="e.g., Oasis Hostel, Hyderabad"
              value={hostelName}
              onChange={(e) => setHostelName(e.target.value)}
              className="mt-1"
            />
          </div>

          <Button onClick={generateQRCode} className="w-full bg-blue-600 hover:bg-blue-700">
            Generate QR Code
          </Button>
        </CardContent>
      </Card>

      {qrUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Your QR Code</CardTitle>
            <CardDescription>Scan to access hostel referrer signup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center p-6 bg-gray-50 rounded-lg">
              <img src={qrUrl} alt="QR Code" className="w-64 h-64" />
            </div>

            <div className="space-y-2">
              <Label>Referral Link</Label>
              <div className="flex gap-2">
                <Input
                  value={`${window.location.origin}/hostel-referrer?hostel=${hostelName}`}
                  readOnly
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  onClick={copyLink}
                  className="px-3"
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Button onClick={downloadQRCode} className="w-full bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />
                Download QR Code
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Print and place in your hostel common area
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ol className="space-y-2 list-decimal list-inside">
            <li>Enter your hostel name</li>
            <li>Generate the QR code</li>
            <li>Download the image</li>
            <li>Print it (A4 size recommended)</li>
            <li>Place in common areas (reception, bulletin board, etc.)</li>
            <li>Guests scan → Share referral link → You earn money!</li>
          </ol>
        </CardContent>
      </Card>

      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-base">Tips for Better Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="space-y-2 list-disc list-inside">
            <li>Print multiple copies (5-10 per hostel)</li>
            <li>Use color printing for better visibility</li>
            <li>Place near WiFi areas</li>
            <li>Add a sign: "Join the solar referral program — scan here"</li>
            <li>Update your referrers about the QR code placement</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
