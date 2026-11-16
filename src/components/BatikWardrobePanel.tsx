import React, { useMemo, useState } from "react";
import { X, Sparkles, MapPin } from "lucide-react";
import {
  BATIK_COLOR_MODES,
  BATIK_MOTIFS,
  BATIK_REGIONS,
  GARMENT_ITEMS,
  GARMENT_SLOTS,
  type BatikColorMode,
  type BatikMotif,
  type BatikRegion,
  type GarmentItem,
  type GarmentSlot,
} from "../data/batikCatalog";
import {
  renderBatikSwatchDataUrl,
  resolveMotifColors,
} from "../utils/batikPatternEngine";
import { MotifHistoryPopover } from "./MotifHistoryPopover";

export type EquippedMap = Record<GarmentSlot, GarmentItem | null>;

interface BatikWardrobePanelProps {
  activeSlot: GarmentSlot;
  onChangeActiveSlot: (slot: GarmentSlot) => void;
  equipped: EquippedMap;
  onEquipItem: (item: GarmentItem) => void;
  onUnequipSlot: (slot: GarmentSlot) => void;
  onClearAll: () => void;
  selectedMotif: BatikMotif;
  onSelectMotif: (motif: BatikMotif) => void;
  selectedColorMode: BatikColorMode;
  onSelectColorMode: (mode: BatikColorMode) => void;
  regionFilter: BatikRegion;
  onChangeRegionFilter: (region: BatikRegion) => void;
  autoFitOnMotifClick: boolean;
  onToggleAutoFitOnMotifClick: (val: boolean) => void;
}

