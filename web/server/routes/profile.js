import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import auth from "../middleware/auth.js";

const router = Router();

const supabaseApp = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "voltpal" } }
);

const supabasePublic = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = req.profile;
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [analysisCount, troubleshootCount, referenceCount, prefsRes] = await Promise.all([
      supabaseApp
        .from("electrical_analyses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth),
      supabaseApp
        .from("troubleshoot_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth),
      supabaseApp
        .from("reference_queries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth),
      supabaseApp
        .from("user_preferences")
        .select("service_specialties, certifications")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    return res.json({
      ...profile,
      service_specialties: prefsRes.data?.service_specialties || [],
      certifications: prefsRes.data?.certifications || [],
      usage: {
        analysis_count: analysisCount.count || 0,
        troubleshoot_count: troubleshootCount.count || 0,
        reference_count: referenceCount.count || 0,
      },
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { display_name, service_specialties, certifications } = req.body;

    if (display_name !== undefined) {
      const { error } = await supabasePublic
        .from("profiles")
        .update({ display_name })
        .eq("id", userId);
      if (error) return res.status(500).json({ error: error.message });
    }

    if (service_specialties !== undefined || certifications !== undefined) {
      const prefUpdates = { user_id: userId };
      if (service_specialties !== undefined) prefUpdates.service_specialties = service_specialties;
      if (certifications !== undefined) prefUpdates.certifications = certifications;
      const { error } = await supabaseApp
        .from("user_preferences")
        .upsert(prefUpdates, { onConflict: "user_id" });
      if (error) return res.status(500).json({ error: error.message });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("Profile patch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
