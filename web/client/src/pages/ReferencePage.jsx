import { useState } from 'react';
import { apiPost } from '../utils/api';
import ReferenceBrowse from '../components/ReferenceBrowse';
import WireSizingCalc from '../components/WireSizingCalculator';
import ConduitFillCalc from '../components/ConduitFillCalculator';
import MotorFLATableComp from '../components/MotorFLATable';

const QUICK_RANGES = [
  { param: 'Branch Circuit Wire (15A)', ideal: '#14 AWG Cu', note: 'NEC 240.4(D)' },
  { param: 'Branch Circuit Wire (20A)', ideal: '#12 AWG Cu', note: 'NEC 240.4(D)' },
  { param: 'Branch Circuit Wire (30A)', ideal: '#10 AWG Cu', note: 'NEC 240.4(D)' },
  { param: 'Service Entrance (100A)', ideal: '#4 AWG Cu / #2 AWG Al', note: '' },
  { param: 'Service Entrance (200A)', ideal: '2/0 AWG Cu / 4/0 AWG Al', note: '' },
  { param: 'Voltage Drop (Branch)', ideal: '3% max', note: 'NEC 210.19(A) FPN' },
  { param: 'Voltage Drop (Total)', ideal: '5% max', note: 'NEC 215.2(A) FPN' },
  { param: 'Ground Rod Resistance', ideal: '25 ohms max', note: 'NEC 250.56' },
];

function QuickRanges() {
  return (
    <div className="card">
      <h3 style={{ margin: '0 0 12px' }}>Quick Reference Ranges</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
            <th style={{ textAlign: 'left', padding: 6 }}>Parameter</th>
            <th style={{ textAlign: 'left', padding: 6 }}>Value</th>
            <th style={{ textAlign: 'left', padding: 6 }}>Ref</th>
          </tr>
        </thead>
        <tbody>
          {QUICK_RANGES.map((r) => (
            <tr key={r.param} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ padding: 6, fontWeight: 500 }}>{r.param}</td>
              <td style={{ padding: 6, color: '#FACC15' }}>{r.ideal}</td>
              <td style={{ padding: 6, color: '#aaa' }}>{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TABS = [
  { id: 'tools', label: 'Tools' },
  { id: 'search', label: 'AI Search' },
  { id: 'browse', label: 'Browse' },
];

export default function ReferencePage() {
  const [tab, setTab] = useState('tools');
  const [toolTab, setToolTab] = useState('wire');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setError('');
    setLoading(true);
    setResults(null);
    try {
      const data = await apiPost('/reference/query', { query });
      setResults(data.results || data.result || data);
    } catch (err) {
      setError(err.message || 'Search failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h2 className="page-header">Reference</h2>

      {/* Top-level tabs */}
      <div className="toggle-group" style={{ marginBottom: '1rem' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`toggle-option ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ========== TOOLS TAB ========== */}
      {tab === 'tools' && (
        <div className="stack">
          {/* Sub-tabs for tools */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {[
              { id: 'wire', label: 'Wire Sizing Calc' },
              { id: 'conduit', label: 'Conduit Fill Calc' },
              { id: 'motor', label: 'Motor FLA Table' },
              { id: 'ranges', label: 'Quick Ranges' },
            ].map((t) => (
              <button
                key={t.id}
                className={toolTab === t.id ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ fontSize: '0.8125rem', minHeight: 36, padding: '0.375rem 0.75rem' }}
                onClick={() => setToolTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {toolTab === 'wire' && <WireSizingCalc />}
          {toolTab === 'conduit' && <ConduitFillCalc />}
          {toolTab === 'motor' && <MotorFLATableComp />}
          {toolTab === 'ranges' && <QuickRanges />}
        </div>
      )}

      {/* ========== AI SEARCH TAB ========== */}
      {tab === 'search' && (
        <div className="stack">
          {error && <div className="error-banner">{error}</div>}

          <div className="row" style={{ gap: 8 }}>
            <input
              className="input"
              style={{ flex: 1 }}
              placeholder="Ask an electrical question..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
              {loading ? '...' : 'Search'}
            </button>
          </div>

          {loading && (
            <div className="spinner-container" style={{ padding: '1.5rem' }}>
              <div className="spinner" />
            </div>
          )}

          {results && (Array.isArray(results) ? results : [results]).map((r, i) => {
            const content = r.content_json || {};
            return (
              <div key={i} className="card">
                <div className="row-between" style={{ marginBottom: 8 }}>
                  <h4 style={{ margin: 0 }}>{r.title}</h4>
                  <div className="row" style={{ gap: 6 }}>
                    {r.category && <span className="badge badge-blue">{r.category}</span>}
                    {r.source && <span className="badge badge-gray">{r.source}</span>}
                  </div>
                </div>
                {content.summary && <p style={{ margin: '0 0 8px', fontSize: '0.9375rem' }}>{content.summary}</p>}
                {content.key_values && content.key_values.length > 0 && (
                  <div style={{ margin: '8px 0' }}>
                    {content.key_values.map((kv, j) => (
                      <div key={j} style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, auto) 1fr', gap: '0.25rem 0.75rem', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span className="text-secondary" style={{ fontSize: '0.8125rem' }}>{kv.label}</span>
                        <span style={{ fontSize: '0.8125rem', color: '#FACC15' }}>{kv.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                {content.important_notes && content.important_notes.length > 0 && (
                  <div className="warning-box" style={{ marginTop: 8, fontSize: '0.8125rem' }}>
                    <ul style={{ margin: '0 0 0 16px', listStyle: 'disc' }}>
                      {content.important_notes.map((note, j) => <li key={j}>{note}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========== BROWSE TAB ========== */}
      {tab === 'browse' && <ReferenceBrowse />}
    </div>
  );
}
