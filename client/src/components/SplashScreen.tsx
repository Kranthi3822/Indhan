import { useEffect, useState } from "react";

interface SplashScreenProps {
  onDismiss: () => void;
}

export function SplashScreen({ onDismiss }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    // Animate progress bar from 0 to 100 over 1.8s
    const start = performance.now();
    const duration = 1800;

    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (pct < 100) {
        requestAnimationFrame(tick);
      } else {
        setPhase("ready");
        setTimeout(onDismiss, 400);
      }
    };
    requestAnimationFrame(tick);
  }, [onDismiss]);

  // Circumference for the circular gauge ring
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(160deg, #1a1208 0%, #0d0a04 60%, #1a1208 100%)" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(245,158,11,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Logo + gauge */}
      <div className="relative flex items-center justify-center mb-8">
        {/* Circular progress ring */}
        <svg width="140" height="140" className="absolute" style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="rgba(245,158,11,0.15)"
            strokeWidth="6"
          />
          {/* Progress arc */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.05s linear" }}
          />
        </svg>

        {/* Logo tile */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
          style={{ background: "linear-gradient(135deg, #2a1f08 0%, #1a1208 100%)", border: "1px solid rgba(245,158,11,0.3)" }}
        >
          {/* Fuel drop SVG icon */}
          <svg viewBox="0 0 40 48" width="36" height="44" fill="none">
            <path
              d="M20 4C20 4 6 18 6 28C6 35.732 12.268 42 20 42C27.732 42 34 35.732 34 28C34 18 20 4 20 4Z"
              fill="#f59e0b"
            />
            <path
              d="M20 14C20 14 11 23 11 29C11 33.418 15.029 37 20 37C24.971 37 29 33.418 29 29C29 23 20 14 20 14Z"
              fill="#fbbf24"
              opacity="0.6"
            />
            <path
              d="M20 22C20 22 15 27 15 30C15 32.761 17.239 35 20 35C22.761 35 25 32.761 25 30C25 27 20 22 20 22Z"
              fill="white"
              opacity="0.4"
            />
          </svg>
        </div>
      </div>

      {/* Brand name */}
      <div className="text-center mb-2">
        <div className="text-3xl font-bold tracking-tight" style={{ color: "#f59e0b", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
          इंधन
        </div>
        <div className="text-sm font-medium tracking-widest uppercase mt-1" style={{ color: "rgba(245,158,11,0.6)" }}>
          Fuel Station OS
        </div>
      </div>

      {/* Station name */}
      <div className="text-xs mt-1 mb-10" style={{ color: "rgba(255,255,255,0.35)" }}>
        BEES Fuel Station · Velgatoor
      </div>

      {/* Progress bar */}
      <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: "rgba(245,158,11,0.15)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
            transition: "width 0.05s linear",
          }}
        />
      </div>

      {/* Status text */}
      <div className="mt-3 text-xs" style={{ color: "rgba(245,158,11,0.5)" }}>
        {phase === "loading" ? "Loading operations data…" : "Ready"}
      </div>
    </div>
  );
}
