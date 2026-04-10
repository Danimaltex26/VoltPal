import { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';

const CATEGORIES = [
  { id: 'wire_sizing', label: 'Wire Sizing', icon: '\u26A1' },
  { id: 'motor_circuits', label: 'Motor Circuits', icon: '\u2699' },
  { id: 'overcurrent_protection', label: 'Overcurrent', icon: '\uD83D\uDEE1' },
  { id: 'grounding', label: 'Grounding', icon: '\u23DA' },
  { id: 'conduit_fill', label: 'Conduit Fill', icon: '\uD83D\uDD27' },
  { id: 'nec_reference', label: 'NEC Reference', icon: '\uD83D\uDCD6' },
  { id: 'safety', label: 'Safety', icon: '\u26A0' },
  { id: 'vfd_drives', label: 'VFD/Drives', icon: '\uD83D\uDD0C' },
];

export default function ReferenceBrowse() {
  const [category, setCategory] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!category) {
      setEntries([]);
      return;
    }
    setLoading(true);
    setExpanded(null);
    apiGet(`/reference/browse?category=${category}`)
      .then((data) => setEntries(data.results || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [category]);

  const toggle = (id) => setExpanded((prev) => (prev === id ? null : id));

  return (
    <div className="stack">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={category === cat.id ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ fontSize: '0.875rem', minHeight: 44, padding: '0.5rem' }}
            onClick={() => setCategory(category === cat.id ? '' : cat.id)}
          >
            <span style={{ marginRight: 6 }}>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="spinner-container" style={{ padding: '1.5rem' }}>
          <div className="spinner" />
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="stack-sm">
          {entries.map((entry) => {
            const content = entry.content_json || {};
            const isOpen = expanded === entry.id;
            return (
              <div key={entry.id} className="card" style={{ padding: '0.75rem 1rem', cursor: 'pointer' }} onClick={() => toggle(entry.id)}>
                <div className="row-between">
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '0.9375rem' }}>{entry.title}</strong>
                    {entry.equipment_type && (
                      <span className="badge badge-gray" style={{ marginLeft: 8 }}>{entry.equipment_type}</span>
                    )}
                  </div>
                  <span style={{ color: '#6B6B73', fontSize: '1.25rem', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                    &#9662;
                  </span>
                </div>

                {isOpen && (
                  <div style={{ marginTop: '0.75rem' }} onClick={(e) => e.stopPropagation()}>
                    {content.summary && (
                      <p style={{ fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>{content.summary}</p>
                    )}

                    {content.key_values && content.key_values.length > 0 && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        {content.key_values.map((kv, i) => (
                          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, auto) 1fr', gap: '0.25rem 0.75rem', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span className="text-secondary" style={{ fontSize: '0.8125rem' }}>{kv.label}</span>
                            <span style={{ fontSize: '0.8125rem', color: '#FACC15' }}>{kv.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {content.important_notes && content.important_notes.length > 0 && (
                      <div className="warning-box" style={{ fontSize: '0.8125rem' }}>
                        <ul style={{ margin: '0 0 0 16px', listStyle: 'disc' }}>
                          {content.important_notes.map((note, i) => (
                            <li key={i} style={{ marginBottom: 2 }}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {entry.source && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <span className="badge badge-green">{entry.source}</span>
                        {entry.specification && <span className="badge badge-gray" style={{ marginLeft: 6 }}>{entry.specification}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && category && entries.length === 0 && (
        <p className="text-secondary" style={{ textAlign: 'center', padding: '1rem' }}>No entries found in this category.</p>
      )}
    </div>
  );
}
