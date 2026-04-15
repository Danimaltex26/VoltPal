import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import auth from "../middleware/auth.js";
import { callClaude } from "../utils/claudeClient.js";
import { TROUBLESHOOT_SYSTEM_PROMPT } from "../prompts/troubleshoot.js";

const router = Router();

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "voltpal" } }
);

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

    const userMessage = buildTroubleshootMessage(req.body);

    const messages = [{ role: "user", content: userMessage }];

    // CLAUDE API CALL: VoltPal troubleshoot diagnosis
    // Model routing: simple symptoms → Haiku, complex → Sonnet
    // Complexity signals passed via context — see utils/modelRouter.js
    const troubleshootContext = {
      // Prior conversation turns — multi-turn escalates to Sonnet
      conversationHistory: req.body.conversationHistory || [],

      // Primary symptom for safety keyword detection
      symptom: req.body.symptom || req.body.fault_code || '',

      // NEC edition selected = code citation accuracy needed = Sonnet
      requiresCodeCompliance: !!(req.body.nec_edition &&
        req.body.nec_edition !== 'Unknown'),

      // 480V and above — arc flash, industrial motor circuits = Sonnet
      isHighVoltage: ['480V', '600V', '4160V', 'medium voltage'].some(
        v => (req.body.voltage_system || '').includes(v)
      ),

      // Fault code present = model-specific interpretation needed = Sonnet
      hasFaultCode: !!(req.body.fault_code && String(req.body.fault_code).trim()),

      // Measured values provided = quantitative diagnosis = Sonnet
      hasMeasurements: !!(
        req.body.measured_voltage || req.body.measured_current
      ),

      // Industrial installation = motor circuits, MCC, PLCs = Sonnet
      isIndustrial: (req.body.installation_type || '').toLowerCase() === 'industrial',

      // Wet or hazardous location = location-specific NEC = Sonnet
      isSpecialEnvironment: ['wet', 'hazardous', 'classified'].some(
        e => (req.body.environment || '').toLowerCase().includes(e)
      ),
    };

    const aiResult = await callClaude({
      feature: 'troubleshoot',
      context: troubleshootContext,
      systemPrompt: TROUBLESHOOT_SYSTEM_PROMPT,
      messages,
    });
    var rawText = aiResult.content;
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
      return res.json({ result, saved: false, model: aiResult.model });
    }

    return res.json({ result, session_id: saved.id, model: aiResult.model });
  } catch (err) {
    console.error("Troubleshoot error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Builds the user message from form fields.
// Supports both current VoltPal fields (equipment_type, equipment_brand,
// voltage_system, symptom, environment, already_tried) and additional
// spec fields (installation_type, equipment_model, nec_edition,
// fault_code, measured_voltage, measured_current, circuit_ampacity) if
// the frontend is extended later to send them.
function buildTroubleshootMessage(body) {
  const lines = [];

  if (body.equipment_type || body.analysis_type) {
    lines.push(`Equipment type: ${body.equipment_type || body.analysis_type}`);
  }
  if (body.installation_type) lines.push(`Installation type: ${body.installation_type}`);
  if (body.voltage_system) lines.push(`Voltage system: ${body.voltage_system}`);
  if (body.environment) lines.push(`Environment: ${body.environment}`);
  if (body.equipment_brand && String(body.equipment_brand).trim()) {
    lines.push(`Equipment brand: ${String(body.equipment_brand).trim()}`);
  }
  if (body.equipment_model && String(body.equipment_model).trim()) {
    lines.push(`Equipment model: ${String(body.equipment_model).trim()}`);
  }
  if (body.nec_edition && body.nec_edition !== 'Unknown') {
    lines.push(`Applicable NEC edition: ${body.nec_edition}`);
  }
  if (body.fault_code && String(body.fault_code).trim()) {
    lines.push(`Fault code: ${String(body.fault_code).trim()}`);
  }
  if (body.circuit_ampacity && String(body.circuit_ampacity).trim()) {
    lines.push(`Circuit ampacity: ${String(body.circuit_ampacity).trim()}`);
  }

  // Measured values
  const measurements = [];
  if (body.measured_voltage) measurements.push(`Voltage: ${body.measured_voltage}`);
  if (body.measured_current) measurements.push(`Current: ${body.measured_current}`);
  if (measurements.length > 0) {
    lines.push(`Measured values: ${measurements.join(', ')}`);
  }

  if (body.already_tried && body.already_tried.length > 0) {
    lines.push(`Already tried: ${body.already_tried.join(', ')}`);
  }
  if (body.symptom && String(body.symptom).trim()) {
    lines.push(`Electrician description: ${String(body.symptom).trim()}`);
  }

  const contextBlock = lines.length > 0
    ? lines.join('\n')
    : 'No additional context provided.';

  return `${contextBlock}\n\nDiagnose this electrical problem and return your complete assessment as a JSON object exactly matching the schema in your instructions. Safety assessment first.`;
}

export default router;
