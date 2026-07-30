import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Download, Share2, TrendingUp } from "lucide-react";

export function SolarBenefitsVideo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Solar Benefits Demo</h1>
          <p className="text-gray-600">Learn why solar is the best investment for your business</p>
        </div>

        {/* Video Player */}
        <Card className="overflow-hidden">
          <div className="aspect-video bg-gray-900 relative group cursor-pointer">
            {/* Video Thumbnail */}
            <div className="w-full h-full bg-gradient-to-br from-green-600 to-blue-600 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition">
                  <Play className="w-10 h-10 text-green-600 ml-1" />
                </div>
                <p className="text-white text-xl font-semibold">Solar Benefits Demo</p>
                <p className="text-green-100 text-sm mt-2">3:45 minutes</p>
              </div>
            </div>
          </div>

          <CardContent className="pt-4 space-y-4">
            <div className="flex gap-2">
              <Button className="flex-1 bg-green-600 hover:bg-green-700">
                <Play className="w-4 h-4 mr-2" />
                Watch Video
              </Button>
              <Button variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" className="flex-1">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Video Content Overview */}
        <Card>
          <CardHeader>
            <CardTitle>What's Covered in This Video</CardTitle>
            <CardDescription>Key benefits and advantages of solar energy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Benefit 1 */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Reduce Electricity Bills</h3>
                    <p className="text-sm text-gray-600 mt-1">Cut your monthly electricity costs by 50-70%</p>
                    <p className="text-xs text-green-600 font-medium mt-2">Save ₹3-9 lakhs/month</p>
                  </div>
                </div>
              </div>

              {/* Benefit 2 */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Government Subsidies</h3>
                    <p className="text-sm text-gray-600 mt-1">Get up to ₹15 lakhs subsidy from government</p>
                    <p className="text-xs text-blue-600 font-medium mt-2">Reduce your investment cost</p>
                  </div>
                </div>
              </div>

              {/* Benefit 3 */}
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Fast ROI</h3>
                    <p className="text-sm text-gray-600 mt-1">Recover your investment in 3-5 years</p>
                    <p className="text-xs text-purple-600 font-medium mt-2">Then earn for free for 20+ years</p>
                  </div>
                </div>
              </div>

              {/* Benefit 4 */}
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center text-white font-bold">4</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Long Warranty</h3>
                    <p className="text-sm text-gray-600 mt-1">25-year warranty on solar panels</p>
                    <p className="text-xs text-yellow-600 font-medium mt-2">Minimal maintenance required</p>
                  </div>
                </div>
              </div>

              {/* Benefit 5 */}
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold">5</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Eco-Friendly</h3>
                    <p className="text-sm text-gray-600 mt-1">Reduce carbon footprint, help environment</p>
                    <p className="text-xs text-orange-600 font-medium mt-2">Sustainable energy solution</p>
                  </div>
                </div>
              </div>

              {/* Benefit 6 */}
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">6</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Increase Property Value</h3>
                    <p className="text-sm text-gray-600 mt-1">Solar installation increases property value</p>
                    <p className="text-xs text-red-600 font-medium mt-2">Better resale potential</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real Numbers */}
        <Card>
          <CardHeader>
            <CardTitle>Real Numbers from Our Customers</CardTitle>
            <CardDescription>Actual results from textile mills and factories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <p className="text-4xl font-bold text-green-600">₹5L</p>
                <p className="text-sm text-gray-600 mt-2">Average monthly savings</p>
                <p className="text-xs text-gray-500 mt-1">Textile mills (200kW systems)</p>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <p className="text-4xl font-bold text-blue-600">₹15L</p>
                <p className="text-sm text-gray-600 mt-2">Average subsidy received</p>
                <p className="text-xs text-gray-500 mt-1">Government support available</p>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <p className="text-4xl font-bold text-purple-600">4 yrs</p>
                <p className="text-sm text-gray-600 mt-2">Average payback period</p>
                <p className="text-xs text-gray-500 mt-1">Then 21 years of free power</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-green-600 to-blue-600 border-0">
          <CardContent className="pt-8 text-center space-y-4">
            <h2 className="text-2xl font-bold text-white">Ready to Go Solar?</h2>
            <p className="text-green-50">Get a free solar potential report for your business</p>
            <Button size="lg" className="bg-white text-green-600 hover:bg-gray-100">
              <TrendingUp className="w-4 h-4 mr-2" />
              Get Free Solar Report
            </Button>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">How long does installation take?</h3>
              <p className="text-sm text-gray-600 mt-1">Typically 2-4 weeks depending on system size</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">What if there's no sun?</h3>
              <p className="text-sm text-gray-600 mt-1">Solar works even on cloudy days. You can add battery backup for night usage.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Do I need to replace batteries?</h3>
              <p className="text-sm text-gray-600 mt-1">Modern systems require minimal maintenance. Panels last 25+ years.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Can I sell excess power?</h3>
              <p className="text-sm text-gray-600 mt-1">Yes! Net metering allows you to sell excess power back to the grid.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
