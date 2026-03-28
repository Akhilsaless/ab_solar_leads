import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search, Building2, MapPin, Phone, Globe, Star,
  UserPlus, Loader2, Factory, Hotel, School, Hospital,
  ShoppingBag, Warehouse, Utensils, Dumbbell, Building,
  Filter, ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";

const BUSINESS_TYPES = [
  { value: "factories", label: "Factories & Manufacturing", icon: Factory },
  { value: "hotels", label: "Hotels & Resorts", icon: Hotel },
  { value: "hospitals", label: "Hospitals & Clinics", icon: Hospital },
  { value: "schools", label: "Schools & Colleges", icon: School },
  { value: "shopping malls", label: "Shopping Malls & Retail", icon: ShoppingBag },
  { value: "warehouses", label: "Warehouses & Cold Storage", icon: Warehouse },
  { value: "restaurants", label: "Restaurants & Food Courts", icon: Utensils },
  { value: "gyms", label: "Gyms & Sports Centers", icon: Dumbbell },
  { value: "offices", label: "Office Buildings & IT Parks", icon: Building },
  { value: "dairy farms", label: "Dairy & Agriculture", icon: Building2 },
  { value: "textile mills", label: "Textile Mills", icon: Factory },
  { value: "cold storage", label: "Cold Storage Facilities", icon: Warehouse },
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal",
];

export default function BusinessScraper() {
  const [businessType, setBusinessType] = useState("");
  const [location, setLocation] = useState("");
  const [state, setState] = useState("");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const searchMutation = trpc.scraper.search.useMutation({
    onSuccess: (data) => {
      toast.success(`Found ${data.total} businesses!`);
      resultsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const resultsQuery = trpc.scraper.results.useQuery({
    businessType: businessType || undefined,
    businessSize: sizeFilter !== "all" ? sizeFilter : undefined,
    state: state || undefined,
  });

  const importMutation = trpc.scraper.importAsLead.useMutation({
    onSuccess: () => {
      toast.success("Business imported as lead!");
      resultsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const jobsQuery = trpc.scraper.jobs.useQuery();

  const handleSearch = () => {
    if (!businessType) return toast.error("Select a business type");
    if (!location) return toast.error("Enter a location");
    searchMutation.mutate({ businessType, location, state });
  };

  const businesses = resultsQuery.data || [];
  const filteredBusinesses = useMemo(() => {
    if (sizeFilter === "all") return businesses;
    return businesses.filter((b: any) => b.businessSize === sizeFilter);
  }, [businesses, sizeFilter]);

  const stats = useMemo(() => ({
    total: businesses.length,
    small: businesses.filter((b: any) => b.businessSize === "small").length,
    medium: businesses.filter((b: any) => b.businessSize === "medium").length,
    large: businesses.filter((b: any) => b.businessSize === "large").length,
    imported: businesses.filter((b: any) => b.isImported).length,
  }), [businesses]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20">
            <Search className="w-6 h-6 text-orange-400" />
          </div>
          Business Scraper
        </h1>
        <p className="text-muted-foreground mt-1">Find businesses from Google Maps and import them as leads</p>
      </div>

      {/* Search Section */}
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg">Search Businesses</CardTitle>
          <CardDescription>Select business type and location to find potential solar customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Business Type Grid */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Business Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {BUSINESS_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = businessType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => setBusinessType(type.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-xs font-medium ${
                      isSelected
                        ? "border-orange-500 bg-orange-500/10 text-orange-400 shadow-lg shadow-orange-500/10"
                        : "border-border/50 bg-background/50 text-muted-foreground hover:border-orange-500/30 hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-center leading-tight">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location & State */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <Label className="text-sm font-medium">City / Area</Label>
              <Input
                placeholder="e.g., Mumbai, Pune, Jaipur"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1.5 bg-background/50"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger className="mt-1.5 bg-background/50">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                disabled={searchMutation.isPending}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold"
              >
                {searchMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Scraping...</>
                ) : (
                  <><Search className="w-4 h-4 mr-2" /> Search Businesses</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Bar */}
      {businesses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total Found", value: stats.total, color: "text-blue-400" },
            { label: "Small", value: stats.small, color: "text-green-400" },
            { label: "Medium", value: stats.medium, color: "text-yellow-400" },
            { label: "Large", value: stats.large, color: "text-red-400" },
            { label: "Imported", value: stats.imported, color: "text-orange-400" },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/30 bg-card/60">
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      {businesses.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Filters
            {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
          {showFilters && (
            <>
              {["all", "small", "medium", "large"].map((size) => (
                <Button
                  key={size}
                  variant={sizeFilter === size ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSizeFilter(size)}
                  className={sizeFilter === size ? "bg-orange-500 hover:bg-orange-600" : ""}
                >
                  {size === "all" ? "All Sizes" : size.charAt(0).toUpperCase() + size.slice(1)}
                </Button>
              ))}
            </>
          )}
          <span className="text-sm text-muted-foreground ml-auto">
            Showing {filteredBusinesses.length} of {businesses.length}
          </span>
        </div>
      )}

      {/* Results Grid */}
      {filteredBusinesses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBusinesses.map((biz: any) => (
            <Card
              key={biz.id}
              className={`border-border/30 bg-card/80 backdrop-blur hover:border-orange-500/30 transition-all ${
                biz.isImported ? "opacity-60" : ""
              }`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground truncate">{biz.businessName}</h3>
                    <p className="text-xs text-muted-foreground truncate">{biz.businessType}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs ${
                      biz.businessSize === "large"
                        ? "border-red-500/30 text-red-400 bg-red-500/10"
                        : biz.businessSize === "medium"
                        ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"
                        : "border-green-500/30 text-green-400 bg-green-500/10"
                    }`}
                  >
                    {biz.businessSize}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-sm">
                  {biz.address && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span className="line-clamp-2 text-xs">{biz.address}</span>
                    </div>
                  )}
                  {biz.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs">{biz.phone}</span>
                    </div>
                  )}
                  {biz.website && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <a href={biz.website} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-orange-400 hover:underline truncate">
                        {biz.website.replace(/^https?:\/\//, "").slice(0, 30)}
                        <ExternalLink className="w-3 h-3 inline ml-1" />
                      </a>
                    </div>
                  )}
                </div>

                {biz.rating && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-medium">{biz.rating}</span>
                    <span className="text-xs text-muted-foreground">({biz.reviewCount} reviews)</span>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  {biz.isImported ? (
                    <Badge variant="outline" className="text-green-400 border-green-500/30 bg-green-500/10">
                      Imported as Lead
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => importMutation.mutate({ businessId: biz.id })}
                      disabled={importMutation.isPending}
                      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1" />
                      Import as Lead
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : businesses.length === 0 && !resultsQuery.isLoading ? (
        <Card className="border-border/30 bg-card/60">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Businesses Found Yet</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Select a business type and location above, then click "Search Businesses" to find potential solar customers from Google Maps.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Recent Scrape Jobs */}
      {(jobsQuery.data?.length || 0) > 0 && (
        <Card className="border-border/30 bg-card/60">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Scrape Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(jobsQuery.data || []).slice(0, 5).map((job: any) => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 text-sm">
                  <div>
                    <span className="text-foreground font-medium">{job.query}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{job.totalFound} found</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        job.status === "completed"
                          ? "text-green-400 border-green-500/30"
                          : job.status === "failed"
                          ? "text-red-400 border-red-500/30"
                          : "text-yellow-400 border-yellow-500/30"
                      }`}
                    >
                      {job.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
