import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Zap, Layers } from "lucide-react";
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { MapView } from "@/components/Map";

const STATUS_COLORS: Record<string, string> = {
  new: "#60a5fa",
  contacted: "#e8a735",
  qualified: "#a78bfa",
  converted: "#4ade80",
  lost: "#ef4444",
};

export default function MapPage() {
  const [, setLocation] = useLocation();
  const leads = trpc.leads.list.useQuery({});
  const [mapReady, setMapReady] = useState(false);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    setMapReady(true);

    // Set default center to India
    map.setCenter({ lat: 20.5937, lng: 78.9629 });
    map.setZoom(5);

    // Add markers for leads with addresses
    if (leads.data) {
      const geocoder = new google.maps.Geocoder();
      const infoWindow = new google.maps.InfoWindow();

      leads.data.forEach((lead: any) => {
        if (lead.city || lead.propertyAddress) {
          const address = [lead.propertyAddress, lead.city, lead.state, lead.zipCode].filter(Boolean).join(", ");
          geocoder.geocode({ address }, (results, status) => {
            if (status === "OK" && results?.[0]) {
              const marker = new google.maps.Marker({
                map,
                position: results[0].geometry.location,
                title: `${lead.firstName} ${lead.lastName}`,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: STATUS_COLORS[lead.status] || "#60a5fa",
                  fillOpacity: 0.9,
                  strokeColor: "#fff",
                  strokeWeight: 2,
                },
              });

              marker.addListener("click", () => {
                infoWindow.setContent(`
                  <div style="color:#000;padding:4px;min-width:180px">
                    <strong>${lead.firstName} ${lead.lastName}</strong><br/>
                    <span style="font-size:12px;color:#666">${lead.email || lead.phone || ""}</span><br/>
                    <span style="font-size:11px;background:${STATUS_COLORS[lead.status]};color:#fff;padding:2px 6px;border-radius:4px;display:inline-block;margin-top:4px">${lead.status}</span>
                    ${lead.leadScore ? `<span style="font-size:11px;margin-left:4px">Score: ${lead.leadScore}</span>` : ""}
                  </div>
                `);
                infoWindow.open(map, marker);
              });
            }
          });
        }
      });
    }
  }, [leads.data]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" /> Territory Map
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visualize lead locations and service coverage areas
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground capitalize">{status}</span>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="stat-card p-0 overflow-hidden" style={{ height: "calc(100vh - 240px)", minHeight: "400px" }}>
        <MapView onMapReady={handleMapReady} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card text-center">
          <Users className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-lg font-bold">{leads.data?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Total Leads</p>
        </div>
        <div className="stat-card text-center">
          <MapPin className="w-5 h-5 text-blue-400 mx-auto mb-2" />
          <p className="text-lg font-bold">{leads.data?.filter((l: any) => l.city).length || 0}</p>
          <p className="text-xs text-muted-foreground">With Location</p>
        </div>
        <div className="stat-card text-center">
          <Layers className="w-5 h-5 text-purple-400 mx-auto mb-2" />
          <p className="text-lg font-bold">{new Set(leads.data?.map((l: any) => l.city).filter(Boolean)).size || 0}</p>
          <p className="text-xs text-muted-foreground">Cities Covered</p>
        </div>
        <div className="stat-card text-center">
          <Zap className="w-5 h-5 text-green-400 mx-auto mb-2" />
          <p className="text-lg font-bold">{new Set(leads.data?.map((l: any) => l.state).filter(Boolean)).size || 0}</p>
          <p className="text-xs text-muted-foreground">States Covered</p>
        </div>
      </div>
    </div>
  );
}
