import React, { useRef } from "react";
import { Upload, ScanLine, RotateCcw, Shuffle } from "lucide-react";
import {
  SAMPLE_STUDIO_MODELS,
  type DetectedPose,
} from "../data/batikCatalog";

export type SubjectMode = "upload" | "studio" | "avatar";

export interface AvatarConfig {
  pose:
    | "standing_front"
    | "side_casual"
    | "walking_runway"
    | "hand_on_hip"
    | "sitting_casual";
  gender: "female" | "male";
  hair: "bun" | "long" | "hijab" | "short";
  skin: string;
  bgIdx: number;
}

export interface PoseJoints {
  turn: number;
  armL: number;
  armR: number;
  legSpread: number;
}

export interface FaceAdjust {
  brightness: number;
  contrast: number;
  warmth: number;
  touchup:
    | "natural"
    | "bright_smooth"
    | "gentle_smile"
    | "light_makeup"
    | "clean_groomed";
}

export const SKIN_TONES = [
  "#F5D0B5",
  "#ECC0A1",
  "#D89B74",
  "#B97A52",
  "#8D5534",
];

export const STUDIO_BACKDROPS: Array<[string, string]> = [
  ["#221D1A", "#0F0E0D"],
  ["#282D38", "#101217"],
  ["#332419", "#16100B"],
  ["#1A2E2B", "#0C1514"],
];

interface ModelPosePanelProps {
  subjectMode: SubjectMode;
  onChangeSubjectMode: (mode: SubjectMode) => void;
  selectedStudioModelId: string;
  onSelectStudioModel: (modelId: string) => void;
  uploadedPhotoDataUrl: string | null;
  onUploadPhotoFile: (file: File) => void;
  photoScale: number;
  photoOffsetY: number;
  onChangePhotoScale: (val: number) => void;
  onChangePhotoOffsetY: (val: number) => void;
  detectedPose: DetectedPose | null;
  isDetectingPose: boolean;
  onDetectPose: () => void;
  avatarConfig: AvatarConfig;
  onChangeAvatarConfig: (next: AvatarConfig) => void;
  onRandomizeAvatar: () => void;
  poseJoints: PoseJoints;
  onChangePoseJoints: (next: PoseJoints) => void;
  onResetPoseJoints: () => void;
  faceAdjust: FaceAdjust;
  onChangeFaceAdjust: (next: FaceAdjust) => void;
  onResetFaceAdjust: () => void;
}

