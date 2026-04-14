// VoltPal training module definitions
// Electrical certification path: APPRENTICE → JOURNEYMAN → MASTER, plus NFPA_70E standalone

export const MODULES = [
  // ── APPRENTICE ────────────────────────────────────────────
  {
    cert_level: 'APPRENTICE', module_number: 1, title: 'Electrical Theory Fundamentals',
    estimated_minutes: 50, exam_domain_weight: 0.25,
    topic_list: ['Ohms law', 'Series circuits', 'Parallel circuits', 'Kirchhoffs laws', 'Power formula', 'AC vs DC', 'Voltage current resistance', 'Impedance basics', 'Frequency and wavelength'],
  },
  {
    cert_level: 'APPRENTICE', module_number: 2, title: 'NEC Code Basics',
    estimated_minutes: 45, exam_domain_weight: 0.20,
    topic_list: ['NEC structure and organization', 'Article 90 scope', 'Article 100 definitions', 'Article 110 requirements', 'How to navigate the code book', 'Annex tables', 'Local amendments', 'Code cycles'],
  },
  {
    cert_level: 'APPRENTICE', module_number: 3, title: 'Wiring Methods and Materials',
    estimated_minutes: 55, exam_domain_weight: 0.20,
    topic_list: ['NM-B Romex', 'MC cable', 'EMT conduit', 'Rigid metal conduit', 'PVC conduit', 'Wire types THHN THWN XHHW', 'Conduit fill calculations NEC 310', 'Box fill calculations Article 314', 'Conductor ampacity tables'],
  },
  {
    cert_level: 'APPRENTICE', module_number: 4, title: 'Residential Wiring',
    estimated_minutes: 50, exam_domain_weight: 0.20,
    topic_list: ['Service entrance equipment', 'Panel layout', 'Branch circuit design', 'GFCI requirements Article 210', 'AFCI requirements', 'Kitchen and bathroom circuits', 'Receptacle spacing rules', 'Grounding electrode system Article 250'],
  },
  {
    cert_level: 'APPRENTICE', module_number: 5, title: 'Electrical Safety Fundamentals',
    estimated_minutes: 40, exam_domain_weight: 0.15,
    topic_list: ['Lockout/tagout OSHA 1910.147', 'Live-dead-live testing', 'PPE selection', 'Shock hazards and thresholds', 'Ground fault protection', 'Tool safety', 'First aid for electrical injuries', 'OSHA electrical standards'],
  },

  // ── JOURNEYMAN ────────────────────────────────────────────
  {
    cert_level: 'JOURNEYMAN', module_number: 1, title: 'Advanced NEC Code Application',
    estimated_minutes: 60, exam_domain_weight: 0.20,
    topic_list: ['Load calculations Article 220', 'Dwelling unit calculations', 'Commercial load calculations', 'Demand factors', 'Feeder sizing', 'Service sizing Article 230', 'Overcurrent protection Article 240', 'Voltage drop calculations'],
  },
  {
    cert_level: 'JOURNEYMAN', module_number: 2, title: 'Motor Circuits and Controls',
    estimated_minutes: 55, exam_domain_weight: 0.20,
    topic_list: ['Motor FLA tables NEC 430', 'Motor branch circuit protection', 'Motor overload protection', 'Motor disconnect requirements', 'Starter types', 'VFD fundamentals', 'Control circuit wiring', 'Motor nameplate data'],
  },
  {
    cert_level: 'JOURNEYMAN', module_number: 3, title: 'Commercial and Industrial Wiring',
    estimated_minutes: 55, exam_domain_weight: 0.20,
    topic_list: ['Three-phase systems', 'Delta vs wye configurations', 'Transformer connections', 'Busway and wireways', 'Cable tray Article 392', 'Hazardous locations Article 500', 'Emergency systems Article 700', 'Fire alarm systems Article 760'],
  },
  {
    cert_level: 'JOURNEYMAN', module_number: 4, title: 'Grounding and Bonding',
    estimated_minutes: 50, exam_domain_weight: 0.20,
    topic_list: ['Article 250 in depth', 'Equipment grounding conductors', 'Grounding electrode system', 'Bonding jumpers', 'Separately derived systems', 'Ground fault current path', 'Isolated grounding', 'Ground rod requirements'],
  },
  {
    cert_level: 'JOURNEYMAN', module_number: 5, title: 'Transformers and Power Distribution',
    estimated_minutes: 50, exam_domain_weight: 0.10,
    topic_list: ['Transformer theory', 'Single-phase transformers', 'Three-phase transformers', 'Transformer connections delta/wye', 'Transformer protection Article 450', 'Tap rules', 'Buck-boost transformers', 'K-factor transformers'],
  },
  {
    cert_level: 'JOURNEYMAN', module_number: 6, title: 'Troubleshooting and Testing',
    estimated_minutes: 45, exam_domain_weight: 0.10,
    topic_list: ['Multimeter usage', 'Megger insulation testing', 'Clamp meter techniques', 'Circuit tracing', 'Voltage drop testing', 'Phase rotation', 'Power quality basics', 'Systematic troubleshooting'],
  },

  // ── MASTER ────────────────────────────────────────────────
  {
    cert_level: 'MASTER', module_number: 1, title: 'Advanced Load Calculations and System Design',
    estimated_minutes: 60, exam_domain_weight: 0.25,
    topic_list: ['Complex dwelling calculations', 'Multi-family calculations', 'Commercial kitchen loads', 'Optional calculation methods', 'Conductor derating', 'Ambient temperature correction', 'Continuous vs non-continuous loads', 'Demand factor application'],
  },
  {
    cert_level: 'MASTER', module_number: 2, title: 'Electrical System Design and Engineering',
    estimated_minutes: 55, exam_domain_weight: 0.25,
    topic_list: ['Short circuit current calculations', 'Arc flash incident energy', 'Selective coordination', 'Power factor correction', 'Harmonic mitigation', 'Surge protection Article 285', 'Standby and emergency systems', 'Energy management systems'],
  },
  {
    cert_level: 'MASTER', module_number: 3, title: 'Special Occupancies and Conditions',
    estimated_minutes: 50, exam_domain_weight: 0.25,
    topic_list: ['Healthcare facilities Article 517', 'Assembly occupancies Article 518', 'Marinas and boatyards Article 555', 'Swimming pools Article 680', 'Solar PV Article 690', 'Energy storage Article 706', 'EV charging Article 625', 'Manufactured buildings'],
  },
  {
    cert_level: 'MASTER', module_number: 4, title: 'Business Management and Code Administration',
    estimated_minutes: 45, exam_domain_weight: 0.25,
    topic_list: ['Electrical contracting law', 'Permit and inspection process', 'Plan review', 'Estimating and bidding', 'Worker supervision requirements', 'Liability and insurance', 'Code interpretation disputes', 'Continuing education requirements'],
  },

  // ── NFPA_70E (Arc Flash / Electrical Safety) ──────────────
  {
    cert_level: 'NFPA_70E', module_number: 1, title: 'Electrical Safety Program',
    estimated_minutes: 50, exam_domain_weight: 0.25,
    topic_list: ['NFPA 70E scope and purpose', 'Electrical safety program elements', 'Risk assessment procedure', 'Hierarchy of risk controls', 'Job safety planning', 'Energized work permits', 'Training requirements', 'Program auditing'],
  },
  {
    cert_level: 'NFPA_70E', module_number: 2, title: 'Shock Hazard Analysis',
    estimated_minutes: 45, exam_domain_weight: 0.25,
    topic_list: ['Shock risk assessment', 'Limited approach boundary', 'Restricted approach boundary', 'Prohibited approach boundary', 'Voltage thresholds', 'Insulated tools and equipment', 'Rubber insulating gloves ratings', 'Testing and verification'],
  },
  {
    cert_level: 'NFPA_70E', module_number: 3, title: 'Arc Flash Hazard Analysis',
    estimated_minutes: 55, exam_domain_weight: 0.30,
    topic_list: ['Arc flash risk assessment', 'Incident energy calculation methods', 'Arc flash boundary', 'PPE categories Table 130.7(C)(15)', 'Equipment labeling requirements', 'IEEE 1584 calculation method', 'Arc-rated clothing selection', 'Incident energy reduction methods'],
  },
  {
    cert_level: 'NFPA_70E', module_number: 4, title: 'Lockout/Tagout and Safe Work Practices',
    estimated_minutes: 45, exam_domain_weight: 0.20,
    topic_list: ['LOTO procedure Article 120', 'Complex lockout procedures', 'Group lockout', 'Temporary grounding', 'Test instrument safety', 'Portable electric equipment', 'Working on or near overhead lines', 'Establishing electrically safe work conditions'],
  },
];
