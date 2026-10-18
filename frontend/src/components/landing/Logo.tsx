import { APP_CONFIG } from "@/lib/integration";

export function LogoMark({
  className = "",
  size,
  animated = false,
}: {
  className?: string;
  size?: number;
  animated?: boolean;
}) {
  // Resolve explicit numeric pixel dimension
  let resolvedSize = size;
  if (!resolvedSize) {
    if (className.includes("h-8") || className.includes("w-8")) resolvedSize = 32;
    else if (className.includes("h-9") || className.includes("w-9")) resolvedSize = 36;
    else if (className.includes("h-10") || className.includes("w-10")) resolvedSize = 40;
    else if (className.includes("h-16") || className.includes("w-16")) resolvedSize = 64;
    else if (className.includes("h-20") || className.includes("w-20")) resolvedSize = 80;
    else resolvedSize = 36;
  }

  if (APP_CONFIG.logoUrl) {
    return (
      <img
        src={APP_CONFIG.logoUrl}
        alt="LandSure AI"
        width={resolvedSize}
        height={resolvedSize}
        className={className}
        style={{ width: `${resolvedSize}px`, height: `${resolvedSize}px`, flexShrink: 0 }}
      />
    );
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ls-logomark-wrap ${animated ? "ls-animated-logo" : ""}`}
      style={{
        width: `${resolvedSize}px`,
        height: `${resolvedSize}px`,
        minWidth: `${resolvedSize}px`,
        minHeight: `${resolvedSize}px`,
        maxWidth: `${resolvedSize}px`,
        maxHeight: `${resolvedSize}px`,
        flexShrink: 0,
      }}
    >
      {animated && (
        <span
          className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-400/20 to-emerald-500/15 blur-sm animate-pulse-ring pointer-events-none"
          style={{
            animationDuration: "3.8s",
            borderRadius: `${Math.round(resolvedSize * 0.3)}px`,
          }}
          aria-hidden="true"
        />
      )}
      <svg
        viewBox="0 0 48 48"
        width={resolvedSize}
        height={resolvedSize}
        style={{
          width: `${resolvedSize}px`,
          height: `${resolvedSize}px`,
          minWidth: `${resolvedSize}px`,
          minHeight: `${resolvedSize}px`,
          maxWidth: `${resolvedSize}px`,
          maxHeight: `${resolvedSize}px`,
          flexShrink: 0,
          display: "block",
        }}
        className={`ls-logo-svg relative z-10 transition-transform duration-300 ${className}`}
        aria-hidden="true"
      >
        {animated && (
          <circle
            cx="24"
            cy="24"
            r="22"
            fill="none"
            stroke="var(--primary, #5ee6cb)"
            strokeOpacity="0.25"
            strokeWidth="0.8"
            strokeDasharray="3 5"
            className="ls-logo-orbit pointer-events-none"
          />
        )}
        <rect
          x="1"
          y="1"
          width="46"
          height="46"
          rx="12"
          fill="var(--elevated, #1a2a29)"
          stroke="var(--primary, #5ee6cb)"
          strokeOpacity="0.4"
          className="fill-elevated stroke-primary/40"
          strokeWidth="1.5"
        />
        <path
          d="M9 31 L19 26 L29 30 L39 24"
          stroke="var(--primary, #5ee6cb)"
          strokeOpacity={animated ? "0.7" : "0.5"}
          className={animated ? "stroke-primary/70 ls-stroke-glow" : "stroke-primary/50"}
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M9 37 L19 32 L29 36 L39 30"
          stroke="var(--primary, #5ee6cb)"
          strokeOpacity={animated ? "0.4" : "0.3"}
          className={animated ? "stroke-primary/40" : "stroke-primary/30"}
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M24 8c-5.2 0-9 3.9-9 8.8 0 6.4 9 14.2 9 14.2s9-7.8 9-14.2C33 11.9 29.2 8 24 8Z"
          fill="var(--primary, #5ee6cb)"
          className={`fill-primary ${animated ? "ls-shield-breathe" : ""}`}
        />
        <path
          d="M20 16.8l2.7 2.7 5.3-5.4"
          stroke="var(--primary-foreground, #081e1a)"
          className="stroke-primary-foreground"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`}>
      LandSure <span className="text-primary">AI</span>
    </span>
  );
}