export const BatikWardrobePanel: React.FC<BatikWardrobePanelProps> = ({
  activeSlot,
  onChangeActiveSlot,
  equipped,
  onEquipItem,
  onUnequipSlot,
  onClearAll,
  selectedMotif,
  onSelectMotif,
  selectedColorMode,
  onSelectColorMode,
  regionFilter,
  onChangeRegionFilter,
  autoFitOnMotifClick,
  onToggleAutoFitOnMotifClick,
}) => {
  const filteredMotifs = useMemo(() => {
    if (regionFilter === "all") return BATIK_MOTIFS;
    return BATIK_MOTIFS.filter((m) => m.region === regionFilter);
  }, [regionFilter]);

  const motifSwatches = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of BATIK_MOTIFS) {
      map[m.id] = renderBatikSwatchDataUrl(m, selectedColorMode);
    }
    return map;
  }, [selectedColorMode]);

  const currentSlotItems = GARMENT_ITEMS[activeSlot] || [];
  const equippedMotifPalette = resolveMotifColors(
    selectedMotif,
    selectedColorMode
  );

  const [hoveredInfo, setHoveredInfo] = useState<{
    motif: BatikMotif;
    rect: DOMRect;
  } | null>(null);

  return (
    <aside className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#1A1816] p-4">
      {/* Section 2: Kombinasi Busana Terpasang */}
      <div id="potongan-busana" className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-[#F4F1EA]">
            2. Potongan &amp; Busana Terpasang
          </h2>
          <button
            type="button"
            onClick={onClearAll}
            className="text-[11px] font-medium text-[#E07A5F] hover:text-[#F4A28C] cursor-pointer"
          >
            Kosongkan
          </button>
        </div>

        {/* Equipped Tray */}
        <div className="grid grid-cols-2 gap-1.5">
          {GARMENT_SLOTS.filter((s) =>
            equipped.fullset
              ? s.id === "fullset" || s.id === "accessory"
              : s.id !== "fullset"
          ).map((slotMeta) => {
            const item = equipped[slotMeta.id];
            const isActive = activeSlot === slotMeta.id;
            return (
              <div
                key={slotMeta.id}
                onClick={() => onChangeActiveSlot(slotMeta.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onChangeActiveSlot(slotMeta.id);
                  }
                }}
                className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 transition-colors cursor-pointer ${
                  slotMeta.id === "fullset" ? "col-span-2" : ""
                } ${
                  isActive
                    ? "border-[#D99B26] bg-[#12110F]"
                    : "border-white/10 bg-[#12110F] hover:border-white/25"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="block text-[10px] text-[#8E867B]">
                    {slotMeta.name}
                  </span>
                  <span className="block truncate text-[11px] font-semibold text-[#F4F1EA]">
                    {item ? item.name : "Kosong"}
                  </span>
                </div>
                {item && (
                  <button
                    type="button"
                    aria-label={`Lepas ${slotMeta.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnequipSlot(slotMeta.id);
                    }}
                    className="rounded p-0.5 text-[#8E867B] hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Slot Tabs */}
        <div className="grid grid-cols-5 gap-1 rounded-lg border border-white/10 bg-[#12110F] p-1">
          {GARMENT_SLOTS.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => onChangeActiveSlot(slot.id)}
              className={`rounded-md py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeSlot === slot.id
                  ? "bg-[#D99B26] text-[#11100F]"
                  : "text-[#A79F93] hover:text-[#F4F1EA]"
              }`}
            >
              {slot.name}
            </button>
          ))}
        </div>

        {/* Garment Cut Picker */}
        <div className="studio-scroll flex max-h-36 flex-col gap-1.5 overflow-y-auto pr-1">
          {currentSlotItems.map((item) => {
            const isSelected = equipped[activeSlot]?.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onEquipItem(item)}
                className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "border-[#D99B26] bg-[#D99B26]/10"
                    : "border-white/10 bg-[#12110F] hover:border-white/25"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-[#F4F1EA]">
                    {item.name}
                  </div>
                  <div className="truncate text-[11px] text-[#8E867B]">
                    {item.cutTag} · {item.desc}
                  </div>
                </div>
                {item.usesBatikPattern && (
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-white/20"
                    style={{
                      backgroundColor: equippedMotifPalette.primary,
                      backgroundImage: `url(${motifSwatches[selectedMotif.id]})`,
                      backgroundSize: "cover",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 3: Mode Klik Ragam Batik Nusantara */}
      <div
        id="katalog-batik"
        className="flex flex-col gap-2.5 border-t border-white/10 pt-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-[#F4F1EA]">
            3. Mode Klik Batik Nusantara
          </h2>
          <button
            type="button"
            onClick={() => onToggleAutoFitOnMotifClick(!autoFitOnMotifClick)}
            title="Jika aktif, setiap klik motif batik langsung merender hasil fitting studio"
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              autoFitOnMotifClick
                ? "border-[#D99B26] bg-[#D99B26]/20 text-[#F0C265]"
                : "border-white/10 bg-[#12110F] text-[#9A9185] hover:text-white"
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span>
              {autoFitOnMotifClick ? "Klik = Render Studio" : "Klik = Pratinjau"}
            </span>
          </button>
        </div>

        {/* Region Filter Segmented Control */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-white/10 bg-[#12110F] p-1">
          {BATIK_REGIONS.map((reg) => (
            <button
              key={reg.id}
              type="button"
              onClick={() => onChangeRegionFilter(reg.id)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                regionFilter === reg.id
                  ? "bg-[#2C2824] text-[#F4F1EA]"
                  : "text-[#8E867B] hover:text-[#D6CFC5]"
              }`}
            >
              {reg.label}
            </button>
          ))}
        </div>

        {/* Color Dye Variant Swatches */}
        <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#12110F] px-2.5 py-2">
          <span className="text-[11px] text-[#9A9185] whitespace-nowrap">
            Pewarnaan:
          </span>
          <div className="flex items-center gap-1.5">
            {BATIK_COLOR_MODES.map((mode) => {
              const active = selectedColorMode.id === mode.id;
              const swatchCol = mode.colors
                ? mode.colors.primary
                : selectedMotif.colors.primary;
              const baseCol = mode.colors
                ? mode.colors.base
                : selectedMotif.colors.base;
              return (
                <button
                  key={mode.id}
                  type="button"
                  title={mode.name}
                  aria-label={mode.name}
                  onClick={() => onSelectColorMode(mode)}
                  className={`h-5 w-5 rounded-full border-2 transition-transform cursor-pointer ${
                    active
                      ? "scale-115 border-[#D99B26]"
                      : "border-white/25 hover:scale-105"
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${baseCol} 50%, ${swatchCol} 50%)`,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Batik Motif Click Grid */}
        <div
          onScroll={() => setHoveredInfo(null)}
          className="studio-scroll grid max-h-[300px] grid-cols-2 gap-2 overflow-y-auto pr-1"
        >
          {filteredMotifs.map((motif) => {
            const isSelected = selectedMotif.id === motif.id;
            return (
              <button
                key={motif.id}
                type="button"
                onClick={() => onSelectMotif(motif)}
                onMouseEnter={(e) => {
                  setHoveredInfo({
                    motif,
                    rect: e.currentTarget.getBoundingClientRect(),
                  });
                }}
                onMouseLeave={() => setHoveredInfo(null)}
                onFocus={(e) => {
                  setHoveredInfo({
                    motif,
                    rect: e.currentTarget.getBoundingClientRect(),
                  });
                }}
                onBlur={() => setHoveredInfo(null)}
                className={`group flex flex-col overflow-hidden rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#D99B26] bg-[#D99B26]/10"
                    : "border-white/10 bg-[#12110F] hover:border-white/25"
                }`}
              >
                <div className="relative h-20 w-full overflow-hidden bg-[#221E1B]">
                  <img
                    src={motifSwatches[motif.id]}
                    alt={`Motif ${motif.name}`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/75 to-transparent" />
                  <span className="absolute bottom-1.5 left-2 inline-flex items-center gap-1 text-[10px] font-medium text-white/95">
                    <MapPin className="h-2.5 w-2.5 text-[#D99B26]" />
                    <span>{motif.origin}</span>
                  </span>
                </div>
                <div className="p-2">
                  <div className="truncate text-xs font-semibold text-[#F4F1EA]">
                    {motif.name}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[#9A9185]">
                    {motif.regionLabel} · {motif.philosophy}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {hoveredInfo && (
        <MotifHistoryPopover
          motif={hoveredInfo.motif}
          swatchUrl={motifSwatches[hoveredInfo.motif.id]}
          anchorRect={hoveredInfo.rect}
        />
      )}
    </aside>
  );
};
