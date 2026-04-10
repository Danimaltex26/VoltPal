import { useState } from 'react';
import { apiPost } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const EQUIPMENT_TYPES = ['Motor', 'VFD/Drive', 'PLC/Controller', 'Breaker/Disconnect', 'Transformer', 'Relay/Contactor', 'Lighting', 'Generator', 'UPS', 'Grounding'];

const EQUIPMENT_BRANDS = {
  Motor: [
    'Baldor',
    'WEG',
    'Marathon',
    'Leeson',
    'Nidec',
    'Siemens',
    'ABB',
    'GE',
  ],
  'VFD/Drive': [
    'Allen-Bradley PowerFlex',
    'Siemens SINAMICS',
    'ABB ACS',
    'Yaskawa GA/A1000',
    'Danfoss VLT',
    'Mitsubishi FR',
    'Eaton SVX',
    'WEG CFW',
  ],
  'PLC/Controller': [
    'Allen-Bradley CompactLogix/ControlLogix',
    'Siemens S7-1200/1500',
    'ABB AC500',
    'Mitsubishi iQ-R/FX5',
    'Omron NX/NJ',
  ],
  'Breaker/Disconnect': [
    'Square D QO/Homeline',
    'Eaton BR/CH',
    'Siemens QP',
    'GE THQL',
    'ABB Tmax',
  ],
  Transformer: [
    'Square D',
    'Eaton',
    'Hammond',
    'Acme',
    'Marcus',
    'Jefferson',
  ],
  'Relay/Contactor': [
    'Allen-Bradley 100-C',
    'Siemens SIRIUS',
    'Eaton XTCE',
    'ABB AF',
    'Schneider TeSys',
  ],
  Generator: [
    'Generac',
    'Kohler',
    'Cummins/Onan',
    'Caterpillar',
    'Katolight',
  ],
  Lighting: [],
  UPS: [],
  Grounding: [],
};

const VOLTAGE_SYSTEMS = [
  '120/240V Single Phase',
  '208V Three Phase',
  '480V Three Phase',
  '277/480V',
  '600V',
  'Medium Voltage',
];

const ENVIRONMENTS = ['Industrial', 'Commercial', 'Residential', 'Hazardous Location', 'Outdoor'];

const ALREADY_TRIED_OPTIONS = [
  'Checked voltage',
  'Meggered motor',
  'Checked connections',
  'Replaced fuse/breaker',
  'Checked control circuit',
  'Reset fault',
  'Nothing yet',
];

const AI_MESSAGES = [
  'Analyzing the issue...',
  'Checking common causes...',
  'Building diagnosis...',
];

