import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Globe, Zap } from "lucide-react";
import { useState } from "react";

export default function Settings() {
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [autoScore, setAutoScore] = useState(true);
  const [autoFollowUp, setAutoFollowUp] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" /> Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your platform preferences</p>
      </div>

      {/* Profile */}
      <div className="stat-card space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <User className="w-4 h-4 text-primary" /> Profile
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={user?.name || ""} disabled className="bg-background mt-1" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input value={user?.email || ""} disabled className="bg-background mt-1" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Role</Label>
          <Input value={user?.role || "user"} disabled className="bg-background mt-1 w-40" />
        </div>
      </div>

      {/* Notifications */}
      <div className="stat-card space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Notifications
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email Notifications</p>
              <p className="text-xs text-muted-foreground">Receive email alerts for new leads and campaign updates</p>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">SMS Notifications</p>
              <p className="text-xs text-muted-foreground">Get SMS alerts for urgent leads</p>
            </div>
            <Switch checked={smsNotifications} onCheckedChange={setSmsNotifications} />
          </div>
        </div>
      </div>

      {/* Automation */}
      <div className="stat-card space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> Automation
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto Lead Scoring</p>
              <p className="text-xs text-muted-foreground">Automatically score new leads using AI</p>
            </div>
            <Switch checked={autoScore} onCheckedChange={setAutoScore} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto Follow-Up</p>
              <p className="text-xs text-muted-foreground">Automatically send follow-up messages to unresponsive leads</p>
            </div>
            <Switch checked={autoFollowUp} onCheckedChange={setAutoFollowUp} />
          </div>
        </div>
      </div>

      {/* Compliance */}
      <div className="stat-card space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> Compliance
        </h3>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            All outreach activities comply with TCPA, GDPR, and CAN-SPAM regulations.
            Contacts on the Do Not Contact list are automatically excluded from all campaigns.
          </p>
          <div className="flex gap-3">
            <div className="flex-1 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs font-medium text-green-400">TCPA Compliant</p>
            </div>
            <div className="flex-1 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs font-medium text-green-400">GDPR Ready</p>
            </div>
            <div className="flex-1 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs font-medium text-green-400">CAN-SPAM</p>
            </div>
          </div>
        </div>
      </div>

      <Button className="solar-gradient text-black" onClick={() => toast.success("Settings saved")}>
        Save Changes
      </Button>
    </div>
  );
}
