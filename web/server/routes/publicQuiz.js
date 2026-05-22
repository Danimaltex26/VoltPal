// Public cert-prep quiz (no auth). Marketing surface for paid + organic traffic.
// Three endpoints:
//   GET  /api/public-quiz/journeyman    → returns 10 questions WITHOUT answers
//   POST /api/public-quiz/capture-email → stores email + partial score, returns continue token
//   POST /api/public-quiz/submit        → grades, returns full results with explanations + sends Resend email
//
// Question selection: prefers a curated PUBLIC_JOURNEYMAN_SHOWCASE_IDS list (env or const),
// falls back to a random sample of cert_level='JOURNEYMAN' rows. Falls back further to
// APPRENTICE if JOURNEYMAN bank is empty in this environment.

import { Router } from "express";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sendQuizResultsEmail } from "../utils/email.js";

const router = Router();

const supabaseVolt = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "voltpal" } }
);

const supabasePublic = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const QUESTION_COUNT = 10;

// Curated showcase IDs. Populate after reviewing the bank — until then we fall back to
// random sampling so the route works out of the box.
const PUBLIC_JOURNEYMAN_SHOWCASE_IDS = (process.env.PUBLIC_JOURNEYMAN_SHOWCASE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// HMAC-signed continue token. Lets us trust that the client actually hit the email gate
// without storing per-session server state. Token carries: email + question IDs in order.
const TOKEN_SECRET = process.env.PUBLIC_QUIZ_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-only-secret";

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(body).digest("base64url");
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function loadJourneymanQuestions() {
  // 1. Try curated showcase IDs first.
  if (PUBLIC_JOURNEYMAN_SHOWCASE_IDS.length > 0) {
    const { data, error } = await supabaseVolt
      .from("training_questions")
      .select("id, topic, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, standard_reference")
      .in("id", PUBLIC_JOURNEYMAN_SHOWCASE_IDS);
    if (!error && data && data.length > 0) return data;
  }

  // 2. Random sample of JOURNEYMAN-level questions.
  const { data: jm } = await supabaseVolt
    .from("training_questions")
    .select("id, topic, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, standard_reference")
    .eq("cert_level", "JOURNEYMAN")
    .eq("flagged_quality", false)
    .limit(50);
  if (jm && jm.length >= QUESTION_COUNT) return shuffle(jm).slice(0, QUESTION_COUNT);

  // 3. Fall back to APPRENTICE — better than returning empty for first-launch.
  const { data: app } = await supabaseVolt
    .from("training_questions")
    .select("id, topic, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, standard_reference")
    .eq("cert_level", "APPRENTICE")
    .eq("flagged_quality", false)
    .limit(50);
  if (app && app.length >= QUESTION_COUNT) return shuffle(app).slice(0, QUESTION_COUNT);

  return [];
}

function toClientQuestion(q, index) {
  return {
    index,
    id: q.id,
    topic: q.topic,
    text: q.question_text,
    options: [
      { key: "A", text: q.option_a },
      { key: "B", text: q.option_b },
      { key: "C", text: q.option_c },
      { key: "D", text: q.option_d },
    ].filter((o) => o.text),
  };
}

// GET /api/public-quiz/journeyman
// Returns 10 questions without correct answers. Issues a session token used by submit.
router.get("/journeyman", async (_req, res) => {
  try {
    const raw = await loadJourneymanQuestions();
    if (raw.length === 0) {
      return res.status(503).json({ error: "Quiz unavailable", message: "No questions seeded for this environment." });
    }

    const picked = raw.slice(0, QUESTION_COUNT);
    const sessionToken = signToken({
      source: "voltpal_journeyman",
      ids: picked.map((q) => q.id),
      issued: Date.now(),
    });

    res.json({
      source: "voltpal_journeyman",
      title: "Free Journeyman Electrician Practice Quiz",
      certName: "Journeyman Electrician",
      totalQuestions: picked.length,
      gateAfter: 3,
      questions: picked.map(toClientQuestion),
      sessionToken,
    });
  } catch (err) {
    console.error("GET /public-quiz/journeyman error:", err);
    res.status(500).json({ error: "Failed to load quiz" });
  }
});

// POST /api/public-quiz/capture-email
// Body: { email, sessionToken, partialAnswers: [{ questionIndex, choice }] }
// Stores an early lead (score may be partial) and returns a continue token.
router.post("/capture-email", async (req, res) => {
  try {
    const { email, sessionToken, partialAnswers = [], utm = {}, referrer = "" } = req.body || {};
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email required" });
    }
    const session = verifyToken(sessionToken);
    if (!session) return res.status(400).json({ error: "Invalid session token" });

    // Grade whatever the user has answered so far (informational, not gated)
    let partialScore = null;
    if (Array.isArray(partialAnswers) && partialAnswers.length > 0) {
      const ids = session.ids.filter((_, i) => partialAnswers.some((a) => a.questionIndex === i));
      const { data: qs } = await supabaseVolt
        .from("training_questions")
        .select("id, correct_answer")
        .in("id", ids);
      const correctMap = Object.fromEntries((qs || []).map((q) => [q.id, q.correct_answer]));
      partialScore = partialAnswers.reduce((acc, a) => {
        const qid = session.ids[a.questionIndex];
        return acc + (correctMap[qid] === a.choice ? 1 : 0);
      }, 0);
    }

    await supabasePublic.from("quiz_leads").insert({
      email: email.toLowerCase().trim(),
      source: session.source,
      score: partialScore,
      total: session.ids.length,
      ip: req.ip,
      user_agent: req.get("user-agent") || null,
      referrer: referrer || req.get("referer") || null,
      utm: Object.keys(utm).length > 0 ? utm : null,
    });

    const continueToken = signToken({ ...session, email: email.toLowerCase().trim() });
    res.json({ ok: true, continueToken });
  } catch (err) {
    console.error("POST /public-quiz/capture-email error:", err);
    res.status(500).json({ error: "Failed to capture email" });
  }
});

