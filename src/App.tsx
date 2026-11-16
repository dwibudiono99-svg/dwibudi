import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BATIK_COLOR_MODES,
  BATIK_MOTIFS,
  DEFAULT_UPRIGHT_SKELETON,
  GARMENT_ITEMS,
  SAMPLE_STUDIO_MODELS,
  type BatikColorMode,
  type BatikMotif,
  type BatikRegion,
  type DetectedPose,
  type GarmentItem,
  type GarmentSlot,
  type PoseSkeleton,
} from "./data/batikCatalog";
import { renderBatikSwatchDataUrl } from "./utils/batikPatternEngine";
import { TopBar } from "./components/TopBar";
import {
  ModelPosePanel,
  SKIN_TONES,
  STUDIO_BACKDROPS,
  type AvatarConfig,
  type FaceAdjust,
  type PoseJoints,
  type SubjectMode,
} from "./components/ModelPosePanel";
import {
  BatikWardrobePanel,
  type EquippedMap,
  type EquippedSlotEntry,
} from "./components/BatikWardrobePanel";
import {
  StudioCanvas,
  type GarmentTransform,
  type StudioCanvasHandle,
} from "./components/StudioCanvas";
import { NusantaraGuideSection } from "./components/NusantaraGuideSection";

const DEFAULT_SKELETAL_TRANSFORM: GarmentTransform = {
  x: 0,
  y: 0,
  scale: 1,
  width: 1,
  rot: 0,
  patternScale: 0.6,
};

const SLOT_LABELS: Record<GarmentSlot, string> = {
  top: "Atasan",
  bottom: "Bawahan",
  outer: "Outer/Luaran",
  fullset: "Setelan Lengkap",
  accessory: "Aksesori",
};

