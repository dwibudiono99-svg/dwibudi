import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Eye,
  EyeOff,
  Columns2,
  Bone,
} from "lucide-react";
import type {
  BatikColorMode,
  BatikMotif,
  GarmentSlot,
  PoseSkeleton,
} from "../data/batikCatalog";
import {
  drawBatikGarmentOnCanvas,
  drawPoseSkeletonOverlay,
  drawSkeletalBatikGarment,
} from "../utils/batikPatternEngine";
import {
  STUDIO_BACKDROPS,
  type AvatarConfig,
  type FaceAdjust,
  type PoseJoints,
  type SubjectMode,
} from "./ModelPosePanel";
import type { EquippedMap } from "./BatikWardrobePanel";

export const CANVAS_W = 450;
export const CANVAS_H = 600;

export interface GarmentTransform {
  x: number;
  y: number;
  scale: number;
  width: number;
  rot: number;
  patternScale: number;
}

export interface StudioCanvasHandle {
  exportPng: () => void;
  getCleanSubjectDataUrl: () => string;
  renderStudioCompositeDataUrl: (photoStyleLabel?: string) => string;
}

interface StudioCanvasProps {
  subjectMode: SubjectMode;
  studioModelImageUrl: string;
  uploadedPhotoDataUrl: string | null;
  photoScale: number;
  photoOffsetY: number;
  avatarConfig: AvatarConfig;
  poseJoints: PoseJoints;
  faceAdjust: FaceAdjust;
  activeSkeleton: PoseSkeleton;
  onChangeSkeleton: (next: PoseSkeleton) => void;
  showSkeleton: boolean;
  onToggleShowSkeleton: (val: boolean) => void;
  equipped: EquippedMap;
  selectedMotif: BatikMotif;
  selectedColorMode: BatikColorMode;
  transform: GarmentTransform;
  onChangeTransform: (next: GarmentTransform) => void;
  onResetTransform: () => void;
  showOverlay2D: boolean;
  onToggleShowOverlay2D: (val: boolean) => void;
  aiResultUrl: string | null;
  onClearAiResult: () => void;
  isGeneratingAi: boolean;
  onTriggerAiTryOn: () => void;
  photoStyle: string;
  onChangePhotoStyle: (style: string) => void;
  directorNote: string;
  onChangeDirectorNote: (note: string) => void;
  highQualityAi: boolean;
  onToggleHighQualityAi: (val: boolean) => void;
}

function shadeHexSimple(col: string, pct: number): string {
  const num = parseInt(col.replace("#", ""), 16);
  const amt = Math.round(2.55 * pct);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0xff) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

