import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, MapPin, Sun, Zap, Search, Info } from "lucide-react";
import { useState } from "react";

export default function Subsidies() {
  const [search, setSearch] = useState("");
  const { data: subsidies, isLoading } = trpc.subsidies.list.useQuery();

  const filtered = (subsidies || []).filter((s: any) =>
    s.stateName.toLowerCase().includes(search.toLowerCase()) ||
    s.stateCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">State Subsidies</h1>
        <p className="text-muted-foreground mt-1">
          Indian government solar subsidies by state (PM Surya Ghar & state schemes)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={IndianRupee} label="Central 1kW" value="₹30,000" color="text-green-400" bg="bg-green-400/10" />
        <SummaryCard icon={IndianRupee} label="Central 2kW" value="₹60,000" color="text-blue-400" bg="bg-blue-400/10" />
        <SummaryCard icon={IndianRupee} label="Central 3kW" value="₹78,000" color="text-amber-400" bg="bg-amber-400/10" />
        <SummaryCard icon={Sun} label="States Covered" value={String((subsidies || []).length)} color="text-primary" bg="bg-primary/10" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Search state..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-primary">PM Surya Ghar Muft Bijli Yojana</p>
          <p className="text-muted-foreground mt-1">
            Central government provides ₹30,000 for 1kW, ₹60,000 for 2kW, and ₹78,000 for 3kW+ systems.
            Some states provide additional subsidies on top of this. The AI bot uses this data to calculate accurate estimates.
          </p>
        </div>
      </div>

      {/* State Cards */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 bg-secondary animate-pulse rounded-lg" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((sub: any) => (
            <Card key={sub.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{sub.stateName}</h3>
                    <span className="text-xs text-muted-foreground">{sub.stateCode}</span>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <SubsidyRow label="Central (1kW)" value={`₹${Number(sub.centralSubsidy1kw).toLocaleString("en-IN")}`} />
                  <SubsidyRow label="Central (2kW)" value={`₹${Number(sub.centralSubsidy2kw).toLocaleString("en-IN")}`} />
                  <SubsidyRow label="Central (3kW+)" value={`₹${Number(sub.centralSubsidy3kw).toLocaleString("en-IN")}`} />
                  {Number(sub.stateAdditionalPerKw) > 0 && (
                    <SubsidyRow label="State Add./kW" value={`₹${Number(sub.stateAdditionalPerKw).toLocaleString("en-IN")}`} highlight />
                  )}
                  <SubsidyRow label="Avg. Rate" value={`₹${sub.avgElectricityRate}/kWh`} />
                  <SubsidyRow label="Sun Hours" value={`${sub.avgSunHours} hrs/day`} />
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`w-2 h-2 rounded-full ${sub.netMeteringAvailable ? "bg-green-400" : "bg-red-400"}`} />
                    <span className="text-muted-foreground">
                      Net Metering: {sub.netMeteringAvailable ? "Available" : "Not Available"}
                    </span>
                  </div>
                </div>
                {sub.specialNotes && (
                  <p className="text-[10px] text-muted-foreground mt-2 italic">{sub.specialNotes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, bg }: {
  icon: any; label: string; value: string; color: string; bg: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-lg font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function SubsidyRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${highlight ? "text-green-400" : ""}`}>{value}</span>
    </div>
  );
}
