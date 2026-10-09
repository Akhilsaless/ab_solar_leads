import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

export function WhatsAppSettings() {
  return (
    <Card>
      <CardHeader><CardTitle>WhatsApp Configuration</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p>WhatsApp is managed by the platform owner in Settings. Agency credentials cannot enable messaging.</p>
        <p>Sending remains unavailable until a verified provider adapter, approved templates, and webhook verification are configured.</p>
        <Link href="/settings" className="text-primary underline">Open Platform Settings</Link>
      </CardContent>
    </Card>
  );
}
