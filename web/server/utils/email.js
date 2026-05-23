// Shared email notification utility — works across all Pal apps.
// Uses Resend API directly (no extra deps).

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "noreply@tradepals.net";
const FROM_NAME = "TradePals";

// App config — each app passes its key, the rest is derived
const APP_CONFIG = {
  splicepal: { name: "SplicePal", color: "#33cc33", url: "https://splicepal.tradepals.net" },
  weldpal:   { name: "WeldPal",   color: "#F97316", url: "https://weldpal.tradepals.net" },
  poolpal:   { name: "PoolPal",   color: "#14B8A6", url: "https://poolpal.tradepals.net" },
  voltpal:   { name: "VoltPal",   color: "#FACC15", url: "https://voltpal.tradepals.net" },
  pipepal:   { name: "PipePal",   color: "#3B82F6", url: "https://pipepal.tradepals.net" },
};

function buildAnalysisReadyEmail({ appKey, displayName, analysisType }) {
  const app = APP_CONFIG[appKey] || APP_CONFIG.poolpal;
  const logoUrl = `https://tradepals.net/${appKey}-logo.png`;
  const historyUrl = `${app.url}/history`;
  const firstName = (displayName || "").split(" ")[0] || "there";
  const typeLabel = (analysisType || "photo").replace(/_/g, " ");
  // Use dark text for yellow buttons (VoltPal), white for others
  const btnTextColor = appKey === "voltpal" ? "#0f0f10" : "#ffffff";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your ${app.name} analysis is ready</title>
</head>
<body style="margin:0;padding:0;background:#0f0f10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e5e5e7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f0f10;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#17171a;border:1px solid #2a2a2e;border-radius:12px;overflow:hidden;">
          <tr>
            <td align="center" style="padding:32px 32px 16px;">
              <img src="${logoUrl}" alt="${app.name}" width="200" style="display:block;max-width:200px;height:auto;">
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#ffffff;text-align:center;">Your analysis is ready</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#a0a0a8;text-align:center;">
                Hey ${firstName}, your <strong style="color:#ffffff;">${typeLabel}</strong> analysis has been processed and is ready to view in ${app.name}.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 32px 24px;">
              <a href="${historyUrl}" style="display:inline-block;background:${app.color};color:${btnTextColor};font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:8px;">View in ${app.name}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #2a2a2e;">
              <p style="margin:0;font-size:12px;color:#6b6b73;text-align:center;line-height:1.6;">
                This notification was sent because a queued photo was processed while you were offline.<br>
                ${app.name} is a TradePals, LLC product &middot; <a href="https://tradepals.net" style="color:#6b6b73;text-decoration:underline;">tradepals.net</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Public cert-prep quiz results email ───────────────────────────────────────

const QUIZ_CONFIG = {
  voltpal_journeyman: {
    appKey: "voltpal",
    certName: "Journeyman",
    certFull: "Journeyman Electrician",
    passPercent: 70,
    signupPath: "/signup?utm_source=journeyman_quiz&utm_medium=email&utm_campaign=public_quiz",
  },
};

// Spanish language strings for the quiz results email.
// All copy is Claude-drafted Mexican Spanish — review with a native speaker before
// wide distribution. Cert names (Journeyman) stay in English per VoltPal Spanish brief.
// TODO[native-speaker review]: confirm tone (semi-formal "tú" used here) + dialect.
const QUIZ_CONFIG_ES = {
  voltpal_journeyman: {
    appKey: "voltpal",
    certName: "Journeyman",
    passPercent: 70,
    signupPath: "/signup?utm_source=journeyman_quiz&utm_medium=email&utm_campaign=public_quiz&utm_content=es",
    quizUrl: "https://voltpal.tradepals.net/es/journeyman-practice",
    subject: (score, total) => `Tu resultado del examen de práctica Journeyman — ${score}/${total}`,
    scoreLabel: "Tu puntaje",
    passedAbove: (pct, mark) => `${pct}% — Arriba del puntaje mínimo Journeyman (${mark}%)`,
    passedBelow: (pct, mark) => `${pct}% — Abajo del puntaje mínimo Journeyman (${mark}%)`,
    ctaHeadline: "Obtén el banco completo Journeyman + tutor AI",
    ctaBody: "VoltPal te explica cada respuesta incorrecta, identifica tus áreas débiles y corre simulacros completos cronometrados. Prueba gratis, cancela cuando quieras.",
    ctaPrimary: "Prueba VoltPal Pro Gratis →",
    ctaFooter: "Comienza tu prueba gratuita →",
    reviewHeadline: "Revisión pregunta por pregunta",
    verdictCorrect: "Correcto",
    verdictIncorrect: "Incorrecto",
    verdictSkipped: "Sin contestar",
    yourAnswer: "Tu respuesta",
    correctAnswer: "Respuesta correcta",
    refLabel: "Ref:",
    footerLine: (appUrl) => `Tomaste el examen gratis de práctica Journeyman en ${appUrl}/es/journeyman-practice.`,
    footerCompany: "VoltPal es un producto de TradePals, LLC",
  },
};

function buildQuizResultsEmail({ source, score, total, results, lang }) {
  const isEs = lang === "es";
  const baseSource = source.replace(/_es$/, ""); // voltpal_journeyman_es → voltpal_journeyman
  const cfg = isEs
    ? (QUIZ_CONFIG_ES[baseSource] || QUIZ_CONFIG_ES.voltpal_journeyman)
    : (QUIZ_CONFIG[baseSource] || QUIZ_CONFIG.voltpal_journeyman);
  const app = APP_CONFIG[cfg.appKey] || APP_CONFIG.voltpal;
  const logoUrl = `https://tradepals.net/${cfg.appKey}-logo.png`;
  const percent = Math.round((score / total) * 100);
  const passed = percent >= cfg.passPercent;
  const scoreColor = passed ? app.color : "#F59E0B";
  const signupUrl = `${app.url}${cfg.signupPath}`;
  // VoltPal accent is yellow — yellow buttons need dark text for legibility (WCAG)
  const btnTextColor = cfg.appKey === "voltpal" ? "#0f0f10" : "#ffffff";

  // Localized labels — Spanish or English
  const L = isEs ? {
    scoreLabel: cfg.scoreLabel,
    passed: passed ? cfg.passedAbove(percent, cfg.passPercent) : cfg.passedBelow(percent, cfg.passPercent),
    ctaHeadline: cfg.ctaHeadline,
    ctaBody: cfg.ctaBody,
    ctaPrimary: cfg.ctaPrimary,
    ctaFooter: cfg.ctaFooter,
    reviewHeadline: cfg.reviewHeadline,
    verdictCorrect: cfg.verdictCorrect,
    verdictIncorrect: cfg.verdictIncorrect,
    verdictSkipped: cfg.verdictSkipped,
    yourAnswer: cfg.yourAnswer,
    correctAnswer: cfg.correctAnswer,
    refLabel: cfg.refLabel,
    footerLine: cfg.footerLine(app.url),
    footerCompany: cfg.footerCompany,
    htmlLang: "es",
  } : {
    scoreLabel: "Your Score",
    passed: passed
      ? `${percent}% — Above ${cfg.certName} pass mark (${cfg.passPercent}%)`
      : `${percent}% — Below ${cfg.certName} pass mark (${cfg.passPercent}%)`,
    ctaHeadline: `Get the full ${cfg.certName} bank + AI tutor`,
    ctaBody: `${app.name} walks you through every wrong answer, tracks your weak domains, and runs full timed mock exams. Free trial, cancel anytime.`,
    ctaPrimary: `Try ${app.name} Pro Free →`,
    ctaFooter: "Start Your Free Trial →",
    reviewHeadline: "Question-by-question review",
    verdictCorrect: "Correct",
    verdictIncorrect: "Incorrect",
    verdictSkipped: "Skipped",
    yourAnswer: "Your answer",
    correctAnswer: "Correct",
    refLabel: "Ref:",
    footerLine: `You took the free ${cfg.certName} practice quiz at ${app.url}/journeyman-practice.`,
    footerCompany: `${app.name} is a TradePals, LLC product`,
    htmlLang: "en",
  };

  const reviewRows = (results || [])
    .map((r) => {
      const userText = r.userChoice
        ? (r.options.find((o) => o.key === r.userChoice)?.text || "")
        : (isEs ? "(sin contestar)" : "(skipped)");
      const correctText = r.options.find((o) => o.key === r.correctAnswer)?.text || "";
      const stripColor = r.isCorrect ? app.color : "#EF4444";
      const verdict = r.isCorrect ? L.verdictCorrect : (r.userChoice ? L.verdictIncorrect : L.verdictSkipped);
      return `
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid #2a2a2e;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-left:3px solid ${stripColor};padding:0 0 0 14px;">
                  <p style="margin:0 0 6px;font-size:12px;color:#6b6b73;text-transform:uppercase;letter-spacing:0.5px;">
                    Q${r.index + 1}${r.topic ? ` · ${r.topic}` : ""} · <span style="color:${stripColor};font-weight:600;">${verdict}</span>
                  </p>
                  <p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:#e5e5e7;">${r.questionText}</p>
                  ${!r.isCorrect && r.userChoice ? `<p style="margin:0 0 4px;font-size:13px;color:#a0a0a8;">${L.yourAnswer}: <strong style="color:#EF4444;">${r.userChoice}</strong> — ${userText}</p>` : ""}
                  <p style="margin:0 0 10px;font-size:13px;color:#a0a0a8;">${L.correctAnswer}: <strong style="color:${app.color};">${r.correctAnswer}</strong> — ${correctText}</p>
                  ${r.explanation ? `<div style="background:rgba(250,204,21,0.06);border-radius:6px;padding:10px 12px;font-size:13px;line-height:1.55;color:#d4d4d8;">${r.explanation}</div>` : ""}
                  ${r.standardReference ? `<p style="margin:6px 0 0;font-size:12px;color:#6b6b73;">${L.refLabel} ${r.standardReference}</p>` : ""}
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="${L.htmlLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${isEs ? `Resultado del examen ${cfg.certName}` : `Your ${cfg.certName} practice quiz results`}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e5e5e7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f0f10;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#17171a;border:1px solid #2a2a2e;border-radius:12px;overflow:hidden;">
          <tr>
            <td align="center" style="padding:32px 32px 8px;">
              <img src="${logoUrl}" alt="${app.name}" width="180" style="display:block;max-width:180px;height:auto;">
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 32px 0;">
              <p style="margin:0 0 4px;font-size:12px;color:#6b6b73;text-transform:uppercase;letter-spacing:0.5px;">${L.scoreLabel}</p>
              <p style="margin:0;font-size:48px;font-weight:700;color:${scoreColor};line-height:1;">${score}/${total}</p>
              <p style="margin:6px 0 0;font-size:15px;color:#d4d4d8;">
                ${L.passed}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,rgba(250,204,21,0.14),rgba(250,204,21,0.04));border:1px solid rgba(250,204,21,0.3);border-radius:10px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <h2 style="margin:0 0 8px;font-size:17px;color:#ffffff;">${L.ctaHeadline}</h2>
                    <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#d4d4d8;">${L.ctaBody}</p>
                    <a href="${signupUrl}" style="display:inline-block;background:${app.color};color:${btnTextColor};font-weight:700;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:8px;">${L.ctaPrimary}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px;">
              <h3 style="margin:16px 0 0;font-size:15px;color:#ffffff;">${L.reviewHeadline}</h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${reviewRows}
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 32px 24px;">
              <a href="${signupUrl}" style="display:inline-block;background:${app.color};color:${btnTextColor};font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:8px;">${L.ctaFooter}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #2a2a2e;">
              <p style="margin:0;font-size:12px;color:#6b6b73;text-align:center;line-height:1.6;">
                ${L.footerLine}<br>
                ${L.footerCompany} · <a href="https://tradepals.net" style="color:#6b6b73;text-decoration:underline;">tradepals.net</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendQuizResultsEmail({ to, source, score, total, results, lang }) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping quiz results email");
    return;
  }

  const isEs = lang === "es";
  const baseSource = source.replace(/_es$/, "");
  const cfg = isEs
    ? (QUIZ_CONFIG_ES[baseSource] || QUIZ_CONFIG_ES.voltpal_journeyman)
    : (QUIZ_CONFIG[baseSource] || QUIZ_CONFIG.voltpal_journeyman);
  const html = buildQuizResultsEmail({ source, score, total, results, lang });
  const subject = isEs
    ? cfg.subject(score, total)
    : `Your ${cfg.certName} practice quiz results — ${score}/${total}`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend quiz results email error:", res.status, err);
    }
  } catch (err) {
    console.error("Quiz results email send failed:", err.message);
  }
}

export async function sendAnalysisReadyEmail({ to, appKey, displayName, analysisType }) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email notification");
    return;
  }

  const app = APP_CONFIG[appKey] || APP_CONFIG.poolpal;
  const html = buildAnalysisReadyEmail({ appKey, displayName, analysisType });

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject: `Your ${app.name} analysis is ready`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend email error:", res.status, err);
    }
  } catch (err) {
    console.error("Email send failed:", err.message);
  }
}