export const StudioCanvas = forwardRef<StudioCanvasHandle, StudioCanvasProps>(
  (
    {
      subjectMode,
      studioModelImageUrl,
      uploadedPhotoDataUrl,
      photoScale,
      photoOffsetY,
      avatarConfig,
      poseJoints,
      faceAdjust,
      activeSkeleton,
      onChangeSkeleton,
      showSkeleton,
      onToggleShowSkeleton,
      equipped,
      selectedMotif,
      selectedColorMode,
      transform,
      onChangeTransform,
      onResetTransform,
      showOverlay2D,
      onToggleShowOverlay2D,
      aiResultUrl,
      onClearAiResult,
      isGeneratingAi,
      onTriggerAiTryOn,
      photoStyle,
      onChangePhotoStyle,
      directorNote,
      onChangeDirectorNote,
      highQualityAi,
      onToggleHighQualityAi,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [loadedPhotoImg, setLoadedPhotoImg] =
      useState<HTMLImageElement | null>(null);
    const [loadedStudioImg, setLoadedStudioImg] =
      useState<HTMLImageElement | null>(null);
    const [loadedAiImg, setLoadedAiImg] = useState<HTMLImageElement | null>(
      null
    );

    const [compareMode, setCompareMode] = useState(false);
    const [compareRatio, setCompareRatio] = useState(0.5);
    const [activeJointKey, setActiveJointKey] = useState<
      keyof PoseSkeleton | null
    >(null);
    const draggingJointRef = useRef<keyof PoseSkeleton | null>(null);
    const draggingGarmentRef = useRef<{
      active: boolean;
      startX: number;
      startY: number;
    }>({ active: false, startX: 0, startY: 0 });
    const draggingCompareRef = useRef(false);

    useEffect(() => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setLoadedStudioImg(img);
      img.src = studioModelImageUrl;
    }, [studioModelImageUrl]);

    useEffect(() => {
      if (!uploadedPhotoDataUrl) {
        setLoadedPhotoImg(null);
        return;
      }
      const img = new Image();
      img.onload = () => setLoadedPhotoImg(img);
      img.src = uploadedPhotoDataUrl;
    }, [uploadedPhotoDataUrl]);

    useEffect(() => {
      if (!aiResultUrl) {
        setLoadedAiImg(null);
        setCompareMode(false);
        return;
      }
      const img = new Image();
      img.onload = () => setLoadedAiImg(img);
      img.src = aiResultUrl;
    }, [aiResultUrl]);

    const drawAvatar = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        const bg = STUDIO_BACKDROPS[avatarConfig.bgIdx] || STUDIO_BACKDROPS[0];
        const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
        g.addColorStop(0, bg[0]);
        g.addColorStop(1, bg[1]);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        const cx = CANVAS_W / 2;
        const skin = avatarConfig.skin;
        const fem = avatarConfig.gender === "female";
        const turnOffset = poseJoints.turn * 0.45;

        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.beginPath();
        ctx.ellipse(cx, 558, 84, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        if (avatarConfig.hair === "long") {
          ctx.fillStyle = "#1C1917";
          ctx.beginPath();
          ctx.roundRect(cx - 40 - turnOffset * 0.3, 98, 80, 130, 30);
          ctx.fill();
        }

        ctx.fillStyle = shadeHexSimple(skin, -15);
        ctx.beginPath();
        ctx.roundRect(cx - 13, 144, 26, 36, 8);
        ctx.fill();

        ctx.fillStyle = skin;
        const perspectiveScale = 1 - Math.abs(poseJoints.turn) * 0.005;
        const sw = (fem ? 55 : 66) * perspectiveScale;
        const ww = (fem ? 36 : 48) * perspectiveScale;
        ctx.beginPath();
        ctx.moveTo(cx - sw + turnOffset * 0.2, 185);
        ctx.lineTo(cx + sw + turnOffset * 0.2, 185);
        ctx.lineTo(cx + ww, 326);
        ctx.lineTo(cx - ww, 326);
        ctx.closePath();
        ctx.fill();

        ctx.lineCap = "round";
        ctx.lineWidth = fem ? 16 : 20;
        ctx.strokeStyle = skin;
        const radL = (poseJoints.armL * Math.PI) / 180;
        const radR = (poseJoints.armR * Math.PI) / 180;
        const shLX = cx - sw + 4 + turnOffset * 0.2;
        const shRX = cx + sw - 4 + turnOffset * 0.2;
        const shY = 192;

        if (avatarConfig.pose === "sitting_casual") {
          ctx.fillStyle = "#3F3F46";
          ctx.beginPath();
          ctx.roundRect(cx - 54, 364, 108, 12, 5);
          ctx.fill();
          ctx.fillRect(cx - 38, 376, 8, 175);
          ctx.fillRect(cx + 30, 376, 8, 175);
        }

        const elbLX = shLX - Math.sin(radL) * 72;
        const elbLY = shY + Math.cos(radL) * 72;
        const handLX =
          poseJoints.armL > 42
            ? cx - ww - 4
            : elbLX - Math.sin(radL * 0.5) * 66;
        const handLY =
          poseJoints.armL > 42 ? 312 : elbLY + Math.cos(radL * 0.5) * 66;
        ctx.beginPath();
        ctx.moveTo(shLX, shY);
        ctx.lineTo(elbLX, elbLY);
        ctx.lineTo(handLX, handLY);
        ctx.stroke();

        const elbRX = shRX + Math.sin(radR) * 72;
        const elbRY = shY + Math.cos(radR) * 72;
        const handRX =
          poseJoints.armR > 42
            ? cx + ww + 4
            : elbRX + Math.sin(radR * 0.5) * 66;
        const handRY =
          poseJoints.armR > 42 ? 312 : elbRY + Math.cos(radR * 0.5) * 66;
        ctx.beginPath();
        ctx.moveTo(shRX, shY);
        ctx.lineTo(elbRX, elbRY);
        ctx.lineTo(handRX, handRY);
        ctx.stroke();

        ctx.lineWidth = fem ? 20 : 23;
        ctx.strokeStyle = skin;
        const spreadRad = (poseJoints.legSpread * Math.PI) / 180;
        const hipLX = cx - 18;
        const hipRX = cx + 18;
        const hipY = 326;
        if (avatarConfig.pose === "sitting_casual") {
          ctx.beginPath();
          ctx.moveTo(hipLX, hipY);
          ctx.lineTo(cx - 32, 375);
          ctx.lineTo(cx - 32, 540);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(hipRX, hipY);
          ctx.lineTo(cx + 32, 375);
          ctx.lineTo(cx + 32, 540);
          ctx.stroke();
        } else {
          const footLX = hipLX - Math.sin(spreadRad) * 145;
          const footRX = hipRX + Math.sin(spreadRad) * 145;
          ctx.beginPath();
          ctx.moveTo(hipLX, hipY);
          ctx.lineTo(footLX, 545);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(hipRX, hipY);
          ctx.lineTo(footRX, 545);
          ctx.stroke();
        }

        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.ellipse(cx + turnOffset * 0.15, 117, 31, 37, 0, 0, Math.PI * 2);
        ctx.fill();

        const eyeShift = turnOffset * 0.35;
        ctx.fillStyle = "#18181B";
        ctx.beginPath();
        ctx.arc(cx - 11 + eyeShift, 114, 2.5, 0, Math.PI * 2);
        ctx.arc(cx + 11 + eyeShift, 114, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle =
          faceAdjust.touchup === "light_makeup" ? "#BE185D" : "#9F5848";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        if (faceAdjust.touchup === "gentle_smile") {
          ctx.arc(cx + eyeShift, 127, 9, 0.1 * Math.PI, 0.9 * Math.PI);
        } else {
          ctx.arc(cx + eyeShift, 129, 7, 0.15 * Math.PI, 0.85 * Math.PI);
        }
        ctx.stroke();

        if (avatarConfig.hair === "hijab") {
          ctx.fillStyle = "#3F3A34";
          ctx.beginPath();
          ctx.arc(
            cx + turnOffset * 0.15,
            122,
            40,
            Math.PI * 0.85,
            Math.PI * 2.15
          );
          ctx.quadraticCurveTo(cx + 48, 175, cx + 32, 205);
          ctx.quadraticCurveTo(cx, 215, cx - 32, 205);
          ctx.quadraticCurveTo(cx - 48, 175, cx - 38, 135);
          ctx.fill();
        } else {
          ctx.fillStyle = "#1C1917";
          if (avatarConfig.hair === "bun") {
            ctx.beginPath();
            ctx.arc(cx - turnOffset * 0.2, 76, 18, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.beginPath();
          ctx.arc(
            cx + turnOffset * 0.15,
            114,
            36,
            Math.PI * 0.95,
            Math.PI * 2.05
          );
          ctx.fill();
        }
      },
      [avatarConfig, poseJoints, faceAdjust]
    );

    const drawCleanSubject = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        const sepiaPct = Math.max(0, faceAdjust.warmth);
        const saturatePct = 100 + faceAdjust.warmth * 0.5;
        ctx.filter = `brightness(${faceAdjust.brightness}%) contrast(${faceAdjust.contrast}%) sepia(${sepiaPct}%) saturate(${saturatePct}%)`;

        if (subjectMode === "upload") {
          ctx.fillStyle = "#131210";
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          if (loadedPhotoImg) {
            const asp = loadedPhotoImg.width / loadedPhotoImg.height;
            const scaleFactor = photoScale / 100;
            let dh = CANVAS_H * scaleFactor;
            let dw = dh * asp;
            if (dw < CANVAS_W * scaleFactor) {
              dw = CANVAS_W * scaleFactor;
              dh = dw / asp;
            }
            ctx.drawImage(
              loadedPhotoImg,
              (CANVAS_W - dw) / 2,
              (CANVAS_H - dh) / 2 + photoOffsetY,
              dw,
              dh
            );
          } else {
            ctx.filter = "none";
            ctx.fillStyle = "#8E867B";
            ctx.font = "500 13px 'Plus Jakarta Sans', system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(
              "Unggah foto model pada panel kiri",
              CANVAS_W / 2,
              CANVAS_H / 2 - 8
            );
            ctx.font = "400 11px 'Plus Jakarta Sans', system-ui, sans-serif";
            ctx.fillStyle = "#6B645B";
            ctx.fillText(
              "atau pilih Model Studio Nusantara",
              CANVAS_W / 2,
              CANVAS_H / 2 + 12
            );
          }
        } else if (subjectMode === "studio") {
          ctx.fillStyle = "#131210";
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          if (loadedStudioImg) {
            const asp = loadedStudioImg.width / loadedStudioImg.height;
            let dh = CANVAS_H;
            let dw = dh * asp;
            if (dw < CANVAS_W) {
              dw = CANVAS_W;
              dh = dw / asp;
            }
            ctx.drawImage(
              loadedStudioImg,
              (CANVAS_W - dw) / 2,
              (CANVAS_H - dh) / 2,
              dw,
              dh
            );
          }
        } else {
          drawAvatar(ctx);
        }

        ctx.filter = "none";
      },
      [
        subjectMode,
        loadedPhotoImg,
        loadedStudioImg,
        photoScale,
        photoOffsetY,
        faceAdjust,
        drawAvatar,
      ]
    );

    const drawCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      if (loadedAiImg) {
        const asp = loadedAiImg.width / loadedAiImg.height;
        let dh = CANVAS_H;
        let dw = dh * asp;
        if (dw < CANVAS_W) {
          dw = CANVAS_W;
          dh = dw / asp;
        }
        if (compareMode) {
          ctx.drawImage(
            loadedAiImg,
            (CANVAS_W - dw) / 2,
            (CANVAS_H - dh) / 2,
            dw,
            dh
          );
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, CANVAS_W * compareRatio, CANVAS_H);
          ctx.clip();
          drawCleanSubject(ctx);
          ctx.restore();
        } else {
          ctx.drawImage(
            loadedAiImg,
            (CANVAS_W - dw) / 2,
            (CANVAS_H - dh) / 2,
            dw,
            dh
          );
        }
        return;
      }

      drawCleanSubject(ctx);

      const canDrawPhotoOverlay =
        subjectMode !== "upload" || Boolean(loadedPhotoImg);

      if (showOverlay2D && canDrawPhotoOverlay) {
        const order: GarmentSlot[] = equipped.fullset
          ? ["fullset", "accessory"]
          : ["bottom", "top", "outer", "accessory"];

        if (subjectMode === "avatar") {
          const bodySkewRad = (poseJoints.turn * 0.32 * Math.PI) / 180;
          ctx.save();
          ctx.translate(CANVAS_W / 2 + transform.x, CANVAS_H / 2 + transform.y);
          ctx.rotate(((transform.rot + poseJoints.turn * 0.18) * Math.PI) / 180);
          ctx.transform(1, 0, Math.tan(bodySkewRad) * 0.25, 1, 0, 0);
          ctx.scale(
            0.74 * transform.scale * transform.width,
            0.74 * transform.scale
          );
          for (const slot of order) {
            const item = equipped[slot];
            if (item) {
              drawBatikGarmentOnCanvas(
                ctx,
                item,
                selectedMotif,
                selectedColorMode,
                transform.patternScale
              );
            }
          }
          ctx.restore();
        } else {
          // Skeletal Pose-Mapped Batik Garment Overlay
          ctx.save();
          ctx.globalAlpha = 0.92;
          for (const slot of order) {
            const item = equipped[slot];
            if (item) {
              drawSkeletalBatikGarment(
                ctx,
                CANVAS_W,
                CANVAS_H,
                activeSkeleton,
                item,
                selectedMotif,
                selectedColorMode,
                {
                  offsetX: transform.x,
                  offsetY: transform.y,
                  widthScale: transform.width,
                  lengthScale: transform.scale,
                  patternScale: transform.patternScale,
                  rotDeg: transform.rot,
                }
              );
            }
          }
          ctx.restore();
        }
      }

      // Draw interactive skeletal landmarks if enabled
      if (showSkeleton && subjectMode !== "avatar" && canDrawPhotoOverlay) {
        drawPoseSkeletonOverlay(
          ctx,
          CANVAS_W,
          CANVAS_H,
          activeSkeleton,
          activeJointKey
        );
      }
    }, [
      loadedAiImg,
      compareMode,
      compareRatio,
      drawCleanSubject,
      showOverlay2D,
      subjectMode,
      loadedPhotoImg,
      poseJoints,
      transform,
      equipped,
      selectedMotif,
      selectedColorMode,
      activeSkeleton,
      showSkeleton,
      activeJointKey,
    ]);

    useEffect(() => {
      drawCanvas();
    }, [drawCanvas]);

    useImperativeHandle(
      ref,
      () => ({
        exportPng: () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const a = document.createElement("a");
          a.download = `batikfit-${selectedMotif.id}-${Date.now()}.png`;
          a.href = canvas.toDataURL("image/png");
          a.click();
        },
        getCleanSubjectDataUrl: () => {
          const offscreen = document.createElement("canvas");
          offscreen.width = CANVAS_W;
          offscreen.height = CANVAS_H;
          const offCtx = offscreen.getContext("2d")!;
          drawCleanSubject(offCtx);
          return offscreen.toDataURL("image/png");
        },
        renderStudioCompositeDataUrl: (photoStyleLabel?: string) => {
          const offscreen = document.createElement("canvas");
          offscreen.width = CANVAS_W;
          offscreen.height = CANVAS_H;
          const offCtx = offscreen.getContext("2d")!;

          drawCleanSubject(offCtx);

          const order: GarmentSlot[] = equipped.fullset
            ? ["fullset", "accessory"]
            : ["bottom", "top", "outer", "accessory"];

          if (subjectMode === "avatar") {
            const bodySkewRad = (poseJoints.turn * 0.32 * Math.PI) / 180;
            offCtx.save();
            offCtx.translate(
              CANVAS_W / 2 + transform.x,
              CANVAS_H / 2 + transform.y
            );
            offCtx.rotate(
              ((transform.rot + poseJoints.turn * 0.18) * Math.PI) / 180
            );
            offCtx.transform(1, 0, Math.tan(bodySkewRad) * 0.25, 1, 0, 0);
            offCtx.scale(
              0.74 * transform.scale * transform.width,
              0.74 * transform.scale
            );
            for (const slot of order) {
              const item = equipped[slot];
              if (item) {
                drawBatikGarmentOnCanvas(
                  offCtx,
                  item,
                  selectedMotif,
                  selectedColorMode,
                  transform.patternScale
                );
              }
            }
            offCtx.restore();
          } else {
            offCtx.save();
            offCtx.globalAlpha = 0.95;
            for (const slot of order) {
              const item = equipped[slot];
              if (item) {
                drawSkeletalBatikGarment(
                  offCtx,
                  CANVAS_W,
                  CANVAS_H,
                  activeSkeleton,
                  item,
                  selectedMotif,
                  selectedColorMode,
                  {
                    offsetX: transform.x,
                    offsetY: transform.y,
                    widthScale: transform.width,
                    lengthScale: transform.scale,
                    patternScale: transform.patternScale,
                    rotDeg: transform.rot,
                  }
                );
              }
            }
            offCtx.restore();
          }

          // Subtle studio lighting & vignette pass based on selected photoStyle
          const styleStr = (photoStyleLabel || photoStyle).toLowerCase();
          offCtx.save();
          if (styleStr.includes("pendopo")) {
            offCtx.fillStyle = "rgba(217, 155, 38, 0.08)";
            offCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          } else if (styleStr.includes("kantor")) {
            offCtx.fillStyle = "rgba(180, 205, 235, 0.05)";
            offCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          } else if (styleStr.includes("daylight")) {
            offCtx.fillStyle = "rgba(255, 248, 230, 0.06)";
            offCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          }
          const vig = offCtx.createRadialGradient(
            CANVAS_W / 2,
            CANVAS_H * 0.42,
            CANVAS_W * 0.3,
            CANVAS_W / 2,
            CANVAS_H / 2,
            CANVAS_H * 0.72
          );
          vig.addColorStop(0, "rgba(0,0,0,0)");
          vig.addColorStop(1, "rgba(0,0,0,0.22)");
          offCtx.fillStyle = vig;
          offCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          offCtx.restore();

          return offscreen.toDataURL("image/png");
        },
      }),
      [
        selectedMotif,
        selectedColorMode,
        drawCleanSubject,
        equipped,
        subjectMode,
        poseJoints,
        transform,
        activeSkeleton,
        photoStyle,
      ]
    );

    const getCanvasPos = (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left) * (CANVAS_W / rect.width),
        y: (clientY - rect.top) * (CANVAS_H / rect.height),
      };
    };

    const handleCanvasPointerDown = (
      e: React.MouseEvent<HTMLCanvasElement>
    ) => {
      if (loadedAiImg) return;
      const pos = getCanvasPos(e.clientX, e.clientY);

      // Check if clicking near a skeletal landmark joint
      if (showSkeleton && subjectMode !== "avatar") {
        const keys = Object.keys(activeSkeleton) as Array<keyof PoseSkeleton>;
        for (const key of keys) {
          const pt = activeSkeleton[key];
          const jx = pt.x * CANVAS_W;
          const jy = pt.y * CANVAS_H;
          if (Math.hypot(pos.x - jx, pos.y - jy) <= 14) {
            draggingJointRef.current = key;
            setActiveJointKey(key);
            return;
          }
        }
      }

      if (!showOverlay2D) return;
      draggingGarmentRef.current = {
        active: true,
        startX: pos.x - transform.x,
        startY: pos.y - transform.y,
      };
    };

    const handleCanvasPointerMove = (
      e: React.MouseEvent<HTMLCanvasElement>
    ) => {
      const pos = getCanvasPos(e.clientX, e.clientY);

      if (draggingJointRef.current) {
        const key = draggingJointRef.current;
        const nx = Math.max(0.02, Math.min(0.98, pos.x / CANVAS_W));
        const ny = Math.max(0.02, Math.min(0.98, pos.y / CANVAS_H));
        onChangeSkeleton({
          ...activeSkeleton,
          [key]: { x: nx, y: ny },
        });
        return;
      }

      if (!draggingGarmentRef.current.active) return;
      onChangeTransform({
        ...transform,
        x: Math.round(pos.x - draggingGarmentRef.current.startX),
        y: Math.round(pos.y - draggingGarmentRef.current.startY),
      });
    };

    const handleCanvasPointerUp = () => {
      draggingJointRef.current = null;
      draggingGarmentRef.current.active = false;
      setActiveJointKey(null);
    };

    const updateCompareFromClientX = (clientX: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const ratio = Math.max(
        0.05,
        Math.min(0.95, (clientX - rect.left) / rect.width)
      );
      setCompareRatio(ratio);
    };

    return (
      <section className="flex flex-col items-center gap-3.5 rounded-xl border border-white/10 bg-[#1A1816] p-4">
        {/* Canvas Top Bar */}
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-[#F4F1EA]">
              {loadedAiImg
                ? "Hasil Fitting Batik Presisi Pose"
                : "Ruang Fitting Kerangka Pose"}
            </h2>
            <p className="text-[11px] text-[#8E867B]">
              {selectedMotif.name} · {selectedMotif.origin}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {loadedAiImg ? (
              <>
                <button
                  type="button"
                  onClick={() => setCompareMode((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#D99B26]/60 bg-[#D99B26]/10 px-2.5 py-1 text-[11px] font-semibold text-[#F0C265] hover:bg-[#D99B26]/20 cursor-pointer whitespace-nowrap"
                >
                  <Columns2 className="h-3 w-3" />
                  <span>{compareMode ? "Tutup Bandingkan" : "Bandingkan"}</span>
                </button>
                <button
                  type="button"
                  onClick={onClearAiResult}
                  className="rounded-md border border-white/10 bg-[#24211E] px-2.5 py-1 text-[11px] font-medium text-[#D6CFC5] hover:text-white cursor-pointer whitespace-nowrap"
                >
                  Kembali ke Kerangka
                </button>
              </>
            ) : (
              <>
                {subjectMode !== "avatar" && (
                  <button
                    type="button"
                    onClick={() => onToggleShowSkeleton(!showSkeleton)}
                    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      showSkeleton
                        ? "border-[#D99B26] bg-[#D99B26]/15 text-[#F0C265]"
                        : "border-white/10 bg-[#24211E] text-[#D6CFC5] hover:text-white"
                    }`}
                  >
                    <Bone className="h-3 w-3" />
                    <span>Kerangka Pose</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onToggleShowOverlay2D(!showOverlay2D)}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-[#24211E] px-2.5 py-1 text-[11px] font-medium text-[#D6CFC5] hover:text-white cursor-pointer whitespace-nowrap"
                >
                  {showOverlay2D ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                  <span>{showOverlay2D ? "Busana Aktif" : "Foto Asli"}</span>
                </button>
                <button
                  type="button"
                  onClick={onResetTransform}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-[#24211E] px-2.5 py-1 text-[11px] font-medium text-[#D6CFC5] hover:text-white cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 3:4 Studio Fitting Viewport */}
        <div className="relative w-full max-w-[400px] overflow-hidden rounded-xl border border-white/10 bg-[#11100F] aspect-[3/4]">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onMouseDown={handleCanvasPointerDown}
            onMouseMove={handleCanvasPointerMove}
            onMouseUp={handleCanvasPointerUp}
            onMouseLeave={handleCanvasPointerUp}
            className={`block h-full w-full touch-none ${
              loadedAiImg || !showOverlay2D
                ? "cursor-default"
                : "cursor-grab active:cursor-grabbing"
            }`}
          />

          {/* Before / After Compare Overlay */}
          {loadedAiImg && compareMode && (
            <div
              onMouseDown={(e) => {
                draggingCompareRef.current = true;
                updateCompareFromClientX(e.clientX);
              }}
              onMouseMove={(e) => {
                if (draggingCompareRef.current) {
                  updateCompareFromClientX(e.clientX);
                }
              }}
              onMouseUp={() => {
                draggingCompareRef.current = false;
              }}
              onMouseLeave={() => {
                draggingCompareRef.current = false;
              }}
              onTouchStart={(e) => {
                draggingCompareRef.current = true;
                updateCompareFromClientX(e.touches[0].clientX);
              }}
              onTouchMove={(e) => {
                if (draggingCompareRef.current) {
                  updateCompareFromClientX(e.touches[0].clientX);
                }
              }}
              onTouchEnd={() => {
                draggingCompareRef.current = false;
              }}
              className="absolute inset-0 z-10 cursor-ew-resize select-none"
            >
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#D99B26]"
                style={{ left: `${compareRatio * 100}%` }}
              >
                <div className="absolute top-1/2 left-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#D99B26] text-[11px] font-bold text-[#11100F]">
                  ⇄
                </div>
              </div>
              <span className="pointer-events-none absolute top-3 left-3 rounded bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white">
                MODEL ASLI
              </span>
              <span className="pointer-events-none absolute top-3 right-3 rounded bg-[#D99B26] px-2 py-0.5 text-[10px] font-semibold text-[#11100F]">
                HASIL FITTING
              </span>
            </div>
          )}

          {/* Loading Overlay */}
          {isGeneratingAi && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#11100F]/85 p-6 text-center backdrop-blur-xs">
              <div className="mb-3 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-[#D99B26]" />
              <div className="text-xs font-semibold text-[#F4F1EA]">
                Menyesuaikan Kain Batik ke Pose Foto...
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#A79F93]">
                Mempertahankan 100% wajah asli &amp; postur tubuh sambil
                memasang motif {selectedMotif.name}
              </p>
            </div>
          )}

          {/* Subtle Hint */}
          {!loadedAiImg && !isGeneratingAi && (
            <div className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-black/75 px-3 py-1 text-[10px] text-[#D6CFC5] whitespace-nowrap">
              {showSkeleton
                ? "Seret titik sendi kuning untuk menyelaraskan bahu & lengan"
                : "Seret busana di kanvas atau klik motif batik di kanan"}
            </div>
          )}
        </div>

        {/* Fine-Tuning Pose Overlay Sliders */}
        <div className="grid w-full grid-cols-2 gap-3 rounded-lg border border-white/10 bg-[#12110F] p-3 sm:grid-cols-4">
          <div>
            <div className="mb-1 flex justify-between text-[10px] text-[#A79F93]">
              <span>Panjang</span>
              <span className="font-mono-num">{transform.scale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={70}
              max={145}
              value={Math.round(transform.scale * 100)}
              onChange={(e) =>
                onChangeTransform({
                  ...transform,
                  scale: Number(e.target.value) / 100,
                })
              }
              className="studio-range"
            />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-[10px] text-[#A79F93]">
              <span>Lebar Bahu</span>
              <span className="font-mono-num">
                {Math.round(transform.width * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={75}
              max={140}
              value={Math.round(transform.width * 100)}
              onChange={(e) =>
                onChangeTransform({
                  ...transform,
                  width: Number(e.target.value) / 100,
                })
              }
              className="studio-range"
            />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-[10px] text-[#A79F93]">
              <span>Skala Motif</span>
              <span className="font-mono-num">
                {Math.round(transform.patternScale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={35}
              max={120}
              value={Math.round(transform.patternScale * 100)}
              onChange={(e) =>
                onChangeTransform({
                  ...transform,
                  patternScale: Number(e.target.value) / 100,
                })
              }
              className="studio-range"
            />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-[10px] text-[#A79F93]">
              <span>Rotasi</span>
              <span className="font-mono-num">{transform.rot}°</span>
            </div>
            <input
              type="range"
              min={-25}
              max={25}
              value={transform.rot}
              onChange={(e) =>
                onChangeTransform({
                  ...transform,
                  rot: Number(e.target.value),
                })
              }
              className="studio-range"
            />
          </div>
        </div>

        {/* Studio Lookbook Render & Comparison Controls */}
        <div className="flex w-full flex-col gap-2.5 rounded-lg border border-white/10 bg-[#12110F] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F0C265]">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Render &amp; Pencahayaan Studio</span>
            </span>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 text-[11px] text-[#A79F93] cursor-pointer">
                <input
                  type="checkbox"
                  checked={highQualityAi}
                  onChange={(e) => onToggleHighQualityAi(e.target.checked)}
                  className="accent-[#D99B26]"
                />
                <span>HD Pro</span>
              </label>
              <select
                value={photoStyle}
                onChange={(e) => onChangePhotoStyle(e.target.value)}
                className="rounded-md border border-white/10 bg-[#1A1816] px-2 py-1 text-[11px] text-[#F4F1EA] outline-none focus:border-[#D99B26]"
              >
                <option value="Editorial Lookbook Studio, pencahayaan softbox bersih, lensa 85mm">
                  Editorial Studio
                </option>
                <option value="Royal Pendopo Nusantara, nuansa hangat heritage Indonesia">
                  Pendopo Heritage
                </option>
                <option value="Potret Eksekutif Kantor Modern, pencahayaan rapi berwibawa">
                  Formal Kantor
                </option>
                <option value="Outdoor Daylight Alami, bokeh arsitektur modern">
                  Outdoor Daylight
                </option>
              </select>
            </div>
          </div>

          <input
            type="text"
            value={directorNote}
            onChange={(e) => onChangeDirectorNote(e.target.value)}
            placeholder="Catatan penyesuaian (mis: lengan digulung, kancing rapi, pencahayaan hangat)..."
            className="w-full rounded-lg border border-white/10 bg-[#1A1816] px-3 py-2 text-xs text-[#F4F1EA] placeholder:text-[#6D665C] outline-none focus:border-[#D99B26]"
          />

          <button
            type="button"
            disabled={isGeneratingAi}
            onClick={onTriggerAiTryOn}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#D99B26] px-4 py-2.5 text-xs font-bold text-[#11100F] transition-colors hover:bg-[#E5AA38] disabled:opacity-60 cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>
              {isGeneratingAi
                ? "Memproses Fitting Studio..."
                : "Render Hasil Fitting (Sesuai Pose)"}
            </span>
          </button>
        </div>
      </section>
    );
  }
);

StudioCanvas.displayName = "StudioCanvas";
