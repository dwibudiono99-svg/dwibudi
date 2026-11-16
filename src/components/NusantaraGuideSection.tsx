import React from "react";
import type { BatikColorMode, BatikMotif } from "../data/batikCatalog";
import {
  renderBatikSwatchDataUrl,
  resolveMotifColors,
} from "../utils/batikPatternEngine";

interface NusantaraGuideSectionProps {
  selectedMotif: BatikMotif;
  selectedColorMode: BatikColorMode;
}

export const NusantaraGuideSection: React.FC<NusantaraGuideSectionProps> = ({
  selectedMotif,
  selectedColorMode,
}) => {
  const swatchUrl = renderBatikSwatchDataUrl(selectedMotif, selectedColorMode);
  const palette = resolveMotifColors(selectedMotif, selectedColorMode);

  return (
    <section
      id="panduan-pose"
      className="mx-auto mt-8 max-w-[1440px] border-t border-white/10 px-6 py-10"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
        {/* Active Batik Motif Spotlight */}
        <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#1A1816] p-6 sm:flex-row sm:items-center lg:col-span-5">
          <img
            src={swatchUrl}
            alt={`Tekstur ${selectedMotif.name}`}
            referrerPolicy="no-referrer"
            className="h-28 w-28 shrink-0 rounded-lg border border-white/15 object-cover"
          />
          <div className="min-w-0">
            <div className="text-xs font-medium text-[#D99B26]">
              {selectedMotif.regionLabel} · {selectedMotif.origin}
            </div>
            <h3 className="font-display mt-1 text-xl font-bold text-[#F4F1EA]">
              {selectedMotif.name}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[#B8B0A4]">
              {selectedMotif.philosophy}. Pewarnaan aktif menggunakan mode{" "}
              <span className="font-medium text-[#F4F1EA]">
                {selectedColorMode.name}
              </span>
              .
            </p>
            <div className="mt-3 flex items-center gap-2">
              {[
                palette.base,
                palette.primary,
                palette.secondary,
                palette.accent,
              ].map((hex, i) => (
                <span
                  key={`${hex}-${i}`}
                  className="h-3.5 w-3.5 rounded-full border border-white/20"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 3-Step Pose Fitting Workflow */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:col-span-7">
          <div className="border-t border-white/10 pt-4">
            <div className="font-mono-num text-xs font-semibold text-[#D99B26]">
              01. Unggah Foto Model
            </div>
            <h4 className="mt-1.5 text-sm font-semibold text-[#F4F1EA]">
              Gunakan Foto Sendiri atau Studio
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-[#9A9185]">
              Unggah foto potret atau seluruh badan. Sistem otomatis memetakan
              posisi bahu, kemiringan badan, dan proporsi torso.
            </p>
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="font-mono-num text-xs font-semibold text-[#D99B26]">
              02. Mode Klik Batik
            </div>
            <h4 className="mt-1.5 text-sm font-semibold text-[#F4F1EA]">
              Ganti Motif &amp; Potongan Seketika
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-[#9A9185]">
              Klik salah satu dari 12 motif batik Nusantara dan padukan dengan
              potongan kemeja, kebaya kutubaru, tunik, blazer, atau jarik.
            </p>
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="font-mono-num text-xs font-semibold text-[#D99B26]">
              03. Fitting AI Presisi Pose
            </div>
            <h4 className="mt-1.5 text-sm font-semibold text-[#F4F1EA]">
              Kunci Wajah &amp; Lipatan Kain Alami
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-[#9A9185]">
              Tekan tombol Pasang Batik Presisi AI agar kain batik mengikuti
              lekuk lengan, bayangan, dan pose foto Anda secara fotorealistis.
            </p>
          </div>
        </div>
      </div>

      <footer className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-[#8E867B] sm:flex-row sm:items-center">
        <span>BatikFit Nusantara · Studio Fitting Busana Batik Indonesia</span>
        <span>
          Parang · Kawung · Mega Mendung · Sekar Jagad · Gentongan · Dayak ·
          Papua
        </span>
      </footer>
    </section>
  );
};
