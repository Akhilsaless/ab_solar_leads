import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Building2 } from "lucide-react";
import BusinessScraper from "./BusinessScraper";
import ScrapedContacts from "./ScrapedContacts";

export default function FindLeads() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Find Leads</h1>
        <p className="text-muted-foreground mt-1">Scrape new businesses or manage your existing scraped contacts</p>
      </div>
      <Tabs defaultValue="scraper" className="w-full">
        <TabsList className="h-auto">
          <TabsTrigger value="scraper" className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" /> Business Scraper
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Scraped Contacts
          </TabsTrigger>
        </TabsList>
        <TabsContent value="scraper" className="mt-4">
          <BusinessScraper />
        </TabsContent>
        <TabsContent value="contacts" className="mt-4">
          <ScrapedContacts />
        </TabsContent>
      </Tabs>
    </div>
  );
}
