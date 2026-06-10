import { withAuth, badRequest, ok } from "@/lib/api";
import { getLLM, parsePhotoAnalysis } from "@/lib/llm";
import { PHOTO_ANALYSIS_PROMPT } from "@/lib/llm/prompts";
import { createAdminClient, STORAGE_BUCKET } from "@/lib/supabase/admin";

export const maxDuration = 60;

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export const POST = withAuth(async (userId, req) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return badRequest("Aucune image reçue.");
  if (!ALLOWED.includes(file.type)) return badRequest("Format : JPEG, PNG ou WebP.");
  if (file.size > MAX_BYTES) return badRequest("Image trop lourde (max 8 Mo).");

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");

  // 1) Upload to Storage (best-effort — analysis still works without it).
  let photoUrl: string | null = null;
  try {
    const ext = file.type.split("/")[1] ?? "jpg";
    const path = `${userId}/${Date.now()}.${ext}`;
    const admin = createAdminClient();
    const { error } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (!error) {
      photoUrl = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
    }
  } catch (err) {
    console.error("[analyze-photo] storage upload failed:", err);
  }

  // 2) Ask Gemini Vision for structured JSON.
  let raw = "";
  try {
    raw = await getLLM().analyzeImage({
      prompt: PHOTO_ANALYSIS_PROMPT,
      imageBase64: base64,
      mimeType: file.type,
    });
  } catch (err) {
    console.error("[analyze-photo] llm error:", err);
    return badRequest("L'analyse IA a échoué. Réessaie la photo ou saisis manuellement.");
  }

  const analysis = parsePhotoAnalysis(raw);
  if (!analysis) {
    return badRequest(
      "Impossible de lire l'analyse. Réessaie la photo ou saisis manuellement.",
    );
  }

  return ok({ analysis, photo_url: photoUrl });
});
