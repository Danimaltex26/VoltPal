import { Router } from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import auth from "../middleware/auth.js";
import { sendAnalysisReadyEmail } from "../utils/email.js";
import { analyzeElectricalPhoto } from "../utils/voltAnalyzer.js";

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
    }

    // CLAUDE API CALL: electrical photo analysis — see /server/utils/voltAnalyzer.js
    let analysisResult;
    try {
      analysisResult = await analyzeElectricalPhoto({
        imageBase64: req.files[0].buffer.toString("base64"),
        imageMediaType: req.files[0].mimetype || "image/jpeg",
        analysisType: analysis_type,
        voltageClass: req.body.voltage_class,
        equipmentType: req.body.equipment_type,
        environment: req.body.environment,
        userNotes: req.body.user_notes,
        userId,
      });
    } catch (error) {
      if (error.type === 'api_error' || error.type === 'parse_error' || error.type === 'validation_error') {
        return res.status(error.status || 500).json({
          error: error.userMessage || 'Analysis failed. Please try again.'
        });
      }
      throw error;
    }

    const { analysis: result } = analysisResult;

    const { data: saved, error: saveError } = await supabaseService
      .from("electrical_analyses")
      .insert({
        user_id: userId,
        image_urls: publicUrls,
        analysis_type: result.image_type || analysis_type || "general",
        diagnosis: result.assessment_reasoning || result.overall_assessment,
        recommended_action: result.corrective_actions?.[0]?.action || null,
        confidence: result.confidence,
        full_response_json: result,
        saved: false,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error:", saveError);
      return res.json({ result, saved: false, save_error: saveError.message, model: analysisResult.model });
    }

    // Only send email for offline-queued analyses
    if (req.body.queued) {
      sendAnalysisReadyEmail({
        to: req.user.email,
        appKey: "voltpal",
        displayName: req.profile.display_name,
        analysisType: result.image_type || analysis_type || "general",
      }).catch(() => {});
    }

    return res.json({ result, record_id: saved.id, model: analysisResult.model });
  } catch (err) {
    console.error("Electrical analysis error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
