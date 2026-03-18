import { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { BrowserMultiFormatReader } from "@zxing/library";

interface ScannerProps {
  onScan: (scanData: string) => void;
  disabled?: boolean;
}

type InputMode = "camera" | "manual";

export default function Scanner({ onScan, disabled = false }: ScannerProps) {
  const [mode, setMode] = useState<InputMode>("camera");
  const [manualInput, setManualInput] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const webcamRef = useRef<Webcam>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastScanRef = useRef<string>("");

  // Initialise ZXing reader once
  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();
    return () => {
      readerRef.current?.reset();
    };
  }, []);

  const handleScan = useCallback(
    (raw: string) => {
      // Debounce duplicate scans
      if (raw === lastScanRef.current) return;
      lastScanRef.current = raw;
      setTimeout(() => {
        lastScanRef.current = "";
      }, 2000);

      setLastScan(raw);
      onScan(raw);
    },
    [onScan]
  );

  // Polling decode loop for camera mode
  useEffect(() => {
    if (mode !== "camera" || disabled) return;

    setScanning(true);
    intervalRef.current = window.setInterval(async () => {
      if (!webcamRef.current || !readerRef.current) return;
      const imgSrc = webcamRef.current.getScreenshot();
      if (!imgSrc) return;

      try {
        const img = new Image();
        img.src = imgSrc;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
        });
        const result = await readerRef.current.decodeFromImageElement(img);
        if (result) {
          handleScan(result.getText());
        }
      } catch {
        // NotFoundException is normal; ignore it
      }
    }, 400);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setScanning(false);
    };
  }, [mode, disabled, handleScan]);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = manualInput.trim();
    if (!trimmed) return;
    handleScan(trimmed);
    setManualInput("");
  }

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setMode("camera"); setCameraError(null); }}
          disabled={disabled}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === "camera"
              ? "bg-blue-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
          Camera
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          disabled={disabled}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === "manual"
              ? "bg-blue-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Manual / USB
        </button>
      </div>

      {/* Camera view */}
      {mode === "camera" && (
        <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-700 aspect-video max-w-lg">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <p className="text-sm text-red-400 font-medium">{cameraError}</p>
              <p className="text-xs text-slate-500">Use manual input mode instead.</p>
            </div>
          ) : (
            <>
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "environment" }}
                onUserMediaError={(err) =>
                  setCameraError(
                    err instanceof Error ? err.message : "Camera access denied."
                  )
                }
                className="w-full h-full object-cover"
              />
              {/* Scan overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-2/3 h-1/2 border-2 border-blue-400 rounded-lg opacity-70" />
              </div>
              {scanning && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-slate-900/70 px-2 py-1 rounded-full">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-green-400">Scanning…</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Manual / USB input */}
      {mode === "manual" && (
        <form onSubmit={handleManualSubmit} className="flex gap-2 max-w-lg">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Scan barcode or type LCSC part no…"
            autoFocus
            disabled={disabled}
            className="input-field flex-1"
          />
          <button
            type="submit"
            disabled={disabled || !manualInput.trim()}
            className="btn-primary flex-shrink-0"
          >
            Submit
          </button>
        </form>
      )}

      {/* Last scan feedback */}
      {lastScan && (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>Last scan: <code className="font-mono">{lastScan}</code></span>
        </div>
      )}
    </div>
  );
}