export default function App() {
  const canvasRef = useRef<StudioCanvasHandle | null>(null);

  // Subject & Pose State
  const [subjectMode, setSubjectMode] = useState<SubjectMode>("studio");
  const [selectedStudioModelId, setSelectedStudioModelId] = useState(
    SAMPLE_STUDIO_MODELS[0].id
  );
  const [uploadedPhotoDataUrl, setUploadedPhotoDataUrl] = useState<
    string | null
  >(null);
  const [photoScale, setPhotoScale] = useState(100);
  const [photoOffsetY, setPhotoOffsetY] = useState(0);
  const [poseViewAnchor, setPoseViewAnchor] = useState({
    scale: 100,
    offsetY: 0,
  });
  const [detectedPose, setDetectedPose] = useState<DetectedPose | null>(
    SAMPLE_STUDIO_MODELS[0].defaultPose
  );
  const [activeSkeleton, setActiveSkeleton] = useState<PoseSkeleton>(
    SAMPLE_STUDIO_MODELS[0].defaultPose.skeleton
  );
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [isDetectingPose, setIsDetectingPose] = useState(false);

  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>({
    pose: "standing_front",
    gender: "male",
    hair: "short",
    skin: SKIN_TONES[2],
    bgIdx: 0,
  });
  const [poseJoints, setPoseJoints] = useState<PoseJoints>({
    turn: SAMPLE_STUDIO_MODELS[0].defaultPose.bodyTurnDeg,
    armL: 14,
    armR: 14,
    legSpread: 8,
  });
  const [faceAdjust, setFaceAdjust] = useState<FaceAdjust>({
    brightness: 100,
    contrast: 100,
    warmth: 0,
    touchup: "natural",
  });

  // Wardrobe & Nusantara Batik State (Per-Slot Mix & Match)
  const [activeSlot, setActiveSlot] = useState<GarmentSlot>("top");
  const [equipped, setEquipped] = useState<EquippedMap>({
    top: {
      item: GARMENT_ITEMS.top[0], // Kemeja Batik Lengan Panjang
      motif: BATIK_MOTIFS[0],
      colorMode: BATIK_COLOR_MODES[0],
    },
    bottom: null,
    outer: null,
    fullset: null,
    accessory: null,
  });
  const [selectedMotif, setSelectedMotif] = useState<BatikMotif>(
    BATIK_MOTIFS[0]
  );
  const [selectedColorMode, setSelectedColorMode] = useState<BatikColorMode>(
    BATIK_COLOR_MODES[0]
  );
  const [regionFilter, setRegionFilter] = useState<BatikRegion>("all");
  const [applyMotifScope, setApplyMotifScope] = useState<"active_slot" | "all">(
    "active_slot"
  );
  const [autoFitOnMotifClick, setAutoFitOnMotifClick] = useState(false);

  // Canvas & AI State
  const [transform, setTransform] = useState<GarmentTransform>(
    DEFAULT_SKELETAL_TRANSFORM
  );
  const [showOverlay2D, setShowOverlay2D] = useState(true);
  const [aiResultUrl, setAiResultUrl] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [photoStyle, setPhotoStyle] = useState(
    "Editorial Lookbook Studio, pencahayaan softbox bersih, lensa 85mm"
  );
  const [directorNote, setDirectorNote] = useState(
    "Pertahankan 100% bentuk tubuh, proporsi, dan wajah asli; lipatan kain batik mengikuti postur tubuh."
  );
  const [highQualityAi, setHighQualityAi] = useState(true);
  const [aiNeedsPaidKeyNote, setAiNeedsPaidKeyNote] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3600);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const activeStudioModel =
    SAMPLE_STUDIO_MODELS.find((m) => m.id === selectedStudioModelId) ||
    SAMPLE_STUDIO_MODELS[0];

  const runPoseDetection = useCallback(
    async (
      imageDataUrl: string,
      anchorScale = photoScale,
      anchorOffsetY = photoOffsetY
    ) => {
      setIsDetectingPose(true);
      try {
        const res = await fetch("/api/detect-pose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: imageDataUrl,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.fallback) {
          setShowSkeleton(true);
          showToast(
            data.error ||
              "Sesuaikan titik Kerangka Pose kuning langsung pada foto jika diperlukan."
          );
          return;
        }
        if (data.pose) {
          const pose = data.pose as DetectedPose;
          setDetectedPose(pose);
          if (pose.skeleton) {
            setActiveSkeleton(pose.skeleton);
          }
          setPoseViewAnchor({ scale: anchorScale, offsetY: anchorOffsetY });
          setTransform(DEFAULT_SKELETAL_TRANSFORM);
          setPoseJoints((prev) => ({
            ...prev,
            turn: Math.round(pose.bodyTurnDeg),
          }));
          showToast(
            `Kerangka pose terdeteksi: ${pose.poseLabel}. Busana menyesuaikan bahu & lengan foto.`
          );
        }
      } catch {
        setShowSkeleton(true);
        showToast(
          "Aktifkan dan geser titik Kerangka Pose untuk menyelaraskan bahu & lengan foto."
        );
      } finally {
        setIsDetectingPose(false);
      }
    },
    [photoScale, photoOffsetY, showToast]
  );

  const handleUploadPhotoFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      setUploadedPhotoDataUrl(dataUrl);
      setSubjectMode("upload");
      setAiResultUrl(null);
      setPhotoScale(100);
      setPhotoOffsetY(0);
      setPoseViewAnchor({ scale: 100, offsetY: 0 });
      setActiveSkeleton(DEFAULT_UPRIGHT_SKELETON);
      setTransform(DEFAULT_SKELETAL_TRANSFORM);
      setShowOverlay2D(true);
      setTimeout(() => {
        const cleanDataUrl =
          canvasRef.current?.getCleanSubjectDataUrl() || dataUrl;
        void runPoseDetection(cleanDataUrl, 100, 0);
      }, 150);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectStudioModel = (modelId: string) => {
    const found = SAMPLE_STUDIO_MODELS.find((m) => m.id === modelId);
    if (!found) return;
    setSelectedStudioModelId(modelId);
    setSubjectMode("studio");
    setAiResultUrl(null);
    setDetectedPose(found.defaultPose);
    setActiveSkeleton(found.defaultPose.skeleton);
    setTransform(DEFAULT_SKELETAL_TRANSFORM);
    setPoseJoints((prev) => ({
      ...prev,
      turn: found.defaultPose.bodyTurnDeg,
    }));
    const recommendedTop = GARMENT_ITEMS.top.find(
      (i) => i.id === found.recommendedSlotCutId
    );
    if (recommendedTop) {
      setEquipped((prev) => ({
        ...prev,
        fullset: null,
        top: {
          item: recommendedTop,
          motif: prev.top?.motif || selectedMotif,
          colorMode: prev.top?.colorMode || selectedColorMode,
        },
      }));
    }
    showToast(`Model ${found.name} aktif dengan kerangka pose terkalibrasi.`);
  };

  const runAiTryOn = useCallback(
    async (overrideEquipped?: EquippedMap) => {
      const activeEquipped = overrideEquipped || equipped;

      const slotsOrder: GarmentSlot[] = activeEquipped.fullset
        ? ["fullset", "accessory"]
        : ["top", "bottom", "outer", "accessory"];

      const outfitPieces: Array<{
        slot: string;
        slotLabel: string;
        itemName: string;
        itemDesc: string;
        usesBatikPattern: boolean;
        solidColor?: string;
        motifName?: string;
        motifOrigin?: string;
        motifPhilosophy?: string;
        colorModeName?: string;
        swatchImageBase64?: string;
      }> = [];

      for (const slot of slotsOrder) {
        const entry = activeEquipped[slot];
        if (!entry) continue;
        outfitPieces.push({
          slot,
          slotLabel: SLOT_LABELS[slot],
          itemName: entry.item.name,
          itemDesc: entry.item.desc,
          usesBatikPattern: entry.item.usesBatikPattern,
          solidColor: entry.item.solidFallbackColor,
          motifName: entry.motif.name,
          motifOrigin: `${entry.motif.origin}, ${entry.motif.regionLabel}`,
          motifPhilosophy: entry.motif.philosophy,
          colorModeName: entry.colorMode.name,
          swatchImageBase64: entry.item.usesBatikPattern
            ? renderBatikSwatchDataUrl(entry.motif, entry.colorMode)
            : undefined,
        });
      }

      if (outfitPieces.length === 0) {
        showToast("Pilih minimal satu potongan busana batik terlebih dahulu.");
        return;
      }

      if (subjectMode === "upload" && !uploadedPhotoDataUrl) {
        showToast("Unggah foto model terlebih dahulu.");
        return;
      }

      const subjectCleanBase64 = canvasRef.current?.getCleanSubjectDataUrl();
      if (!subjectCleanBase64) {
        showToast("Kanvas subjek belum siap.");
        return;
      }

      setIsGeneratingAi(true);
      setAiNeedsPaidKeyNote(false);
      try {
        const poseDescription =
          subjectMode === "avatar"
            ? `${avatarConfig.pose}, body turn ${poseJoints.turn} deg, left arm ${poseJoints.armL} deg, right arm ${poseJoints.armR} deg`
            : detectedPose
            ? `${detectedPose.poseLabel}, torso tilt ${detectedPose.tiltDeg} deg, body turn ${detectedPose.bodyTurnDeg} deg`
            : "exact posture from Image 1";

        const res = await fetch("/api/try-on", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjectImageBase64: subjectCleanBase64,
            subjectMimeType: "image/png",
            outfitPieces,
            poseDescription,
            photoStyle,
            directorNote,
            faceTouchup: faceAdjust.touchup,
            brightness: faceAdjust.brightness,
            contrast: faceAdjust.contrast,
            highQuality: highQualityAi,
          }),
        });

        const data = await res.json();
        if (data.imageUrl) {
          setAiResultUrl(data.imageUrl);
          showToast(
            "Render AI selesai: busana terpasang presisi dengan wajah & tubuh 100% asli."
          );
        } else if (data.needsPaidKey) {
          setAiNeedsPaidKeyNote(true);
          setAutoFitOnMotifClick(false);
          const compositeUrl =
            canvasRef.current?.renderStudioCompositeDataUrl(photoStyle);
          if (compositeUrl) {
            setAiResultUrl(compositeUrl);
          }
          showToast(
            "Pratinjau Studio Lokal dirender sesuai pose. Render AI awan memerlukan API Key berbayar di Settings > Secrets."
          );
        } else {
          showToast(
            data.message ||
              "Render AI belum mengembalikan gambar. Silakan coba ulangi."
          );
        }
      } catch {
        showToast(
          "Gagal menghubungi layanan render AI. Pratinjau kerangka pose tetap aktif."
        );
      } finally {
        setIsGeneratingAi(false);
      }
    },
    [
      equipped,
      subjectMode,
      uploadedPhotoDataUrl,
      avatarConfig.pose,
      poseJoints,
      detectedPose,
      photoStyle,
      directorNote,
      faceAdjust,
      highQualityAi,
      showToast,
    ]
  );

  const handleChangeActiveSlot = (slot: GarmentSlot) => {
    setActiveSlot(slot);
    const entry = equipped[slot];
    if (entry) {
      setSelectedMotif(entry.motif);
      setSelectedColorMode(entry.colorMode);
    }
  };

  const handleEquipItem = (item: GarmentItem) => {
    setShowOverlay2D(true);
    const currentEntry = equipped[item.slot];
    const isAlreadySelected = currentEntry?.item.id === item.id;
    const equippedCount = Object.values(equipped).filter(Boolean).length;

    let nextEquipped: EquippedMap;
    if (isAlreadySelected && equippedCount > 1) {
      nextEquipped = {
        ...equipped,
        [item.slot]: null,
      };
    } else {
      const nextEntry: EquippedSlotEntry = {
        item,
        motif: currentEntry?.motif || selectedMotif,
        colorMode: currentEntry?.colorMode || selectedColorMode,
      };
      if (item.slot === "fullset") {
        nextEquipped = {
          ...equipped,
          top: null,
          bottom: null,
          outer: null,
          fullset: nextEntry,
        };
      } else {
        nextEquipped = {
          ...equipped,
          fullset: ["top", "bottom", "outer"].includes(item.slot)
            ? null
            : equipped.fullset,
          [item.slot]: nextEntry,
        };
      }
    }

    setEquipped(nextEquipped);
    if (autoFitOnMotifClick) {
      void runAiTryOn(nextEquipped);
    } else {
      setAiResultUrl(null);
    }
  };

  const handleUnequipSlot = (slot: GarmentSlot) => {
    const nextEquipped = { ...equipped, [slot]: null };
    setEquipped(nextEquipped);
    setAiResultUrl(null);
  };

  const applyStylingChange = (
    motif: BatikMotif,
    colorMode: BatikColorMode
  ): EquippedMap => {
    const nextEquipped: EquippedMap = { ...equipped };

    if (applyMotifScope === "all") {
      const hasMain =
        nextEquipped.top ||
        nextEquipped.bottom ||
        nextEquipped.outer ||
        nextEquipped.fullset;
      if (!hasMain) {
        nextEquipped.top = {
          item: GARMENT_ITEMS.top[0],
          motif,
          colorMode,
        };
      }
      (Object.keys(nextEquipped) as GarmentSlot[]).forEach((slot) => {
        const entry = nextEquipped[slot];
        if (entry) {
          nextEquipped[slot] = { ...entry, motif, colorMode };
        }
      });
    } else {
      let targetEntry = nextEquipped[activeSlot];
      if (!targetEntry) {
        const defaultItem = GARMENT_ITEMS[activeSlot]?.[0];
        if (defaultItem) {
          targetEntry = { item: defaultItem, motif, colorMode };
          if (activeSlot === "fullset") {
            nextEquipped.top = null;
            nextEquipped.bottom = null;
            nextEquipped.outer = null;
          } else if (["top", "bottom", "outer"].includes(activeSlot)) {
            nextEquipped.fullset = null;
          }
        }
      } else {
        targetEntry = { ...targetEntry, motif, colorMode };
      }
      nextEquipped[activeSlot] = targetEntry;
    }

    return nextEquipped;
  };

  const handleSelectMotif = (motif: BatikMotif) => {
    setSelectedMotif(motif);
    const nextEquipped = applyStylingChange(motif, selectedColorMode);
    setEquipped(nextEquipped);
    if (autoFitOnMotifClick) {
      void runAiTryOn(nextEquipped);
    } else {
      setAiResultUrl(null);
      setShowOverlay2D(true);
    }
  };

  const handleSelectColorMode = (mode: BatikColorMode) => {
    setSelectedColorMode(mode);
    const nextEquipped = applyStylingChange(selectedMotif, mode);
    setEquipped(nextEquipped);
    if (autoFitOnMotifClick) {
      void runAiTryOn(nextEquipped);
    } else {
      setAiResultUrl(null);
      setShowOverlay2D(true);
    }
  };

  const handleRandomizeAvatar = () => {
    const poses: AvatarConfig["pose"][] = [
      "standing_front",
      "side_casual",
      "walking_runway",
      "hand_on_hip",
      "sitting_casual",
    ];
    const genders: AvatarConfig["gender"][] = ["female", "male"];
    const hairs: AvatarConfig["hair"][] = ["bun", "long", "hijab", "short"];
    setAiResultUrl(null);
    setAvatarConfig({
      pose: poses[Math.floor(Math.random() * poses.length)],
      gender: genders[Math.floor(Math.random() * genders.length)],
      hair: hairs[Math.floor(Math.random() * hairs.length)],
      skin: SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)],
      bgIdx: Math.floor(Math.random() * STUDIO_BACKDROPS.length),
    });
  };

  const handleResetTransform = () => {
    if (subjectMode === "studio") {
      setActiveSkeleton(activeStudioModel.defaultPose.skeleton);
    } else if (subjectMode === "upload" && detectedPose?.skeleton) {
      setActiveSkeleton(detectedPose.skeleton);
    }
    setTransform(DEFAULT_SKELETAL_TRANSFORM);
  };

  return (
    <div className="min-h-screen bg-[#11100F] text-[#F4F1EA]">
      <TopBar
        onDownloadPng={() => {
          canvasRef.current?.exportPng();
          showToast("Gambar hasil fitting PNG diunduh.");
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed right-5 bottom-5 z-50 max-w-sm rounded-lg border border-[#D99B26]/60 bg-[#1F1C18] px-4 py-2.5 text-xs font-medium text-[#F4F1EA] shadow-xl"
        >
          {toastMessage}
        </div>
      )}

      {/* Main 3-Column Fitting Studio Workspace */}
      <main
        id="studio-fitting"
        className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6"
      >
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#F4F1EA] sm:text-3xl">
              Studio Fitting Busana Batik Nusantara
            </h1>
            <p className="mt-1 text-sm text-[#A79F93]">
              Unggah foto Anda, petakan kerangka pose otomatis, lalu klik ragam
              motif batik Nusantara untuk mencoba busana seketika.
            </p>
          </div>
          <div className="text-xs text-[#8E867B] whitespace-nowrap">
            {BATIK_MOTIFS.length} Motif Nusantara ·{" "}
            {Object.values(GARMENT_ITEMS).flat().length} Potongan Busana
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[290px_minmax(0,1fr)_350px] lg:items-start">
          <ModelPosePanel
            subjectMode={subjectMode}
            onChangeSubjectMode={(m) => {
              setSubjectMode(m);
              setAiResultUrl(null);
              if (m === "studio") {
                setDetectedPose(activeStudioModel.defaultPose);
                setActiveSkeleton(activeStudioModel.defaultPose.skeleton);
                setTransform(DEFAULT_SKELETAL_TRANSFORM);
              } else if (m === "upload") {
                setTransform(DEFAULT_SKELETAL_TRANSFORM);
                if (detectedPose?.skeleton) {
                  setActiveSkeleton(detectedPose.skeleton);
                }
              } else {
                setTransform({
                  x: 0,
                  y: 16,
                  scale: 1,
                  width: 1,
                  rot: 0,
                  patternScale: 0.62,
                });
              }
            }}
            selectedStudioModelId={selectedStudioModelId}
            onSelectStudioModel={handleSelectStudioModel}
            uploadedPhotoDataUrl={uploadedPhotoDataUrl}
            onUploadPhotoFile={handleUploadPhotoFile}
            photoScale={photoScale}
            photoOffsetY={photoOffsetY}
            onChangePhotoScale={(val) => {
              setPhotoScale(val);
              setAiResultUrl(null);
            }}
            onChangePhotoOffsetY={(val) => {
              setPhotoOffsetY(val);
              setAiResultUrl(null);
            }}
            detectedPose={detectedPose}
            isDetectingPose={isDetectingPose}
            onDetectPose={() => {
              const clean = canvasRef.current?.getCleanSubjectDataUrl();
              if (clean) void runPoseDetection(clean);
            }}
            avatarConfig={avatarConfig}
            onChangeAvatarConfig={(next) => {
              setAvatarConfig(next);
              setAiResultUrl(null);
            }}
            onRandomizeAvatar={handleRandomizeAvatar}
            poseJoints={poseJoints}
            onChangePoseJoints={(next) => {
              setPoseJoints(next);
              setAiResultUrl(null);
            }}
            onResetPoseJoints={() =>
              setPoseJoints({ turn: 0, armL: 14, armR: 14, legSpread: 8 })
            }
            faceAdjust={faceAdjust}
            onChangeFaceAdjust={(next) => {
              setFaceAdjust(next);
              setAiResultUrl(null);
            }}
            onResetFaceAdjust={() =>
              setFaceAdjust({
                brightness: 100,
                contrast: 100,
                warmth: 0,
                touchup: "natural",
              })
            }
          />

          <StudioCanvas
            ref={canvasRef}
            subjectMode={subjectMode}
            studioModelImageUrl={activeStudioModel.imageUrl}
            uploadedPhotoDataUrl={uploadedPhotoDataUrl}
            photoScale={photoScale}
            photoOffsetY={photoOffsetY}
            poseViewAnchor={poseViewAnchor}
            avatarConfig={avatarConfig}
            poseJoints={poseJoints}
            faceAdjust={faceAdjust}
            activeSkeleton={activeSkeleton}
            onChangeSkeleton={setActiveSkeleton}
            showSkeleton={showSkeleton}
            onToggleShowSkeleton={setShowSkeleton}
            equipped={equipped}
            selectedMotif={selectedMotif}
            selectedColorMode={selectedColorMode}
            transform={transform}
            onChangeTransform={setTransform}
            onResetTransform={handleResetTransform}
            showOverlay2D={showOverlay2D}
            onToggleShowOverlay2D={setShowOverlay2D}
            aiResultUrl={aiResultUrl}
            onClearAiResult={() => setAiResultUrl(null)}
            isGeneratingAi={isGeneratingAi}
            onTriggerAiTryOn={() => void runAiTryOn()}
            photoStyle={photoStyle}
            onChangePhotoStyle={setPhotoStyle}
            directorNote={directorNote}
            onChangeDirectorNote={setDirectorNote}
            highQualityAi={highQualityAi}
            onToggleHighQualityAi={setHighQualityAi}
            aiNeedsPaidKeyNote={aiNeedsPaidKeyNote}
          />

          <BatikWardrobePanel
            activeSlot={activeSlot}
            onChangeActiveSlot={handleChangeActiveSlot}
            equipped={equipped}
            onEquipItem={handleEquipItem}
            onUnequipSlot={handleUnequipSlot}
            onClearAll={() => {
              setAiResultUrl(null);
              setEquipped({
                top: null,
                bottom: null,
                outer: null,
                fullset: null,
                accessory: null,
              });
            }}
            selectedMotif={selectedMotif}
            onSelectMotif={handleSelectMotif}
            selectedColorMode={selectedColorMode}
            onSelectColorMode={handleSelectColorMode}
            regionFilter={regionFilter}
            onChangeRegionFilter={setRegionFilter}
            applyMotifScope={applyMotifScope}
            onChangeApplyMotifScope={setApplyMotifScope}
            autoFitOnMotifClick={autoFitOnMotifClick}
            onToggleAutoFitOnMotifClick={setAutoFitOnMotifClick}
          />
        </div>
      </main>

      <NusantaraGuideSection
        selectedMotif={selectedMotif}
        selectedColorMode={selectedColorMode}
      />
    </div>
  );
}
