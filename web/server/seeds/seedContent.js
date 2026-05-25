// Generate and seed training content for VoltPal via Claude API
// Run: node seeds/seedContent.js [CERT_LEVEL]

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "voltpal" } }
);

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are an expert electrical certification instructor with 20+ years of experience training electricians at all levels from apprentice through master electrician and NFPA 70E qualified persons. You have deep knowledge of the NEC (NFPA 70), NFPA 70E, OSHA electrical standards, IEEE 1584, and state licensing requirements.

Generate learning content sections for a training module. Each section should teach a specific concept in depth — written for working electricians, not academics. Use real-world examples, actual NEC article references, and practical field context.

Return ONLY a valid JSON array with 8 sections. No preamble, no markdown fences, no explanation outside the JSON. Each element:
{
  "section_number": 1,
  "section_title": "string — clear, descriptive title",
  "content_type": "concept | example | formula | tip | code_reference",
  "content_text": "string — 200-400 words of instructional content. Use real NEC articles, actual values, and practical explanations. Write in a direct, professional tone.",
  "standard_reference": "string or null — e.g. NEC Article 210.8, NFPA 70E Table 130.7(C)(15), IEEE 1584"
}

CONTENT TYPE GUIDELINES:
- concept: Core instructional material explaining how something works, why it matters, and key code values
- example: A realistic field scenario showing the concept in practice — include specific wire sizes, breaker ratings, conduit types, or load calculations
- formula: Mathematical relationships with worked examples using real values — Ohm's law, voltage drop, conduit fill, load calculations, fault current
- tip: Practical field advice that comes from experience — things an apprentice might not know
- code_reference: A specific NEC article or NFPA 70E requirement with the actual section/table number, what it requires, and why it matters in practice

RULES:
- Generate exactly 8 sections
- Every listed topic in the module MUST get its own dedicated section — do NOT bundle multiple topics into a single section
- Every section must be independently useful — no "as we discussed" references
- Use actual NEC article numbers and table references from the current code cycle (e.g., NEC 210.8(A) GFCI requirements, Table 310.16 conductor ampacities, not vague generalities)
- Include specific wire gauges, breaker sizes, conduit types, or equipment where relevant
- Write for comprehension, not memorization — explain the WHY behind each code requirement
- At least one section must be content_type "tip" with practical field advice
- At least one section must be content_type "code_reference" citing a specific NEC article or NFPA 70E section
- At least one section must include an "example" with a realistic field scenario
- Vary content_type across sections — use at least 3 different types
- Content should be 200-400 words per section, not shorter`;

async function generateContent(certLevel, moduleTitle, topicList) {
  const topicStr = topicList.join(", ");
  const userPrompt = `Generate 8 learning content sections for the ${certLevel} certification module: "${moduleTitle}"

Topics to cover (each topic MUST have its own dedicated section): ${topicStr}

Write content that would prepare an electrician for the ${certLevel} certification exam while giving them practical field knowledge. Use real NEC references, actual specification values, and field-tested advice.`;

  let retries = 0;
  while (retries < 3) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16384,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });

      const rawText = response.content[0].text;
      const stripped = rawText.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(stripped);
      } catch {
        const start = stripped.indexOf("[");
        const end = stripped.lastIndexOf("]");
        if (start === -1 || end === -1) throw new Error("No JSON array found");
        parsed = JSON.parse(stripped.slice(start, end + 1));
      }

      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Empty array");

      const valid = parsed.filter(s => s.section_number && s.section_title && s.content_type && s.content_text);
      if (valid.length < 6) throw new Error(`Only ${valid.length} valid sections returned`);

      return valid;
    } catch (err) {
      retries++;
      if (retries >= 3) { console.error("    [FAIL] " + moduleTitle + ": " + err.message); return []; }
      console.log("    [retry " + retries + "] " + err.message);
    }
  }
  return [];
}

async function main() {
  console.log("=== Seeding VoltPal Training Content ===\n");
  const targetLevel = process.argv[2] || null;

  const query = supabase
    .from("training_modules")
    .select("id, cert_level, module_number, title, topic_list")
    .eq("is_published", true)
    .order("cert_level").order("module_number");
  if (targetLevel) query.eq("cert_level", targetLevel);

  const { data: modules, error } = await query;
  if (error || !modules) { console.error("Failed:", error?.message); return; }

  let totalSeeded = 0;
  for (const mod of modules) {
    const { count } = await supabase.from("training_content").select("*", { count: "exact", head: true }).eq("module_id", mod.id);
    if (count >= 7) { console.log("[skip] " + mod.cert_level + " M" + mod.module_number + ": " + mod.title + " — " + count + " sections"); continue; }

    console.log("[gen] " + mod.cert_level + " M" + mod.module_number + ": " + mod.title + "...");
    const sections = await generateContent(mod.cert_level, mod.title, mod.topic_list);
    if (sections.length === 0) { console.log("  [WARN] No content"); continue; }

    let inserted = 0;
    for (const s of sections) {
      const { data: ex } = await supabase.from("training_content").select("id").eq("module_id", mod.id).eq("section_number", s.section_number).maybeSingle();
      if (ex) continue;
      const { error: ie } = await supabase.from("training_content").insert({
        module_id: mod.id, section_number: s.section_number, section_title: s.section_title,
        content_type: s.content_type, content_text: s.content_text, standard_reference: s.standard_reference || null,
      });
      if (!ie) inserted++;
    }
    console.log("  [ok] " + inserted + " sections");
    totalSeeded += inserted;
  }
  console.log("\n=== Done — " + totalSeeded + " sections seeded ===");
}

main().catch(console.error);
