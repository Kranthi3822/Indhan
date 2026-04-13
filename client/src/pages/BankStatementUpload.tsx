import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Upload, FileText, CheckCircle2, AlertCircle, Clock,
  RefreshCw, ChevronDown, ChevronUp, Building2, CalendarDays,
  TrendingUp, TrendingDown, Link2
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { fmtCompact, fmtFull } from "@/lib/format";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URL prefix: "data:application/pdf;base64,..."
      resolve(result.split(",")[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getFileType(file: File): "pdf" | "xlsx" | "csv" | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "xlsx";
  if (name.endsWith(".csv")) return "csv";
  return null;
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({ onFile }: { onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
        dragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50 hover:bg-muted/20"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.xlsx,.xls,.csv"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
      <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm font-medium mb-1">Drop your bank statement here</p>
      <p className="text-xs text-muted-foreground mb-3">Supports PDF, Excel (.xlsx), and CSV from any Indian bank</p>
      <Button variant="outline" size="sm" className="pointer-events-none">
        Browse file
      </Button>
    </div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TxRow({ tx, onReconcile }: { tx: any; onReconcile?: (date: string) => void }) {
  const isDebit = Number(tx.withdrawal ?? tx.debit ?? 0) > 0;
  const amount = isDebit ? Number(tx.withdrawal ?? tx.debit ?? 0) : Number(tx.deposit ?? tx.credit ?? 0);
  const date = String(tx.transactionDate ?? tx.date ?? "").slice(0, 10);
  const matched = tx.matchStatus === "matched" || tx.reconciliationStatus === "matched";

  return (
    <tr className="border-b border-border/20 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-2.5 text-xs font-medium whitespace-nowrap">{date}</td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[240px] truncate">{tx.description}</td>
      <td className="px-4 py-2.5 text-xs">
        <Badge variant="outline" className="text-[10px] border-border/40">{tx.transactionType}</Badge>
      </td>
      <td className="px-4 py-2.5 text-xs tabular-nums text-red-400">
        {isDebit ? <span title={fmtFull(amount)}>{fmtCompact(amount)}</span> : "—"}
      </td>
      <td className="px-4 py-2.5 text-xs tabular-nums text-green-400">
        {!isDebit ? <span title={fmtFull(amount)}>{fmtCompact(amount)}</span> : "—"}
      </td>
      <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground">
        {tx.balance != null ? fmtCompact(Number(tx.balance)) : "—"}
      </td>
      <td className="px-4 py-2.5 text-xs">
        {matched ? (
          <Badge className="text-[10px] bg-green-500/15 text-green-400 border-green-500/20">Matched</Badge>
        ) : (
          <div className="flex items-center gap-1.5">
            <Badge className="text-[10px] bg-teal-500/15 text-teal-400 border-teal-500/20">Pending</Badge>
            {onReconcile && (
              <button
                onClick={() => onReconcile(date)}
                className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
              >
                <Link2 className="w-3 h-3" /> Match
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Upload History Card ──────────────────────────────────────────────────────

function UploadHistoryCard({ upload }: { upload: any }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = upload.status === "done" ? "text-green-400" : upload.status === "error" ? "text-red-400" : "text-teal-400";
  const StatusIcon = upload.status === "done" ? CheckCircle2 : upload.status === "error" ? AlertCircle : Clock;

  return (
    <div className="border border-border/40 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/20"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium">{upload.filename}</p>
            <p className="text-[10px] text-muted-foreground">
              {upload.statement_from && `${upload.statement_from} → ${upload.statement_to}`}
              {" · "}Uploaded {new Date(upload.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1 text-xs ${statusColor}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            <span className="capitalize">{upload.status}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {upload.parsed_count} parsed · {upload.matched_count} matched
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>
      {expanded && upload.status === "error" && (
        <div className="px-4 py-3 bg-red-500/5 border-t border-border/30">
          <p className="text-xs text-red-400">{upload.error_message ?? "Unknown error"}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BankStatementUpload() {
  const [uploading, setUploading] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [viewDateEnd, setViewDateEnd] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const uploadMutation = trpc.bankStatement.upload.useMutation();
  const markReconciledMutation = trpc.bankStatement.markDateReconciled.useMutation();
  const { data: uploads, refetch: refetchUploads } = trpc.bankStatement.listUploads.useQuery();
  const { data: unreconciledDays, refetch: refetchUnreconciled } = trpc.bankStatement.getUnreconciledDays.useQuery();
  const { data: transactions, refetch: refetchTx } = trpc.bankStatement.getTransactions.useQuery({
    startDate: viewDate,
    endDate: viewDateEnd,
  });

  const handleFile = async (file: File) => {
    const fileType = getFileType(file);
    if (!fileType) {
      toast.error("Unsupported file type", { description: "Please upload a PDF, Excel, or CSV file." });
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      toast.error("File too large", { description: "Maximum file size is 16 MB." });
      return;
    }
    setSelectedFile(file);
    setUploading(true);
    setParseResult(null);

    try {
      const fileBase64 = await fileToBase64(file);
      const result = await uploadMutation.mutateAsync({
        filename: file.name,
        fileType,
        fileBase64,
      });
      setParseResult(result);
      refetchUploads();
      refetchUnreconciled();
      toast.success("Statement parsed successfully", { description: `${result.parsedCount} transactions extracted, ${result.matchedCount} matched to daily reports.` });
    } catch (err: any) {
      toast.error("Upload failed", { description: err.message ?? "Unknown error" });
    } finally {
      setUploading(false);
    }
  };

  const handleMarkReconciled = async (date: string) => {
    try {
      await markReconciledMutation.mutateAsync({ date });
      refetchUnreconciled();
      refetchTx();
      toast.success("Reconciled", { description: `${date} marked as reconciled.` });
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-bold">Bank Statement Sync</h2>
          <p className="text-xs text-muted-foreground">Upload your bank statement to auto-reconcile daily reports</p>
        </div>
      </div>

      {/* Catch-up Banner */}
      {unreconciledDays && unreconciledDays.length > 0 && (
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-teal-300">
              {unreconciledDays.length} day{unreconciledDays.length > 1 ? "s" : ""} with bank data pending reconciliation
            </p>
            <p className="text-xs text-teal-400/80 mt-0.5">
              Dates: {unreconciledDays.slice(0, 5).map((d: any) => String(d.date ?? "").slice(0, 10)).join(", ")}
              {unreconciledDays.length > 5 && ` and ${unreconciledDays.length - 5} more`}
            </p>
          </div>
          <button
            onClick={() => refetchUnreconciled()}
            className="text-teal-400 hover:text-teal-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upload Card */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Upload Statement</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            {uploading ? (
              <div className="border-2 border-dashed border-primary/30 rounded-xl p-10 text-center">
                <RefreshCw className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
                <p className="text-sm font-medium">Parsing {selectedFile?.name}…</p>
                <p className="text-xs text-muted-foreground mt-1">The AI is extracting transactions from your statement</p>
              </div>
            ) : parseResult ? (
              <div className="space-y-3">
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-green-300">Parsed successfully</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Transactions</span>
                      <p className="font-bold text-sm">{parseResult.parsedCount}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Matched to reports</span>
                      <p className="font-bold text-sm text-green-400">{parseResult.matchedCount}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">From</span>
                      <p className="font-medium">{parseResult.statementFrom ?? "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">To</span>
                      <p className="font-medium">{parseResult.statementTo ?? "—"}</p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => { setParseResult(null); setSelectedFile(null); }}
                >
                  Upload another statement
                </Button>
              </div>
            ) : (
              <UploadZone onFile={handleFile} />
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Supported formats:</p>
              <p>• PDF bank statements (any Indian bank)</p>
              <p>• Excel (.xlsx) exports from netbanking</p>
              <p>• CSV transaction exports</p>
              <p>• Max file size: 16 MB</p>
            </div>
          </CardContent>
        </Card>

        {/* Unreconciled Days */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Pending Reconciliation</CardTitle>
              <Badge variant="outline" className="text-[10px] border-border/50">
                {unreconciledDays?.length ?? 0} days
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {!unreconciledDays || unreconciledDays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
                <p className="text-sm font-medium text-green-300">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-1">No pending reconciliation days in the last 90 days</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {unreconciledDays.map((day: any) => {
                  const date = String(day.date ?? "").slice(0, 10);
                  return (
                    <div key={date} className="flex items-center justify-between px-3 py-2 bg-secondary/40 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium">{date}</span>
                        <span className="text-[10px] text-muted-foreground">{day.txCount} tx</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {Number(day.totalDeposit ?? 0) > 0 && (
                          <span className="text-[10px] text-green-400 flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3" />
                            {fmtCompact(Number(day.totalDeposit))}
                          </span>
                        )}
                        {Number(day.totalWithdrawal ?? 0) > 0 && (
                          <span className="text-[10px] text-red-400 flex items-center gap-0.5">
                            <TrendingDown className="w-3 h-3" />
                            {fmtCompact(Number(day.totalWithdrawal))}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2"
                          onClick={() => handleMarkReconciled(date)}
                          disabled={markReconciledMutation.isPending}
                        >
                          Reconcile
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Viewer */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm font-semibold">Bank Transactions</CardTitle>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={viewDate}
                onChange={e => setViewDate(e.target.value)}
                className="text-xs bg-secondary border border-border/40 rounded-lg px-2 py-1 text-foreground"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={viewDateEnd}
                onChange={e => setViewDateEnd(e.target.value)}
                className="text-xs bg-secondary border border-border/40 rounded-lg px-2 py-1 text-foreground"
              />
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => refetchTx()}>
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30">
                  {["Date", "Description", "Type", "Debit (₹)", "Credit (₹)", "Balance (₹)", "Status"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions && transactions.length > 0 ? transactions.map((tx: any, i: number) => (
                  <TxRow key={i} tx={tx} onReconcile={handleMarkReconciled} />
                )) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No bank transactions for selected period. Upload a statement to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Upload History */}
      {uploads && uploads.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Upload History</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2">
            {uploads.map((u: any) => (
              <UploadHistoryCard key={u.id} upload={u} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
