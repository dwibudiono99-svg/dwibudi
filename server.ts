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

  // 2. Optional Photorealistic Batik Virtual Try-On Endpoint (requires paid image model key)
  app.post("/api/try-on", async (req, res) => {
    try {
      const {
        subjectImageBase64,
        subjectMimeType,
        swatchImageBase64,
        outfitSummary,
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

      if (!subjectImageBase64 || !outfitSummary) {
        return res.status(400).json({
          error: "Foto model dan pilihan busana batik wajib dilengkapi.",
        });
      }

      const ai = getAiClient();
      const subjectParsed = stripDataUrlPrefix(subjectImageBase64);

      const touchupInstructions: Record<string, string> = {
        natural:
          "Keep the subject's face 100% identical without changing facial bone structure, eyes, nose, lips, skin details, or expression.",
        bright_smooth:
          "Keep the exact facial identity and structure 100% unchanged, only applying gentle natural studio skin glow and soft fill lighting.",
        gentle_smile:
          "Keep the exact facial identity and features 100% unchanged, with only a subtle warm natural smile.",
        light_makeup:
          "Keep the exact facial identity 100% unchanged, adding only refined subtle editorial makeup.",
        clean_groomed:
          "Keep the exact facial identity 100% unchanged, with clean editorial studio portrait retouching.",
      };

      const faceRule =
        touchupInstructions[faceTouchup || "natural"] ||
        touchupInstructions.natural;

      const modelName = highQuality
        ? "gemini-nano-banana-2.1"
        : "gemini-3.1-flash-lite-image";

      const promptText = `High-precision photorealistic Indonesian Batik virtual try-on image editing.
Image 1 is the EXACT human model / user photo.
${swatchImageBase64 ? "Image 2 is the EXACT Batik Nusantara textile pattern swatch to apply onto the garment fabric." : ""}

TASK:
Dress the person from Image 1 in this Indonesian Batik outfit:
${outfitSummary}
Selected Batik Motif: ${motifName || "Batik Nusantara"} (${motifOrigin || "Indonesia"}) — ${motifDescription || "authentic hand-drawn wax-resist canting batik textile"}.

STRICT ANATOMICAL, POSE & IDENTITY LOCK (CRITICAL):
1. Preserve 100% of the person's exact face, facial features, skin tone, hair/hijab, expression, body proportions, and exact pose (${poseDescription || "preserve exact pose from Image 1"}).
2. Do NOT move, warp, straighten, or alter the person's head, neck, shoulders, arms, elbows, hands, fingers, torso lean, or legs. Every limb must remain in its exact pixel position from Image 1.
3. Tailor and drape the Batik garment naturally over the person's exact body posture—wrapping convincingly around bent arms, shoulders, hands in pockets, waistlines, and fabric creases with realistic textile physics, crisp Batik motif alignment, collar construction, seams, and natural shadows.
4. Keep the exact background environment from Image 1 unless subtly enhanced for studio lighting harmony.
5. ${faceRule}
6. Photography & Tone: ${photoStyle || "Editorial Lookbook Studio"}, brightness ${brightness ?? 100}%, contrast ${contrast ?? 100}%. Stylist note: ${directorNote || "natural balanced studio lighting"}.`;

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

      if (swatchImageBase64) {
        const swatchParsed = stripDataUrlPrefix(swatchImageBase64);
        parts.push({
          inlineData: {
            data: swatchParsed.data,
            mimeType: swatchParsed.mimeType,
          },
        });
      }

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
          "Hasil fitting dirender menggunakan Mode Kerangka Pose Studio.",
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
          reason: "paid_key_required",
          message:
            "Mode Fitting Studio Lokal aktif (render awan memerlukan kuota berbayar). Busana dirender presisi sesuai kerangka pose.",
        });
      }

      console.warn("Try-on fallback:", message);
      return res.json({
        fallbackMode: true,
        reason: "service_unavailable",
        message:
          "Mode Fitting Studio Lokal aktif untuk merender hasil busana sesuai pose.",
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
