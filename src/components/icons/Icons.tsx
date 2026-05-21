import type { SVGProps } from "react";

/*
 * Placeholder icon set. Each icon uses currentColor for stroke/fill so it
 * adapts to light/dark theme automatically. Replace these with the operator's
 * exported SVGs from 01_design/EXP/icons/ when available.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function svgProps(size: number, rest: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
    focusable: false,
    ...rest,
  };
}

export function HintIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size, rest)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v1.5" />
      <path d="M3 12h1.5" />
      <path d="M19.5 12H21" />
      <path d="M5.6 5.6l1 1" />
      <path d="M17.4 5.6l-1 1" />
      <path d="M9 17h6" />
      <path d="M10 20h4" />
      <path d="M8.5 14a5 5 0 1 1 7 0c-.7.7-1 1.5-1 2.5h-5c0-1-.3-1.8-1-2.5z" />
    </svg>
  );
}

export function PastScramblesIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size, rest)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="14" height="14" rx="2" />
      <path d="M3 9h14" />
      <path d="M7 3v3" />
      <path d="M13 3v3" />
      <circle cx="17" cy="17" r="4" fill="var(--bg, #fff)" />
      <circle cx="17" cy="17" r="4" />
      <path d="M17 15v2l1.5 1" />
    </svg>
  );
}

export function ProfileIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size, rest)} fill="currentColor">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6v1H4v-1z" />
    </svg>
  );
}

export function LeaderboardIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size, rest)} fill="currentColor">
      <path d="M12 2l1.6 3.2 3.5.5-2.5 2.5.6 3.5L12 10l-3.2 1.7.6-3.5L7 5.7l3.5-.5L12 2z" />
      <rect x="4" y="13" width="4" height="8" />
      <rect x="10" y="10" width="4" height="11" />
      <rect x="16" y="15" width="4" height="6" />
    </svg>
  );
}

export function DailyIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size, rest)} fill="currentColor">
      {Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 5 }, (_, c) => (
          <rect
            key={`${r}-${c}`}
            x={2 + c * 4}
            y={2 + r * 4}
            width={3}
            height={3}
            rx={0.4}
          />
        ))
      )}
    </svg>
  );
}

export function PracticeIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size, rest)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l5-5 4 4 7-8" />
      <path d="M14 8h5v5" />
    </svg>
  );
}

export function SettingsIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size, rest)} fill="currentColor">
      <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
      <path d="M19.4 12.9l1.5-1-1.4-2.4-1.7.6c-.4-.4-.9-.7-1.4-1l-.3-1.8h-2.8l-.3 1.8c-.5.2-1 .5-1.4 1l-1.7-.6-1.4 2.4 1.5 1c0 .3-.1.6-.1.9s0 .6.1.9l-1.5 1 1.4 2.4 1.7-.6c.4.4.9.7 1.4 1l.3 1.8h2.8l.3-1.8c.5-.2 1-.5 1.4-1l1.7.6 1.4-2.4-1.5-1c0-.3.1-.6.1-.9s0-.6-.1-.9z" />
    </svg>
  );
}

export function SunIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size, rest)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function MoonIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size, rest)} fill="currentColor">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  );
}

export function CloseIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size, rest)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M6 6l12 12M18 6l-12 12" />
    </svg>
  );
}

export function LogoBuntRGB({ height = 56, ...rest }: SVGProps<SVGSVGElement> & { height?: number }) {
  // Composite logo: "Bunt" wordmark + 3 square tiles with R G B inside.
  // Tiles use currentColor for fill; letters use the page background so they
  // appear as knockout. This lets the same SVG work in both themes by setting
  // color: var(--fg) on the parent.
  return (
    <svg
      height={height}
      viewBox="0 0 320 70"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BUNT RGB"
      {...rest}
    >
      <text
        x="0"
        y="56"
        fontFamily="-apple-system, BlinkMacSystemFont, system-ui, sans-serif"
        fontWeight="900"
        fontSize="64"
        letterSpacing="-2"
        fill="currentColor"
      >
        Bunt
      </text>
      <g transform="translate(150, 8)">
        <rect width="52" height="52" rx="10" fill="currentColor" />
        <text x="26" y="40" textAnchor="middle" fontFamily="-apple-system, system-ui, sans-serif" fontWeight="900" fontSize="38" fill="var(--bg)">R</text>
      </g>
      <g transform="translate(208, 8)">
        <rect width="52" height="52" rx="10" fill="currentColor" />
        <text x="26" y="40" textAnchor="middle" fontFamily="-apple-system, system-ui, sans-serif" fontWeight="900" fontSize="38" fill="var(--bg)">G</text>
      </g>
      <g transform="translate(266, 8)">
        <rect width="52" height="52" rx="10" fill="currentColor" />
        <text x="26" y="40" textAnchor="middle" fontFamily="-apple-system, system-ui, sans-serif" fontWeight="900" fontSize="38" fill="var(--bg)">B</text>
      </g>
    </svg>
  );
}
