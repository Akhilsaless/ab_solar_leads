import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Globe, Search, MapPin, Building2, Zap, Users, CheckCircle,
  Loader2, Database, ArrowRight
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Scraper() {
  const [, setLocation] = useLocation();
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [propertyType, setPropertyType] = useState("residential");
  const [minBill, setMinBill] = useState("");
  const [scraping, setScraping] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [imported, setImported] = useState(false);

  const scrapeLeads = trpc.scraping.start.useMutation({
    onSuccess: (data: any) => {
      setResults(data.leads || []);
      setScraping(false);
      if (data.leads?.length > 0) {
        toast.success(`Found ${data.leads.length} potential leads`);
      } else {
        toast.info("No leads found for this criteria. Try different parameters.");
      }
    },
    onError: (err: any) => {
      setScraping(false);
      toast.error(err.message);
    },
  });

  const bulkImport = trpc.leads.bulkImport.useMutation({
    onSuccess: (data) => {
      setImported(true);
      toast.success(`${data.count} leads imported successfully`);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleScrape = () => {
    if (!city.trim()) {
      toast.error("City is required");
      return;
    }
    setScraping(true);
    setResults([]);
    setImported(false);
    scrapeLeads.mutate({ source: "property_database", query: `${propertyType} properties in ${city}${state ? `, ${state}` : ""}${minBill ? ` with min bill ₹${minBill}` : ""}` });
  };

  const handleImportAll = () => {
    if (results.length === 0) return;
    bulkImport.mutate({
      leads: results.map(r => ({
        firstName: r.firstName || r.name?.split(" ")[0] || "Unknown",
        lastName: r.lastName || r.name?.split(" ").slice(1).join(" ") || "-",
        email: r.email,
        phone: r.phone,
        propertyAddress: r.address,
        city: r.city || city,
        state: r.state || state,
        monthlyEnergyBill: r.estimatedBill?.toString(),
        source: "web_scrape",
      })),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" /> Data Scraper
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Find potential solar leads from public property databases and real estate sources
        </p>
      </div>

      {/* Search Form */}
      <div className="stat-card space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" /> Search Criteria
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs">City *</Label>
            <Input value={city} onChange={e => setCity(e.target.value)} className="bg-background mt-1" placeholder="e.g., Mumbai" />
          </div>
          <div>
            <Label className="text-xs">State</Label>
            <Input value={state} onChange={e => setState(e.target.value)} className="bg-background mt-1" placeholder="e.g., Maharashtra" />
          </div>
          <div>
            <Label className="text-xs">Property Type</Label>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger className="bg-background mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="industrial">Industrial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Min Monthly Bill (₹)</Label>
            <Input type="number" value={minBill} onChange={e => setMinBill(e.target.value)} className="bg-background mt-1" placeholder="e.g., 3000" />
          </div>
        </div>
        <Button className="solar-gradient text-black" onClick={handleScrape} disabled={scraping}>
          {scraping ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching...</>
          ) : (
            <><Search className="w-4 h-4 mr-2" /> Find Leads</>
          )}
        </Button>
      </div>

      {/* Scraping Animation */}
      {scraping && (
        <div className="stat-card text-center py-12">
          <div className="relative mx-auto w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-primary/40 animate-ping" style={{ animationDelay: "0.5s" }} />
            <div className="absolute inset-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary animate-spin" style={{ animationDuration: "3s" }} />
            </div>
          </div>
          <p className="font-medium">Searching public databases...</p>
          <p className="text-sm text-muted-foreground mt-1">Analyzing property records in {city}{state ? `, ${state}` : ""}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !imported && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              Found {results.length} Potential Leads
            </h3>
            <Button size="sm" className="solar-gradient text-black" onClick={handleImportAll} disabled={bulkImport.isPending}>
              {bulkImport.isPending ? "Importing..." : `Import All ${results.length} Leads`}
            </Button>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full">
                <thead className="sticky top-0">
                  <tr className="bg-card border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Contact</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Address</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Est. Bill</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Potential</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-b border-border/50 table-row">
                      <td className="px-3 py-2 text-sm font-medium">{r.name || `${r.firstName} ${r.lastName}`}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{r.email || r.phone || "-"}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{r.address || "-"}</td>
                      <td className="px-3 py-2 text-sm">₹{r.estimatedBill?.toLocaleString() || "-"}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full solar-gradient rounded-full" style={{ width: `${r.solarPotential || 70}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{r.solarPotential || 70}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Import Success */}
      {imported && (
        <div className="stat-card text-center py-10">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold">Leads Imported!</h3>
          <p className="text-sm text-muted-foreground mt-2">{results.length} leads from web scraping have been added to your pipeline.</p>
          <div className="flex justify-center gap-3 mt-6">
            <Button variant="outline" onClick={() => { setResults([]); setImported(false); }}>
              Search Again
            </Button>
            <Button className="solar-gradient text-black" onClick={() => setLocation("/leads")}>
              View Leads <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: MapPin, title: "Property Records", desc: "Search public property databases for homeowners with high energy consumption." },
          { icon: Building2, title: "Business Listings", desc: "Find commercial properties with large rooftop areas ideal for solar." },
          { icon: Zap, title: "AI Analysis", desc: "Our AI analyzes properties for solar potential based on location, size, and energy data." },
        ].map(card => (
          <div key={card.title} className="stat-card">
            <card.icon className="w-5 h-5 text-primary mb-3" />
            <h4 className="font-medium text-sm">{card.title}</h4>
            <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
