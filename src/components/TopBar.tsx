import React from "react";
import { Download } from "lucide-react";

interface TopBarProps {
  onDownloadPng: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onDownloadPng }) => {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#141311]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-6 py-3.5">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#studio-fitting"
          className="font-display text-xl font-bold tracking-tight text-[#F4F1EA] whitespace-nowrap shrink-0"
        >
          BatikFit Nusantara
        </a>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#B8B0A4]">
          <a
            href="#studio-fitting"
            className="hover:text-[#F4F1EA] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Studio Fitting
          </a>
          <a
            href="#katalog-batik"
            className="hover:text-[#F4F1EA] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Katalog Batik
          </a>
          <a
            href="#potongan-busana"
            className="hover:text-[#F4F1EA] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Potongan Busana
          </a>
          <a
            href="#panduan-pose"
            className="hover:text-[#F4F1EA] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Panduan Pose
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onDownloadPng}
            className="inline-flex items-center gap-2 rounded-lg bg-[#D99B26] px-4 py-2 text-xs font-semibold text-[#11100F] transition-colors hover:bg-[#E5AA38] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D99B26] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Unduh Hasil PNG</span>
          </button>
        </div>
      </div>
    </header>
  );
};
