import type { BatikColorMode, BatikMotif, GarmentItem } from "../data/batikCatalog";

export interface EffectivePalette {
  base: string;
  primary: string;
  secondary: string;
  accent: string;
}

export function resolveMotifColors(
  motif: BatikMotif,
  colorMode: BatikColorMode
): EffectivePalette {
  return colorMode.colors ? colorMode.colors : motif.colors;
}

function shadeHex(hex: string, pct: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
  const amt = Math.round(2.55 * pct);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Cache generated pattern tiles for zero-lag instant click switching
const tileCache = new Map<string, HTMLCanvasElement>();

export function createBatikTileCanvas(
  motif: BatikMotif,
  colorMode: BatikColorMode,
  size = 160
): HTMLCanvasElement {
  const key = `${motif.id}_${colorMode.id}_${size}`;
  const cached = tileCache.get(key);
  if (cached) return cached;

  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;
  const ctx = tile.getContext("2d")!;
  const c = resolveMotifColors(motif, colorMode);

  // Cotton mori weave background
  ctx.fillStyle = c.base;
  ctx.fillRect(0, 0, size, size);

  // Subtle woven linen grain
  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 1;
  for (let i = 0; i < size; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  switch (motif.patternType) {
    case "parang": {
      // Authentic diagonal Parang waves
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(-Math.PI / 4);
      const step = size / 4;
      for (let y = -size * 1.5; y <= size * 1.5; y += step) {
        // Dark dividing band with mlinjon diamonds
        ctx.fillStyle = c.secondary;
        ctx.fillRect(-size * 1.5, y - 4, size * 3, 8);
        for (let x = -size * 1.5; x <= size * 1.5; x += step * 0.85) {
          // Mlinjon diamond
          ctx.fillStyle = c.accent;
          ctx.beginPath();
          ctx.moveTo(x, y - 4);
          ctx.lineTo(x + 5, y);
          ctx.lineTo(x, y + 4);
          ctx.lineTo(x - 5, y);
          ctx.closePath();
          ctx.fill();

          // S-curved Parang blade
          ctx.fillStyle = c.primary;
          ctx.beginPath();
          ctx.ellipse(x + step * 0.35, y + step * 0.45, step * 0.32, step * 0.16, 0.3, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = c.secondary;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(x + step * 0.18, y + step * 0.5, step * 0.14, 0, Math.PI * 1.4);
          ctx.stroke();
        }
      }
      ctx.restore();
      break;
    }

    case "kawung": {
      const cell = size / 2;
      for (let gx = 0; gx <= 2; gx++) {
        for (let gy = 0; gy <= 2; gy++) {
          const cx = gx * cell;
          const cy = gy * cell;
          const r = cell * 0.42;
          // 4 symmetrical petals
          for (let a = 0; a < 4; a++) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate((a * Math.PI) / 2 + Math.PI / 4);
            ctx.fillStyle = c.primary;
            ctx.beginPath();
            ctx.ellipse(r * 0.56, 0, r * 0.52, r * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = c.secondary;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Inner dot pairs
            ctx.fillStyle = c.accent;
            ctx.beginPath();
            ctx.arc(r * 0.7, 0, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          // Center medallion
          ctx.fillStyle = c.accent;
          ctx.beginPath();
          ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case "megamendung": {
      const drawCloud = (cx: number, cy: number, scale: number) => {
        const layers = [c.primary, c.secondary, c.accent];
        layers.forEach((col, idx) => {
          const s = scale * (1 - idx * 0.22);
          ctx.fillStyle = col;
          ctx.strokeStyle = c.accent;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(cx - 38 * s, cy + 8 * s);
          ctx.bezierCurveTo(cx - 42 * s, cy - 16 * s, cx - 16 * s, cy - 26 * s, cx, cy - 18 * s);
          ctx.bezierCurveTo(cx + 18 * s, cy - 28 * s, cx + 44 * s, cy - 14 * s, cx + 38 * s, cy + 8 * s);
          ctx.bezierCurveTo(cx + 24 * s, cy + 20 * s, cx - 22 * s, cy + 20 * s, cx - 38 * s, cy + 8 * s);
          ctx.fill();
          if (idx === 2) ctx.stroke();
        });
      };
      drawCloud(size * 0.25, size * 0.28, 0.9);
      drawCloud(size * 0.78, size * 0.25, 0.75);
      drawCloud(size * 0.5, size * 0.75, 0.95);
      drawCloud(size * 0.02, size * 0.75, 0.75);
      drawCloud(size * 1.02, size * 0.75, 0.75);
      break;
    }

    case "sidomukti": {
      const half = size / 2;
      for (let gx = 0; gx < 2; gx++) {
        for (let gy = 0; gy < 2; gy++) {
          const cx = gx * half + half / 2;
          const cy = gy * half + half / 2;
          // Diamond frame
          ctx.strokeStyle = c.primary;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy - half * 0.46);
          ctx.lineTo(cx + half * 0.46, cy);
          ctx.lineTo(cx, cy + half * 0.46);
          ctx.lineTo(cx - half * 0.46, cy);
          ctx.closePath();
          ctx.stroke();

          // Butterfly / Meru core
          ctx.fillStyle = (gx + gy) % 2 === 0 ? c.primary : c.secondary;
          ctx.beginPath();
          ctx.ellipse(cx - 10, cy, 11, 7, -0.4, 0, Math.PI * 2);
          ctx.ellipse(cx + 10, cy, 11, 7, 0.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = c.accent;
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case "sekarjagad": {
      const cells = [
        [0.25, 0.25, c.primary],
        [0.75, 0.25, c.secondary],
        [0.25, 0.75, c.secondary],
        [0.75, 0.75, c.primary],
        [0.5, 0.5, c.accent],
      ] as const;
      cells.forEach(([fx, fy, col]) => {
        const cx = fx * size;
        const cy = fy * size;
        ctx.fillStyle = col;
        ctx.strokeStyle = c.accent;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let a = 0; a < 8; a++) {
          const ang = (a * Math.PI) / 4;
          const rad = size * (a % 2 === 0 ? 0.23 : 0.19);
          const px = cx + Math.cos(ang) * rad;
          const py = cy + Math.sin(ang) * rad;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Flower inner
        ctx.fillStyle = c.base;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }

    case "truntum": {
      const step = size / 4;
      for (let gx = 0; gx < 4; gx++) {
        for (let gy = 0; gy < 4; gy++) {
          const cx = gx * step + step / 2;
          const cy = gy * step + step / 2;
          // 8-petal jasmine star
          for (let a = 0; a < 8; a++) {
            const ang = (a * Math.PI) / 4;
            ctx.fillStyle = a % 2 === 0 ? c.primary : c.secondary;
            ctx.beginPath();
            ctx.ellipse(
              cx + Math.cos(ang) * 8,
              cy + Math.sin(ang) * 8,
              5,
              2.3,
              ang,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
          ctx.fillStyle = c.accent;
          ctx.beginPath();
          ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case "tujuhrupa":
    case "tiganegeri": {
      // Flowing coastal floral tendrils + blooms
      ctx.strokeStyle = c.secondary;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.25);
      ctx.bezierCurveTo(size * 0.35, 0, size * 0.65, size * 0.5, size, size * 0.25);
      ctx.moveTo(0, size * 0.75);
      ctx.bezierCurveTo(size * 0.35, size * 0.5, size * 0.65, size, size, size * 0.75);
      ctx.stroke();

      const blooms = [
        [0.25, 0.25],
        [0.75, 0.3],
        [0.5, 0.55],
        [0.25, 0.8],
        [0.8, 0.8],
      ];
      blooms.forEach(([fx, fy], idx) => {
        const cx = fx * size;
        const cy = fy * size;
        for (let p = 0; p < 6; p++) {
          const ang = (p * Math.PI) / 3;
          ctx.fillStyle = idx % 2 === 0 ? c.primary : c.accent;
          ctx.beginPath();
          ctx.ellipse(cx + Math.cos(ang) * 10, cy + Math.sin(ang) * 10, 7, 4, ang, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = c.base;
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      // Cecek dots
      ctx.fillStyle = c.secondary;
      for (let i = 0; i < 24; i++) {
        ctx.beginPath();
        ctx.arc(((i * 37) % size), ((i * 53) % size), 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case "gentongan": {
      // Bold Madura geometric curves & contrasting dots
      ctx.strokeStyle = c.primary;
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const y = (i + 0.5) * (size / 4);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(size * 0.25, y - 18, size * 0.5, y);
        ctx.quadraticCurveTo(size * 0.75, y + 18, size, y);
        ctx.stroke();
      }
      ctx.fillStyle = c.secondary;
      for (let gx = 0; gx < 4; gx++) {
        for (let gy = 0; gy < 4; gy++) {
          ctx.beginPath();
          ctx.arc((gx + 0.5) * (size / 4), (gy + 0.5) * (size / 4), 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case "bali_prapen":
    case "dayak":
    case "cendrawasih": {
      // Rich Nusantara organic symmetry + gold prada linework
      const half = size / 2;
      ctx.strokeStyle = c.primary;
      ctx.lineWidth = 2.2;
      [
        [half * 0.5, half * 0.5],
        [half * 1.5, half * 0.5],
        [half * 0.5, half * 1.5],
        [half * 1.5, half * 1.5],
      ].forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, half * 0.34, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = c.secondary;
        ctx.beginPath();
        ctx.moveTo(cx, cy - half * 0.38);
        ctx.quadraticCurveTo(cx + half * 0.28, cy, cx, cy + half * 0.38);
        ctx.quadraticCurveTo(cx - half * 0.28, cy, cx, cy - half * 0.38);
        ctx.fill();

        ctx.fillStyle = c.primary;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Decorative spiral accents
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(half, half, half * 0.22, 0, Math.PI * 1.6);
      ctx.stroke();
      break;
    }
  }

  tileCache.set(key, tile);
  return tile;
}

export function renderBatikSwatchDataUrl(
  motif: BatikMotif,
  colorMode: BatikColorMode
): string {
  const tile = createBatikTileCanvas(motif, colorMode, 256);
  return tile.toDataURL("image/png");
}

/**
 * Draws the selected garment cut filled with the active Batik tile pattern
 * aligned around origin (0,0) = torso center.
 */
export function drawBatikGarmentOnCanvas(
  ctx: CanvasRenderingContext2D,
  item: GarmentItem,
  motif: BatikMotif,
  colorMode: BatikColorMode,
  patternScale = 0.65
) {
  const palette = resolveMotifColors(motif, colorMode);
  const tile = createBatikTileCanvas(motif, colorMode, 160);
  const pattern = ctx.createPattern(tile, "repeat");

  ctx.save();

  if (item.usesBatikPattern && pattern) {
    if (pattern.setTransform) {
      const m = new DOMMatrix();
      m.scaleSelf(patternScale, patternScale);
      pattern.setTransform(m);
    }
    ctx.fillStyle = pattern;
  } else {
    ctx.fillStyle = item.solidFallbackColor || palette.base;
  }

  ctx.strokeStyle = shadeHex(palette.base, -35);
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";

  const addFabricShading = (
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, "rgba(0,0,0,0.22)");
    grad.addColorStop(0.25, "rgba(255,255,255,0.08)");
    grad.addColorStop(0.55, "rgba(0,0,0,0.03)");
    grad.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = grad;
    ctx.fill();
  };

  switch (item.shape) {
    case "kemeja_panjang":
    case "tunik_modern": {
      const bottomY = item.shape === "tunik_modern" ? 95 : 58;
      ctx.beginPath();
      ctx.moveTo(-36, -155);
      ctx.lineTo(36, -155);
      ctx.lineTo(96, -128);
      ctx.lineTo(122, 30);
      ctx.lineTo(92, 34);
      ctx.lineTo(72, -74);
      ctx.lineTo(66, bottomY);
      ctx.lineTo(-66, bottomY);
      ctx.lineTo(-72, -74);
      ctx.lineTo(-92, 34);
      ctx.lineTo(-122, 30);
      ctx.lineTo(-96, -128);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      addFabricShading(-100, 0, 100, 0);

      // Collar & placket
      ctx.fillStyle = shadeHex(palette.primary, -10);
      ctx.beginPath();
      ctx.moveTo(-36, -155);
      ctx.lineTo(-14, -118);
      ctx.lineTo(0, -138);
      ctx.lineTo(14, -118);
      ctx.lineTo(36, -155);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -138);
      ctx.lineTo(0, bottomY);
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.stroke();
      break;
    }

    case "kemeja_pendek": {
      ctx.beginPath();
      ctx.moveTo(-36, -155);
      ctx.lineTo(36, -155);
      ctx.lineTo(96, -128);
      ctx.lineTo(116, -42);
      ctx.lineTo(82, -32);
      ctx.lineTo(68, -76);
      ctx.lineTo(64, 56);
      ctx.lineTo(-64, 56);
      ctx.lineTo(-68, -76);
      ctx.lineTo(-82, -32);
      ctx.lineTo(-116, -42);
      ctx.lineTo(-96, -128);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      addFabricShading(-90, 0, 90, 0);

      ctx.fillStyle = shadeHex(palette.primary, -10);
      ctx.beginPath();
      ctx.moveTo(-36, -155);
      ctx.lineTo(-14, -118);
      ctx.lineTo(0, -138);
      ctx.lineTo(14, -118);
      ctx.lineTo(36, -155);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case "kebaya_kutubaru":
    case "blouse_peplum": {
      const flare = item.shape === "blouse_peplum" ? 82 : 68;
      ctx.beginPath();
      ctx.moveTo(-34, -152);
      ctx.lineTo(34, -152);
      ctx.lineTo(90, -126);
      ctx.lineTo(112, 18);
      ctx.lineTo(86, 22);
      ctx.lineTo(68, -76);
      ctx.lineTo(54, 8);
      ctx.lineTo(flare, 76);
      ctx.lineTo(-flare, 76);
      ctx.lineTo(-54, 8);
      ctx.lineTo(-68, -76);
      ctx.lineTo(-86, 22);
      ctx.lineTo(-112, 18);
      ctx.lineTo(-90, -126);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      addFabricShading(-85, 0, 85, 0);

      // Kutubaru center panel
      if (item.shape === "kebaya_kutubaru") {
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.fillRect(-16, -125, 32, 118);
      }
      break;
    }

    case "rok_jarik":
    case "rok_span": {
      const wTop = 60;
      const wBot = item.shape === "rok_jarik" ? 72 : 64;
      ctx.beginPath();
      ctx.moveTo(-wTop, 45);
      ctx.lineTo(wTop, 45);
      ctx.lineTo(wBot, 315);
      ctx.lineTo(-wBot, 315);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      addFabricShading(-70, 150, 70, 150);

      // Vertical Jarik pleat line
      ctx.strokeStyle = "rgba(0,0,0,0.38)";
      ctx.beginPath();
      ctx.moveTo(-12, 48);
      ctx.lineTo(-18, 315);
      ctx.stroke();
      break;
    }

    case "celana_kulot":
    case "celana_bahan": {
      const flare = item.shape === "celana_kulot" ? 74 : 62;
      ctx.beginPath();
      ctx.moveTo(-58, 45);
      ctx.lineTo(58, 45);
      ctx.lineTo(flare, 320);
      ctx.lineTo(14, 320);
      ctx.lineTo(0, 120);
      ctx.lineTo(-14, 320);
      ctx.lineTo(-flare, 320);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      addFabricShading(-65, 160, 65, 160);
      break;
    }

    case "blazer_batik":
    case "kimono_outer": {
      const len = item.shape === "kimono_outer" ? 95 : 74;
      // Left panel
      ctx.beginPath();
      ctx.moveTo(-40, -158);
      ctx.lineTo(-14, -158);
      ctx.lineTo(-14, len);
      ctx.lineTo(-68, len);
      ctx.lineTo(-76, -74);
      ctx.lineTo(-96, 30);
      ctx.lineTo(-124, 24);
      ctx.lineTo(-100, -130);
      ctx.closePath();
      // Right panel
      ctx.moveTo(40, -158);
      ctx.lineTo(14, -158);
      ctx.lineTo(14, len);
      ctx.lineTo(68, len);
      ctx.lineTo(76, -74);
      ctx.lineTo(96, 30);
      ctx.lineTo(124, 24);
      ctx.lineTo(100, -130);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case "selendang_sampur": {
      ctx.beginPath();
      ctx.moveTo(-78, -148);
      ctx.lineTo(-42, -148);
      ctx.lineTo(76, 95);
      ctx.lineTo(42, 95);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case "dress_gamis":
    case "sarimbit_set":
    case "beskap_set": {
      ctx.beginPath();
      ctx.moveTo(-36, -155);
      ctx.lineTo(36, -155);
      ctx.lineTo(96, -128);
      ctx.lineTo(118, 22);
      ctx.lineTo(90, 26);
      ctx.lineTo(72, -74);
      ctx.lineTo(84, 315);
      ctx.lineTo(-84, 315);
      ctx.lineTo(-72, -74);
      ctx.lineTo(-90, 26);
      ctx.lineTo(-118, 22);
      ctx.lineTo(-96, -128);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      addFabricShading(-90, 60, 90, 60);
      break;
    }

    case "peci": {
      ctx.beginPath();
      ctx.roundRect(-42, -305, 84, 34, 8);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case "blangkon": {
      ctx.beginPath();
      ctx.ellipse(0, -288, 44, 22, 0, Math.PI, Math.PI * 2);
      ctx.lineTo(44, -276);
      ctx.lineTo(-44, -276);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case "hijab_senada": {
      ctx.beginPath();
      ctx.arc(0, -258, 54, Math.PI * 0.85, Math.PI * 2.15);
      ctx.quadraticCurveTo(64, -182, 46, -140);
      ctx.quadraticCurveTo(0, -120, -46, -140);
      ctx.quadraticCurveTo(-64, -182, -52, -238);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case "tas_tenun": {
      ctx.beginPath();
      ctx.roundRect(84, 34, 50, 42, 8);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = palette.accent;
      ctx.beginPath();
      ctx.arc(109, 34, 14, Math.PI, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}
