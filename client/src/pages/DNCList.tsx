import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Plus, Trash2, Search, Phone, Mail } from "lucide-react";
import { useState } from "react";

export default function DNCList() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [search, setSearch] = useState("");
  const dncList = trpc.dnc.list.useQuery();
  const removeDnc = trpc.dnc.remove.useMutation({
    onSuccess: () => { dncList.refetch(); toast.success("Removed from DNC list"); },
  });

  const filtered = dncList.data?.filter((item: any) =>
    !search || item.contact?.toLowerCase().includes(search.toLowerCase()) ||
    item.reason?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> Do Not Contact
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage contacts that should not receive outreach messages
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="solar-gradient text-black">
              <Plus className="w-4 h-4 mr-1" /> Add to DNC
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add to Do Not Contact List</DialogTitle></DialogHeader>
            <AddDNCForm onSuccess={() => { setShowAddDialog(false); dncList.refetch(); }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search DNC list..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-card"
        />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-card/50">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Contact</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Type</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Reason</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Added</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">DNC list is empty</p>
                  <p className="text-sm mt-1">Contacts added here will be excluded from all outreach.</p>
                </td>
              </tr>
            ) : (
              filtered.map((item: any) => (
                <tr key={item.id} className="border-b border-border/50 table-row">
                  <td className="px-4 py-3 text-sm font-medium">{item.contact}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {item.contactType === "email" ? <Mail className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                      {item.contactType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{item.reason || "-"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" className="text-destructive h-7" onClick={() => {
                      if (confirm("Remove from DNC list?")) removeDnc.mutate({ id: item.id });
                    }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddDNCForm({ onSuccess }: { onSuccess: () => void }) {
  const [contact, setContact] = useState("");
  const [contactType, setContactType] = useState("email");
  const [reason, setReason] = useState("");

  const addDnc = trpc.dnc.add.useMutation({
    onSuccess: () => { toast.success("Added to DNC list"); onSuccess(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Contact (Email or Phone) *</Label>
        <Input value={contact} onChange={e => setContact(e.target.value)} className="bg-card mt-1" placeholder="e.g., user@example.com or +919876543210" />
      </div>
      <div>
        <Label className="text-xs">Reason</Label>
        <Input value={reason} onChange={e => setReason(e.target.value)} className="bg-card mt-1" placeholder="e.g., Requested removal" />
      </div>
      <Button className="w-full solar-gradient text-black" onClick={() => {
        if (!contact.trim()) { toast.error("Contact is required"); return; }
        const isEmail = contact.includes("@");
        addDnc.mutate({
          email: isEmail ? contact : undefined,
          phone: !isEmail ? contact : undefined,
          reason: reason || undefined,
        });
      }} disabled={addDnc.isPending}>
        {addDnc.isPending ? "Adding..." : "Add to DNC List"}
      </Button>
    </div>
  );
}
