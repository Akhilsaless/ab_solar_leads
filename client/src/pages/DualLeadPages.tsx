import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

export function DualLeadPages() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lead Outreach Planning</h1>
        <p className="text-muted-foreground mt-2">Choose a research approach before creating a campaign.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Business Research</CardTitle></CardHeader>
          <CardContent>Find businesses by location and category, then confirm contact details, site ownership, electricity usage, and interest.</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Owner Research</CardTitle></CardHeader>
          <CardContent>Identify the decision maker and confirm rooftop permission. An ownership claim alone does not establish solar readiness.</CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Campaign Results</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p>This planning page does not run outreach or have measured results. Review recorded campaign performance in North Star.</p>
          <div className="flex gap-4">
            <Link href="/campaigns" className="text-primary underline">Open Campaigns</Link>
            <Link href="/north-star" className="text-primary underline">Open North Star</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
