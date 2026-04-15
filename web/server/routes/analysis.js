import { Router } from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import auth from "../middleware/auth.js";
import { callClaude } from "../utils/claudeClient.js";
import { ELECTRICAL_ANALYSIS_SYSTEM_PROMPT } from "../prompts/analysis.js";
import { sendAnalysisReadyEmail } from "../utils/email.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } });

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "voltpal" } }
);

router.post("/", auth, upload.array("images", 4), async (req, res) => {
  try {
    const userId = req.user.id;
    const { analysis_type } = req.body;

    // SUBSCRIPTION GATE
    if (req.profile.subscription_tier === "free") {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count } = await supabaseService
        .from("electrical_analyses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth);
      if (count >= 2) {
        return res.status(403).json({
          error: "Monthly limit reached",
          message: "Free tier allows 2 electrical analyses per month. Upgrade to Pro for unlimited.",
          limit: 2,
          used: count,
        });
      }
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    const imageContent = [];
    const publicUrls = [];

    for (const file of req.files) {
      const timestamp = Date.now();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${userId}/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabaseService.storage
        .from("voltpal-uploads")
        .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });
      if (uploadError) {
        console.error("Upload error:", uploadError);
        return res.status(500).json({ error: "Failed to upload image" });
      }

      const { data: urlData } = supabaseService.storage
        .from("voltpal-uploads")
        .getPublicUrl(storagePath);
      publicUrls.push(urlData.publicUrl);

      imageContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: file.mimetype || "image/jpeg",
          data: file.buffer.toString("base64"),
        },
      });
    }

    imageContent.push({
      type: "text",
      text: `Analyze this electrical equipment photo. Analysis type hint: ${analysis_type || "general"}. Return your analysis as the specified JSON object.`,
    });

    var aiResult = await callClaude({
      feature: 'photo_diagnosis',
      systemPrompt: ELECTRICAL_ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: imageContent }],
    });
    var rawText = aiResult.content;
    let result;
    try {
      const stripped = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      try {
        result = JSON.parse(stripped);
      } catch {
        const start = stripped.indexOf("{");
        if (start === -1) throw new Error("No JSON found");
        let depth = 0;
        let end = -1;
        for (let i = start; i < stripped.length; i++) {
          if (stripped[i] === "{") depth++;
          else if (stripped[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
        }
        if (end === -1) throw new Error("Unbalanced JSON");
        result = JSON.parse(stripped.slice(start, end + 1));
      }
    } catch (parseErr) {
      console.error("Parse error:", parseErr.message, rawText);
      return res.status(500).json({ error: "Failed to parse analysis result", raw: rawText });
    }

    const { data: saved, error: saveError } = await supabaseService
      .from("electrical_analyses")
      .insert({
        user_id: userId,
        image_urls: publicUrls,
        analysis_type: result.analysis_type || analysis_type || "general",
        diagnosis: result.overall_diagnosis || result.plain_english_summary,
        recommended_action: result.recommended_action,
        confidence: result.confidence,
        full_response_json: result,
        saved: false,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error:", saveError);
      return res.json({ result, saved: false, save_error: saveError.message, model: aiResult.model });
    }

    // Only send email for offline-queued analyses
    if (req.body.queued) {
      sendAnalysisReadyEmail({
        to: req.user.email,
        appKey: "voltpal",
        displayName: req.profile.display_name,
        analysisType: result.analysis_type || analysis_type || "general",
      }).catch(() => {});
    }

    return res.json({ result, record_id: saved.id, model: aiResult.model });
  } catch (err) {
    console.error("Electrical analysis error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
