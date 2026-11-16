import React from "react";
import type { BatikMotif } from "../data/batikCatalog";

interface MotifHistoryPopoverProps {
  motif: BatikMotif;
  swatchUrl: string;
  anchorRect: DOMRect;
}

export const MotifHistoryPopover: React.FC<MotifHistoryPopoverProps> = ({
  motif,
  swatchUrl,
  anchorRect,
}) => {
  const POPOVER_W = 304;
  const POPOVER_H = 350;
  const GAP = 12;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;

  // Prefer placing cleanly to the left of the motif card on desktop
  let left = anchorRect.left - POPOVER_W - GAP;
  let top = anchorRect.top - 24;

  if (left < 12) {
    // Fallback for narrow screens: center horizontally and place above or below the card
    left = Math.min(
      vw - POPOVER_W - 12,
      Math.max(12, anchorRect.left + anchorRect.width / 2 - POPOVER_W / 2)
    );
    const spaceAbove = anchorRect.top - 16;
    const spaceBelow = vh - anchorRect.bottom - 16;
    if (spaceBelow >= POPOVER_H || spaceBelow >= spaceAbove) {
      top = anchorRect.bottom + 8;
    } else {
      top = anchorRect.top - POPOVER_H - 8;
    }
  }

  if (top + POPOVER_H > vh - 16) {
    top = Math.max(16, vh - POPOVER_H - 16);
  }
  if (top < 16) {
    top = 16;
  }

  return (
    <div
      role="tooltip"
      style={{ top, left, width: POPOVER_W }}
      className="pointer-events-none fixed z-50 overflow-hidden rounded-xl border border-white/15 bg-[#181613]/95 p-3.5 shadow-2xl backdrop-blur-md transition-opacity duration-150"
    >
      {/* Top Swatch + Motif Header */}
      <div className="flex items-start gap-3">
        <img
          src={swatchUrl}
          alt={motif.name}
          referrerPolicy="no-referrer"
          className="h-14 w-14 shrink-0 rounded-lg border border-white/15 object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium text-[#D99B26]">
            {motif.origin} · {motif.era}
          </div>
          <h4 className="font-display mt-0.5 text-base font-bold leading-tight text-[#F4F1EA]">
            {motif.name}
          </h4>
          <p className="mt-0.5 text-[11px] text-[#9A9185]">
            {motif.regionLabel} · {motif.mapCoords.island}
          </p>
        </div>
      </div>

      {/* Stylized Nusantara Archipelago Origin Map */}
      <div className="mt-3 rounded-lg border border-white/10 bg-[#11100F] p-2">
        <div className="mb-1 flex items-center justify-between text-[10px] text-[#8E867B]">
          <span>Peta Asal Motif Nusantara</span>
          <span className="font-medium text-[#E5AA38]">{motif.origin}</span>
        </div>
        <svg
          viewBox="0 0 280 105"
          className="h-24 w-full"
          aria-label={`Peta asal ${motif.origin}`}
        >
          {/* Subtle Archipelago Silhouette */}
          <g fill="#2A2622" stroke="#474038" strokeWidth="0.9">
            {/* Sumatra */}
            <path d="M12,18 L24,14 L38,30 L56,56 L50,66 L34,54 L18,32 Z" />
            {/* Bangka Belitung */}
            <circle cx="60" cy="58" r="2.2" />
            {/* Java */}
            <path d="M58,72 L84,71 L114,76 L116,82 L88,83 L60,79 Z" />
            {/* Madura */}
            <path d="M107,71 L121,72 L120,76 L108,75 Z" />
            {/* Bali */}
            <path d="M122,80 L130,81 L129,86 L122,85 Z" />
            {/* Nusa Tenggara */}
            <path d="M133,82 L145,83 L144,87 L133,86 Z" />
            <path d="M149,83 L166,85 L164,89 L149,87 Z" />
            <path d="M170,85 L186,82 L185,89 L169,90 Z" />
            {/* Kalimantan */}
            <path d="M88,24 L112,14 L132,22 L136,42 L122,56 L96,55 L86,42 Z" />
            {/* Sulawesi */}
            <path d="M142,26 L166,24 L169,31 L154,36 L166,48 L158,60 L147,54 L144,40 Z" />
            {/* Maluku */}
            <path d="M180,32 L192,28 L194,42 L184,44 Z" />
            <path d="M188,52 L202,51 L202,58 L188,58 Z" />
            {/* Papua */}
            <path d="M210,34 L224,36 L236,34 L264,42 L270,66 L252,66 L234,56 L218,54 Z" />
          </g>

          {/* Subtle Latitude Grid Lines */}
          <line
            x1="0"
            y1="42"
            x2="280"
            y2="42"
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="2 3"
          />
          <line
            x1="0"
            y1="76"
            x2="280"
            y2="76"
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="2 3"
          />

          {/* Origin Marker Pin */}
          <circle
            cx={motif.mapCoords.x}
            cy={motif.mapCoords.y}
            r="9"
            fill="rgba(217, 155, 38, 0.22)"
            stroke="rgba(217, 155, 38, 0.65)"
            strokeWidth="1"
          />
          <circle
            cx={motif.mapCoords.x}
            cy={motif.mapCoords.y}
            r="3.6"
            fill="#D99B26"
            stroke="#11100F"
            strokeWidth="1.2"
          />
        </svg>
      </div>

      {/* Brief Historical Snippet */}
      <div className="mt-2.5 border-t border-white/10 pt-2">
        <div className="text-[10px] font-semibold text-[#D6CFC5]">
          Sejarah &amp; Makna Budaya
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-[#B8B0A4]">
          {motif.historySnippet}
        </p>
      </div>
    </div>
  );
};
