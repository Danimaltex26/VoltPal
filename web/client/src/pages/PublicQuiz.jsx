import { useEffect, useState, useRef } from 'react';
import { strings } from '../i18n/voltpal';

const API_ROOT = import.meta.env.VITE_API_URL || '';
const VOLTPAL_YELLOW = '#FACC15';
const ON_YELLOW_TEXT = '#0f0f10'; // dark text on yellow for legibility (WCAG)
const GATE_AFTER = 3; // soft email gate after Q3

// Analytics — best-effort, never throws if pixel/dataLayer absent.
function track(event, payload = {}) {
  try {
    if (typeof window === 'undefined') return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...payload });
    if (typeof window.rdt === 'function') {
      const rdtMap = {
        quiz_start: 'ViewContent',
        quiz_email_capture: 'Lead',
        quiz_complete: 'CompleteRegistration',
        quiz_cta_click: 'AddToCart',
      };
      const rdtEvent = rdtMap[event];
      if (rdtEvent) window.rdt('track', rdtEvent);
    }
  } catch {
    /* analytics never blocks UX */
  }
}

function getUtmParams() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const utm = {};
  ['source', 'medium', 'campaign', 'content', 'term'].forEach((k) => {
    const v = params.get(`utm_${k}`);
    if (v) utm[k] = v;
  });
  return utm;
}

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div style={{ width: '100%', height: 6, background: '#1F1F22', borderRadius: 3, marginBottom: '1rem', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: VOLTPAL_YELLOW, transition: 'width 0.3s ease' }} />
    </div>
  );
}

function Hero({ onStart, certName, t }) {
  return (
    <div style={{ textAlign: 'center', padding: '2.5rem 0 2rem' }}>
      <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', margin: '0 0 0.75rem', lineHeight: 1.15 }}>
        {t.heroTitle({ certName })}
      </h1>
      <p style={{ color: '#A0A0A8', fontSize: '1.0625rem', margin: '0 0 1.75rem', maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
        {t.heroSubtitle({ certName })}
      </p>
      <button
        className="btn btn-primary"
        style={{ minWidth: 220, fontSize: '1.0625rem', padding: '0.875rem 2rem', background: VOLTPAL_YELLOW, color: ON_YELLOW_TEXT, border: 'none' }}
        onClick={onStart}
      >
        {t.heroStart}
      </button>
      <p style={{ color: '#6B6B73', fontSize: '0.875rem', marginTop: '2rem' }}>
        {t.heroFooter}
      </p>
    </div>
  );
}

function QuestionCard({ q, index, total, selected, onSelect, onNext, onPrev, canGoBack, isLast, t }) {
  return (
    <div>
      <ProgressBar current={index + 1} total={total} />
      <div className="row-between" style={{ marginBottom: '0.5rem' }}>
        <span className="text-muted" style={{ fontSize: '0.875rem' }}>{t.questionLabel({ current: index + 1, total })}</span>
        {q.topic && <span className="text-muted" style={{ fontSize: '0.8125rem' }}>{q.topic}</span>}
      </div>
      <div className="card">
        <p style={{ fontSize: '1.0625rem', lineHeight: 1.55, marginBottom: '1.25rem' }}>{q.text}</p>
        <div className="stack-sm">
          {q.options.map((opt) => {
            const isSelected = selected === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => onSelect(opt.key)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '0.875rem 1rem', borderRadius: 8,
                  border: `1px solid ${isSelected ? VOLTPAL_YELLOW : '#2A2A2E'}`,
                  backgroundColor: isSelected ? 'rgba(250,204,21,0.10)' : 'transparent',
                  color: '#F5F5F5', fontSize: '0.9375rem',
                  cursor: 'pointer', minHeight: 48,
                  transition: 'border-color 0.15s, background-color 0.15s',
                }}
              >
                <strong style={{ marginRight: 8 }}>{opt.key}.</strong>{opt.text}
              </button>
            );
          })}
        </div>
      </div>
      <div className="row-between" style={{ marginTop: '1rem' }}>
        <button className="btn btn-ghost" onClick={onPrev} disabled={!canGoBack}>{t.previous}</button>
        <button
          className="btn btn-primary"
          onClick={onNext}
          disabled={selected == null}
          style={{ background: VOLTPAL_YELLOW, color: ON_YELLOW_TEXT, border: 'none' }}
        >
          {isLast ? t.seeResults : t.next}
        </button>
      </div>
    </div>
  );
}

