import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapView as Map } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { MapPin, Zap } from "lucide-react";

export default function LeadMapView() {
  const [selectedStatus, setSelectedStatus] = useState("");

  const leadsQuery = trpc.leads.list.useQuery({
    status: selectedStatus || undefined,
    limit: 1000,
  });

  const leads = leadsQuery.data || [];

  const handleMapReady = (mapInstance: any) => {
    // Add markers for each lead with valid coordinates
    leads.forEach((lead: any) => {
      if (lead.latitude && lead.longitude) {
        try {
          const position = {
            lat: parseFloat(lead.latitude),
            lng: parseFloat(lead.longitude),
          };

          // Create marker
          new window.google.maps.Marker({
            position,
            map: mapInstance,
            title: `${lead.firstName} ${lead.lastName}`,
          });

          // Create info window
          const infoWindow = new window.google.maps.InfoWindow({
            content: `<div style="padding: 8px; font-family: Arial, sans-serif;"><p style="margin: 0; font-weight: bold;">${lead.firstName} ${lead.lastName}</p><p style="margin: 4px 0; font-size: 12px;">${lead.email}</p><p style="margin: 4px 0; font-size: 12px;">Status: <strong>${lead.status}</strong></p></div>`,
          });

          // Add click listener to marker
          const marker = new window.google.maps.Marker({
            position,
            map: mapInstance,
            title: `${lead.firstName} ${lead.lastName}`,
          });

          marker.addListener("click", () => {
            infoWindow.open(mapInstance, marker);
          });
        } catch (error) {
          console.error("Error adding marker:", error);
        }
      }
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Service Coverage & Lead Map</h1>
          <p className="text-muted-foreground mt-2">View your service areas and lead locations</p>
        </div>

        <Card className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Lead Locations ({leads.length})
            </h2>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted rounded-lg overflow-hidden h-96 md:h-[600px]">
            <Map
              initialCenter={{ lat: 37.7749, lng: -122.4194 }}
              initialZoom={12}
              onMapReady={handleMapReady}
              className="w-full h-full"
            />
          </div>

          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <Zap className="w-4 h-4 inline mr-2" />
              Showing {leads.length} leads on the map. Click on markers to view lead details.
            </p>
          </div>
        </Card>

        {/* Legend */}
        <Card className="card-elevated p-6">
          <h3 className="font-bold mb-4">Status Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { status: "New", color: "bg-blue-100 text-blue-700" },
              { status: "Contacted", color: "bg-yellow-100 text-yellow-700" },
              { status: "Qualified", color: "bg-purple-100 text-purple-700" },
              { status: "Converted", color: "bg-green-100 text-green-700" },
              { status: "Rejected", color: "bg-red-100 text-red-700" },
            ].map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${item.color}`}></div>
                <span className="text-sm">{item.status}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
