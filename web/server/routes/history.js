import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import auth from "../middleware/auth.js";

const router = Router();

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "voltpal" } }
);

router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.profile.subscription_tier === "free" ? 10 : 100;

    const [analyses, sessions] = await Promise.all([
      supabaseService
        .from("electrical_analyses")
        .select("id, created_at, image_urls, analysis_type, diagnosis, recommended_action, confidence, saved, title, notes, full_response_json")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabaseService
        .from("troubleshoot_sessions")
        .select("id, created_at, equipment_type, equipment_brand, voltage_system, symptom, resolved, title, notes, conversation_json")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    return res.json({
      electrical_analyses: analyses.data || [],
      troubleshoot_sessions: sessions.data || [],
    });
  } catch (err) {
    console.error("History error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /history/analysis/:id
router.patch("/analysis/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const update = {};
    if (req.body.title !== undefined) update.title = req.body.title;
    if (req.body.notes !== undefined) update.notes = req.body.notes;
    if (req.body.saved !== undefined) update.saved = req.body.saved;
    if (Object.keys(update).length === 0) return res.status(400).json({ error: "No valid fields" });
    const { error } = await supabaseService
      .from("electrical_analyses")
      .update(update)
      .eq("id", req.params.id)
      .eq("user_id", userId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    console.error("History patch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /history/troubleshoot/:id
router.patch("/troubleshoot/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const update = {};
    if (req.body.title !== undefined) update.title = req.body.title;
    if (req.body.notes !== undefined) update.notes = req.body.notes;
    if (Object.keys(update).length === 0) return res.status(400).json({ error: "No valid fields" });
    const { error } = await supabaseService
      .from("troubleshoot_sessions")
      .update(update)
      .eq("id", req.params.id)
      .eq("user_id", userId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    console.error("Troubleshoot patch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /history/troubleshoot/:id/resolve
router.patch("/troubleshoot/:id/resolve", auth, async (req, res) => {
  try {
    const { error } = await supabaseService
      .from("troubleshoot_sessions")
      .update({ resolved: true })
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    console.error("Resolve error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /history/analysis/:id
router.delete("/analysis/:id", auth, async (req, res) => {
  try {
    const { error } = await supabaseService
      .from("electrical_analyses")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /history/troubleshoot/:id
router.delete("/troubleshoot/:id", auth, async (req, res) => {
  try {
    const { error } = await supabaseService
      .from("troubleshoot_sessions")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
