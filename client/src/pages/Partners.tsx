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
      <Tabs defaultValue="operations" className="w-full min-w-0">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:flex sm:flex-wrap">
          <TabsTrigger value="operations" className="min-h-11 whitespace-normal text-xs sm:text-sm">Installer Operations</TabsTrigger>
          <TabsTrigger value="outreach" className="flex min-h-11 items-center gap-1.5 whitespace-normal text-xs sm:text-sm">
            <Handshake className="w-3.5 h-3.5" /> Partner Outreach
          </TabsTrigger>
          <TabsTrigger value="signups" className="flex min-h-11 items-center gap-1.5 whitespace-normal text-xs sm:text-sm">
            <Users className="w-3.5 h-3.5" /> Partner Signups
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex min-h-11 items-center gap-1.5 whitespace-normal text-xs sm:text-sm">
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
