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

// Apply Spanish content_es overlay to a question row if available.
// Returns the question with question_text / option_a..d / explanation overridden
// from the content_es JSONB column. Falls back to English where Spanish is absent
// (per-field — so a partial translation still surfaces what it has).
function applyEsOverlay(q) {
  const es = q.content_es;
  if (!es || typeof es !== "object") return q;
  return {
    ...q,
    question_text: es.question_text || q.question_text,
    option_a: es.option_a || q.option_a,
    option_b: es.option_b || q.option_b,
    option_c: es.option_c || q.option_c,
    option_d: es.option_d || q.option_d,
    explanation: es.explanation || q.explanation,
  };
}

// Pick the column list to select; include content_es only when content_es column exists
// (migration 050 applied). Falls back gracefully if the column doesn't exist yet.
const ENGLISH_COLS = "id, topic, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, standard_reference";
const WITH_ES_COLS = ENGLISH_COLS + ", content_es";

async function loadJourneymanQuestions(lang) {
  const wantEs = lang === "es";
  // When serving Spanish, try with content_es column; if migration 050 isn't applied
  // yet, retry with English-only columns. esColumnAvailable tracks the outcome so
  // subsequent fallback queries don't repeat the same failed select.
  let cols = wantEs ? WITH_ES_COLS : ENGLISH_COLS;
  let esColumnAvailable = wantEs;

  function isColumnMissingError(err) {
    return err && /content_es/.test(err.message || "");
  }

  // 1. For Spanish requests, prefer rows that have a Spanish translation seeded.
  if (wantEs) {
    const r = await supabaseVolt
      .from("training_questions")
      .select(cols)
      .eq("cert_level", "JOURNEYMAN")
      .eq("flagged_quality", false)
      .not("content_es", "is", null)
      .limit(QUESTION_COUNT);
    if (!r.error && r.data && r.data.length >= QUESTION_COUNT) {
      return { questions: r.data, translationStatus: "es" };
    }
    if (isColumnMissingError(r.error)) {
      console.warn("[public-quiz] content_es column missing (migration 050 not applied) — falling back to English.");
      esColumnAvailable = false;
      cols = ENGLISH_COLS;
    }
    // Fall through to English with a warning header
  }

  // 2. Try curated showcase IDs.
  if (PUBLIC_JOURNEYMAN_SHOWCASE_IDS.length > 0) {
    const r = await supabaseVolt
      .from("training_questions")
      .select(cols)
      .in("id", PUBLIC_JOURNEYMAN_SHOWCASE_IDS);
    if (!r.error && r.data && r.data.length > 0) {
      return { questions: r.data, translationStatus: wantEs ? "fallback-en" : "en" };
    }
  }

  // 3. Random sample of JOURNEYMAN-level questions.
  const jmR = await supabaseVolt
    .from("training_questions")
    .select(cols)
    .eq("cert_level", "JOURNEYMAN")
    .eq("flagged_quality", false)
    .limit(50);
  if (!jmR.error && jmR.data && jmR.data.length >= QUESTION_COUNT) {
    return { questions: shuffle(jmR.data).slice(0, QUESTION_COUNT), translationStatus: wantEs ? "fallback-en" : "en" };
  }
  if (isColumnMissingError(jmR.error) && esColumnAvailable) {
    // Retry English-only one more time (in case showcase path didn't trip it)
    esColumnAvailable = false;
    cols = ENGLISH_COLS;
    const jmRetry = await supabaseVolt
      .from("training_questions")
      .select(cols)
      .eq("cert_level", "JOURNEYMAN")
      .eq("flagged_quality", false)
      .limit(50);
    if (!jmRetry.error && jmRetry.data && jmRetry.data.length >= QUESTION_COUNT) {
      return { questions: shuffle(jmRetry.data).slice(0, QUESTION_COUNT), translationStatus: wantEs ? "fallback-en" : "en" };
    }
  }

  // 4. Fall back to APPRENTICE.
  const appR = await supabaseVolt
    .from("training_questions")
    .select(cols)
    .eq("cert_level", "APPRENTICE")
    .eq("flagged_quality", false)
    .limit(50);
  if (!appR.error && appR.data && appR.data.length >= QUESTION_COUNT) {
    return { questions: shuffle(appR.data).slice(0, QUESTION_COUNT), translationStatus: wantEs ? "fallback-en" : "en" };
  }

  return { questions: [], translationStatus: "none" };
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

// GET /api/public-quiz/journeyman?lang=en|es
// Returns 10 questions without correct answers. Issues a session token used by submit.
// When ?lang=es, prefers questions with a Spanish content_es payload (after migration 050 + 051);
// falls back to English with X-Translation-Status: fallback-en header if no Spanish content found.
router.get("/journeyman", async (req, res) => {
  try {
    const lang = req.query.lang === "es" ? "es" : "en";
    const { questions: raw, translationStatus } = await loadJourneymanQuestions(lang);
    if (raw.length === 0) {
      return res.status(503).json({ error: "Quiz unavailable", message: "No questions seeded for this environment." });
    }

    const picked = raw.slice(0, QUESTION_COUNT);
    // Apply Spanish overlay when serving Spanish content
    const localized = translationStatus === "es" ? picked.map(applyEsOverlay) : picked;

    const sessionToken = signToken({
      source: lang === "es" ? "voltpal_journeyman_es" : "voltpal_journeyman",
      ids: picked.map((q) => q.id),
      lang,
      issued: Date.now(),
    });

    // Surface translation status as a response header so the client can show a notice if it falls back
    res.set("X-Translation-Status", translationStatus);

    res.json({
      source: lang === "es" ? "voltpal_journeyman_es" : "voltpal_journeyman",
      title: lang === "es"
        ? "Examen Gratis de Práctica Journeyman"
        : "Free Journeyman Electrician Practice Quiz",
      certName: lang === "es" ? "Journeyman" : "Journeyman Electrician",
      lang,
      translationStatus,
      totalQuestions: picked.length,
      gateAfter: 3,
      questions: localized.map(toClientQuestion),
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

    const lang = session.lang === "es" ? "es" : "en";
    // Pull the same columns (including content_es when serving Spanish), and apply the overlay
    const cols = lang === "es"
      ? "id, topic, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, standard_reference, content_es"
      : "id, topic, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, standard_reference";
    let qResp = await supabaseVolt.from("training_questions").select(cols).in("id", session.ids);
    if (qResp.error && lang === "es" && /content_es/.test(qResp.error.message)) {
      // Column missing (migration 050 not applied) — retry without content_es
      qResp = await supabaseVolt
        .from("training_questions")
        .select("id, topic, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, standard_reference")
        .in("id", session.ids);
    }
    if (qResp.error) throw qResp.error;

    const byId = Object.fromEntries((qResp.data || []).map((q) => [q.id, lang === "es" ? applyEsOverlay(q) : q]));

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
        lang,
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