// POST /api/public-quiz/submit
// Body: { sessionToken, answers: [{ questionIndex, choice }] }
// Returns full graded results with correct answer + explanation per question.
router.post("/submit", async (req, res) => {
  try {
    const { sessionToken, answers = [] } = req.body || {};
    const session = verifyToken(sessionToken);
    if (!session) return res.status(400).json({ error: "Invalid session token" });

    const { data: qs, error } = await supabaseVolt
      .from("training_questions")
      .select("id, topic, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, standard_reference")
      .in("id", session.ids);
    if (error) throw error;

    const byId = Object.fromEntries((qs || []).map((q) => [q.id, q]));

    let correct = 0;
    const results = session.ids.map((qid, i) => {
      const q = byId[qid];
      const answer = answers.find((a) => a.questionIndex === i);
      const userChoice = answer ? answer.choice : null;
      const isCorrect = !!q && userChoice === q.correct_answer;
      if (isCorrect) correct++;
      return {
        index: i,
        questionText: q?.question_text || "",
        topic: q?.topic || null,
        options: q
          ? [
              { key: "A", text: q.option_a },
              { key: "B", text: q.option_b },
              { key: "C", text: q.option_c },
              { key: "D", text: q.option_d },
            ].filter((o) => o.text)
          : [],
        correctAnswer: q?.correct_answer || null,
        userChoice,
        isCorrect,
        explanation: q?.explanation || null,
        standardReference: q?.standard_reference || null,
      };
    });

    // If the user provided email upstream, write a finalized lead row with the real score
    // and send the results email (fire-and-forget — don't block the response on Resend).
    if (session.email) {
      await supabasePublic.from("quiz_leads").insert({
        email: session.email,
        source: session.source,
        score: correct,
        total: session.ids.length,
        ip: req.ip,
        user_agent: req.get("user-agent") || null,
      });

      sendQuizResultsEmail({
        to: session.email,
        source: session.source,
        score: correct,
        total: session.ids.length,
        results,
      }).catch((err) => console.error("sendQuizResultsEmail failed:", err));
    }

    res.json({
      score: correct,
      total: session.ids.length,
      percent: Math.round((correct / session.ids.length) * 100),
      results,
    });
  } catch (err) {
    console.error("POST /public-quiz/submit error:", err);
    res.status(500).json({ error: "Failed to submit quiz" });
  }
});

export default router;
