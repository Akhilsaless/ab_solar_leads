import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

export function SolarBenefitsVideo() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <h1 className="text-3xl font-bold">Solar Learning Resources</h1>
      <Card>
        <CardHeader><CardTitle>Video Not Available Yet</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p>No approved video has been uploaded. Playback and downloads will be available when a real video is published.</p>
          <p>Savings and payback depend on electricity usage, tariffs, site conditions, system design, and current installer pricing. Subsidy eligibility requires a separate review.</p>
          <Link href="/product-guide" className="text-primary underline">View the Product Guide</Link>
        </CardContent>
      </Card>
    </div>
  );
}
