import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY belum tersedia. Periksa konfigurasi API key di panel Settings > Secrets."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function stripDataUrlPrefix(input: string): { data: string; mimeType: string } {
  const match = input.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return { mimeType: "image/png", data: input };
}

const pointSchema = {
  type: Type.OBJECT,
  properties: {
    x: { type: Type.NUMBER },
    y: { type: Type.NUMBER },
  },
  required: ["x", "y"],
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "20mb" }));

  // 1. Skeletal Pose Estimation Endpoint using gemini-3.8-flash
  app.post("/api/detect-pose", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body as {
        imageBase64?: string;
        mimeType?: string;
      };

      if (!imageBase64) {
        return res
          .status(400)
          .json({ error: "Data gambar model wajib dikirim." });
      }

      const ai = getAiClient();
      const parsed = stripDataUrlPrefix(imageBase64);

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: {
          parts: [
            {
              inlineData: {
                data: parsed.data,
                mimeType: mimeType || parsed.mimeType,
              },
            },
            {
              text: [
                "Estimate the 2D skeletal pose landmarks of the primary person in this image for virtual garment fitting.",
                "Use normalized coordinates (x from 0.0 left edge to 1.0 right edge; y from 0.0 top edge to 1.0 bottom edge).",
                "Note: leftShoulder/leftElbow/leftWrist/leftHip refer to the person's anatomical left (which appears on the right side when facing the camera), and rightShoulder/rightElbow/rightWrist/rightHip refer to the person's anatomical right.",
                "If lower legs are cropped out of frame, extrapolate reasonable hip/knee/ankle positions below the frame.",
                "Also provide summary metrics: torsoCenterX, torsoCenterY, shoulderWidthRatio, torsoHeightRatio, tiltDeg (-25 to +25), bodyTurnDeg (-25 to +25), poseLabel (in Indonesian), detectedSubjectType ('pria', 'wanita', or 'berhijab').",
              ].join("\n"),
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              torsoCenterX: { type: Type.NUMBER },
              torsoCenterY: { type: Type.NUMBER },
              shoulderWidthRatio: { type: Type.NUMBER },
              torsoHeightRatio: { type: Type.NUMBER },
              tiltDeg: { type: Type.NUMBER },
              bodyTurnDeg: { type: Type.NUMBER },
              poseLabel: { type: Type.STRING },
              detectedSubjectType: { type: Type.STRING },
              skeleton: {
                type: Type.OBJECT,
                properties: {
                  neck: pointSchema,
                  leftShoulder: pointSchema,
                  rightShoulder: pointSchema,
                  leftElbow: pointSchema,
                  rightElbow: pointSchema,
                  leftWrist: pointSchema,
                  rightWrist: pointSchema,
                  leftHip: pointSchema,
                  rightHip: pointSchema,
                  leftAnkle: pointSchema,
                  rightAnkle: pointSchema,
                },
                required: [
                  "neck",
                  "leftShoulder",
                  "rightShoulder",
                  "leftElbow",
                  "rightElbow",
                  "leftWrist",
                  "rightWrist",
                  "leftHip",
                  "rightHip",
                  "leftAnkle",
                  "rightAnkle",
                ],
              },
            },
            required: [
              "torsoCenterX",
              "torsoCenterY",
              "shoulderWidthRatio",
              "torsoHeightRatio",
              "tiltDeg",
              "bodyTurnDeg",
              "poseLabel",
              "detectedSubjectType",
              "skeleton",
            ],
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const poseData = JSON.parse(rawText);
      return res.json({ pose: poseData });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Gagal mendeteksi pose dari foto.";
      console.warn("Detect pose fallback:", message);
      return res.json({
        fallback: true,
        error: "Deteksi otomatis sedang sibuk; sesuaikan titik Kerangka Pose secara manual.",
      });
    }
  });

  // 2. Photorealistic Batik Virtual Try-On Endpoint (100% Identity, Body Shape & Pose Lock)
  app.post("/api/try-on", async (req, res) => {
    try {
      const {
        subjectImageBase64,
        subjectMimeType,
        swatchImageBase64,
        outfitSummary,
        outfitPieces,
        motifName,
        motifOrigin,
        motifDescription,
        poseDescription,
        photoStyle,
        directorNote,
        faceTouchup,
        brightness,
        contrast,
        highQuality,
      } = req.body as {
        subjectImageBase64?: string;
        subjectMimeType?: string;
        swatchImageBase64?: string;
        outfitSummary?: string;
        outfitPieces?: Array<{
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
        }>;
        motifName?: string;
        motifOrigin?: string;
        motifDescription?: string;
        poseDescription?: string;
        photoStyle?: string;
        directorNote?: string;
        faceTouchup?: string;
        brightness?: number;
        contrast?: number;
        highQuality?: boolean;
      };

      const hasPieces = Array.isArray(outfitPieces) && outfitPieces.length > 0;
      if (!subjectImageBase64 || (!outfitSummary && !hasPieces)) {
        return res.status(400).json({
          error: "Foto model dan pilihan busana batik wajib dilengkapi.",
        });
      }

      const ai = getAiClient();
      const subjectParsed = stripDataUrlPrefix(subjectImageBase64);

      const touchupInstructions: Record<string, string> = {
        natural:
          "Keep the subject's face 100% identical pixel-for-pixel in facial bone structure, eyes, nose, lips, eyebrows, skin texture, and expression.",
        bright_smooth:
          "Keep the exact facial identity and bone structure 100% unchanged, only harmonizing soft fill studio lighting on the skin.",
        gentle_smile:
          "Keep the exact facial identity and features 100% unchanged, preserving the natural expression.",
        light_makeup:
          "Keep the exact facial identity 100% unchanged, with only subtle natural editorial finish.",
        clean_groomed:
          "Keep the exact facial identity 100% unchanged, with clean editorial studio portrait lighting.",
      };

      const faceRule =
        touchupInstructions[faceTouchup || "natural"] ||
        touchupInstructions.natural;

      const modelName = highQuality
        ? "gemini-nano-banana-2.1"
        : "gemini-3.1-flash-lite-image";

      const parts: Array<
        | { text: string }
        | { inlineData: { data: string; mimeType: string } }
      > = [
        {
          inlineData: {
            data: subjectParsed.data,
            mimeType: subjectMimeType || subjectParsed.mimeType,
          },
        },
      ];

      // Attach unique swatch images per mix-and-match piece
      const swatchIndexMap = new Map<string, number>();
      const pieceDescriptions: string[] = [];

      if (hasPieces && outfitPieces) {
        for (const piece of outfitPieces) {
          if (piece.usesBatikPattern && piece.swatchImageBase64) {
            let imgIdx = swatchIndexMap.get(piece.swatchImageBase64);
            if (!imgIdx) {
              const parsedSwatch = stripDataUrlPrefix(piece.swatchImageBase64);
              parts.push({
                inlineData: {
                  data: parsedSwatch.data,
                  mimeType: parsedSwatch.mimeType,
                },
              });
              imgIdx = parts.length; // 1-based image index (Image 2, Image 3, ...)
              swatchIndexMap.set(piece.swatchImageBase64, imgIdx);
            }
            pieceDescriptions.push(
              `- ${piece.slotLabel}: ${piece.itemName} (${piece.itemDesc}). Apply EXACT Batik pattern from Image ${imgIdx} — Motif "${piece.motifName}" (${piece.motifOrigin || "Indonesia"}, color "${piece.colorModeName || "Asli"}").`
            );
          } else {
            pieceDescriptions.push(
              `- ${piece.slotLabel}: ${piece.itemName} (${piece.itemDesc}). Solid tailored fabric${piece.solidColor ? ` (${piece.solidColor})` : ""}.`
            );
          }
        }
      } else {
        if (swatchImageBase64) {
          const swatchParsed = stripDataUrlPrefix(swatchImageBase64);
          parts.push({
            inlineData: {
              data: swatchParsed.data,
              mimeType: swatchParsed.mimeType,
            },
          });
        }
        pieceDescriptions.push(
          `- Outfit: ${outfitSummary}. Motif: ${motifName || "Batik Nusantara"} (${motifOrigin || "Indonesia"}) — ${motifDescription || "authentic Indonesian wax-resist batik"}.`
        );
      }

      const equippedSlots = hasPieces && outfitPieces ? outfitPieces.map((p) => p.slot) : [];
      const preserveUntouched: string[] = [];
      if (hasPieces && !equippedSlots.includes("fullset")) {
        if (!equippedSlots.includes("top") && !equippedSlots.includes("outer")) {
          preserveUntouched.push("upper-body top");
        }
        if (!equippedSlots.includes("bottom")) {
          preserveUntouched.push("lower-body pants/skirt and shoes");
        }
      }

      const promptText = `PRECISION PHOTOREALISTIC VIRTUAL TRY-ON (INPAINTING / GARMENT REPLACEMENT ONLY).
Image 1 is the EXACT target person/model photograph.
${swatchIndexMap.size > 0 || swatchImageBase64 ? "Subsequent reference image(s) are the EXACT Indonesian Batik textile pattern swatches to map onto the corresponding garment fabric." : ""}

MIX & MATCH OUTFIT TO TAILOR ONTO IMAGE 1:
${pieceDescriptions.join("\n")}
${preserveUntouched.length > 0 ? `Keep the person's existing ${preserveUntouched.join(" and ")} from Image 1 unchanged.` : ""}

ABSOLUTE 100% FACE, BODY SHAPE & POSE LOCK (NON-NEGOTIABLE):
1. ZERO body reshaping: Preserve 100% of the person's exact body shape, weight, waist width, hip curve, shoulder width, chest/torso volume, arm thickness, leg silhouette, height, and proportions from Image 1. Do NOT make the person slimmer, wider, taller, or more muscular.
2. ZERO facial modification: ${faceRule} Do NOT alter face shape, jawline, hairstyle, hijab wrap/color (unless hijab accessory was explicitly selected), skin tone, or gaze.
3. ZERO pose shift: Maintain the EXACT pixel coordinates of head, neck, shoulders, elbows, wrists, hands, fingers, torso tilt, hips, knees, feet, and camera framing (${poseDescription || "exact posture from Image 1"}). Hands in pockets, hands on hips, or crossed arms MUST remain in the exact same position ON TOP OF / naturally interacting with the tailored Batik fabric.
4. REALISTIC TAILORING & TEXTILE PHYSICS: Replace only the targeted clothing regions with cleanly tailored Indonesian Batik garments matching each swatch pattern's exact motifs, line work, and colors, complete with realistic collar construction, seam lines, fabric folds, shadows, and ambient studio lighting.
5. IMMUTABLE BACKGROUND: Keep the exact background studio wall, floor, and camera crop from Image 1 without shifting or re-framing.
6. Tone & Styling: ${photoStyle || "Editorial Lookbook Studio"}, brightness ${brightness ?? 100}%, contrast ${contrast ?? 100}%. Note: ${directorNote || "natural balanced studio lighting"}.`;

      parts.push({ text: promptText });

      const config: Record<string, unknown> = {
        imageConfig: highQuality
          ? { aspectRatio: "3:4", imageSize: "1K" }
          : { aspectRatio: "3:4" },
      };

      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config,
      });

      const candidateParts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of candidateParts) {
        if (part.inlineData?.data) {
          const outMime = part.inlineData.mimeType || "image/png";
          return res.json({
            imageUrl: `data:${outMime};base64,${part.inlineData.data}`,
            modelUsed: modelName,
          });
        }
      }

      return res.json({
        fallbackMode: true,
        reason: "no_image_part",
        message:
          "Model AI tidak mengembalikan gambar. Silakan coba ulangi render AI.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memproses AI Batik Try-On.";
      const isKeyOrQuota =
        message.includes("PERMISSION_DENIED") ||
        message.includes("API_KEY_INVALID") ||
        message.includes("RESOURCE_EXHAUSTED") ||
        message.includes("429") ||
        message.includes("quota") ||
        message.includes("limit: 0") ||
        message.includes("billing") ||
        message.includes("paid");

      if (isKeyOrQuota) {
        return res.json({
          fallbackMode: true,
          needsPaidKey: true,
          reason: "paid_key_required",
          message:
            "Render gambar AI fotorealistis memerlukan API Key berbayar pada Settings > Secrets.",
        });
      }

      console.warn("Try-on fallback:", message);
      return res.json({
        fallbackMode: true,
        reason: "service_unavailable",
        message:
          "Layanan render gambar AI sedang sibuk. Pratinjau Kerangka Pose tetap aktif.",
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BatikFit Nusantara server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
