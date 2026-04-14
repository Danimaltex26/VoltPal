import { useState } from 'react';

const TOPICS = [
  {
    title: 'Electrical Safety & LOTO',
    items: ['Arc flash hazard analysis', 'PPE categories & selection', 'NFPA 70E compliance', 'Live-dead-live verification', 'Approach boundaries', 'Lockout/tagout procedures'],
  },
  {
    title: 'NEC Code Fundamentals',
    items: ['Branch circuit design', 'Feeder sizing & protection', 'Grounding & bonding', 'Overcurrent protection devices', 'Conductor ampacity tables', 'Raceway fill calculations'],
  },
  {
    title: 'Motors & Drives',
    items: ['Motor types & applications', 'VFD parameter setup', 'Motor protection coordination', 'Troubleshooting motor faults', 'Shaft alignment techniques', 'Nameplate data interpretation'],
  },
  {
    title: 'Power Distribution',
    items: ['Transformer connections', 'Switchgear maintenance', 'Panelboard scheduling', 'Load calculations (NEC 220)', 'Demand factors', 'Single-line diagram reading'],
  },
  {
    title: 'Apprentice/Journeyman Prep',
    items: ['Exam topic overview', 'Code calculation practice', 'Electrical theory review', 'Practical skills checklist', 'Ohm\'s law & power formulas', 'Blueprint reading basics'],
  },
];

export default function LearnPage() {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="page stack">
      <h1>Learn</h1>
      <div className="info-box">Training modules are coming soon. Browse topic previews below.</div>

      <div className="stack-sm">
        {TOPICS.map((topic, i) => {
          const isOpen = expanded === i;
          return (
            <div key={i} className="card">
              <div className="expandable-header" onClick={() => setExpanded(isOpen ? null : i)}>
                <h3>{topic.title}</h3>
                <span style={{ color: '#6B6B73', fontSize: '1.25rem' }}>{isOpen ? '\u2212' : '+'}</span>
              </div>
              {isOpen && (
                <div style={{ marginTop: '0.75rem' }}>
                  {topic.items.map((item, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid #2A2A2E' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <span className="text-secondary" style={{ fontSize: '0.875rem' }}>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
