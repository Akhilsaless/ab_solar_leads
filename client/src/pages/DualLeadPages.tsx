import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, TrendingUp, CheckCircle } from "lucide-react";

export function DualLeadPages() {
  const [mode, setMode] = useState<"blind" | "owner">("blind");

  const blindStats = {
    totalSent: 450,
    replies: 95,
    responseRate: "21%",
    interested: 28,
    conversionRate: "29%",
    avgLeadScore: 65,
    revenue: "₹2.1L"
  };

  const ownerStats = {
    totalSent: 180,
    replies: 82,
    responseRate: "45%",
    interested: 52,
    conversionRate: "63%",
    avgLeadScore: 82,
    revenue: "₹3.9L"
  };

  const stats = mode === "blind" ? blindStats : ownerStats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lead Outreach Modes</h1>
        <p className="text-gray-500 mt-1">Compare blind outreach vs owner-targeted outreach</p>
      </div>

      {/* Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Outreach Mode</CardTitle>
          <CardDescription>Switch between targeting strategies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              onClick={() => setMode("blind")}
              variant={mode === "blind" ? "default" : "outline"}
              className="flex-1"
            >
              Blind Outreach
              <Badge variant="secondary" className="ml-2">All Businesses</Badge>
            </Button>
            <Button
              onClick={() => setMode("owner")}
              variant={mode === "owner" ? "default" : "outline"}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Owner-Only Targeting
              <Badge variant="secondary" className="ml-2">Sole Proprietors</Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mode Description */}
      {mode === "blind" ? (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">Blind Outreach Mode</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>✓ Sends to all businesses matching criteria</p>
            <p>✓ Higher volume (30 msgs/day)</p>
            <p>✓ Lower response rate (20-30%)</p>
            <p>✓ Good for brand awareness</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-base">Owner-Only Targeting Mode</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>✓ Sends ONLY to identified business owners</p>
            <p>✓ Lower volume (15-20 msgs/day)</p>
            <p>✓ Higher response rate (40-50%)</p>
            <p>✓ Better quality leads, faster conversions</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Messages Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalSent}</div>
            <p className="text-xs text-gray-500 mt-1">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Response Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.responseRate}</div>
            <p className="text-xs text-gray-500 mt-1">{stats.replies} replies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.conversionRate}</div>
            <p className="text-xs text-gray-500 mt-1">{stats.interested} interested</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="metrics" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="video">Demo Video</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Avg Lead Score</p>
                  <p className="text-2xl font-bold mt-2">{stats.avgLeadScore}/100</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Est. Revenue</p>
                  <p className="text-2xl font-bold mt-2">{stats.revenue}</p>
                </div>
              </div>

              {mode === "owner" && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900">
                    ✓ Owner-only mode is {Math.round((82 - 65) / 65 * 100)}% more effective!
                  </p>
                  <p className="text-xs text-green-800 mt-1">
                    Higher quality leads, better response rates, faster conversions
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Leads</CardTitle>
              <CardDescription>
                {mode === "blind" ? "All businesses" : "Sole proprietor businesses"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 border rounded-lg flex items-start justify-between">
                    <div>
                      <p className="font-medium">Business Name {i}</p>
                      <p className="text-sm text-gray-600">
                        {mode === "owner" ? "Owner: Raj Kumar" : "Contact: General"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Telangana • Rating: 4.2★</p>
                    </div>
                    <Badge variant="outline" className="bg-green-50">Interested</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="video" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Solar Benefits Demo Video</CardTitle>
              <CardDescription>Shown in outreach messages to increase conversion</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-2xl">▶</span>
                  </div>
                  <p className="text-white font-medium">Solar Benefits Demo</p>
                  <p className="text-gray-400 text-sm mt-1">3:45 min</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-medium">Video Content:</p>
                <ul className="space-y-1 text-gray-600">
                  <li>✓ How solar reduces electricity bills by 50-70%</li>
                  <li>✓ Government subsidies available (₹15 lakhs)</li>
                  <li>✓ ROI in 3-5 years</li>
                  <li>✓ 25-year warranty on panels</li>
                  <li>✓ Maintenance-free operation</li>
                </ul>
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Watch Demo Video
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Mode Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Metric</th>
                  <th className="text-center py-2 px-2">Blind Mode</th>
                  <th className="text-center py-2 px-2">Owner Mode</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-2">Messages/Day</td>
                  <td className="text-center">30</td>
                  <td className="text-center">15-20</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-2">Response Rate</td>
                  <td className="text-center">20-30%</td>
                  <td className="text-center text-green-600 font-medium">40-50%</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-2">Lead Quality</td>
                  <td className="text-center">Medium</td>
                  <td className="text-center text-green-600 font-medium">High</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-2">Conversion Rate</td>
                  <td className="text-center">30-40%</td>
                  <td className="text-center text-green-600 font-medium">60-70%</td>
                </tr>
                <tr>
                  <td className="py-2 px-2">Best For</td>
                  <td className="text-center">Volume</td>
                  <td className="text-center text-green-600 font-medium">Quality</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