export default function TroubleshootPage() {
  const [form, setForm] = useState({
    equipment_type: '',
    equipment_brand: '',
    voltage_system: '',
    symptom: '',
    environment: '',
    already_tried: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const toggleTried = (opt) => {
    setForm((prev) => {
      const arr = prev.already_tried.includes(opt)
        ? prev.already_tried.filter((o) => o !== opt)
        : [...prev.already_tried, opt];
      return { ...prev, already_tried: arr };
    });
  };

  const brandOptions = EQUIPMENT_BRANDS[form.equipment_type] || [];

  const handleSubmit = async () => {
    if (!form.symptom.trim()) {
      setError('Please describe the symptom.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const data = await apiPost('/troubleshoot', form);
      setResult(data.result || data);
    } catch (err) {
      setError(err.message || 'Troubleshoot failed.');
    } finally {
      setLoading(false);
    }
  };

  function handleReset() {
    setResult(null);
    setError('');
    setForm({
      equipment_type: '',
      equipment_brand: '',
      voltage_system: '',
      symptom: '',
      environment: '',
      already_tried: [],
    });
  }

  if (loading) {
    return (
      <div className="page">
        <LoadingSpinner messages={AI_MESSAGES} />
      </div>
    );
  }

  if (result) {
    return (
      <div className="page">
        <div className="stack">
          <div className="page-header">
            <h2>Diagnosis</h2>
          </div>

          {/* Summary */}
          {result.plain_english_summary && (
            <div className="card">
              <p style={{ fontSize: '1.125rem', lineHeight: 1.6 }}>{result.plain_english_summary}</p>
            </div>
          )}

          {/* Probable Causes */}
          {result.probable_causes && result.probable_causes.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Probable Causes</h3>
              <div className="stack-sm">
                {result.probable_causes.map((c, i) => (
                  <div key={i} style={{ paddingBottom: '0.75rem', borderBottom: '1px solid #2A2A2E' }}>
                    <div className="row" style={{ gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, color: '#FACC15', minWidth: 24 }}>#{c.rank || i + 1}</span>
                      <strong>{c.cause}</strong>
                      {c.likelihood && (
                        <span className={`badge ${c.likelihood === 'high' ? 'badge-red' : c.likelihood === 'medium' ? 'badge-amber' : 'badge-gray'}`}>
                          {c.likelihood}
                        </span>
                      )}
                    </div>
                    {c.explanation && <p className="text-secondary" style={{ fontSize: '0.875rem', marginLeft: 32 }}>{c.explanation}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step-by-Step Fix */}
          {result.step_by_step_fix && result.step_by_step_fix.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Step-by-Step Fix</h3>
              <div className="stack-sm">
                {result.step_by_step_fix.map((s, i) => (
                  <div key={i} className="row" style={{ gap: '0.5rem', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 700, color: '#FACC15', minWidth: 24 }}>{s.step || i + 1}</span>
                    <div>
                      <p>{s.action}</p>
                      {s.tip && <p className="text-secondary" style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>Tip: {s.tip}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parts to Check */}
          {result.parts_to_check && result.parts_to_check.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Parts to Check</h3>
              <div className="stack-sm">
                {result.parts_to_check.map((p, i) => (
                  <div key={i} className="row-between" style={{ padding: '0.5rem 0', borderBottom: '1px solid #2A2A2E' }}>
                    <div>
                      <strong>{p.part}</strong>
                      {p.symptom_if_failed && <p className="text-secondary" style={{ fontSize: '0.8125rem' }}>{p.symptom_if_failed}</p>}
                    </div>
                    {p.estimated_cost && <span className="text-secondary" style={{ fontSize: '0.875rem' }}>{p.estimated_cost}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safety Warning */}
          {result.safety_warning && (
            <div className="warning-box">
              <strong>Safety Warning:</strong> {result.safety_warning}
            </div>
          )}

          {/* Escalation */}
          {result.escalate_if && (
            <div className="warning-box">
              <strong>Escalate if:</strong> {result.escalate_if}
            </div>
          )}

          {/* Estimated Fix Time */}
          {result.estimated_fix_time && (
            <div className="info-box">
              <strong>Estimated Fix Time:</strong> {result.estimated_fix_time}
            </div>
          )}

          <button className="btn btn-secondary btn-block" onClick={handleReset}>
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="stack">
        <div className="page-header">
          <h2>Troubleshoot</h2>
          <p className="text-secondary" style={{ marginTop: '0.25rem' }}>
            Describe your issue and get an AI-powered diagnosis
          </p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="form-group">
          <label>Equipment Type</label>
          <select
            className="select"
            value={form.equipment_type}
            onChange={(e) => {
              set('equipment_type', e.target.value);
              set('equipment_brand', '');
            }}
          >
            <option value="">Select...</option>
            {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {brandOptions.length > 0 ? (
          <div className="form-group">
            <label>Equipment Brand / Model</label>
            <select className="select" value={form.equipment_brand} onChange={(e) => set('equipment_brand', e.target.value)}>
              <option value="">Select...</option>
              {brandOptions.map((b) => <option key={b} value={b}>{b}</option>)}
              <option value="__other">Other (not listed)</option>
            </select>
            {form.equipment_brand === '__other' && (
              <input
                className="input"
                style={{ marginTop: '0.5rem' }}
                placeholder="Type brand / model"
                value=""
                onChange={(e) => set('equipment_brand', e.target.value)}
              />
            )}
          </div>
        ) : form.equipment_type && !['Lighting', 'UPS', 'Grounding'].includes(form.equipment_type) ? (
          <div className="form-group">
            <label>Equipment Brand / Model</label>
            <input className="input" placeholder="e.g. brand and model" value={form.equipment_brand} onChange={(e) => set('equipment_brand', e.target.value)} />
          </div>
        ) : null}

        <div className="form-group">
          <label>Voltage System</label>
          <select className="select" value={form.voltage_system} onChange={(e) => set('voltage_system', e.target.value)}>
            <option value="">Select...</option>
            {VOLTAGE_SYSTEMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Symptom *</label>
          <textarea
            className="input"
            rows={4}
            style={{ resize: 'vertical' }}
            placeholder="Describe what's happening..."
            value={form.symptom}
            onChange={(e) => set('symptom', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Environment</label>
          <select className="select" value={form.environment} onChange={(e) => set('environment', e.target.value)}>
            <option value="">Select...</option>
            {ENVIRONMENTS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Already Tried</label>
          <div className="stack-sm">
            {ALREADY_TRIED_OPTIONS.map((opt) => (
              <label key={opt} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.already_tried.includes(opt)}
                  onChange={() => toggleTried(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        <button className="btn btn-primary btn-block" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Analyzing...' : 'Get Diagnosis'}
        </button>
      </div>
    </div>
  );
}
