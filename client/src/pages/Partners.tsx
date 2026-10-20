import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Handshake, Users, UserCheck } from "lucide-react";
import PartnerOutreach from "./PartnerOutreach";
import PartnerSignupsAdmin from "./PartnerSignupsAdmin";
import ReferralManagement from "./ReferralManagement";
import { OwnerSalesOperations } from "@/components/PartnerSalesOperations";

export default function Partners() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Partners</h1>
        <p className="text-muted-foreground mt-1">Manage partner outreach, signups, and referral commissions</p>
      </div>
      <Tabs defaultValue="outreach" className="w-full">
        <TabsList className="h-auto flex-wrap gap-1">
          <TabsTrigger value="operations">Installer Operations</TabsTrigger>
          <TabsTrigger value="outreach" className="flex items-center gap-1.5">
            <Handshake className="w-3.5 h-3.5" /> Partner Outreach
          </TabsTrigger>
          <TabsTrigger value="signups" className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Partner Signups
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5" /> Referral Management
          </TabsTrigger>
        </TabsList>
        <TabsContent value="operations" className="mt-4"><OwnerSalesOperations /></TabsContent>
        <TabsContent value="outreach" className="mt-4">
          <PartnerOutreach />
        </TabsContent>
        <TabsContent value="signups" className="mt-4">
          <PartnerSignupsAdmin />
        </TabsContent>
        <TabsContent value="referrals" className="mt-4">
          <ReferralManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
