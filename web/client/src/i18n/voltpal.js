// i18n string map for the VoltPal public quiz funnels.
// English baseline + Mexican Spanish translations.
// Strings that vary per cert take a { certName, passPercent } parameter so the same
// component renders for Apprentice, Journeyman, Master, NFPA 70E, etc.
//
// TODO[native-speaker review]: every Spanish string here is Claude-drafted. Have
// a native speaker review before launch — Mexican Spanish dialect for US trades.
// Cert names (Journeyman, NEC, IBEW, OSHA), state license names, and NEC code
// references stay in English in both languages.

export const STRINGS = {
  en: {
    // Hero
    heroTitle: ({ certName }) => `Free ${certName} Practice Quiz`,
    heroSubtitle: ({ certName }) =>
      `10 questions. 5 minutes. See where you stand for the ${certName} exam — with explanations for every answer.`,
    heroStart: 'Start Quiz →',
    heroFooter: 'Built by VoltPal — the AI field companion for electricians.',

    // Quiz UI
    questionLabel: ({ current, total }) => `Question ${current} of ${total}`,
    previous: '← Previous',
    next: 'Next →',
    seeResults: 'See Results →',

    // Email gate
    gateHeadline: "You're doing well — want your full results emailed?",
    gateBody: ({ certName }) =>
      `We'll send your score, every answer's explanation, and a free ${certName} exam study cheat sheet. No spam, unsubscribe anytime.`,
    gateEmailPlaceholder: 'you@email.com',
    gateSubmit: 'Email My Results →',
    gateSubmitting: 'Saving…',
    gateSkip: 'Continue without email',

    // Submitting
    grading: 'Grading your quiz…',

    // Results
    yourScore: 'Your Score',
    abovePassMark: ({ percent, certName, passPercent }) =>
      `${percent}% — Above ${certName} pass mark (${passPercent}%)`,
    belowPassMark: ({ percent, certName, passPercent }) =>
      `${percent}% — Below ${certName} pass mark (${passPercent}%)`,
    ctaHeadline: ({ certName }) => `Get the full ${certName} bank + AI tutor`,
    ctaBody:
      'VoltPal walks you through every wrong answer, tracks your weak domains, and runs full timed mock exams. Free trial, cancel anytime.',
    ctaPrimary: 'Try VoltPal Pro Free →',
    reviewHeadline: 'Question-by-question review',
    verdictCorrect: '✓ Correct',
    verdictIncorrect: '✗ Incorrect',
    verdictSkipped: '— Skipped',
    yourAnswer: 'Your answer',
    correctAnswer: 'Correct answer',
    refLabel: 'Ref:',
    readyHeadline: 'Ready for the real thing?',
    ctaTrial: 'Start Your Free VoltPal Trial →',

    // Errors
    somethingWrong: 'Something went wrong:',
    tryAgain: 'Try again',

    // Translation status fallback notice (Spanish-only render)
    fallbackNotice: '',

    // Page meta
    pageTitle: ({ certName }) => `Free ${certName} Electrician Practice Quiz — VoltPal`,
    metaDescription: ({ certName }) =>
      `Free 10-question ${certName} electrician practice quiz with full explanations. Built by VoltPal, the AI field companion for electricians.`,
    ogDescription: ({ certName }) =>
      `See where you stand for the ${certName} electrician exam in 5 minutes.`,
  },

  es: {
    // Hero
    heroTitle: ({ certName }) => `Examen Gratis de Práctica ${certName}`,
    heroSubtitle: ({ certName }) =>
      `10 preguntas. 5 minutos. Mira en qué nivel estás para el examen ${certName} — con explicaciones para cada respuesta.`,
    heroStart: 'Comenzar Examen →',
    heroFooter: 'Hecho por VoltPal — el asistente AI de campo para electricistas.',

    // Quiz UI
    questionLabel: ({ current, total }) => `Pregunta ${current} de ${total}`,
    previous: '← Anterior',
    next: 'Siguiente →',
    seeResults: 'Ver Resultados →',

    // Email gate
    gateHeadline: 'Vas bien — ¿quieres que te enviemos tus resultados completos por correo?',
    gateBody: ({ certName }) =>
      `Te enviaremos tu puntaje, la explicación de cada respuesta y una guía gratuita de estudio para el examen ${certName}. Sin spam, te puedes dar de baja cuando quieras.`,
    gateEmailPlaceholder: 'tu@correo.com',
    gateSubmit: 'Enviar Mis Resultados →',
    gateSubmitting: 'Guardando…',
    gateSkip: 'Continuar sin correo',

    // Submitting
    grading: 'Calificando tu examen…',

    // Results
    yourScore: 'Tu Puntaje',
    abovePassMark: ({ percent, certName, passPercent }) =>
      `${percent}% — Arriba del puntaje mínimo ${certName} (${passPercent}%)`,
    belowPassMark: ({ percent, certName, passPercent }) =>
      `${percent}% — Abajo del puntaje mínimo ${certName} (${passPercent}%)`,
    ctaHeadline: ({ certName }) => `Obtén el banco completo ${certName} + tutor AI`,
    ctaBody:
      'VoltPal te explica cada respuesta incorrecta, identifica tus áreas débiles y corre simulacros completos cronometrados. Prueba gratis, cancela cuando quieras.',
    ctaPrimary: 'Prueba VoltPal Pro Gratis →',
    reviewHeadline: 'Revisión pregunta por pregunta',
    verdictCorrect: '✓ Correcto',
    verdictIncorrect: '✗ Incorrecto',
    verdictSkipped: '— Sin contestar',
    yourAnswer: 'Tu respuesta',
    correctAnswer: 'Respuesta correcta',
    refLabel: 'Ref:',
    readyHeadline: '¿Listo para el examen real?',
    ctaTrial: 'Comienza tu Prueba Gratis de VoltPal →',

    // Errors
    somethingWrong: 'Algo salió mal:',
    tryAgain: 'Intenta de nuevo',

    // Translation status fallback notice (shown when content_es seeds not yet applied)
    fallbackNotice:
      'Nota: Algunas preguntas se muestran en inglés mientras completamos las traducciones.',

    // Page meta
    pageTitle: ({ certName }) => `Examen Gratis de Práctica ${certName} — VoltPal`,
    metaDescription: ({ certName }) =>
      `Examen gratuito de 10 preguntas para electricistas ${certName} con explicaciones completas. Hecho por VoltPal.`,
    ogDescription: ({ certName }) =>
      `Mira en qué nivel estás para el examen ${certName} en 5 minutos.`,
  },
};

// Convenience accessor — returns the string map for the requested language
// (falls back to English if lang is missing or unknown).
export function strings(lang) {
  return STRINGS[lang] || STRINGS.en;
}
