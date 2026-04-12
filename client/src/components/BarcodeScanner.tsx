import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Camera, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

const SCANNER_ID = "indhan-qr-scanner";

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);

  const startScanner = useCallback(async () => {
    setError(null);
    try {
      const scanner = new Html5Qrcode(SCANNER_ID, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          if (!mountedRef.current) return;
          // Stop scanner and call callback
          scanner.stop().catch(() => {});
          onScan(decodedText);
        },
        () => {
          // scan failure — ignore, keep scanning
        }
      );
      if (mountedRef.current) setScanning(true);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("permission") || msg.includes("Permission")) {
        setError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (msg.includes("NotFound") || msg.includes("no camera")) {
        setError("No camera found on this device.");
      } else {
        setError(`Could not start camera: ${msg}`);
      }
    }
  }, [onScan]);

  useEffect(() => {
    mountedRef.current = true;
    startScanner();
    return () => {
      mountedRef.current = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        try { scannerRef.current.clear(); } catch (_) {}
        scannerRef.current = null;
      }
    };
  }, [startScanner]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#1a1208", border: "1px solid rgba(245,158,11,0.3)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-primary/20">
          <div className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Scan Barcode / QR Code</span>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg hover:bg-secondary/60 flex items-center justify-center"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scanner viewport */}
        <div className="relative bg-black">
          {error ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
              <Camera className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button size="sm" onClick={startScanner} variant="outline" className="border-primary/30 text-primary">
                Try Again
              </Button>
            </div>
          ) : (
            <>
              {/* html5-qrcode renders into this div */}
              <div id={SCANNER_ID} className="w-full" style={{ minHeight: 280 }} />
              {/* Scan frame overlay */}
              {scanning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className="w-64 h-36 rounded-xl"
                    style={{
                      border: "2px solid #f59e0b",
                      boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                    }}
                  >
                    {/* Corner accents */}
                    {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
                      <div
                        key={i}
                        className={`absolute ${pos} w-5 h-5`}
                        style={{
                          borderColor: "#f59e0b",
                          borderStyle: "solid",
                          borderWidth: i === 0 ? "3px 0 0 3px" : i === 1 ? "3px 3px 0 0" : i === 2 ? "0 0 3px 3px" : "0 3px 3px 0",
                          borderRadius: i === 0 ? "4px 0 0 0" : i === 1 ? "0 4px 0 0" : i === 2 ? "0 0 0 4px" : "0 0 4px 0",
                        }}
                      />
                    ))}
                    {/* Scanning line animation */}
                    <div
                      className="absolute left-1 right-1 h-0.5 rounded-full animate-bounce"
                      style={{ background: "rgba(245,158,11,0.8)", top: "50%" }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            Point camera at a product barcode or QR code to look it up in inventory
          </p>
        </div>
      </div>
    </div>
  );
}
