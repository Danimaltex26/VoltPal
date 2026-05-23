// Tiny i18n string map for the VoltPal public Spanish funnel (Phase 1).
// English baseline + Mexican Spanish translations.
//
// TODO[native-speaker review]: every Spanish string here is Claude-drafted. Have
// a native speaker review before launch — Mexican Spanish dialect for US trades.
// Cert names (Journeyman, NEC, IBEW, OSHA), state license names, and NEC code
// references stay in English in both languages.

export const STRINGS = {
  en: {
    // Hero
    heroTitle: 'Free Journeyman Practice Quiz',
    heroSubtitle: ({ certName }) =>
      `10 questions. 5 minutes. See where you stand for the ${certName} electrician exam — with explanations for every answer.`,
    heroStart: 'Start Quiz →',
    heroFooter: 'Built by VoltPal — the AI field companion for electricians.',

    // Quiz UI
    questionLabel: ({ current, total }) => `Question ${current} of ${total}`,
    previous: '← Previous',
    next: 'Next →',
    seeResults: 'See Results →',

    // Email gate
    gateHeadline: "You're doing well — want your full results emailed?",
    gateBody:
      "We'll send your score, every answer's explanation, and a free Journeyman exam study cheat sheet. No spam, unsubscribe anytime.",
    gateEmailPlaceholder: 'you@email.com',
    gateSubmit: 'Email My Results →',
    gateSubmitting: 'Saving…',
    gateSkip: 'Continue without email',

    // Submitting
    grading: 'Grading your quiz…',

    // Results
    yourScore: 'Your Score',
    abovePassMark: ({ percent }) => `${percent}% — Above Journeyman pass mark (70%)`,
    belowPassMark: ({ percent }) => `${percent}% — Below Journeyman pass mark (70%)`,
    ctaHeadline: 'Get the full Journeyman bank + AI tutor',
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
    pageTitle: 'Free Journeyman Electrician Practice Quiz — VoltPal',
    metaDescription:
      'Free 10-question journeyman electrician practice quiz with full explanations. Built by VoltPal, the AI field companion for electricians.',
    ogDescription: 'See where you stand for the journeyman electrician exam in 5 minutes.',
  },

  es: {
    // Hero
    heroTitle: 'Examen Gratis de Práctica Journeyman',
    heroSubtitle: ({ certName }) =>
      `10 preguntas. 5 minutos. Mira en qué nivel estás para el examen ${certName} de electricista — con explicaciones para cada respuesta.`,
    heroStart: 'Comenzar Examen →',
    heroFooter: 'Hecho por VoltPal — el asistente AI de campo para electricistas.',

    // Quiz UI
    questionLabel: ({ current, total }) => `Pregunta ${current} de ${total}`,
    previous: '← Anterior',
    next: 'Siguiente →',
    seeResults: 'Ver Resultados →',

    // Email gate
    gateHeadline: 'Vas bien — ¿quieres que te enviemos tus resultados completos por correo?',
    gateBody:
      'Te enviaremos tu puntaje, la explicación de cada respuesta y una guía gratuita de estudio para el examen Journeyman. Sin spam, te puedes dar de baja cuando quieras.',
    gateEmailPlaceholder: 'tu@correo.com',
    gateSubmit: 'Enviar Mis Resultados →',
    gateSubmitting: 'Guardando…',
    gateSkip: 'Continuar sin correo',

    // Submitting
    grading: 'Calificando tu examen…',

    // Results
    yourScore: 'Tu Puntaje',
    abovePassMark: ({ percent }) => `${percent}% — Arriba del puntaje mínimo Journeyman (70%)`,
    belowPassMark: ({ percent }) => `${percent}% — Abajo del puntaje mínimo Journeyman (70%)`,
    ctaHeadline: 'Obtén el banco completo Journeyman + tutor AI',
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
    pageTitle: 'Examen Gratis de Práctica Journeyman — VoltPal',
    metaDescription:
      'Examen gratuito de 10 preguntas para electricistas Journeyman con explicaciones completas. Hecho por VoltPal, el asistente AI de campo para electricistas.',
    ogDescription: 'Mira en qué nivel estás para el examen Journeyman en 5 minutos.',
  },
};

// Convenience accessor — returns the string map for the requested language
// (falls back to English if lang is missing or unknown).
export function strings(lang) {
  return STRINGS[lang] || STRINGS.en;
}