function EmailGate({ onSubmit, onSkip, submitting, error, t, certName }) {
  const [email, setEmail] = useState('');
  return (
    <div className="card" style={{ maxWidth: 480, margin: '2rem auto', textAlign: 'center' }}>
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.375rem' }}>{t.gateHeadline}</h2>
      <p style={{ color: '#A0A0A8', fontSize: '0.9375rem', margin: '0 0 1.5rem' }}>
        {t.gateBody({ certName })}
      </p>
      <form onSubmit={(e) => { e.preventDefault(); if (email && !submitting) onSubmit(email); }}>
        <input
          type="email"
          required
          autoFocus
          inputMode="email"
          placeholder={t.gateEmailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          style={{
            width: '100%', padding: '0.875rem 1rem', borderRadius: 8,
            border: '1px solid #2A2A2E', background: '#1F1F22', color: '#F5F5F5',
            fontSize: '1rem', marginBottom: '0.75rem', minHeight: 48,
          }}
        />
        {error && <p style={{ color: '#EF4444', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>{error}</p>}
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={!email || submitting}
          style={{ background: VOLTPAL_YELLOW, color: ON_YELLOW_TEXT, border: 'none' }}
        >
          {submitting ? t.gateSubmitting : t.gateSubmit}
        </button>
      </form>
      <button className="btn btn-ghost" style={{ marginTop: '0.75rem', fontSize: '0.875rem' }} onClick={onSkip} disabled={submitting}>
        {t.gateSkip}
      </button>
    </div>
  );
}

function ResultsView({ result, onCtaClick, t, certName, passPercent }) {
  const { score, total, percent, results } = result;
  const passed = percent >= passPercent;
  return (
    <div>
      <div className="card" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <p style={{ color: '#A0A0A8', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 0.5rem' }}>{t.yourScore}</p>
        <p style={{ fontSize: '3rem', fontWeight: 700, margin: 0, color: passed ? VOLTPAL_YELLOW : '#F59E0B' }}>
          {score}/{total}
        </p>
        <p style={{ fontSize: '1rem', color: '#D4D4D8', margin: '0.25rem 0 0' }}>
          {passed
            ? t.abovePassMark({ percent, certName, passPercent })
            : t.belowPassMark({ percent, certName, passPercent })}
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(250,204,21,0.14), rgba(250,204,21,0.04))', border: '1px solid rgba(250,204,21,0.3)' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem' }}>{t.ctaHeadline({ certName })}</h3>
        <p style={{ color: '#D4D4D8', fontSize: '0.9375rem', margin: '0 0 1rem' }}>{t.ctaBody}</p>
        <button
          className="btn btn-primary btn-block"
          onClick={onCtaClick}
          style={{ background: VOLTPAL_YELLOW, color: ON_YELLOW_TEXT, border: 'none' }}
        >
          {t.ctaPrimary}
        </button>
      </div>

      <h3 style={{ margin: '1rem 0 0.75rem', fontSize: '1.0625rem' }}>{t.reviewHeadline}</h3>
      {results.map((r) => (
        <div key={r.index} className="card" style={{ marginBottom: '0.75rem', borderLeft: `3px solid ${r.isCorrect ? VOLTPAL_YELLOW : '#EF4444'}` }}>
          <div className="row-between" style={{ marginBottom: '0.5rem' }}>
            <span className="text-muted" style={{ fontSize: '0.8125rem' }}>Q{r.index + 1}{r.topic ? ` · ${r.topic}` : ''}</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: r.isCorrect ? VOLTPAL_YELLOW : '#EF4444' }}>
              {r.isCorrect ? t.verdictCorrect : r.userChoice ? t.verdictIncorrect : t.verdictSkipped}
            </span>
          </div>
          <p style={{ fontSize: '0.9375rem', lineHeight: 1.5, margin: '0 0 0.75rem' }}>{r.questionText}</p>
          <div style={{ fontSize: '0.875rem', color: '#A0A0A8', marginBottom: '0.5rem' }}>
            {r.userChoice && r.userChoice !== r.correctAnswer && (
              <div>{t.yourAnswer}: <strong style={{ color: '#EF4444' }}>{r.userChoice}</strong> — {r.options.find((o) => o.key === r.userChoice)?.text}</div>
            )}
            <div>{t.correctAnswer}: <strong style={{ color: VOLTPAL_YELLOW }}>{r.correctAnswer}</strong> — {r.options.find((o) => o.key === r.correctAnswer)?.text}</div>
          </div>
          {r.explanation && (
            <div style={{ padding: '0.75rem', background: 'rgba(250,204,21,0.06)', borderRadius: 6, fontSize: '0.875rem', lineHeight: 1.55, color: '#D4D4D8' }}>
              {r.explanation}
            </div>
          )}
          {r.standardReference && (
            <p className="text-muted" style={{ fontSize: '0.8125rem', marginTop: '0.5rem', marginBottom: 0 }}>{t.refLabel} {r.standardReference}</p>
          )}
        </div>
      ))}

      <div className="card" style={{ marginTop: '1.5rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(250,204,21,0.14), rgba(250,204,21,0.04))', border: '1px solid rgba(250,204,21,0.3)' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem' }}>{t.readyHeadline}</h3>
        <button
          className="btn btn-primary"
          style={{ minWidth: 240, background: VOLTPAL_YELLOW, color: ON_YELLOW_TEXT, border: 'none' }}
          onClick={onCtaClick}
        >
          {t.ctaTrial}
        </button>
      </div>
    </div>
  );
}

export default function PublicQuiz({ lang = 'en', cert = 'journeyman' }) {
  const t = strings(lang);
  const [stage, setStage] = useState('intro'); // intro | quiz | gate | submitting | results | error
  const [quiz, setQuiz] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionIndex]: 'A'|'B'|'C'|'D' }
  const [sessionToken, setSessionToken] = useState(null);
  const [continueToken, setContinueToken] = useState(null);
  const [gateShownOnce, setGateShownOnce] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [result, setResult] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const utmRef = useRef(getUtmParams());

  // certName is hydrated from the server response after loadQuiz; we fall back to the
  // capitalized cert slug for the very first paint so meta tags aren't blank.
  const certNameForMeta = quiz?.certName || cert.charAt(0).toUpperCase() + cert.slice(1).replace('-', ' ');

  // Set page metadata (title + OG + JSON-LD) — client-side; sufficient for Google but
  // not for social crawlers (would need SSR/prerender for full sharing support).
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.pageTitle({ certName: certNameForMeta });
    const setMeta = (name, content, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', t.metaDescription({ certName: certNameForMeta }));
    setMeta('og:title', t.pageTitle({ certName: certNameForMeta }), 'property');
    setMeta('og:description', t.ogDescription({ certName: certNameForMeta }), 'property');
    setMeta('og:type', 'website', 'property');
    setMeta('og:locale', lang === 'es' ? 'es_US' : 'en_US', 'property');

    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.id = `${cert}-quiz-schema`;
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Course',
      inLanguage: lang,
      name: `${certNameForMeta} Exam Prep — VoltPal`,
      description: `AI-assisted ${certNameForMeta} electrician exam prep with a free 10-question diagnostic quiz, full question bank, NEC code lookups, and per-domain weak-area drills.`,
      provider: { '@type': 'Organization', name: 'VoltPal', sameAs: 'https://voltpal.tradepals.net' },
      hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'Online', courseWorkload: 'PT5M', inLanguage: lang },
    });
    document.head.appendChild(ld);
    return () => { document.getElementById(`${cert}-quiz-schema`)?.remove(); };
  }, [lang, t, cert, certNameForMeta]);

  async function loadQuiz() {
    try {
      const url = `${API_ROOT}/api/public-quiz/${cert}${lang === 'es' ? '?lang=es' : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = await res.json();
      setQuiz(data);
      setSessionToken(data.sessionToken);
      setStage('quiz');
      track('quiz_start', { source: data.source, lang, cert });
    } catch (err) {
      setLoadError(err.message || 'Failed to load quiz');
      setStage('error');
    }
  }

  function selectAnswer(choice) {
    setAnswers((prev) => ({ ...prev, [current]: choice }));
  }

  function goNext() {
    const nextIdx = current + 1;

    // Trigger soft gate after answering question GATE_AFTER (index = GATE_AFTER - 1)
    if (!continueToken && !gateShownOnce && current === GATE_AFTER - 1) {
      setGateShownOnce(true);
      setStage('gate');
      return;
    }

    if (nextIdx >= quiz.questions.length) {
      submitQuiz();
      return;
    }
    setCurrent(nextIdx);
  }

  function goPrev() {
    if (current > 0) setCurrent(current - 1);
  }

  async function submitEmail(email) {
    setEmailSubmitting(true);
    setEmailError(null);
    try {
      const partialAnswers = Object.entries(answers).map(([i, choice]) => ({ questionIndex: Number(i), choice }));
      const res = await fetch(`${API_ROOT}/api/public-quiz/capture-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          sessionToken,
          partialAnswers,
          utm: utmRef.current,
          referrer: document.referrer,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed (${res.status})`);
      }
      const data = await res.json();
      setContinueToken(data.continueToken);
      track('quiz_email_capture');
      // Continue from where they were
      const nextIdx = current + 1;
      if (nextIdx >= quiz.questions.length) {
        await submitQuizWithToken(data.continueToken);
      } else {
        setCurrent(nextIdx);
        setStage('quiz');
      }
    } catch (err) {
      setEmailError(err.message || 'Failed to save email');
    } finally {
      setEmailSubmitting(false);
    }
  }

  function skipEmail() {
    const nextIdx = current + 1;
    if (nextIdx >= quiz.questions.length) submitQuiz();
    else { setCurrent(nextIdx); setStage('quiz'); }
  }

  async function submitQuiz() {
    return submitQuizWithToken(continueToken || sessionToken);
  }

  async function submitQuizWithToken(token) {
    setStage('submitting');
    try {
      const answersArr = Object.entries(answers).map(([i, choice]) => ({ questionIndex: Number(i), choice }));
      const res = await fetch(`${API_ROOT}/api/public-quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: token, answers: answersArr }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      setResult(data);
      setStage('results');
      track('quiz_complete', { score: data.score, total: data.total, percent: data.percent });
    } catch (err) {
      setLoadError(err.message || 'Failed to submit');
      setStage('error');
    }
  }

  function handleCtaClick() {
    track('quiz_cta_click');
    const utmContent = lang === 'es' ? '&utm_content=es' : '';
    const utmSource = `${cert.replace('-', '_')}_quiz`;
    window.location.href = `/signup?utm_source=${utmSource}&utm_medium=results_page&utm_campaign=public_quiz${utmContent}`;
  }

  // Notice shown on the Spanish flow if the server reports content fell back to English
  // (i.e. content_es seeds not yet applied). Quiet, info-tone, doesn't block use.
  const fallbackNotice = lang === 'es' && quiz?.translationStatus === 'fallback-en' ? (
    <p style={{ color: '#A0A0A8', fontSize: '0.8125rem', textAlign: 'center', margin: '0 0 0.75rem' }}>
      {t.fallbackNotice}
    </p>
  ) : null;

  if (stage === 'intro') {
    return (
      <div className="page" style={{ maxWidth: 720, margin: '0 auto', padding: '1rem' }}>
        <Hero onStart={loadQuiz} certName={certNameForMeta} t={t} />
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="page" style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
        <p style={{ color: '#EF4444', marginBottom: '1rem' }}>{t.somethingWrong} {loadError}</p>
        <button
          className="btn btn-primary"
          onClick={() => { setLoadError(null); setStage('intro'); }}
          style={{ background: VOLTPAL_YELLOW, color: ON_YELLOW_TEXT, border: 'none' }}
        >{t.tryAgain}</button>
      </div>
    );
  }

  if (stage === 'submitting') {
    return (
      <div className="spinner-container">
        <div className="spinner" />
        <p className="spinner-message">{t.grading}</p>
      </div>
    );
  }

  if (stage === 'results' && result) {
    return (
      <div className="page" style={{ maxWidth: 720, margin: '0 auto', padding: '1rem' }}>
        <ResultsView
          result={result}
          onCtaClick={handleCtaClick}
          t={t}
          certName={quiz?.certName || certNameForMeta}
          passPercent={quiz?.passPercent || 70}
        />
      </div>
    );
  }

  if (stage === 'gate') {
    return (
      <div className="page" style={{ maxWidth: 720, margin: '0 auto', padding: '1rem' }}>
        <EmailGate
          onSubmit={submitEmail}
          onSkip={skipEmail}
          submitting={emailSubmitting}
          error={emailError}
          t={t}
          certName={quiz?.certName || certNameForMeta}
        />
      </div>
    );
  }

  // stage === 'quiz'
  if (!quiz) return null;
  const q = quiz.questions[current];
  return (
    <div className="page" style={{ maxWidth: 720, margin: '0 auto', padding: '1rem' }}>
      {fallbackNotice}
      <QuestionCard
        q={q}
        index={current}
        total={quiz.questions.length}
        selected={answers[current]}
        onSelect={selectAnswer}
        onNext={goNext}
        onPrev={goPrev}
        canGoBack={current > 0}
        isLast={current === quiz.questions.length - 1}
        t={t}
      />
    </div>
  );
}
