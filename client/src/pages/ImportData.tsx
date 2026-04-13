import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle2, Info, Database, AlertCircle } from "lucide-react";

const SUPPORTED_SHEETS = [
  { name: "Daily Accounting", description: "Daily sales, cash, and card transactions", status: "supported" },
  { name: "Monthly Summary", description: "Month-wise revenue and expense summary", status: "supported" },
  { name: "Bank Statement", description: "NEFT, RTGS, IMPS, Cash transactions", status: "supported" },
  { name: "Receivables / Credit Accounts", description: "Customer credit and outstanding balances", status: "supported" },
  { name: "Expenses", description: "Wages, Admin, Electricity, Maintenance etc.", status: "supported" },
  { name: "Daily Stock Statement", description: "Fuel and lubricant inventory levels", status: "supported" },
  { name: "P&L Statement", description: "Profit and loss figures", status: "supported" },
  { name: "Weigh Bridge", description: "Vehicle and cargo records", status: "coming_soon" },
];

type ImportStep = "idle" | "uploading" | "done" | "error";

interface ImportResult {
  sheet: string;
  rows: number;
  status: "success" | "error";
}

export default function ImportData() {
  const [step, setStep] = useState<ImportStep>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [results, setResults] = useState<ImportResult[]>([]);
  const [totalImported, setTotalImported] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls") && !file.name.endsWith(".csv")) {
      toast.error("Please upload an Excel (.xlsx/.xls) or CSV file");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 50MB.");
      return;
    }
    setFileName(file.name);
    setStep("uploading");
    setProgress(15);
    setResults([]);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate progress while uploading
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 8, 85));
      }, 400);

      const response = await fetch("/api/import/excel", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(95);

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error ?? "Import failed");
      }

      const data = await response.json();
      setProgress(100);
      setStep("done");
      setTotalImported(data.totalImported ?? 0);

      // Convert breakdown to results array
      const breakdown = data.breakdown as Record<string, number> ?? {};
      const resultItems: ImportResult[] = Object.entries(breakdown).map(([sheet, rows]) => ({
        sheet,
        rows: rows as number,
        status: "success",
      }));
      setResults(resultItems);

      toast.success(`Import complete! ${(data.totalImported ?? 0).toLocaleString("en-IN")} records imported.`);
    } catch (err: any) {
      setStep("error");
      setErrorMsg(err.message ?? "Import failed. Please check the file format and try again.");
      toast.error(err.message ?? "Import failed");
    }
  };

  const stepLabel = step === "uploading" ? "Uploading and processing file..." : step === "done" ? "Import complete!" : step === "error" ? "Import failed" : "Ready to import";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold tracking-tight">Import Historical Data</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Migrate your existing BEES accounting Excel data into Indhan — supports up to 3 years of historical data</p>
      </div>

      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-primary">BEES Format Auto-Detection</p>
          <p className="text-xs text-muted-foreground mt-1">
            Indhan automatically recognises the BEES accounting Excel format and maps all columns including Daily Accounting, Bank Statement, Receivables, Expenses, and more.
            Upload your file and the system will handle the rest. Supports up to 3 years of historical data across all sheets.
          </p>
        </div>
      </div>

      <Card className="bg-card border-border/50">
        <CardContent className="p-6">
          {step === "idle" && (
            <div
              className="border-2 border-dashed border-border/50 rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              <FileSpreadsheet className="w-14 h-14 text-primary/40 mx-auto mb-4" />
              <p className="text-base font-semibold mb-1">Drop your Excel file here</p>
              <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
              <Button size="sm" variant="outline" className="border-primary/30 text-primary">
                <Upload className="w-4 h-4 mr-2" /> Choose File
              </Button>
              <p className="text-xs text-muted-foreground mt-4">Supports: .xlsx, .xls, .csv · Max 50MB · BEES format auto-detected</p>
            </div>
          )}

          {step === "uploading" && (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-primary shrink-0 animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{fileName}</p>
                  <p className="text-xs text-muted-foreground">{stepLabel}</p>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Processing all sheets — Daily Reports, Bank Transactions, Expenses, Receivables...</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-6">
              <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p className="text-base font-bold text-green-400 mb-1">Import Successful!</p>
              <p className="text-sm text-muted-foreground mb-1">{fileName}</p>
              <p className="text-sm font-semibold text-foreground mb-1">{totalImported.toLocaleString("en-IN")} records imported</p>
              <p className="text-xs text-muted-foreground">All historical data is now available across all modules in Indhan.</p>
              <Button size="sm" className="mt-4" onClick={() => { setStep("idle"); setProgress(0); setResults([]); setTotalImported(0); }}>
                Import Another File
              </Button>
            </div>
          )}

          {step === "error" && (
            <div className="text-center py-6">
              <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <p className="text-base font-bold text-destructive mb-1">Import Failed</p>
              <p className="text-sm text-muted-foreground mb-4">{errorMsg}</p>
              <Button size="sm" variant="outline" onClick={() => { setStep("idle"); setProgress(0); setResults([]); }}>
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" /> Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="space-y-2">
              {results.map(r => (
                <div key={r.sheet} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-sm">{r.sheet}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{r.rows.toLocaleString("en-IN")} records</span>
                    <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-[10px]">Imported</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3 pt-4 px-5"><CardTitle className="text-sm font-semibold">Supported Data Sheets</CardTitle></CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SUPPORTED_SHEETS.map(s => (
              <div key={s.name} className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-secondary/20">
                {s.status === "supported" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                ) : (
                  <span className="w-4 h-4 text-teal-400 shrink-0 mt-0.5 text-xs font-bold">~</span>
                )}
                <div>
                  <p className="text-xs font-semibold">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">{s.description}</p>
                </div>
                {s.status === "coming_soon" && (
                  <Badge className="ml-auto text-[9px] bg-teal-500/10 text-teal-400 border-teal-500/20 shrink-0">Soon</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
