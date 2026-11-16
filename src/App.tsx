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

export default function App() {
  const canvasRef = useRef<StudioCanvasHandle | null>(null);
  const paidImageQuotaUnavailableRef = useRef(false);

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

  // Wardrobe & Nusantara Batik State
  const [activeSlot, setActiveSlot] = useState<GarmentSlot>("top");
  const [equipped, setEquipped] = useState<EquippedMap>({
    top: GARMENT_ITEMS.top[0], // Kemeja Batik Lengan Panjang
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
    "Pertahankan pose tubuh dan wajah asli secara presisi, lipatan kain batik mengikuti postur tubuh."
  );
  const [highQualityAi, setHighQualityAi] = useState(false);
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
    async (imageDataUrl: string) => {
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
    [showToast]
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
      setActiveSkeleton(DEFAULT_UPRIGHT_SKELETON);
      setTransform(DEFAULT_SKELETAL_TRANSFORM);
      setShowOverlay2D(true);
      setTimeout(() => {
        const cleanDataUrl =
          canvasRef.current?.getCleanSubjectDataUrl() || dataUrl;
        void runPoseDetection(cleanDataUrl);
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
        top: recommendedTop,
      }));
    }
    showToast(`Model ${found.name} aktif dengan kerangka pose terkalibrasi.`);
  };

  const runAiTryOn = useCallback(
    async (overrideMotif?: BatikMotif, overrideColorMode?: BatikColorMode) => {
      const motifToUse = overrideMotif || selectedMotif;
      const colorModeToUse = overrideColorMode || selectedColorMode;

      const equippedList: string[] = [];
      if (equipped.fullset) {
        equippedList.push(
          `Setelan Lengkap: ${equipped.fullset.name} (${equipped.fullset.desc})`
        );
      } else {
        if (equipped.top) {
          equippedList.push(
            `Atasan: ${equipped.top.name} (${equipped.top.desc})`
          );
        }
        if (equipped.bottom) {
          equippedList.push(
            `Bawahan: ${equipped.bottom.name} (${equipped.bottom.desc})`
          );
        }
        if (equipped.outer) {
          equippedList.push(
            `Outer/Luaran: ${equipped.outer.name} (${equipped.outer.desc})`
          );
        }
      }
      if (equipped.accessory) {
        equippedList.push(
          `Aksesori: ${equipped.accessory.name} (${equipped.accessory.desc})`
        );
      }

      if (equippedList.length === 0) {
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

      if (paidImageQuotaUnavailableRef.current) {
        const compositeUrl =
          canvasRef.current?.renderStudioCompositeDataUrl(photoStyle);
        if (compositeUrl) {
          setAiResultUrl(compositeUrl);
        }
        showToast(
          `Hasil fitting studio Batik ${motifToUse.name} dirender sesuai kerangka pose.`
        );
        return;
      }

      setIsGeneratingAi(true);
      try {
        const swatchDataUrl = renderBatikSwatchDataUrl(
          motifToUse,
          colorModeToUse
        );

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
            swatchImageBase64: swatchDataUrl,
            outfitSummary: equippedList.join("; "),
            motifName: `${motifToUse.name} (${colorModeToUse.name})`,
            motifOrigin: `${motifToUse.origin}, ${motifToUse.regionLabel}`,
            motifDescription: motifToUse.philosophy,
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
            `Batik ${motifToUse.name} berhasil dipasangkan sesuai pose foto.`
          );
        } else if (data.fallbackMode || !res.ok) {
          if (data.reason === "paid_key_required") {
            paidImageQuotaUnavailableRef.current = true;
          }
          const compositeUrl =
            canvasRef.current?.renderStudioCompositeDataUrl(photoStyle);
          if (compositeUrl) {
            setAiResultUrl(compositeUrl);
          }
          setAutoFitOnMotifClick(false);
          showToast(
            `Hasil fitting studio Batik ${motifToUse.name} selesai dirender sesuai kerangka pose.`
          );
        }
      } catch {
        const compositeUrl =
          canvasRef.current?.renderStudioCompositeDataUrl(photoStyle);
        if (compositeUrl) {
          setAiResultUrl(compositeUrl);
        }
        setAutoFitOnMotifClick(false);
        showToast(
          `Hasil fitting studio Batik ${motifToUse.name} selesai dirender sesuai kerangka pose.`
        );
      } finally {
        setIsGeneratingAi(false);
      }
    },
    [
      selectedMotif,
      selectedColorMode,
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

  const handleEquipItem = (item: GarmentItem) => {
    setAiResultUrl(null);
    setShowOverlay2D(true);
    setEquipped((prev) => {
      if (item.slot === "fullset") {
        return {
          ...prev,
          top: null,
          bottom: null,
          outer: null,
          fullset: item,
        };
      }
      return {
        ...prev,
        fullset: ["top", "bottom", "outer"].includes(item.slot)
          ? null
          : prev.fullset,
        [item.slot]: item,
      };
    });
  };

  const handleUnequipSlot = (slot: GarmentSlot) => {
    setAiResultUrl(null);
    setEquipped((prev) => ({ ...prev, [slot]: null }));
  };

  const handleSelectMotif = (motif: BatikMotif) => {
    setSelectedMotif(motif);
    if (
      !equipped.top &&
      !equipped.fullset &&
      !equipped.outer &&
      !equipped.bottom
    ) {
      setEquipped((prev) => ({ ...prev, top: GARMENT_ITEMS.top[0] }));
    }
    if (autoFitOnMotifClick) {
      void runAiTryOn(motif, selectedColorMode);
    } else {
      setAiResultUrl(null);
      setShowOverlay2D(true);
    }
  };

  const handleSelectColorMode = (mode: BatikColorMode) => {
    setSelectedColorMode(mode);
    if (autoFitOnMotifClick) {
      void runAiTryOn(selectedMotif, mode);
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
          />

          <BatikWardrobePanel
            activeSlot={activeSlot}
            onChangeActiveSlot={setActiveSlot}
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
