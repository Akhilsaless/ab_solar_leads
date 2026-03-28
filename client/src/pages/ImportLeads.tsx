import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle, AlertCircle, ArrowLeft, X, Download } from "lucide-react";
import { useState, useCallback } from "react";
import { useLocation } from "wouter";

type ParsedLead = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company?: string;
  propertyAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  monthlyEnergyBill?: string;
  source?: string;
};

export default function ImportLeads() {
  const [, setLocation] = useLocation();
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  const bulkImport = trpc.leads.bulkImport.useMutation({
    onSuccess: (data) => {
      setImported(true);
      toast.success(`${data.count} leads imported successfully`);
    },
    onError: (err) => toast.error(err.message),
  });

  const parseCSV = useCallback((text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      setErrors(["File must have a header row and at least one data row"]);
      return;
    }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
    const fieldMap: Record<string, string> = {
      "first name": "firstName", "firstname": "firstName", "first_name": "firstName", "name": "firstName",
      "last name": "lastName", "lastname": "lastName", "last_name": "lastName", "surname": "lastName",
      "email": "email", "email address": "email", "e-mail": "email",
      "phone": "phone", "phone number": "phone", "telephone": "phone", "mobile": "phone",
      "whatsapp": "whatsapp", "whatsapp number": "whatsapp",
      "company": "company", "company name": "company", "organization": "company",
      "address": "propertyAddress", "property address": "propertyAddress", "street": "propertyAddress",
      "city": "city", "town": "city",
      "state": "state", "province": "state",
      "zip": "zipCode", "zip code": "zipCode", "zipcode": "zipCode", "postal code": "zipCode",
      "monthly bill": "monthlyEnergyBill", "energy bill": "monthlyEnergyBill", "monthly energy bill": "monthlyEnergyBill", "bill": "monthlyEnergyBill",
    };

    const mappedHeaders = headers.map(h => fieldMap[h] || h);
    const parseErrors: string[] = [];
    const leads: ParsedLead[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const lead: any = { source: "csv_import" };
      mappedHeaders.forEach((header, idx) => {
        if (idx < values.length && values[idx].trim()) {
          lead[header] = values[idx].trim().replace(/^['"]|['"]$/g, "");
        }
      });

      // Handle "name" field that might contain full name
      if (lead.firstName && !lead.lastName && lead.firstName.includes(" ")) {
        const parts = lead.firstName.split(" ");
        lead.firstName = parts[0];
        lead.lastName = parts.slice(1).join(" ");
      }

      if (!lead.firstName) {
        parseErrors.push(`Row ${i + 1}: Missing first name`);
        continue;
      }
      if (!lead.lastName) {
        lead.lastName = "-";
      }

      leads.push(lead);
    }

    setParsedLeads(leads);
    setErrors(parseErrors);
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImported(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  }, [parseCSV]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    setFileName(file.name);
    setImported(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  }, [parseCSV]);

  const handleImport = () => {
    if (parsedLeads.length === 0) return;
    setImporting(true);
    bulkImport.mutate({ leads: parsedLeads }, {
      onSettled: () => setImporting(false),
    });
  };

  const downloadSampleCSV = () => {
    const csv = `First Name,Last Name,Email,Phone,WhatsApp,Company,Address,City,State,Zip Code,Monthly Bill
Rahul,Sharma,rahul@example.com,+919876543210,+919876543210,Sharma Enterprises,123 MG Road,Mumbai,Maharashtra,400001,5000
Priya,Patel,priya@example.com,+919876543211,,Patel Industries,456 Ring Road,Ahmedabad,Gujarat,380001,8000
Amit,Singh,amit@example.com,+919876543212,+919876543212,,789 Sector 15,Noida,Uttar Pradesh,201301,6500`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/leads")} className="h-8 w-8 p-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Import Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">Upload a CSV file to bulk import leads</p>
        </div>
      </div>

      {/* Sample Download */}
      <div className="stat-card flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Need a template?</p>
          <p className="text-xs text-muted-foreground mt-0.5">Download our sample CSV file to see the expected format</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadSampleCSV}>
          <Download className="w-4 h-4 mr-1" /> Download Sample
        </Button>
      </div>

      {/* Upload Area */}
      {!imported && (
        <div
          className="stat-card border-2 border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => document.getElementById("csv-upload")?.click()}
        >
          <div className="text-center py-10">
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium">Drop your CSV file here or click to browse</p>
            <p className="text-sm text-muted-foreground mt-1">Supports .csv files with lead data</p>
            {fileName && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium">{fileName}</span>
                <button onClick={(e) => { e.stopPropagation(); setParsedLeads([]); setFileName(""); setErrors([]); }}>
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            )}
          </div>
          <input id="csv-upload" type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="stat-card border-destructive/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">{errors.length} parsing issues</span>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {errors.map((err, i) => (
              <p key={i} className="text-xs text-muted-foreground">{err}</p>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {parsedLeads.length > 0 && !imported && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Preview ({parsedLeads.length} leads)</h3>
            <Button size="sm" className="solar-gradient text-black" onClick={handleImport} disabled={importing}>
              {importing ? "Importing..." : `Import ${parsedLeads.length} Leads`}
            </Button>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full">
                <thead className="sticky top-0">
                  <tr className="bg-card border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">#</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Email</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Phone</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">City</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Bill</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedLeads.slice(0, 50).map((lead, i) => (
                    <tr key={i} className="border-b border-border/50 table-row">
                      <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 text-sm">{lead.firstName} {lead.lastName}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{lead.email || "-"}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{lead.phone || "-"}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{lead.city || "-"}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{lead.monthlyEnergyBill ? `₹${lead.monthlyEnergyBill}` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedLeads.length > 50 && (
              <div className="text-center py-2 text-xs text-muted-foreground bg-card">
                Showing first 50 of {parsedLeads.length} leads
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success */}
      {imported && (
        <div className="stat-card text-center py-10">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold">Import Successful!</h3>
          <p className="text-sm text-muted-foreground mt-2">{parsedLeads.length} leads have been imported and scored.</p>
          <div className="flex justify-center gap-3 mt-6">
            <Button variant="outline" onClick={() => { setParsedLeads([]); setFileName(""); setImported(false); }}>
              Import More
            </Button>
            <Button className="solar-gradient text-black" onClick={() => setLocation("/leads")}>
              View Leads
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
