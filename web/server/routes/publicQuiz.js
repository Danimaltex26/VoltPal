// Public cert-prep quiz (no auth). Marketing surface for paid + organic traffic.
// Routes (all return/accept the same shape — cert is in the URL):
//   GET  /api/public-quiz/:cert         → returns 10 questions WITHOUT answers
//   POST /api/public-quiz/capture-email → stores email + partial score, returns continue token
//   POST /api/public-quiz/submit        → grades, returns full results + sends Resend results email
//
// Supported :cert slugs are listed in CERTS below. Each maps to a voltpal.training_questions
// cert_level value plus per-cert display + email config.
//
// Backward-compat: GET /journeyman still works (it's just :cert=journeyman).

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

// Per-cert config. URL slug → DB cert_level + display + email source.
// passPercent mirrors server/config/examBlueprints.js exactly.
const CERTS = {
  apprentice: {
    cert_level: "APPRENTICE",
    source: "voltpal_apprentice",
    title: "Free Apprentice Electrician Practice Quiz",
    titleEs: "Examen Gratis de Práctica Aprendiz Electricista",
    certName: "Apprentice Electrician",
    certNameEs: "Aprendiz Electricista",
    passPercent: 70,
    showcaseEnvVar: "PUBLIC_APPRENTICE_SHOWCASE_IDS",
    fallbackCert: null,
  },
  journeyman: {
    cert_level: "JOURNEYMAN",
    source: "voltpal_journeyman",
    title: "Free Journeyman Electrician Practice Quiz",
    titleEs: "Examen Gratis de Práctica Journeyman",
    certName: "Journeyman Electrician",
    certNameEs: "Journeyman",
    passPercent: 70,
    showcaseEnvVar: "PUBLIC_JOURNEYMAN_SHOWCASE_IDS",
    fallbackCert: "APPRENTICE",
  },
  master: {
    cert_level: "MASTER",
    source: "voltpal_master",
    title: "Free Master Electrician Practice Quiz",
    titleEs: "Examen Gratis de Práctica Master Electrician",
    certName: "Master Electrician",
    certNameEs: "Master Electrician",
    passPercent: 75,
    showcaseEnvVar: "PUBLIC_MASTER_SHOWCASE_IDS",
    fallbackCert: "JOURNEYMAN",
  },
  "nfpa-70e": {
    cert_level: "NFPA_70E",
    source: "voltpal_nfpa_70e",
    title: "Free NFPA 70E Practice Quiz",
    titleEs: "Examen Gratis de Práctica NFPA 70E",
    certName: "NFPA 70E",
    certNameEs: "NFPA 70E",
    passPercent: 70,
    showcaseEnvVar: "PUBLIC_NFPA_70E_SHOWCASE_IDS",
    fallbackCert: null,
  },
};

// HMAC-signed continue token. Lets us trust that the client actually hit the email gate
// without storing per-session server state. Token carries: source, ids, lang, email?.
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

// Apply Spanish content_es overlay if available. Per-field fallback to English.
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

const ENGLISH_COLS = "id, topic, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, standard_reference";
const WITH_ES_COLS = ENGLISH_COLS + ", content_es";

