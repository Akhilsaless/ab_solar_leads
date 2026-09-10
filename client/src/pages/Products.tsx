import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Plus, Trash2, Sun, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Products() {
  const { data: panels, isLoading: panelsLoading } = trpc.panels.list.useQuery();
  const { data: inverters, isLoading: invertersLoading } = trpc.inverters.list.useQuery();
  const utils = trpc.useUtils();

  const deletePanel = trpc.panels.delete.useMutation({
    onSuccess: () => { utils.panels.list.invalidate(); toast.success("Panel deleted"); },
  });
  const deleteInverter = trpc.inverters.delete.useMutation({
    onSuccess: () => { utils.inverters.list.invalidate(); toast.success("Inverter deleted"); },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Product Catalog</h1>
        <p className="text-muted-foreground mt-1">Manage panels and inverters your AI bot recommends to customers</p>
      </div>

      <Tabs defaultValue="panels">
        <TabsList className="bg-secondary">
          <TabsTrigger value="panels" className="gap-2"><Sun className="w-3.5 h-3.5" /> Solar Panels</TabsTrigger>
          <TabsTrigger value="inverters" className="gap-2"><Zap className="w-3.5 h-3.5" /> Inverters</TabsTrigger>
        </TabsList>

        <TabsContent value="panels" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{(panels || []).length} panels configured</p>
            <AddPanelDialog onSuccess={() => utils.panels.list.invalidate()} />
          </div>
          {panelsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-48 bg-secondary animate-pulse rounded-lg" />)}
            </div>
          ) : (panels || []).length === 0 ? (
            <EmptyState type="panels" />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(panels || []).map((panel: any) => (
                <Card key={panel.id} className="relative group">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <Sun className="w-5 h-5 text-amber-400" />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deletePanel.mutate({ id: panel.id })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <h3 className="font-semibold">{panel.brand}</h3>
                    <p className="text-sm text-muted-foreground">{panel.model}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <InfoBox label="Wattage" value={`${panel.wattage}W`} />
                      <InfoBox label="Price" value={`₹${Number(panel.pricePerPanel).toLocaleString("en-IN")}`} />
                      <InfoBox label="Type" value={panel.panelType || "Mono"} />
                      <InfoBox label="Warranty" value={`${panel.warranty || 25} yrs`} />
                    </div>
                    <p className={`mt-3 text-xs ${panel.isPriceActive ? "text-emerald-400" : "text-amber-400"}`}>{panel.isPriceActive ? `Verified price · ${panel.pricingVersion || "versioned"}` : "Draft price — withheld from public monetary estimates"}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inverters" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{(inverters || []).length} inverters configured</p>
            <AddInverterDialog onSuccess={() => utils.inverters.list.invalidate()} />
          </div>
          {invertersLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-48 bg-secondary animate-pulse rounded-lg" />)}
            </div>
          ) : (inverters || []).length === 0 ? (
            <EmptyState type="inverters" />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(inverters || []).map((inv: any) => (
                <Card key={inv.id} className="relative group">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-blue-400" />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteInverter.mutate({ id: inv.id })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <h3 className="font-semibold">{inv.brand}</h3>
                    <p className="text-sm text-muted-foreground">{inv.model}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <InfoBox label="Capacity" value={`${inv.capacityKw} kW`} />
                      <InfoBox label="Price" value={`₹${Number(inv.price).toLocaleString("en-IN")}`} />
                      <InfoBox label="Type" value={inv.inverterType || "String"} />
                      <InfoBox label="Warranty" value={`${inv.warranty || 10} yrs`} />
                    </div>
                    <p className={`mt-3 text-xs ${inv.isPriceActive ? "text-emerald-400" : "text-amber-400"}`}>{inv.isPriceActive ? `Verified price · ${inv.pricingVersion || "versioned"}` : "Draft price — withheld from public monetary estimates"}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary rounded-lg px-2.5 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <p className="font-semibold capitalize">{value}</p>
    </div>
  );
}

function EmptyState({ type }: { type: "panels" | "inverters" }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      {type === "panels" ? <Sun className="w-12 h-12 mx-auto mb-3 opacity-20" /> : <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />}
      <p className="text-lg font-medium">No {type} added yet</p>
      <p className="text-sm mt-1">Add your {type} so the AI bot can recommend them to customers</p>
    </div>
  );
}

function AddPanelDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ brand: "", model: "", wattage: "", pricePerPanel: "", efficiency: "", panelType: "monocrystalline", warranty: "25", pricingVersion: "draft", effectiveFrom: "", verifiedOn: "", sourceNote: "", isPriceActive: false });

  const addPanel = trpc.panels.create.useMutation({
    onSuccess: () => { onSuccess(); setOpen(false); toast.success("Panel added"); setForm({ brand: "", model: "", wattage: "", pricePerPanel: "", efficiency: "", panelType: "monocrystalline", warranty: "25", pricingVersion: "draft", effectiveFrom: "", verifiedOn: "", sourceNote: "", isPriceActive: false }); },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 solar-gradient text-black"><Plus className="w-3.5 h-3.5" /> Add Panel</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Solar Panel</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Brand *" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} placeholder="Tata, Adani, Waaree..." />
            <FormField label="Model *" value={form.model} onChange={(v) => setForm({ ...form, model: v })} placeholder="Model name" />
            <FormField label="Wattage (W) *" value={form.wattage} onChange={(v) => setForm({ ...form, wattage: v })} placeholder="540" type="number" />
            <FormField label="Price/Panel (₹) *" value={form.pricePerPanel} onChange={(v) => setForm({ ...form, pricePerPanel: v })} placeholder="15000" type="number" />
            <FormField label="Efficiency (%)" value={form.efficiency} onChange={(v) => setForm({ ...form, efficiency: v })} placeholder="21.5" type="number" />
            <FormField label="Warranty (years)" value={form.warranty} onChange={(v) => setForm({ ...form, warranty: v })} placeholder="25" type="number" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Panel Type</label>
            <select className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm" value={form.panelType} onChange={(e) => setForm({ ...form, panelType: e.target.value })}>
              <option value="monocrystalline">Monocrystalline</option>
              <option value="polycrystalline">Polycrystalline</option>
              <option value="bifacial">Bifacial</option>
              <option value="thin_film">Thin Film</option>
            </select>
          </div>
          <div className="rounded-lg border border-border p-3 space-y-3"><p className="text-xs font-medium">Price verification</p><div className="grid grid-cols-2 gap-3"><FormField label="Pricing version" value={form.pricingVersion} onChange={(v) => setForm({ ...form, pricingVersion: v })} placeholder="2026-q4" /><FormField label="Effective from" value={form.effectiveFrom} onChange={(v) => setForm({ ...form, effectiveFrom: v })} placeholder="" type="date" /><FormField label="Verified on" value={form.verifiedOn} onChange={(v) => setForm({ ...form, verifiedOn: v })} placeholder="" type="date" /></div><FormField label="Source / owner approval" value={form.sourceNote} onChange={(v) => setForm({ ...form, sourceNote: v })} placeholder="Vendor sheet or approved quote" /><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.isPriceActive} onChange={(e) => setForm({ ...form, isPriceActive: e.target.checked })} /> Mark this price verified and active</label></div>
          <Button className="w-full solar-gradient text-black" disabled={!form.brand || !form.model || !form.wattage || !form.pricePerPanel || addPanel.isPending} onClick={() => addPanel.mutate({ brand: form.brand, model: form.model, wattage: Number(form.wattage), pricePerPanel: form.pricePerPanel, efficiency: form.efficiency || undefined, panelType: form.panelType, warranty: Number(form.warranty) || 25, pricingVersion: form.pricingVersion, effectiveFrom: form.effectiveFrom || undefined, sourceNote: form.sourceNote || undefined, lastVerifiedAt: form.verifiedOn ? new Date(`${form.verifiedOn}T00:00:00.000Z`).toISOString() : undefined, isPriceActive: form.isPriceActive })}>
            {addPanel.isPending ? "Adding..." : "Add Panel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddInverterDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ brand: "", model: "", capacityKw: "", price: "", inverterType: "string", warranty: "10", pricingVersion: "draft", effectiveFrom: "", verifiedOn: "", sourceNote: "", isPriceActive: false });

  const addInverter = trpc.inverters.create.useMutation({
    onSuccess: () => { onSuccess(); setOpen(false); toast.success("Inverter added"); setForm({ brand: "", model: "", capacityKw: "", price: "", inverterType: "string", warranty: "10", pricingVersion: "draft", effectiveFrom: "", verifiedOn: "", sourceNote: "", isPriceActive: false }); },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 solar-gradient text-black"><Plus className="w-3.5 h-3.5" /> Add Inverter</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Inverter</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Brand *" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} placeholder="Growatt, Fronius..." />
            <FormField label="Model *" value={form.model} onChange={(v) => setForm({ ...form, model: v })} placeholder="Model name" />
            <FormField label="Capacity (kW) *" value={form.capacityKw} onChange={(v) => setForm({ ...form, capacityKw: v })} placeholder="5" type="number" />
            <FormField label="Price (₹) *" value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="45000" type="number" />
            <FormField label="Warranty (years)" value={form.warranty} onChange={(v) => setForm({ ...form, warranty: v })} placeholder="10" type="number" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Inverter Type</label>
            <select className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm" value={form.inverterType} onChange={(e) => setForm({ ...form, inverterType: e.target.value })}>
              <option value="string">String Inverter</option>
              <option value="micro">Micro Inverter</option>
              <option value="hybrid">Hybrid Inverter</option>
              <option value="off_grid">Off-Grid Inverter</option>
            </select>
          </div>
          <div className="rounded-lg border border-border p-3 space-y-3"><p className="text-xs font-medium">Price verification</p><div className="grid grid-cols-2 gap-3"><FormField label="Pricing version" value={form.pricingVersion} onChange={(v) => setForm({ ...form, pricingVersion: v })} placeholder="2026-q4" /><FormField label="Effective from" value={form.effectiveFrom} onChange={(v) => setForm({ ...form, effectiveFrom: v })} placeholder="" type="date" /><FormField label="Verified on" value={form.verifiedOn} onChange={(v) => setForm({ ...form, verifiedOn: v })} placeholder="" type="date" /></div><FormField label="Source / owner approval" value={form.sourceNote} onChange={(v) => setForm({ ...form, sourceNote: v })} placeholder="Vendor sheet or approved quote" /><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.isPriceActive} onChange={(e) => setForm({ ...form, isPriceActive: e.target.checked })} /> Mark this price verified and active</label></div>
          <Button className="w-full solar-gradient text-black" disabled={!form.brand || !form.model || !form.capacityKw || !form.price || addInverter.isPending} onClick={() => addInverter.mutate({ brand: form.brand, model: form.model, capacityKw: form.capacityKw, price: form.price, inverterType: form.inverterType, warranty: Number(form.warranty) || 10, pricingVersion: form.pricingVersion, effectiveFrom: form.effectiveFrom || undefined, sourceNote: form.sourceNote || undefined, lastVerifiedAt: form.verifiedOn ? new Date(`${form.verifiedOn}T00:00:00.000Z`).toISOString() : undefined, isPriceActive: form.isPriceActive })}>
            {addInverter.isPending ? "Adding..." : "Add Inverter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <input type={type} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
