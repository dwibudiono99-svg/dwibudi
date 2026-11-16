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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "20mb" }));

  // 1. Pose Detection Endpoint: analyzes uploaded photo to align Batik garment overlay automatically
  app.post("/api/detect-pose", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body as {
        imageBase64?: string;
        mimeType?: string;
      };

      if (!imageBase64) {
        return res.status(400).json({ error: "Data gambar model wajib dikirim." });
      }

      const ai = getAiClient();
      const parsed = stripDataUrlPrefix(imageBase64);

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
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
                "Analyze the primary person in this portrait/full-body photo for virtual clothing fitting alignment.",
                "Return normalized coordinates (0.0 to 1.0 relative to image width/height):",
                "- torsoCenterX: horizontal center of the person's chest/torso (0.0 left, 1.0 right)",
                "- torsoCenterY: vertical center of the upper-to-mid torso where a shirt/top sits (0.0 top, 1.0 bottom)",
                "- shoulderWidthRatio: horizontal span between left and right shoulder edges divided by image width (typical range 0.18 to 0.55)",
                "- torsoHeightRatio: vertical span from collarbone to waist/hip divided by image height (typical range 0.20 to 0.45)",
                "- tiltDeg: shoulder line tilt angle in degrees (-25 to +25, positive if right shoulder is lower)",
                "- bodyTurnDeg: estimated 3/4 yaw turn in degrees (-25 facing left to +25 facing right, 0 facing camera)",
                "- poseLabel: short Indonesian description of the pose (e.g. 'Berdiri Tegak Frontal', 'Pose Santai 3/4', 'Tangan di Saku', 'Tangan di Pinggang')",
                "- detectedSubjectType: 'pria', 'wanita', or 'berhijab'",
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
      console.error("Detect pose error:", err);
      return res.status(500).json({ error: message });
    }
  });

  // 2. Photorealistic Batik Virtual Try-On Endpoint
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

      return res.status(502).json({
        error:
          "Model tidak mengembalikan gambar hasil fitting. Coba ulangi atau ubah deskripsi busana.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memproses AI Batik Try-On.";
      console.error("Try-on error:", err);
      const status =
        message.includes("PERMISSION_DENIED") ||
        message.includes("API_KEY_INVALID")
          ? 403
          : message.includes("RESOURCE_EXHAUSTED")
          ? 429
          : 500;
      return res.status(status).json({ error: message });
    }
  });

  // Serve Vite middleware in development, static dist in production
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
