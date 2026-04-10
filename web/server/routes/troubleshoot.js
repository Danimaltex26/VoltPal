import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import auth from "../middleware/auth.js";
import { TROUBLESHOOT_SYSTEM_PROMPT } from "../prompts/troubleshoot.js";

const router = Router();

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "voltpal" } }
);

const anthropic = new Anthropic();

router.post("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      equipment_type,
      equipment_brand,
      voltage_system,
      symptom,
      environment,
      already_tried = [],
    } = req.body;

    // SUBSCRIPTION GATE
    if (req.profile.subscription_tier === "free") {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count } = await supabaseService
        .from("troubleshoot_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth);
      if (count >= 2) {
        return res.status(403).json({
          error: "Monthly limit reached",
          message: "Free tier allows 2 troubleshoot sessions per month. Upgrade to Pro for unlimited.",
        });
      }
    }

    if (!symptom || typeof symptom !== "string" || !symptom.trim()) {
      return res.status(400).json({ error: "A symptom description is required" });
    }

    const userMessage = [
      `Equipment type: ${equipment_type || "not specified"}`,
      `Brand/model: ${equipment_brand || "not specified"}`,
      `Voltage system: ${voltage_system || "not specified"}`,
      `Environment: ${environment || "not specified"}`,
      `Symptom: ${symptom}`,
      already_tried.length > 0
        ? `Already tried: ${already_tried.join(", ")}`
        : "Already tried: nothing yet",
    ].join("\n");

    const messages = [{ role: "user", content: userMessage }];

    const aiResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: TROUBLESHOOT_SYSTEM_PROMPT,
      messages,
    });

    if (aiResponse.stop_reason === "max_tokens") {
      console.error("Troubleshoot response truncated (max_tokens)");
      return res.status(500).json({ error: "AI response was too long. Please try a more specific symptom description." });
    }

    const rawText = aiResponse.content[0].text;
    let result;
    try {
      // Strip markdown code fences if present, then parse
      const stripped = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      try {
        result = JSON.parse(stripped);
      } catch {
        // Fallback: extract first top-level JSON object by matching balanced braces
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
      return res.status(500).json({ error: "Failed to parse troubleshoot result", raw: rawText });
    }

    const conversationRecord = [
      { role: "user", content: userMessage },
      { role: "assistant", content: rawText },
    ];

    const { data: saved, error: saveError } = await supabaseService
      .from("troubleshoot_sessions")
      .insert({
        user_id: userId,
        equipment_type,
        equipment_brand,
        voltage_system,
        symptom,
        environment,
        conversation_json: conversationRecord,
        resolved: false,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error:", saveError);
      return res.json({ result, saved: false });
    }

    return res.json({ result, session_id: saved.id });
  } catch (err) {
    console.error("Troubleshoot error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
