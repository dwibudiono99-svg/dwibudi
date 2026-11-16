import type {
  BatikColorMode,
  BatikMotif,
  GarmentItem,
  PosePoint,
  PoseSkeleton,
} from "../data/batikCatalog";

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
  const num = parseInt(
    clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean,
    16
  );
  const amt = Math.round(2.55 * pct);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

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

  ctx.fillStyle = c.base;
  ctx.fillRect(0, 0, size, size);

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
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(-Math.PI / 4);
      const step = size / 4;
      for (let y = -size * 1.5; y <= size * 1.5; y += step) {
        ctx.fillStyle = c.secondary;
        ctx.fillRect(-size * 1.5, y - 4, size * 3, 8);
        for (let x = -size * 1.5; x <= size * 1.5; x += step * 0.85) {
          ctx.fillStyle = c.accent;
          ctx.beginPath();
          ctx.moveTo(x, y - 4);
          ctx.lineTo(x + 5, y);
          ctx.lineTo(x, y + 4);
          ctx.lineTo(x - 5, y);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = c.primary;
          ctx.beginPath();
          ctx.ellipse(
            x + step * 0.35,
            y + step * 0.45,
            step * 0.32,
            step * 0.16,
            0.3,
            0,
            Math.PI * 2
          );
          ctx.fill();

          ctx.strokeStyle = c.secondary;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(
            x + step * 0.18,
            y + step * 0.5,
            step * 0.14,
            0,
            Math.PI * 1.4
          );
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
            ctx.fillStyle = c.accent;
            ctx.beginPath();
            ctx.arc(r * 0.7, 0, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
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
          ctx.bezierCurveTo(
            cx - 42 * s,
            cy - 16 * s,
            cx - 16 * s,
            cy - 26 * s,
            cx,
            cy - 18 * s
          );
          ctx.bezierCurveTo(
            cx + 18 * s,
            cy - 28 * s,
            cx + 44 * s,
            cy - 14 * s,
            cx + 38 * s,
            cy + 8 * s
          );
          ctx.bezierCurveTo(
            cx + 24 * s,
            cy + 20 * s,
            cx - 22 * s,
            cy + 20 * s,
            cx - 38 * s,
            cy + 8 * s
          );
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
          ctx.strokeStyle = c.primary;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy - half * 0.46);
          ctx.lineTo(cx + half * 0.46, cy);
          ctx.lineTo(cx, cy + half * 0.46);
          ctx.lineTo(cx - half * 0.46, cy);
          ctx.closePath();
          ctx.stroke();

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
      ctx.strokeStyle = c.secondary;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.25);
      ctx.bezierCurveTo(
        size * 0.35,
        0,
        size * 0.65,
        size * 0.5,
        size,
        size * 0.25
      );
      ctx.moveTo(0, size * 0.75);
      ctx.bezierCurveTo(
        size * 0.35,
        size * 0.5,
        size * 0.65,
        size,
        size,
        size * 0.75
      );
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
          ctx.ellipse(
            cx + Math.cos(ang) * 10,
            cy + Math.sin(ang) * 10,
            7,
            4,
            ang,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.fillStyle = c.base;
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = c.secondary;
      for (let i = 0; i < 24; i++) {
        ctx.beginPath();
        ctx.arc((i * 37) % size, (i * 53) % size, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case "gentongan": {
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
          ctx.arc(
            (gx + 0.5) * (size / 4),
            (gy + 0.5) * (size / 4),
            4.5,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
      break;
    }

    case "bali_prapen":
    case "dayak":
    case "cendrawasih": {
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

function lerpPt(a: PosePoint, b: PosePoint, t: number): PosePoint {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function dist(a: PosePoint, b: PosePoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Draws a tapered sleeve tube along shoulder -> elbow -> (optional wrist)
 */
function traceArmSleevePath(
  ctx: CanvasRenderingContext2D,
  shoulder: PosePoint,
  elbow: PosePoint,
  wrist: PosePoint,
  lengthMode: "long" | "short",
  upperRadius: number,
  cuffRadius: number,
  inwardSideSign: number
) {
  const endPt = lengthMode === "short" ? lerpPt(shoulder, elbow, 0.72) : wrist;
  const midPt = lengthMode === "short" ? lerpPt(shoulder, elbow, 0.36) : elbow;

  const angle1 = Math.atan2(midPt.y - shoulder.y, midPt.x - shoulder.x);
  const angle2 = Math.atan2(endPt.y - midPt.y, endPt.x - midPt.x);

  const perp1 = {
    x: -Math.sin(angle1) * inwardSideSign,
    y: Math.cos(angle1) * inwardSideSign,
  };
  const perp2 = {
    x: -Math.sin(angle2) * inwardSideSign,
    y: Math.cos(angle2) * inwardSideSign,
  };

  const midR = (upperRadius + cuffRadius) * 0.52;

  ctx.beginPath();
  ctx.moveTo(
    shoulder.x + perp1.x * upperRadius,
    shoulder.y + perp1.y * upperRadius
  );
  ctx.lineTo(midPt.x + perp1.x * midR, midPt.y + perp1.y * midR);
  ctx.lineTo(endPt.x + perp2.x * cuffRadius, endPt.y + perp2.y * cuffRadius);
  ctx.lineTo(endPt.x - perp2.x * cuffRadius, endPt.y - perp2.y * cuffRadius);
  ctx.lineTo(midPt.x - perp1.x * midR, midPt.y - perp1.y * midR);
  ctx.lineTo(
    shoulder.x - perp1.x * upperRadius,
    shoulder.y - perp1.y * upperRadius
  );
  ctx.closePath();
}

/**
 * Skeletal-aligned Batik garment renderer:
 * Maps torso, neckline, waist, hem, sleeves, skirts, and trousers directly onto
 * the uploaded model photo's detected 2D skeletal keypoints.
 */
export function drawSkeletalBatikGarment(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  skeleton: PoseSkeleton,
  item: GarmentItem,
  motif: BatikMotif,
  colorMode: BatikColorMode,
  options: {
    offsetX: number;
    offsetY: number;
    widthScale: number;
    lengthScale: number;
    patternScale: number;
    rotDeg?: number;
  }
) {
  const palette = resolveMotifColors(motif, colorMode);
  const tile = createBatikTileCanvas(motif, colorMode, 160);
  const pattern = ctx.createPattern(tile, "repeat");

  // Convert normalized skeleton landmarks to canvas pixels + fine-tuning offsets
  const centerAllX =
    ((skeleton.leftShoulder.x + skeleton.rightShoulder.x) / 2) * canvasW;
  const centerAllY =
    ((skeleton.leftShoulder.y + skeleton.leftHip.y) / 2) * canvasH;
  const rad = ((options.rotDeg ?? 0) * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);

  const toPx = (pt: PosePoint): PosePoint => {
    const dx = (pt.x * canvasW - centerAllX) * options.widthScale;
    const dy = (pt.y * canvasH - centerAllY) * options.lengthScale;
    return {
      x: centerAllX + dx * cosR - dy * sinR + options.offsetX,
      y: centerAllY + dx * sinR + dy * cosR + options.offsetY,
    };
  };

  const neck = toPx(skeleton.neck);
  const ls = toPx(skeleton.leftShoulder);
  const rs = toPx(skeleton.rightShoulder);
  const le = toPx(skeleton.leftElbow);
  const re = toPx(skeleton.rightElbow);
  const lw = toPx(skeleton.leftWrist);
  const rw = toPx(skeleton.rightWrist);
  const lh = toPx(skeleton.leftHip);
  const rh = toPx(skeleton.rightHip);
  const la = toPx(skeleton.leftAnkle);
  const ra = toPx(skeleton.rightAnkle);

  const shoulderWidth = Math.max(40, dist(ls, rs));
  const torsoHeight = Math.max(60, dist(lerpPt(ls, rs, 0.5), lerpPt(lh, rh, 0.5)));

  // Expand shoulders slightly for realistic fabric thickness
  const dirLR = {
    x: (ls.x - rs.x) / shoulderWidth,
    y: (ls.y - rs.y) / shoulderWidth,
  };
  const lsOuter = {
    x: ls.x + dirLR.x * shoulderWidth * 0.09,
    y: ls.y + dirLR.y * shoulderWidth * 0.09 - 4,
  };
  const rsOuter = {
    x: rs.x - dirLR.x * shoulderWidth * 0.09,
    y: rs.y - dirLR.y * shoulderWidth * 0.09 - 4,
  };

  // Neck collar opening anchors
  const collarL = lerpPt(neck, ls, 0.34);
  const collarR = lerpPt(neck, rs, 0.34);
  const neckDip = {
    x: neck.x,
    y: neck.y + torsoHeight * 0.14,
  };

  // Hip outer edges
  const hipMid = lerpPt(lh, rh, 0.5);
  const lhOuter = {
    x: lh.x + (lh.x - hipMid.x) * 0.32,
    y: lh.y,
  };
  const rhOuter = {
    x: rh.x + (rh.x - hipMid.x) * 0.32,
    y: rh.y,
  };

  ctx.save();

  const applyFillAndShade = (leftX: number, rightX: number) => {
    if (item.usesBatikPattern && pattern) {
      if (pattern.setTransform) {
        const m = new DOMMatrix();
        m.scaleSelf(options.patternScale, options.patternScale);
        pattern.setTransform(m);
      }
      ctx.fillStyle = pattern;
    } else {
      ctx.fillStyle = item.solidFallbackColor || palette.base;
    }
    ctx.fill();
    ctx.strokeStyle = shadeHex(palette.base, -35);
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Soft cylindrical body lighting gradient
    const g = ctx.createLinearGradient(leftX, 0, rightX, 0);
    g.addColorStop(0, "rgba(0,0,0,0.28)");
    g.addColorStop(0.28, "rgba(255,255,255,0.08)");
    g.addColorStop(0.55, "rgba(0,0,0,0.04)");
    g.addColorStop(1, "rgba(0,0,0,0.32)");
    ctx.fillStyle = g;
    ctx.fill();
  };

  const upperSleeveR = Math.max(11, shoulderWidth * 0.14);
  const wristSleeveR = Math.max(8, shoulderWidth * 0.1);

  switch (item.shape) {
    case "kemeja_panjang":
    case "kemeja_pendek":
    case "kebaya_kutubaru":
    case "tunik_modern":
    case "blouse_peplum": {
      const sleeveMode =
        item.shape === "kemeja_pendek" ? "short" : "long";
      const hemExtra =
        item.shape === "tunik_modern"
          ? torsoHeight * 0.42
          : item.shape === "kebaya_kutubaru" || item.shape === "blouse_peplum"
          ? torsoHeight * 0.22
          : torsoHeight * 0.14;
      const hemFlare =
        item.shape === "blouse_peplum" || item.shape === "kebaya_kutubaru"
          ? 1.15
          : 1.03;

      const hemL = {
        x: hipMid.x + (lhOuter.x - hipMid.x) * hemFlare,
        y: lhOuter.y + hemExtra,
      };
      const hemR = {
        x: hipMid.x + (rhOuter.x - hipMid.x) * hemFlare,
        y: rhOuter.y + hemExtra,
      };

      // Left & right articulated sleeves along Skeleton arms
      traceArmSleevePath(
        ctx,
        lsOuter,
        le,
        lw,
        sleeveMode,
        upperSleeveR,
        wristSleeveR,
        1
      );
      applyFillAndShade(lsOuter.x - 20, lsOuter.x + 30);

      traceArmSleevePath(
        ctx,
        rsOuter,
        re,
        rw,
        sleeveMode,
        upperSleeveR,
        wristSleeveR,
        -1
      );
      applyFillAndShade(rsOuter.x - 30, rsOuter.x + 20);

      // Torso body following shoulder & hip landmarks
      ctx.beginPath();
      ctx.moveTo(collarR.x, collarR.y);
      ctx.quadraticCurveTo(neckDip.x, neckDip.y, collarL.x, collarL.y);
      ctx.lineTo(lsOuter.x, lsOuter.y);
      ctx.lineTo(lhOuter.x, lhOuter.y);
      ctx.lineTo(hemL.x, hemL.y);
      ctx.lineTo(hemR.x, hemR.y);
      ctx.lineTo(rhOuter.x, rhOuter.y);
      ctx.lineTo(rsOuter.x, rsOuter.y);
      ctx.closePath();
      applyFillAndShade(rsOuter.x, lsOuter.x);

      // Collar / Kutubaru detail
      if (item.shape === "kemeja_panjang" || item.shape === "kemeja_pendek") {
        ctx.fillStyle = shadeHex(palette.primary, -8);
        ctx.beginPath();
        ctx.moveTo(collarR.x, collarR.y);
        ctx.lineTo(neckDip.x - 10, neckDip.y + 4);
        ctx.lineTo(neckDip.x, neckDip.y - 6);
        ctx.lineTo(neckDip.x + 10, neckDip.y + 4);
        ctx.lineTo(collarL.x, collarL.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.moveTo(neckDip.x, neckDip.y - 6);
        ctx.lineTo((hemL.x + hemR.x) / 2, (hemL.y + hemR.y) / 2);
        ctx.stroke();
      } else if (item.shape === "kebaya_kutubaru") {
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.beginPath();
        ctx.moveTo(neckDip.x - 11, neckDip.y);
        ctx.lineTo(neckDip.x + 11, neckDip.y);
        ctx.lineTo((hemL.x + hemR.x) / 2 + 12, (hemL.y + hemR.y) / 2);
        ctx.lineTo((hemL.x + hemR.x) / 2 - 12, (hemL.y + hemR.y) / 2);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case "blazer_batik":
    case "kimono_outer": {
      const hemExtra =
        item.shape === "kimono_outer" ? torsoHeight * 0.45 : torsoHeight * 0.25;
      // Sleeves
      traceArmSleevePath(
        ctx,
        lsOuter,
        le,
        lw,
        "long",
        upperSleeveR * 1.1,
        wristSleeveR * 1.1,
        1
      );
      applyFillAndShade(lsOuter.x - 20, lsOuter.x + 30);

      traceArmSleevePath(
        ctx,
        rsOuter,
        re,
        rw,
        "long",
        upperSleeveR * 1.1,
        wristSleeveR * 1.1,
        -1
      );
      applyFillAndShade(rsOuter.x - 30, rsOuter.x + 20);

      // Left open lapel panel
      const midHip = lerpPt(lhOuter, rhOuter, 0.5);
      ctx.beginPath();
      ctx.moveTo(collarL.x, collarL.y);
      ctx.lineTo(lsOuter.x, lsOuter.y);
      ctx.lineTo(lhOuter.x, lhOuter.y + hemExtra);
      ctx.lineTo(midHip.x + 12, lhOuter.y + hemExtra);
      ctx.lineTo(neckDip.x + 10, neckDip.y + 12);
      ctx.closePath();
      applyFillAndShade(midHip.x, lsOuter.x);

      // Right open lapel panel
      ctx.beginPath();
      ctx.moveTo(collarR.x, collarR.y);
      ctx.lineTo(rsOuter.x, rsOuter.y);
      ctx.lineTo(rhOuter.x, rhOuter.y + hemExtra);
      ctx.lineTo(midHip.x - 12, rhOuter.y + hemExtra);
      ctx.lineTo(neckDip.x - 10, neckDip.y + 12);
      ctx.closePath();
      applyFillAndShade(rsOuter.x, midHip.x);
      break;
    }

    case "selendang_sampur": {
      ctx.beginPath();
      ctx.moveTo(collarR.x - 6, collarR.y);
      ctx.lineTo(rsOuter.x, rsOuter.y);
      ctx.lineTo(lhOuter.x + 14, lhOuter.y + torsoHeight * 0.4);
      ctx.lineTo(lhOuter.x - 18, lhOuter.y + torsoHeight * 0.4);
      ctx.closePath();
      applyFillAndShade(rsOuter.x, lhOuter.x);
      break;
    }

    case "rok_jarik":
    case "rok_span": {
      const ankleL = { x: lhOuter.x + 6, y: la.y };
      const ankleR = { x: rhOuter.x - 6, y: ra.y };
      ctx.beginPath();
      ctx.moveTo(rhOuter.x, rhOuter.y - 6);
      ctx.lineTo(lhOuter.x, lhOuter.y - 6);
      ctx.lineTo(ankleL.x, ankleL.y);
      ctx.lineTo(ankleR.x, ankleR.y);
      ctx.closePath();
      applyFillAndShade(rhOuter.x, lhOuter.x);
      break;
    }

    case "celana_kulot":
    case "celana_bahan": {
      const crotch = {
        x: hipMid.x,
        y: hipMid.y + torsoHeight * 0.25,
      };
      const flare = item.shape === "celana_kulot" ? 24 : 15;
      ctx.beginPath();
      ctx.moveTo(rhOuter.x, rhOuter.y - 6);
      ctx.lineTo(lhOuter.x, lhOuter.y - 6);
      ctx.lineTo(la.x + flare, la.y);
      ctx.lineTo(la.x - flare * 0.8, la.y);
      ctx.lineTo(crotch.x, crotch.y);
      ctx.lineTo(ra.x + flare * 0.8, ra.y);
      ctx.lineTo(ra.x - flare, ra.y);
      ctx.closePath();
      applyFillAndShade(rhOuter.x, lhOuter.x);
      break;
    }

    case "dress_gamis":
    case "sarimbit_set":
    case "beskap_set": {
      traceArmSleevePath(
        ctx,
        lsOuter,
        le,
        lw,
        "long",
        upperSleeveR,
        wristSleeveR,
        1
      );
      applyFillAndShade(lsOuter.x - 20, lsOuter.x + 30);

      traceArmSleevePath(
        ctx,
        rsOuter,
        re,
        rw,
        "long",
        upperSleeveR,
        wristSleeveR,
        -1
      );
      applyFillAndShade(rsOuter.x - 30, rsOuter.x + 20);

      const hemFlare = item.shape === "dress_gamis" ? 24 : 8;
      ctx.beginPath();
      ctx.moveTo(collarR.x, collarR.y);
      ctx.quadraticCurveTo(neckDip.x, neckDip.y, collarL.x, collarL.y);
      ctx.lineTo(lsOuter.x, lsOuter.y);
      ctx.lineTo(lhOuter.x, lhOuter.y);
      ctx.lineTo(la.x + hemFlare + 12, la.y);
      ctx.lineTo(ra.x - hemFlare - 12, ra.y);
      ctx.lineTo(rhOuter.x, rhOuter.y);
      ctx.lineTo(rsOuter.x, rsOuter.y);
      ctx.closePath();
      applyFillAndShade(rsOuter.x, lsOuter.x);
      break;
    }

    case "peci": {
      const headY = neck.y - torsoHeight * 0.56;
      const w = shoulderWidth * 0.42;
      ctx.beginPath();
      ctx.roundRect(neck.x - w / 2, headY - 26, w, 26, 6);
      applyFillAndShade(neck.x - w / 2, neck.x + w / 2);
      break;
    }

    case "blangkon": {
      const headY = neck.y - torsoHeight * 0.54;
      const w = shoulderWidth * 0.44;
      ctx.beginPath();
      ctx.ellipse(neck.x, headY, w / 2, 18, 0, Math.PI, Math.PI * 2);
      ctx.lineTo(neck.x + w / 2, headY + 8);
      ctx.lineTo(neck.x - w / 2, headY + 8);
      ctx.closePath();
      applyFillAndShade(neck.x - w / 2, neck.x + w / 2);
      break;
    }

    case "hijab_senada": {
      const headY = neck.y - torsoHeight * 0.34;
      const r = shoulderWidth * 0.3;
      ctx.beginPath();
      ctx.arc(neck.x, headY, r, Math.PI * 0.85, Math.PI * 2.15);
      ctx.quadraticCurveTo(
        neck.x + r * 1.15,
        neck.y + 18,
        neck.x + r * 0.85,
        neck.y + 42
      );
      ctx.quadraticCurveTo(
        neck.x,
        neck.y + 52,
        neck.x - r * 0.85,
        neck.y + 42
      );
      ctx.quadraticCurveTo(
        neck.x - r * 1.15,
        neck.y + 18,
        neck.x - r * 0.95,
        headY + 4
      );
      applyFillAndShade(neck.x - r, neck.x + r);
      break;
    }

    case "tas_tenun": {
      const bagX = lw.x;
      const bagY = lw.y + 14;
      ctx.beginPath();
      ctx.roundRect(bagX - 20, bagY, 40, 32, 6);
      applyFillAndShade(bagX - 20, bagX + 20);
      ctx.strokeStyle = palette.accent;
      ctx.beginPath();
      ctx.arc(bagX, bagY, 10, Math.PI, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

export const SKELETON_BONES: Array<[keyof PoseSkeleton, keyof PoseSkeleton]> = [
  ["neck", "leftShoulder"],
  ["neck", "rightShoulder"],
  ["leftShoulder", "rightShoulder"],
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftWrist"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
  ["leftShoulder", "leftHip"],
  ["rightShoulder", "rightHip"],
  ["leftHip", "rightHip"],
  ["leftHip", "leftAnkle"],
  ["rightHip", "rightAnkle"],
];

export function drawPoseSkeletonOverlay(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  skeleton: PoseSkeleton,
  activeJointKey: keyof PoseSkeleton | null
) {
  ctx.save();
  ctx.strokeStyle = "rgba(217, 155, 38, 0.88)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);

  for (const [aKey, bKey] of SKELETON_BONES) {
    const a = skeleton[aKey];
    const b = skeleton[bKey];
    ctx.beginPath();
    ctx.moveTo(a.x * canvasW, a.y * canvasH);
    ctx.lineTo(b.x * canvasW, b.y * canvasH);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  (Object.keys(skeleton) as Array<keyof PoseSkeleton>).forEach((key) => {
    const pt = skeleton[key];
    const px = pt.x * canvasW;
    const py = pt.y * canvasH;
    const isActive = activeJointKey === key;

    ctx.beginPath();
    ctx.arc(px, py, isActive ? 7 : 5, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? "#F4F1EA" : "#D99B26";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#11100F";
    ctx.stroke();
  });

  ctx.restore();
}

/**
 * Fallback non-skeletal avatar garment drawer (used in Manekin mode)
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
