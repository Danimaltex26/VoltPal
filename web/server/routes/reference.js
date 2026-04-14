import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import auth from "../middleware/auth.js";
import { REFERENCE_SYSTEM_PROMPT } from "../prompts/reference.js";
import { callClaude } from "../utils/claudeClient.js";
import { requiresSpecificClause } from "../utils/modelRouter.js";

const router = Router();

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "voltpal" } }
);

router.post("/query", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { query } = req.body;
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: "A query string is required" });
    }
    const searchTerm = query.trim();

    // Step 1 — fuzzy match existing reference
    let matches = [];
    const { data: byTitle } = await supabaseService
      .from("volt_reference")
      .select("*")
      .ilike("title", `%${searchTerm}%`)
      .limit(5);
    if (byTitle && byTitle.length) matches = byTitle;

    if (!matches.length) {
      const { data: byCategory } = await supabaseService
        .from("volt_reference")
        .select("*")
        .ilike("category", `%${searchTerm}%`)
        .limit(5);
      if (byCategory && byCategory.length) matches = byCategory;
    }

    if (!matches.length) {
      const { data: byEquip } = await supabaseService
        .from("volt_reference")
        .select("*")
        .ilike("equipment_type", `%${searchTerm}%`)
        .limit(5);
      if (byEquip && byEquip.length) matches = byEquip;
    }

    if (matches.length > 0) {
      const match = matches[0];
      await supabaseService
        .from("volt_reference")
        .update({ query_count: (match.query_count || 0) + 1 })
        .eq("id", match.id);
      return res.json({ result: match, source: "database" });
    }

    // Gate AI calls only
    if (req.profile.subscription_tier === "free") {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count } = await supabaseService
        .from("reference_queries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth);
      if (count >= 5) {
        return res.status(403).json({
          error: "Monthly limit reached",
          message: "Free tier allows 5 AI reference lookups per month. Upgrade to Pro for unlimited.",
          limit: 5,
          used: count,
        });
      }
    }

    // Step 2 — Claude
    var feature = requiresSpecificClause(searchTerm) ? 'code_citation' : 'reference_lookup';
    var aiResult = await callClaude({
      feature: feature,
      systemPrompt: REFERENCE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: query }],
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
      console.error("Reference parse error:", parseErr.message, rawText);
      return res.status(500).json({ error: "Failed to parse reference result", raw: rawText });
    }

    // Write back to DB
    const { data: inserted, error: insertError } = await supabaseService
      .from("volt_reference")
      .insert({
        category: result.category,
        title: result.title,
        equipment_type: result.equipment_type,
        voltage_class: result.voltage_class,
        specification: result.specification,
        content_json: result.content,
        source: "ai_generated",
        query_count: 1,
      })
      .select()
      .single();

    if (insertError) console.error("Reference insert error:", insertError);

    await supabaseService.from("reference_queries").insert({ user_id: userId, query: searchTerm, source: "ai" });
    return res.json({ result: inserted || result, source: "ai", model: aiResult.model });
  } catch (err) {
    console.error("Reference query error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/browse", auth, async (req, res) => {
  try {
    const { category, equipment_type } = req.query;
    let q = supabaseService.from("volt_reference").select("*").order("query_count", { ascending: false }).limit(50);
    if (category) q = q.eq("category", category);
    if (equipment_type) q = q.ilike("equipment_type", `%${equipment_type}%`);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ results: data });
  } catch (err) {
    console.error("Reference browse error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
