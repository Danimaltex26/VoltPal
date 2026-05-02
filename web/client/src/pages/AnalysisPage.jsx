import { useState, useRef } from 'react';
import { apiUpload } from '../utils/api';
import { compressImage } from '../utils/compressImage';
import LoadingSpinner from '../components/LoadingSpinner';
import OfflineQueue from '../components/OfflineQueue';
import useOfflineQueue from '../hooks/useOfflineQueue';

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
  if (a.includes('safe') || a.includes('routine') || a.includes('maintenance')) return 'badge badge-green';
  if (a.includes('schedule') || a.includes('investigation') || a.includes('repair') || a.includes('replace')) return 'badge badge-amber';
  if (a.includes('immediate') || a.includes('de_energize') || a.includes('de-energize') || a.includes('shutdown') || a.includes('professional')) return 'badge badge-red';
  return 'badge badge-gray';
}

function confidenceBadgeClass(confidence) {
  if (!confidence) return 'badge badge-gray';
  const lower = confidence.toLowerCase();
  if (lower.includes('high')) return 'badge badge-green';
  if (lower.includes('medium')) return 'badge badge-amber';
  return 'badge badge-red';
}

export default function AnalysisPage() {
  const [analysisType, setAnalysisType] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [model, setModel] = useState('');
  const [error, setError] = useState('');
  const [queued, setQueued] = useState(false);
  const fileInputRef = useRef(null);
  const offlineQueue = useOfflineQueue();

  async function handleUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError('');
    setResult(null);
    setQueued(false);

    // If offline, queue it
    if (!navigator.onLine) {
      await offlineQueue.enqueue(files, analysisType);
      setQueued(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Online — upload directly
    setLoading(true);
    const formData = new FormData();
    for (let i = 0; i < Math.min(files.length, 4); i++) {
      var compressed = await compressImage(files[i]);
      formData.append('images', compressed);
    }
    if (analysisType) formData.append('analysis_type', analysisType);

    try {
      const data = await apiUpload('/analysis', formData);
      setResult(data.result);
      setModel(data.model || '');
    } catch (err) {
      // If upload fails (network dropped mid-request), queue it
      if (!navigator.onLine || err.message?.includes('fetch') || err.message?.includes('network')) {
        await offlineQueue.enqueue(files, analysisType);
        setQueued(true);
      } else {
        setError(err.message || 'Failed to analyze. Please try again.');
      }
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleReset() {
    setResult(null);
    setModel('');
    setError('');
    setQueued(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleViewQueueResult(item) {
    if (item.result) {
      setResult(item.result);
      offlineQueue.dismiss(item.id);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <LoadingSpinner messages={AI_MESSAGES} />
      </div>
    );
  }

  if (result) {
    const ctx = result.equipment_context;
    const safety = result.safety_assessment;
    const panel = result.panel_analysis;
    const motor = result.motor_nameplate_data;
    const vfd = result.vfd_analysis;
    const meter = result.meter_reading;
    const imageUsable = result.is_electrical_image !== false && result.image_quality?.usable !== false;

    return (
      <div className="page">
        <div className="stack">
          <div className="page-header">
            <h2>Analysis Result</h2>
            {model && <div style={{ fontSize: '0.6875rem', color: '#6B6B73', marginTop: '0.25rem' }}>{model}</div>}
          </div>

          {/* Unusable image warning */}
          {!imageUsable && (
            <div className="warning-box">
              <strong>Image could not be analyzed.</strong>
              {result.image_quality?.quality_note && (
                <p style={{ marginTop: '0.25rem' }}>{result.image_quality.quality_note}</p>
              )}
            </div>
          )}

          {/* Overall Assessment Badge */}
          {imageUsable && result.overall_assessment && (
            <div className="card" style={{ textAlign: 'center' }}>
              <span className={actionBadge(result.overall_assessment)} style={{ fontSize: '1.25rem', padding: '0.5rem 1.5rem' }}>
                {result.overall_assessment.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
          )}

          {/* Assessment Reasoning */}
          {result.assessment_reasoning && (
            <div className="card">
              <p style={{ fontSize: '1.0625rem', lineHeight: 1.6 }}>{result.assessment_reasoning}</p>
            </div>
          )}

          {/* Detected Context */}
          {ctx && (ctx.equipment_type || ctx.manufacturer_detected || (ctx.voltage_class && ctx.voltage_class !== 'unknown') || (ctx.environment && ctx.environment !== 'unknown')) && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Detected</h3>
              <div className="stack-sm">
                {result.image_type && result.image_type !== 'unknown' && (
                  <div className="row-between">
                    <span className="text-secondary">Image Type</span>
                    <span className="badge badge-blue">{result.image_type.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {ctx.equipment_type && (
                  <div className="row-between">
                    <span className="text-secondary">Equipment</span>
                    <span style={{ fontWeight: 600 }}>{ctx.equipment_type}</span>
                  </div>
                )}
                {ctx.manufacturer_detected && (
                  <div className="row-between">
                    <span className="text-secondary">Manufacturer</span>
                    <span style={{ fontWeight: 600 }}>{ctx.manufacturer_detected}</span>
                  </div>
                )}
                {ctx.voltage_class && ctx.voltage_class !== 'unknown' && (
                  <div className="row-between">
                    <span className="text-secondary">Voltage Class</span>
                    <span style={{ fontWeight: 600 }}>{ctx.voltage_class.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {ctx.environment && ctx.environment !== 'unknown' && (
                  <div className="row-between">
                    <span className="text-secondary">Environment</span>
                    <span>{ctx.environment.replace(/_/g, ' ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Safety Assessment */}
          {safety && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Safety Assessment</h3>
              {safety.immediate_hazard_detected && (
                <div className="warning-box" style={{ marginBottom: '0.75rem' }}>
                  <strong>Immediate hazard detected.</strong>
                  {safety.hazard_description && <p style={{ marginTop: '0.25rem' }}>{safety.hazard_description}</p>}
                </div>
              )}
              <div className="stack-sm">
                {safety.arc_flash_concern != null && (
                  <div className="row-between">
                    <span className="text-secondary">Arc Flash Concern</span>
                    <span className={safety.arc_flash_concern ? 'badge badge-red' : 'badge badge-green'}>
                      {safety.arc_flash_concern ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
                {safety.arc_flash_notes && (
                  <p className="text-secondary" style={{ fontSize: '0.875rem' }}>{safety.arc_flash_notes}</p>
                )}
                {safety.loto_required_before_work != null && (
                  <div className="row-between">
                    <span className="text-secondary">LOTO Required</span>
                    <span className={safety.loto_required_before_work ? 'badge badge-amber' : 'badge badge-gray'}>
                      {safety.loto_required_before_work ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
                {safety.ppe_requirements && (
                  <div style={{ padding: '0.5rem 0' }}>
                    <span className="text-secondary" style={{ fontSize: '0.875rem' }}>PPE Requirements:</span>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{safety.ppe_requirements}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Panel Analysis */}
          {panel?.applicable && (
            <div className="card">
              <div className="row-between" style={{ marginBottom: '0.75rem' }}>
                <h3>Panel Analysis</h3>
                {panel.overall_panel_condition && (
                  <span className={severityBadge(panel.overall_panel_condition === 'critical' ? 'critical' : panel.overall_panel_condition === 'poor' ? 'severe' : panel.overall_panel_condition === 'fair' ? 'moderate' : 'minor')}>
                    {panel.overall_panel_condition}
                  </span>
                )}
              </div>
              <div className="stack-sm">
                {panel.panel_type && panel.panel_type !== 'unknown' && (
                  <div className="row-between">
                    <span className="text-secondary">Panel Type</span>
                    <span style={{ fontWeight: 600 }}>{panel.panel_type.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {panel.bus_rating_amps != null && (
                  <div className="row-between">
                    <span className="text-secondary">Bus Rating</span>
                    <span style={{ fontWeight: 600 }}>{panel.bus_rating_amps} A</span>
                  </div>
                )}
                {panel.main_breaker_amps != null && (
                  <div className="row-between">
                    <span className="text-secondary">Main Breaker</span>
                    <span style={{ fontWeight: 600 }}>{panel.main_breaker_amps} A</span>
                  </div>
                )}
                {panel.available_spaces != null && (
                  <div className="row-between">
                    <span className="text-secondary">Available Spaces</span>
                    <span>{panel.available_spaces}</span>
                  </div>
                )}
                {panel.double_tapped_breakers != null && (
                  <div className="row-between">
                    <span className="text-secondary">Double-Tapped Breakers</span>
                    <span className={panel.double_tapped_breakers ? 'badge badge-red' : 'badge badge-green'}>
                      {panel.double_tapped_breakers ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
                {panel.missing_knockouts != null && (
                  <div className="row-between">
                    <span className="text-secondary">Missing Knockouts</span>
                    <span className={panel.missing_knockouts ? 'badge badge-amber' : 'badge badge-green'}>
                      {panel.missing_knockouts ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
                {panel.labeling_adequate != null && (
                  <div className="row-between">
                    <span className="text-secondary">Labeling Adequate</span>
                    <span className={panel.labeling_adequate ? 'badge badge-green' : 'badge badge-amber'}>
                      {panel.labeling_adequate ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
                {panel.grounding_visible != null && (
                  <div className="row-between">
                    <span className="text-secondary">Grounding Visible</span>
                    <span>{panel.grounding_visible ? 'Yes' : 'No'}</span>
                  </div>
                )}
                {panel.neutral_bar_condition && (
                  <div className="row-between">
                    <span className="text-secondary">Neutral Bar</span>
                    <span>{panel.neutral_bar_condition}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Motor Nameplate Data */}
          {motor?.applicable && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Motor Nameplate</h3>
              <div className="stack-sm">
                {motor.hp && (
                  <div className="row-between"><span className="text-secondary">HP</span><span style={{ fontWeight: 600 }}>{motor.hp}</span></div>
                )}
                {motor.voltage && (
                  <div className="row-between"><span className="text-secondary">Voltage</span><span style={{ fontWeight: 600 }}>{motor.voltage}</span></div>
                )}
                {motor.fla && (
                  <div className="row-between"><span className="text-secondary">FLA</span><span style={{ fontWeight: 600 }}>{motor.fla}</span></div>
                )}
                {motor.rpm && (
                  <div className="row-between"><span className="text-secondary">RPM</span><span style={{ fontWeight: 600 }}>{motor.rpm}</span></div>
                )}
                {motor.service_factor && (
                  <div className="row-between"><span className="text-secondary">Service Factor</span><span>{motor.service_factor}</span></div>
                )}
                {motor.frame_size && (
                  <div className="row-between"><span className="text-secondary">Frame Size</span><span>{motor.frame_size}</span></div>
                )}
                {motor.nema_design && (
                  <div className="row-between"><span className="text-secondary">NEMA Design</span><span>{motor.nema_design}</span></div>
                )}
                {motor.insulation_class && (
                  <div className="row-between"><span className="text-secondary">Insulation Class</span><span>{motor.insulation_class}</span></div>
                )}
                {motor.enclosure_type && (
                  <div className="row-between"><span className="text-secondary">Enclosure</span><span>{motor.enclosure_type}</span></div>
                )}
                {motor.phase && (
                  <div className="row-between"><span className="text-secondary">Phase</span><span>{motor.phase}</span></div>
                )}
                {motor.efficiency && (
                  <div className="row-between"><span className="text-secondary">Efficiency</span><span>{motor.efficiency}</span></div>
                )}
              </div>
              {motor.motor_condition_notes && (
                <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.75rem' }}>{motor.motor_condition_notes}</p>
              )}
            </div>
          )}

          {/* VFD Analysis */}
          {vfd?.applicable && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>VFD / Drive</h3>
              <div className="stack-sm">
                {vfd.fault_code_visible && (
                  <div className="row-between">
                    <span className="text-secondary">Fault Code</span>
                    <span className="badge badge-red" style={{ fontWeight: 600 }}>{vfd.fault_code_visible}</span>
                  </div>
                )}
                {vfd.fault_description && (
                  <p style={{ fontSize: '0.875rem' }}><span className="text-secondary">Description:</span> {vfd.fault_description}</p>
                )}
                {vfd.display_readings && (
                  <div className="row-between">
                    <span className="text-secondary">Display Readings</span>
                    <span>{vfd.display_readings}</span>
                  </div>
                )}
                {vfd.capacitor_condition && (
                  <div className="row-between">
                    <span className="text-secondary">Capacitor</span>
                    <span>{vfd.capacitor_condition}</span>
                  </div>
                )}
                {vfd.terminal_condition && (
                  <div className="row-between">
                    <span className="text-secondary">Terminals</span>
                    <span>{vfd.terminal_condition}</span>
                  </div>
                )}
                {vfd.cooling_fan_condition && (
                  <div className="row-between">
                    <span className="text-secondary">Cooling Fan</span>
                    <span>{vfd.cooling_fan_condition}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Meter Reading */}
          {meter?.applicable && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Meter Reading</h3>
              <div className="stack-sm">
                {meter.meter_type && meter.meter_type !== 'unknown' && (
                  <div className="row-between">
                    <span className="text-secondary">Meter Type</span>
                    <span style={{ fontWeight: 600 }}>{meter.meter_type.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {meter.measurement_type && meter.measurement_type !== 'unknown' && (
                  <div className="row-between">
                    <span className="text-secondary">Measurement</span>
                    <span>{meter.measurement_type.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {(meter.reading_value || meter.reading_unit) && (
                  <div className="row-between">
                    <span className="text-secondary">Reading</span>
                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                      {meter.reading_value}{meter.reading_unit ? ` ${meter.reading_unit}` : ''}
                    </span>
                  </div>
                )}
                {meter.expected_range && (
                  <div className="row-between">
                    <span className="text-secondary">Expected Range</span>
                    <span>{meter.expected_range}</span>
                  </div>
                )}
                {meter.reading_assessment && (
                  <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{meter.reading_assessment}</p>
                )}
              </div>
            </div>
          )}

          {/* Findings */}
          {result.findings && result.findings.length > 0 && result.findings[0].finding_type !== 'none_detected' && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Findings</h3>
              <div className="stack-sm">
                {result.findings.map((f, i) => (
                  <div key={i} style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <div className="row-between" style={{ marginBottom: '0.25rem' }}>
                      <strong>{f.finding_type ? f.finding_type.replace(/_/g, ' ') : 'Finding'}</strong>
                      {f.severity && <span className={severityBadge(f.severity)}>{f.severity}</span>}
                    </div>
                    {f.description && <p style={{ fontSize: '0.9375rem', marginTop: '0.25rem' }}>{f.description}</p>}
                    {f.location && (
                      <p className="text-secondary" style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>Location: {f.location}</p>
                    )}
                    {f.probable_cause && (
                      <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        <span className="text-secondary">Cause:</span> {f.probable_cause}
                      </p>
                    )}
                    {f.corrective_action && (
                      <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        <span className="text-secondary">Fix:</span> {f.corrective_action}
                      </p>
                    )}
                    {f.nec_reference && (
                      <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{f.nec_reference}</p>
                    )}
                    {f.requires_de_energization && (
                      <div className="warning-box" style={{ marginTop: '0.5rem', fontSize: '0.8125rem' }}>
                        De-energize before correcting.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Corrective Actions */}
          {result.corrective_actions && result.corrective_actions.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Corrective Actions</h3>
              <ol style={{ paddingLeft: '1.25rem', margin: 0 }}>
                {result.corrective_actions.map((a, i) => (
                  <li key={i} style={{ marginBottom: '0.75rem' }}>
                    <div className="row-between" style={{ marginBottom: '0.25rem', gap: '0.5rem' }}>
                      <span style={{ flex: 1 }}>{a.action}</span>
                      {a.priority && (
                        <span className={actionBadge(a.priority === 'immediate' ? 'immediate' : a.priority === 'before_re_energizing' ? 'repair' : 'routine')} style={{ minWidth: 'fit-content', fontSize: '0.6875rem' }}>
                          {a.priority.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    {(a.requires_qualified_person || a.requires_de_energization) && (
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {a.requires_qualified_person && <span>Qualified person required. </span>}
                        {a.requires_de_energization && <span>De-energization required.</span>}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* NEC References */}
          {result.nec_references && result.nec_references.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>NEC References</h3>
              <div className="stack-sm">
                {result.nec_references.map((ref, i) => (
                  <div key={i} style={{ fontSize: '0.875rem' }}>
                    <strong>{ref.article}</strong>
                    {ref.section && <span className="text-secondary"> · {ref.section}</span>}
                    {ref.requirement && <p className="text-secondary" style={{ marginTop: '0.125rem' }}>{ref.requirement}</p>}
                    {ref.applies_to && <p className="text-muted" style={{ fontSize: '0.75rem' }}>Applies to: {ref.applies_to}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Next Steps */}
          {result.recommended_next_steps && (
            <div className="card">
              <h3 style={{ marginBottom: '0.5rem' }}>Next Steps</h3>
              <p>{result.recommended_next_steps}</p>
            </div>
          )}

          {/* Confidence */}
          {result.confidence && (
            <div className="card">
              <div className="row-between">
                <span className="text-secondary">Confidence</span>
                <span className={confidenceBadgeClass(result.confidence)}>{result.confidence}</span>
              </div>
              {result.confidence_reasoning && (
                <p className="text-secondary" style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>{result.confidence_reasoning}</p>
              )}
            </div>
          )}

          {/* Scope Disclaimer */}
          {result.scope_disclaimer && (
            <p className="text-muted" style={{ fontSize: '0.75rem', fontStyle: 'italic', padding: '0 0.5rem' }}>
              {result.scope_disclaimer}
            </p>
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

        {/* Offline indicator */}
        {!navigator.onLine && (
          <div className="warning-box" style={{ fontSize: '0.875rem' }}>
            You are offline. Photos will be queued and processed automatically when you reconnect.
          </div>
        )}

        {/* Queued confirmation */}
        {queued && (
          <div className="info-box" style={{ fontSize: '0.875rem' }}>
            Photo queued! It will be processed automatically when you're back online.
          </div>
        )}

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
              {navigator.onLine ? 'Tap to upload or take a photo' : 'Tap to capture and queue a photo'}
            </p>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Photo of panels, wiring, motors, or equipment (up to 4)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            style={{ display: 'none' }}
          />
        </label>

        {/* Offline Queue */}
        <OfflineQueue
          queue={offlineQueue.queue}
          processing={offlineQueue.processing}
          onRetry={offlineQueue.retry}
          onDismiss={offlineQueue.dismiss}
          onViewResult={handleViewQueueResult}
          onClearCompleted={offlineQueue.clearCompleted}
        />
      </div>
    </div>
  );
}
