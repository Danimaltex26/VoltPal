export const EXAM_BLUEPRINTS = {
  APPRENTICE: {
    totalQuestions: 50, timeMinutes: 75, passPercent: 70,
    domains: [
      { moduleNumber: 1, name: 'Electrical Theory Fundamentals', weight: 0.25, questions: 13 },
      { moduleNumber: 2, name: 'NEC Code Basics', weight: 0.20, questions: 10 },
      { moduleNumber: 3, name: 'Wiring Methods and Materials', weight: 0.20, questions: 10 },
      { moduleNumber: 4, name: 'Residential Wiring', weight: 0.20, questions: 10 },
      { moduleNumber: 5, name: 'Electrical Safety Fundamentals', weight: 0.15, questions: 7 },
    ]
  },
  JOURNEYMAN: {
    totalQuestions: 80, timeMinutes: 120, passPercent: 70,
    domains: [
      { moduleNumber: 1, name: 'Advanced NEC Code Application', weight: 0.20, questions: 16 },
      { moduleNumber: 2, name: 'Motor Circuits and Controls', weight: 0.20, questions: 16 },
      { moduleNumber: 3, name: 'Commercial and Industrial Wiring', weight: 0.20, questions: 16 },
      { moduleNumber: 4, name: 'Grounding and Bonding', weight: 0.20, questions: 16 },
      { moduleNumber: 5, name: 'Transformers and Power Distribution', weight: 0.10, questions: 8 },
      { moduleNumber: 6, name: 'Troubleshooting and Testing', weight: 0.10, questions: 8 },
    ]
  },
  MASTER: {
    totalQuestions: 100, timeMinutes: 150, passPercent: 75,
    domains: [
      { moduleNumber: 1, name: 'Advanced Load Calculations and System Design', weight: 0.25, questions: 25 },
      { moduleNumber: 2, name: 'Electrical System Design and Engineering', weight: 0.25, questions: 25 },
      { moduleNumber: 3, name: 'Special Occupancies and Conditions', weight: 0.25, questions: 25 },
      { moduleNumber: 4, name: 'Business Management and Code Administration', weight: 0.25, questions: 25 },
    ]
  },
  NFPA_70E: {
    totalQuestions: 60, timeMinutes: 90, passPercent: 70,
    domains: [
      { moduleNumber: 1, name: 'Electrical Safety Program', weight: 0.25, questions: 15 },
      { moduleNumber: 2, name: 'Shock Hazard Analysis', weight: 0.25, questions: 15 },
      { moduleNumber: 3, name: 'Arc Flash Hazard Analysis', weight: 0.30, questions: 18 },
      { moduleNumber: 4, name: 'Lockout/Tagout and Safe Work Practices', weight: 0.20, questions: 12 },
    ]
  },
};