async function loadCertQuestions(cfg, lang) {
  const wantEs = lang === "es";
  let cols = wantEs ? WITH_ES_COLS : ENGLISH_COLS;

  function isColumnMissingError(err) {
    return err && /content_es/.test(err.message || "");
  }

  // 1. For Spanish requests, prefer rows that have a Spanish translation seeded.
  if (wantEs) {
    const r = await supabaseVolt
      .from("training_questions")
      .select(cols)
      .eq("cert_level", cfg.cert_level)
      .eq("flagged_quality", false)
      .not("content_es", "is", null)
      .limit(QUESTION_COUNT);
    if (!r.error && r.data && r.data.length >= QUESTION_COUNT) {
      return { questions: r.data, translationStatus: "es" };
    }
    if (isColumnMissingError(r.error)) {
      console.warn(`[public-quiz] content_es column missing — falling back to English.`);
      cols = ENGLISH_COLS;
    }
  }

  // 2. Curated showcase IDs (if env var set).
  const showcaseIds = (process.env[cfg.showcaseEnvVar] || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (showcaseIds.length > 0) {
    const r = await supabaseVolt.from("training_questions").select(cols).in("id", showcaseIds);
    if (!r.error && r.data && r.data.length > 0) {
      return { questions: r.data, translationStatus: wantEs ? "fallback-en" : "en" };
    }
  }

  // 3. Random sample of the requested cert.
  const primary = await supabaseVolt
    .from("training_questions")
    .select(cols)
    .eq("cert_level", cfg.cert_level)
    .eq("flagged_quality", false)
    .limit(50);
  if (!primary.error && primary.data && primary.data.length >= QUESTION_COUNT) {
    return { questions: shuffle(primary.data).slice(0, QUESTION_COUNT), translationStatus: wantEs ? "fallback-en" : "en" };
  }
  if (isColumnMissingError(primary.error)) {
    const retry = await supabaseVolt
      .from("training_questions")
      .select(ENGLISH_COLS)
      .eq("cert_level", cfg.cert_level)
      .eq("flagged_quality", false)
      .limit(50);
    if (!retry.error && retry.data && retry.data.length >= QUESTION_COUNT) {
      return { questions: shuffle(retry.data).slice(0, QUESTION_COUNT), translationStatus: wantEs ? "fallback-en" : "en" };
    }
  }

  // 4. Fall back to a friendlier cert if configured (e.g. master → journeyman).
  if (cfg.fallbackCert) {
    const fb = await supabaseVolt
      .from("training_questions")
      .select(ENGLISH_COLS)
      .eq("cert_level", cfg.fallbackCert)
      .eq("flagged_quality", false)
      .limit(50);
    if (!fb.error && fb.data && fb.data.length >= QUESTION_COUNT) {
      return { questions: shuffle(fb.data).slice(0, QUESTION_COUNT), translationStatus: wantEs ? "fallback-en" : "en" };
    }
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

// GET /api/public-quiz/:cert?lang=en|es
router.get("/:cert", async (req, res) => {
  try {
    const cfg = CERTS[req.params.cert];
    if (!cfg) {
      return res.status(404).json({ error: "Unknown cert", availableCerts: Object.keys(CERTS) });
    }
    const lang = req.query.lang === "es" ? "es" : "en";
    const { questions: raw, translationStatus } = await loadCertQuestions(cfg, lang);
    if (raw.length === 0) {
      return res.status(503).json({ error: "Quiz unavailable", message: "No questions seeded for this environment." });
    }

    const picked = raw.slice(0, QUESTION_COUNT);
    const localized = translationStatus === "es" ? picked.map(applyEsOverlay) : picked;

    const sessionToken = signToken({
      source: lang === "es" ? `${cfg.source}_es` : cfg.source,
      certSlug: req.params.cert,
      ids: picked.map((q) => q.id),
      lang,
      issued: Date.now(),
    });

    res.set("X-Translation-Status", translationStatus);

    res.json({
      source: lang === "es" ? `${cfg.source}_es` : cfg.source,
      title: lang === "es" ? cfg.titleEs : cfg.title,
      certName: lang === "es" ? cfg.certNameEs : cfg.certName,
      certSlug: req.params.cert,
      passPercent: cfg.passPercent,
      lang,
      translationStatus,
      totalQuestions: picked.length,
      gateAfter: 3,
      questions: localized.map(toClientQuestion),
      sessionToken,
    });
  } catch (err) {
    console.error(`GET /public-quiz/${req.params.cert} error:`, err);
    res.status(500).json({ error: "Failed to load quiz" });
  }
});

// POST /api/public-quiz/capture-email — unchanged contract; cert is encoded in the session token.
router.post("/capture-email", async (req, res) => {
  try {
    const { email, sessionToken, partialAnswers = [], utm = {}, referrer = "" } = req.body || {};
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email required" });
    }
    const session = verifyToken(sessionToken);
    if (!session) return res.status(400).json({ error: "Invalid session token" });

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

// POST /api/public-quiz/submit — unchanged contract; cert + lang encoded in session token.
router.post("/submit", async (req, res) => {
  try {
    const { sessionToken, answers = [] } = req.body || {};
    const session = verifyToken(sessionToken);
    if (!session) return res.status(400).json({ error: "Invalid session token" });

    const lang = session.lang === "es" ? "es" : "en";
    const cols = lang === "es"
      ? "id, topic, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, standard_reference, content_es"
      : "id, topic, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, standard_reference";
    let qResp = await supabaseVolt.from("training_questions").select(cols).in("id", session.ids);
    if (qResp.error && lang === "es" && /content_es/.test(qResp.error.message)) {
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
