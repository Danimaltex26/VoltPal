import { useState, useRef } from 'react';
import { apiUpload } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const AI_MESSAGES = [
  'Analyzing your electrical photo...',
  'Inspecting panel and wiring...',
  'Identifying issues...',
  'Almost done...',
];

function severityBadge(severity) {
  if (!severity) return 'badge badge-gray';
  const s = severity.toLowerCase();
  if (s === 'critical' || s === 'severe') return 'badge badge-red';
  if (s === 'moderate') return 'badge badge-amber';
  return 'badge badge-green';
}

function actionBadge(action) {
  if (!action) return 'badge badge-gray';
  const a = action.toLowerCase();
  if (a.includes('routine') || a.includes('maintenance')) return 'badge badge-green';
  if (a.includes('repair') || a.includes('replace')) return 'badge badge-amber';
  if (a.includes('immediate') || a.includes('shutdown') || a.includes('professional')) return 'badge badge-red';
  return 'badge badge-gray';
}

export default function AnalysisPage() {
  const [analysisType, setAnalysisType] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  async function handleUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError('');
    setResult(null);
    setLoading(true);

    const formData = new FormData();
    for (let i = 0; i < Math.min(files.length, 4); i++) {
      formData.append('images', files[i]);
    }
    if (analysisType) formData.append('analysis_type', analysisType);

    try {
      const data = await apiUpload('/analysis', formData);
      setResult(data.result);
    } catch (err) {
      setError(err.message || 'Failed to analyze. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
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
            <h2>Analysis Result</h2>
          </div>

          {result.plain_english_summary && (
            <div className="card">
              <p style={{ fontSize: '1.125rem', lineHeight: 1.6 }}>{result.plain_english_summary}</p>
            </div>
          )}

          {result.recommended_action && (
            <div className="card">
              <div className="row-between" style={{ marginBottom: '0.5rem' }}>
                <strong>Recommendation</strong>
                <span className={actionBadge(result.recommended_action)}>
                  {result.recommended_action.replace(/_/g, ' ')}
                </span>
              </div>
              {result.confidence && (
                <div className="row" style={{ marginTop: '0.5rem' }}>
                  <span className="text-secondary" style={{ fontSize: '0.875rem' }}>Confidence:</span>
                  <span className={`badge ${result.confidence === 'high' ? 'badge-green' : result.confidence === 'medium' ? 'badge-amber' : 'badge-red'}`}>
                    {result.confidence}
                  </span>
                </div>
              )}
            </div>
          )}

          {result.safety_warning && (
            <div className="warning-box">{result.safety_warning}</div>
          )}

          {result.findings && result.findings.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Findings</h3>
              <div className="stack-sm">
                {result.findings.map((f, i) => (
                  <div key={i} style={{ paddingBottom: '0.75rem', borderBottom: '1px solid #2A2A2E' }}>
                    <div className="row-between" style={{ marginBottom: '0.25rem' }}>
                      <strong>{f.issue}</strong>
                      <span className={severityBadge(f.severity)}>{f.severity}</span>
                    </div>
                    <p className="text-secondary" style={{ fontSize: '0.875rem' }}>{f.description}</p>
                    {f.probable_cause && (
                      <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                        <span className="text-secondary">Cause:</span> {f.probable_cause}
                      </p>
                    )}
                    {f.immediate_action && (
                      <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                        <span className="text-secondary">Action:</span> {f.immediate_action}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.nec_references && result.nec_references.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>NEC References</h3>
              <div className="stack-sm">
                {result.nec_references.map((ref, i) => (
                  <div key={i} className="row-between" style={{ padding: '0.5rem 0', borderBottom: '1px solid #2A2A2E' }}>
                    <div>
                      <strong>{ref.code}</strong>
                      {ref.description && <p className="text-secondary" style={{ fontSize: '0.8125rem' }}>{ref.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.recommendations && result.recommendations.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Recommendations</h3>
              <div className="stack-sm">
                {result.recommendations.map((r, i) => (
                  <div key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid #2A2A2E' }}>
                    <p>{r}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.overall_diagnosis && (
            <div className="card">
              <h3 style={{ marginBottom: '0.5rem' }}>Diagnosis</h3>
              <p className="text-secondary">{result.overall_diagnosis}</p>
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
          <h2>Electrical Photo Analysis</h2>
          <p className="text-secondary" style={{ marginTop: '0.25rem' }}>
            Upload a photo of electrical equipment for AI-powered analysis
          </p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* Analysis Type */}
        <div className="form-group">
          <label>Analysis Type (optional)</label>
          <select className="select" value={analysisType} onChange={(e) => setAnalysisType(e.target.value)}>
            <option value="">Auto-detect</option>
            <option value="panel_inspection">Panel Inspection</option>
            <option value="fault_diagnosis">Fault Diagnosis</option>
            <option value="motor_nameplate">Motor/Nameplate</option>
            <option value="wiring_review">Wiring Review</option>
          </select>
        </div>

        {/* Upload Area */}
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            minHeight: 220,
            border: '2px dashed #2A2A2E',
            borderRadius: 16,
            cursor: 'pointer',
            padding: '2rem',
            textAlign: 'center',
            transition: 'border-color 0.15s',
          }}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#FACC15'; }}
          onDragLeave={(e) => { e.currentTarget.style.borderColor = '#2A2A2E'; }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = '#2A2A2E';
            if (e.dataTransfer.files.length) {
              const dt = new DataTransfer();
              for (const f of e.dataTransfer.files) dt.items.add(f);
              fileInputRef.current.files = dt.files;
              handleUpload({ target: { files: dt.files } });
            }
          }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div>
            <p style={{ fontSize: '1.0625rem', fontWeight: 600 }}>
              Tap to upload or take a photo
            </p>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Photo of panels, wiring, motors, or equipment (up to 4)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleUpload}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </div>
  );
}