export const ModelPosePanel: React.FC<ModelPosePanelProps> = ({
  subjectMode,
  onChangeSubjectMode,
  selectedStudioModelId,
  onSelectStudioModel,
  uploadedPhotoDataUrl,
  onUploadPhotoFile,
  photoScale,
  photoOffsetY,
  onChangePhotoScale,
  onChangePhotoOffsetY,
  detectedPose,
  isDetectingPose,
  onDetectPose,
  avatarConfig,
  onChangeAvatarConfig,
  onRandomizeAvatar,
  poseJoints,
  onChangePoseJoints,
  onResetPoseJoints,
  faceAdjust,
  onChangeFaceAdjust,
  onResetFaceAdjust,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadPhotoFile(file);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onUploadPhotoFile(file);
    }
  };

  return (
    <aside className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#1A1816] p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-[#F4F1EA]">
          1. Model &amp; Pose Foto
        </h2>
        {subjectMode === "avatar" && (
          <button
            type="button"
            onClick={onRandomizeAvatar}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#24211E] px-2.5 py-1 text-[11px] font-medium text-[#D6CFC5] hover:border-white/25 hover:text-white cursor-pointer whitespace-nowrap"
          >
            <Shuffle className="h-3 w-3" />
            <span>Acak</span>
          </button>
        )}
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-[#12110F] p-1">
        <button
          type="button"
          onClick={() => onChangeSubjectMode("upload")}
          className={`rounded-md py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            subjectMode === "upload"
              ? "bg-[#D99B26] text-[#11100F]"
              : "text-[#A79F93] hover:text-[#F4F1EA]"
          }`}
        >
          Unggah Foto
        </button>
        <button
          type="button"
          onClick={() => onChangeSubjectMode("studio")}
          className={`rounded-md py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            subjectMode === "studio"
              ? "bg-[#D99B26] text-[#11100F]"
              : "text-[#A79F93] hover:text-[#F4F1EA]"
          }`}
        >
          Model Studio
        </button>
        <button
          type="button"
          onClick={() => onChangeSubjectMode("avatar")}
          className={`rounded-md py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            subjectMode === "avatar"
              ? "bg-[#D99B26] text-[#11100F]"
              : "text-[#A79F93] hover:text-[#F4F1EA]"
          }`}
        >
          Manekin
        </button>
      </div>

      {/* Mode 1: Unggah Foto Model */}
      {subjectMode === "upload" && (
        <div className="flex flex-col gap-3">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                fileInputRef.current?.click();
              }
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-[#12110F] px-3 py-5 text-center transition-colors hover:border-[#D99B26]"
          >
            <Upload className="h-5 w-5 text-[#D99B26]" />
            <div className="text-xs font-medium text-[#F4F1EA]">
              {uploadedPhotoDataUrl
                ? "Ganti Foto Model"
                : "Klik atau seret foto model"}
            </div>
            <p className="text-[11px] text-[#8E867B]">
              Foto setengah badan atau seluruh badan (JPG, PNG, WebP)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {uploadedPhotoDataUrl && (
            <>
              <button
                type="button"
                disabled={isDetectingPose}
                onClick={onDetectPose}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#D99B26]/50 bg-[#D99B26]/10 px-3 py-2 text-xs font-semibold text-[#F0C265] transition-colors hover:bg-[#D99B26]/20 disabled:opacity-50 cursor-pointer"
              >
                <ScanLine className="h-3.5 w-3.5" />
                <span>
                  {isDetectingPose
                    ? "Mendeteksi Pose Foto..."
                    : "Deteksi & Sesuaikan Pose Otomatis"}
                </span>
              </button>

              {detectedPose && (
                <div className="border-t border-white/10 pt-2 text-[11px] leading-relaxed text-[#B8B0A4]">
                  <span className="font-medium text-[#F4F1EA]">
                    {detectedPose.poseLabel}
                  </span>
                  <span className="mx-1.5 text-[#6D665C]">·</span>
                  <span className="font-mono-num">
                    Kemiringan {Math.round(detectedPose.tiltDeg)}°
                  </span>
                  <span className="mx-1.5 text-[#6D665C]">·</span>
                  <span className="font-mono-num">
                    Rotasi {Math.round(detectedPose.bodyTurnDeg)}°
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-2.5 border-t border-white/10 pt-3">
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-[#A79F93]">
                    <span>Zoom Foto</span>
                    <span className="font-mono-num">{photoScale}%</span>
                  </div>
                  <input
                    type="range"
                    min={65}
                    max={160}
                    value={photoScale}
                    onChange={(e) => onChangePhotoScale(Number(e.target.value))}
                    className="studio-range"
                  />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-[#A79F93]">
                    <span>Geser Vertikal</span>
                    <span className="font-mono-num">{photoOffsetY}px</span>
                  </div>
                  <input
                    type="range"
                    min={-140}
                    max={140}
                    value={photoOffsetY}
                    onChange={(e) =>
                      onChangePhotoOffsetY(Number(e.target.value))
                    }
                    className="studio-range"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Mode 2: Model Studio Nusantara */}
      {subjectMode === "studio" && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-[#8E867B]">
            Pilih foto model studio dengan pose terkalibrasi untuk langsung
            mencoba ragam motif batik:
          </p>
          <div className="flex flex-col gap-2">
            {SAMPLE_STUDIO_MODELS.map((model) => {
              const active = selectedStudioModelId === model.id;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => onSelectStudioModel(model.id)}
                  className={`flex items-center gap-3 rounded-lg border p-2 text-left transition-colors cursor-pointer ${
                    active
                      ? "border-[#D99B26] bg-[#D99B26]/10"
                      : "border-white/10 bg-[#12110F] hover:border-white/25"
                  }`}
                >
                  <img
                    src={model.imageUrl}
                    alt={model.name}
                    referrerPolicy="no-referrer"
                    className="h-14 w-11 rounded object-cover object-top shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-[#F4F1EA]">
                      {model.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#9A9185]">
                      {model.category} · {model.defaultPose.poseLabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode 3: Manekin Pose Proporsional */}
      {subjectMode === "avatar" && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-[11px] text-[#A79F93]">
              Pose Tubuh
            </label>
            <select
              value={avatarConfig.pose}
              onChange={(e) => {
                const pose = e.target.value as AvatarConfig["pose"];
                const presets: Record<AvatarConfig["pose"], PoseJoints> = {
                  standing_front: { turn: 0, armL: 14, armR: 14, legSpread: 8 },
                  side_casual: { turn: 16, armL: 10, armR: 28, legSpread: 12 },
                  walking_runway: {
                    turn: 8,
                    armL: -16,
                    armR: 24,
                    legSpread: 18,
                  },
                  hand_on_hip: { turn: -8, armL: 56, armR: 12, legSpread: 10 },
                  sitting_casual: { turn: 6, armL: 22, armR: 22, legSpread: 14 },
                };
                onChangeAvatarConfig({ ...avatarConfig, pose });
                onChangePoseJoints(presets[pose]);
              }}
              className="w-full rounded-lg border border-white/10 bg-[#12110F] px-2.5 py-2 text-xs text-[#F4F1EA] outline-none focus:border-[#D99B26]"
            >
              <option value="standing_front">Berdiri Tegak Frontal</option>
              <option value="side_casual">Pose Santai 3/4</option>
              <option value="walking_runway">Berjalan Runway</option>
              <option value="hand_on_hip">Tangan di Pinggang</option>
              <option value="sitting_casual">Duduk Kasual</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] text-[#A79F93]">
                Gender
              </label>
              <select
                value={avatarConfig.gender}
                onChange={(e) =>
                  onChangeAvatarConfig({
                    ...avatarConfig,
                    gender: e.target.value as AvatarConfig["gender"],
                  })
                }
                className="w-full rounded-lg border border-white/10 bg-[#12110F] px-2.5 py-2 text-xs text-[#F4F1EA] outline-none focus:border-[#D99B26]"
              >
                <option value="female">Wanita</option>
                <option value="male">Pria</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[#A79F93]">
                Rambut / Hijab
              </label>
              <select
                value={avatarConfig.hair}
                onChange={(e) =>
                  onChangeAvatarConfig({
                    ...avatarConfig,
                    hair: e.target.value as AvatarConfig["hair"],
                  })
                }
                className="w-full rounded-lg border border-white/10 bg-[#12110F] px-2.5 py-2 text-xs text-[#F4F1EA] outline-none focus:border-[#D99B26]"
              >
                <option value="bun">Sanggul Klasik</option>
                <option value="long">Panjang Terurai</option>
                <option value="hijab">Hijab Modern</option>
                <option value="short">Pendek Rapi</option>
              </select>
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] text-[#A79F93]">
              Warna Kulit
            </span>
            <div className="flex flex-wrap gap-2">
              {SKIN_TONES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Warna kulit ${hex}`}
                  onClick={() =>
                    onChangeAvatarConfig({ ...avatarConfig, skin: hex })
                  }
                  className={`h-6 w-6 rounded-full border-2 transition-transform cursor-pointer ${
                    avatarConfig.skin === hex
                      ? "scale-110 border-[#D99B26]"
                      : "border-white/20"
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] text-[#A79F93]">
              Latar Studio
            </span>
            <div className="flex flex-wrap gap-2">
              {STUDIO_BACKDROPS.map(([topCol, botCol], idx) => (
                <button
                  key={topCol}
                  type="button"
                  aria-label={`Latar studio ${idx + 1}`}
                  onClick={() =>
                    onChangeAvatarConfig({ ...avatarConfig, bgIdx: idx })
                  }
                  className={`h-6 w-6 rounded-full border-2 transition-transform cursor-pointer ${
                    avatarConfig.bgIdx === idx
                      ? "scale-110 border-[#D99B26]"
                      : "border-white/20"
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${topCol}, ${botCol})`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Joint Sliders */}
          <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#D6CFC5]">
                Atur Sendi &amp; Rotasi Tubuh
              </span>
              <button
                type="button"
                onClick={onResetPoseJoints}
                className="inline-flex items-center gap-1 text-[11px] text-[#A79F93] hover:text-white cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[11px] text-[#A79F93]">
                <span>Rotasi Badan</span>
                <span className="font-mono-num">{poseJoints.turn}°</span>
              </div>
              <input
                type="range"
                min={-25}
                max={25}
                value={poseJoints.turn}
                onChange={(e) =>
                  onChangePoseJoints({
                    ...poseJoints,
                    turn: Number(e.target.value),
                  })
                }
                className="studio-range"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="mb-1 flex justify-between text-[11px] text-[#A79F93]">
                  <span>Lengan Kiri</span>
                  <span className="font-mono-num">{poseJoints.armL}°</span>
                </div>
                <input
                  type="range"
                  min={-30}
                  max={70}
                  value={poseJoints.armL}
                  onChange={(e) =>
                    onChangePoseJoints({
                      ...poseJoints,
                      armL: Number(e.target.value),
                    })
                  }
                  className="studio-range"
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[11px] text-[#A79F93]">
                  <span>Lengan Kanan</span>
                  <span className="font-mono-num">{poseJoints.armR}°</span>
                </div>
                <input
                  type="range"
                  min={-30}
                  max={70}
                  value={poseJoints.armR}
                  onChange={(e) =>
                    onChangePoseJoints({
                      ...poseJoints,
                      armR: Number(e.target.value),
                    })
                  }
                  className="studio-range"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kecerahan & Penyesuaian Wajah Umum */}
      <div className="flex flex-col gap-2.5 border-t border-white/10 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[#D6CFC5]">
            Pencahayaan &amp; Wajah Asli
          </span>
          <button
            type="button"
            onClick={onResetFaceAdjust}
            className="text-[11px] text-[#A79F93] hover:text-white cursor-pointer"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="mb-1 flex justify-between text-[11px] text-[#A79F93]">
              <span>Kecerahan</span>
              <span className="font-mono-num">{faceAdjust.brightness}%</span>
            </div>
            <input
              type="range"
              min={70}
              max={135}
              value={faceAdjust.brightness}
              onChange={(e) =>
                onChangeFaceAdjust({
                  ...faceAdjust,
                  brightness: Number(e.target.value),
                })
              }
              className="studio-range"
            />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[11px] text-[#A79F93]">
              <span>Kontras</span>
              <span className="font-mono-num">{faceAdjust.contrast}%</span>
            </div>
            <input
              type="range"
              min={75}
              max={135}
              value={faceAdjust.contrast}
              onChange={(e) =>
                onChangeFaceAdjust({
                  ...faceAdjust,
                  contrast: Number(e.target.value),
                })
              }
              className="studio-range"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] text-[#A79F93]">
            Sentuhan Wajah (Identitas 100% Terjaga)
          </label>
          <select
            value={faceAdjust.touchup}
            onChange={(e) =>
              onChangeFaceAdjust({
                ...faceAdjust,
                touchup: e.target.value as FaceAdjust["touchup"],
              })
            }
            className="w-full rounded-lg border border-white/10 bg-[#12110F] px-2.5 py-2 text-xs text-[#F4F1EA] outline-none focus:border-[#D99B26]"
          >
            <option value="natural">Asli Apa Adanya (Tanpa Ubah Wajah)</option>
            <option value="bright_smooth">Cerah Halus Natural (Soft Glow)</option>
            <option value="gentle_smile">Senyum Ramah Natural</option>
            <option value="light_makeup">Riasan Natural Ringan</option>
            <option value="clean_groomed">Tampilan Studio Segar</option>
          </select>
        </div>
      </div>
    </aside>
  );
};
