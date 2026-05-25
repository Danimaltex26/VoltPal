import { useState } from 'react';
import { apiPost } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const EQUIPMENT_TYPES = [
  // Residential & Commercial
  'Panel / Main Breaker',
  'Breaker / Fuse',
  'Receptacle / Outlet',
  'Switch / Dimmer',
  'GFCI / AFCI',
  'Lighting (Interior)',
  'Lighting (Exterior / Landscape)',
  'Ceiling Fan',
  'Smoke / CO Detector',
  'Doorbell / Low Voltage',
  'Water Heater (Electric)',
  'HVAC / Thermostat',
  'EV Charger (EVSE)',
  // Commercial & Industrial
  'Motor',
  'VFD / Drive',
  'PLC / Controller',
  'Transformer',
  'Relay / Contactor',
  'Disconnect / Safety Switch',
  'Generator / Transfer Switch',
  'UPS / Battery Backup',
  'Fire Alarm Panel',
  'Surge Protection (SPD)',
  'Solar / Inverter',
  'Grounding / Bonding',
  'Conduit / Raceway',
  'Other',
];

const EQUIPMENT_BRANDS = {
  'Panel / Main Breaker': [
    'Square D QO', 'Square D Homeline', 'Square D NQ/NF (commercial)',
    'Eaton BR', 'Eaton CH', 'Eaton PRL (commercial)',
    'Siemens / Murray', 'GE', 'Leviton',
    'Federal Pacific (FPE) Stab-Lok', 'Zinsco / Sylvania', 'Challenger',
    'Cutler-Hammer', 'ITE / Gould', 'Pushmatic',
  ],
  'Breaker / Fuse': [
    'Square D QO', 'Square D Homeline', 'Square D QOB (bolt-on)',
    'Eaton BR', 'Eaton CH', 'Eaton BAB/BQD (bolt-on)',
    'Siemens QP', 'Siemens BQ (bolt-on)', 'Murray MQ',
    'GE THQL', 'GE THHQL', 'GE Spectra (industrial)',
    'ABB Tmax / SACE', 'Schneider PowerPact',
    'Cutler-Hammer', 'Federal Pacific', 'Zinsco',
    'Bussmann (fuses)', 'Littelfuse', 'Mersen/Ferraz (fuses)',
  ],
  'Receptacle / Outlet': [
    'Leviton', 'Hubbell', 'Pass & Seymour (Legrand)',
    'Eaton / Cooper', 'Lutron', 'GE',
  ],
  'Switch / Dimmer': [
    'Lutron Caseta', 'Lutron Diva', 'Lutron Maestro',
    'Leviton Decora', 'Leviton Decora Smart',
    'GE / Jasco (smart)', 'Hubbell',
    'Pass & Seymour (Legrand)', 'Eaton / Cooper',
    'TP-Link Kasa', 'Inovelli',
  ],
  'GFCI / AFCI': [
    'Leviton GFCI', 'Hubbell GFCI', 'Eaton GFCI',
    'Square D GFCI breaker', 'Eaton AFCI breaker',
    'Siemens AFCI/GFCI breaker', 'Eaton Dual Function (AFCI/GFCI)',
    'Square D Dual Function', 'GE Dual Function',
  ],
  'Lighting (Interior)': [
    'Lithonia', 'RAB Lighting', 'Acuity Brands',
    'Philips / Signify', 'GE Lighting', 'Cree',
    'Halo (recessed)', 'Juno (recessed)',
    'Lutron (controls)', 'Leviton (controls)',
    'Sylvania / Ledvance', 'Feit Electric',
  ],
  'Lighting (Exterior / Landscape)': [
    'RAB Lighting', 'Lithonia', 'Hubbell Outdoor',
    'Kim Lighting', 'FX Luminaire (landscape)',
    'Unique Lighting (landscape)', 'VOLT Lighting',
    'Philips / Signify', 'Cree',
  ],
  'Ceiling Fan': [
    'Hunter', 'Hampton Bay', 'Minka-Aire',
    'Casablanca', 'Big Ass Fans', 'Modern Forms',
    'Fanimation', 'Monte Carlo', 'Kichler',
  ],
  'Water Heater (Electric)': [
    'Rheem', 'A.O. Smith', 'Bradford White',
    'State', 'GE GeoSpring', 'Bosch',
    'Stiebel Eltron (tankless)', 'EcoSmart (tankless)',
    'Rinnai (hybrid)', 'Navien',
  ],
  'HVAC / Thermostat': [
    'Carrier', 'Trane', 'Lennox', 'Rheem / Ruud',
    'Goodman / Amana', 'York / Johnson Controls',
    'Daikin', 'Mitsubishi (mini-split)', 'Fujitsu (mini-split)',
    'Nest (thermostat)', 'Ecobee (thermostat)', 'Honeywell (thermostat)',
    'Emerson / Sensi (thermostat)', 'White-Rodgers (controls)',
  ],
  'EV Charger (EVSE)': [
    'Tesla Wall Connector', 'ChargePoint Home Flex',
    'JuiceBox (Enel X)', 'Grizzl-E', 'Wallbox Pulsar Plus',
    'Emporia (Level 2)', 'ClipperCreek / Enphase',
    'Siemens VersiCharge', 'Eaton', 'Leviton EVR',
  ],
  Motor: [
    'Baldor (ABB)', 'WEG', 'Marathon (Regal Rexnord)',
    'Leeson (Regal Rexnord)', 'Nidec / US Motors',
    'Siemens', 'ABB', 'GE Industrial',
    'Dayton (Grainger)', 'Teco-Westinghouse',
    'Brook Crompton', 'Worldwide Electric',
  ],
  'VFD / Drive': [
    'Allen-Bradley PowerFlex 523/525', 'Allen-Bradley PowerFlex 753/755',
    'Siemens SINAMICS G120', 'Siemens SINAMICS V20',
    'ABB ACS310/ACS355', 'ABB ACS580/ACS880',
    'Yaskawa GA500', 'Yaskawa A1000',
    'Danfoss VLT FC51/FC102', 'Danfoss VLT AutomationDrive',
    'Mitsubishi FR-E800/FR-A800',
    'Eaton SVX/DG1', 'Eaton PowerXL',
    'WEG CFW300/CFW500/CFW11',
    'Schneider Altivar 320/340/630',
    'Fuji FRENIC',
  ],
  'PLC / Controller': [
    'Allen-Bradley Micro820/830', 'Allen-Bradley CompactLogix 5380',
    'Allen-Bradley ControlLogix 5580', 'Allen-Bradley PanelView',
    'Siemens S7-1200', 'Siemens S7-1500', 'Siemens LOGO!',
    'ABB AC500', 'Mitsubishi FX5U/iQ-R',
    'Omron NX/NJ/CP2E', 'Automation Direct (Click/Productivity)',
    'Unitronics', 'Beckhoff', 'Schneider M221/M241',
  ],
  Transformer: [
    'Square D / Schneider', 'Eaton', 'Hammond Power Solutions',
    'Acme Electric', 'Marcus (Hammond)', 'Jefferson Electric',
    'GE Industrial', 'ABB', 'Siemens',
    'Sola / Emerson (CVS)', 'Dongan',
  ],
  'Relay / Contactor': [
    'Allen-Bradley 100-C / 100-E', 'Allen-Bradley 700-H (relay)',
    'Siemens SIRIUS 3RT / 3RH', 'Eaton XTCE / XTCF',
    'ABB AF / A-Line', 'Schneider TeSys D / TeSys F',
    'GE CL series', 'Sprecher+Schuh CA7',
    'Fuji SC-E series', 'Honeywell (HVAC contactors)',
    'Mars (HVAC contactors)', 'Packard (HVAC)',
    'IDEC (relays)', 'Phoenix Contact (relays)', 'Omron (relays)',
  ],
  'Disconnect / Safety Switch': [
    'Square D / Schneider H-D / H-F', 'Eaton DH/DT series',
    'Siemens HF/HNF series', 'GE TH/THN series',
    'ABB EOT series', 'Leviton (residential)',
  ],
  'Generator / Transfer Switch': [
    'Generac Guardian / Protector', 'Generac PWRcell',
    'Kohler', 'Cummins / Onan', 'Caterpillar',
    'Briggs & Stratton / Fortress',
    'Champion', 'Westinghouse', 'DuroMax',
    'ASCO (transfer switch)', 'Generac (transfer switch)',
    'Kohler (transfer switch)', 'Eaton (transfer switch)',
    'Reliance Controls (manual transfer)',
  ],
  'UPS / Battery Backup': [
    'APC (Schneider) Smart-UPS', 'APC Back-UPS',
    'Eaton 5PX / 9PX', 'Eaton 5S/5SC',
    'CyberPower', 'Vertiv / Liebert',
    'Tripp Lite', 'GE UPS',
  ],
  'Fire Alarm Panel': [
    'Notifier (Honeywell)', 'Simplex (Johnson Controls)',
    'EST / Edwards (Carrier)', 'Silent Knight (Honeywell)',
    'Fire-Lite (Honeywell)', 'Bosch',
    'Gamewell-FCI', 'Mircom', 'Kidde / Fenwal',
  ],
  'Surge Protection (SPD)': [
    'Square D / Schneider HEPD', 'Eaton SPD',
    'Siemens FS/QSA', 'Leviton SPD',
    'Intermatic (whole house)', 'Emrise / Joslyn',
    'ABB OVR', 'Phoenix Contact',
  ],
  'Solar / Inverter': [
    'Enphase (microinverter)', 'SolarEdge (optimizer + inverter)',
    'SMA Sunny Boy', 'Fronius',
    'Tesla Powerwall', 'Generac PWRcell',
    'Enphase IQ Battery', 'LG Chem RESU',
    'Canadian Solar', 'Growatt', 'Goodwe',
  ],
  'Smoke / CO Detector': [],
  'Doorbell / Low Voltage': [],
  'Grounding / Bonding': [],
  'Conduit / Raceway': [],
  Other: [],
};

const VOLTAGE_SYSTEMS = [
  '120V Single Phase',
  '120/240V Single Phase',
  '120/208V Three Phase',
  '277/480V Three Phase',
  '480V Three Phase',
  '240V Three Phase (Delta)',
  '600V',
  'Medium Voltage (over 600V)',
  '12V DC / Low Voltage',
  '24V DC / Control Voltage',
  '48V DC',
];

const ENVIRONMENTS = [
  'Residential (single family)',
  'Residential (multi-family / apartment)',
  'Commercial (office / retail)',
  'Commercial (restaurant / kitchen)',
  'Industrial (manufacturing)',
  'Industrial (warehouse)',
  'Healthcare / Hospital',
  'Outdoor / Wet location',
  'Hazardous Location (Class I/II/III)',
  'Data Center / Server Room',
  'Construction / Temporary power',
];

const ALREADY_TRIED_OPTIONS = [
  // Residential basics
  'Checked / reset breaker',
  'Checked / reset GFCI',
  'Tested outlet with plug tester',
  'Checked wire connections',
  'Replaced bulb / device',
  // General
  'Checked voltage with meter',
  'Checked for tripped breaker',
  'Inspected for visible damage / burn marks',
  'Checked neutral / ground connections',
  // Industrial
  'Meggered motor / cable',
  'Checked control circuit / PLC',
  'Reset fault on drive / controller',
  'Replaced fuse',
  'Checked amp draw',
  'Verified incoming power (all phases)',
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
  const [model, setModel] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [followUp, setFollowUp] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUps, setFollowUps] = useState([]);
  // Tracks whether the user picked "Other (not listed)" from the brand dropdown.
  // Kept separate from form.equipment_brand so typing in the free-text input
  // doesn't blow away the sentinel value and unmount the input mid-keystroke.
  const [brandIsOther, setBrandIsOther] = useState(false);

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
      setModel(data.model || '');
      setSessionId(data.session_id || null);
      setFollowUps([]);
    } catch (err) {
      setError(err.message || 'Troubleshoot failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!followUp.trim() || !sessionId) return;
    const question = followUp;
    setFollowUpLoading(true);
    setError('');
    try {
      const data = await apiPost('/troubleshoot', { session_id: sessionId, follow_up: question });
      setResult(data.result || data);
      setModel(data.model || '');
      setFollowUps((prev) => [...prev, { question, at: Date.now() }]);
      setFollowUp('');
    } catch (err) {
      setError(err.message || 'Follow-up failed.');
    } finally {
      setFollowUpLoading(false);
    }
  };

  function handleReset() {
    setResult(null);
    setModel('');
    setError('');
    setSessionId(null);
    setFollowUp('');
    setFollowUps([]);
    setBrandIsOther(false);
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
            {model && <div style={{ fontSize: '0.6875rem', color: '#6B6B73', marginTop: '0.25rem' }}>{model}</div>}
          </div>

          {/* Safety callout — top priority when present */}
          {(result.safety_callout || result.safety_warning) && (
            <div className="warning-box">
              <strong>Safety: </strong>{result.safety_callout || result.safety_warning}
            </div>
          )}

          {/* PPE & LOTO — always populated, highlighted prominently */}
          {result.required_ppe_and_loto && (
            <div className="card" style={{ borderLeft: '4px solid #FACC15' }}>
              <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#FACC15' }}>⚡</span>
                Required PPE & LOTO
              </h3>
              <p style={{ fontSize: '0.9375rem', lineHeight: 1.5 }}>{result.required_ppe_and_loto}</p>
            </div>
          )}

          {/* Plain English Summary */}
          {result.plain_english_summary && (
            <div className="card">
              <p style={{ fontSize: '1.0625rem', lineHeight: 1.6 }}>{result.plain_english_summary}</p>
            </div>
          )}

          {/* Fault code interpretation */}
          {result.fault_code_interpretation && (
            <div className="card">
              <h3 style={{ marginBottom: '0.5rem' }}>Fault Code</h3>
              <p className="text-secondary">{result.fault_code_interpretation}</p>
            </div>
          )}

          {/* Probable Causes — each with its own fix_path, parts, measurements */}
          {result.probable_causes && result.probable_causes.length > 0 && (
            <div className="stack">
              <h3>Probable Causes</h3>
              {result.probable_causes.map((c, i) => {
                const rank = c.rank ?? i + 1;
                const fixSteps = c.fix_path || c.fix_steps || [];
                const parts = c.parts_to_check || [];
                const meas = c.measurement_expectations || {};
                const hasMeas = meas && Object.values(meas).some(Boolean);
                return (
                  <div key={i} className="card">
                    <div className="row" style={{ marginBottom: '0.5rem', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{
                          minWidth: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: '#FACC15',
                          color: '#000',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8125rem',
                        }}>
                          {rank}
                        </div>
                        <strong style={{ lineHeight: 1.3 }}>{c.cause}</strong>
                      </div>
                      {c.likelihood && (
                        <span className={`badge ${c.likelihood === 'high' ? 'badge-red' : c.likelihood === 'medium' ? 'badge-amber' : 'badge-gray'}`}>
                          {c.likelihood}
                        </span>
                      )}
                    </div>

                    {c.explanation && (
                      <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                        {c.explanation}
                      </p>
                    )}

                    {c.code_note && (
                      <p style={{ fontSize: '0.8125rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(250,204,21,0.1)', borderLeft: '3px solid #FACC15', borderRadius: 4 }}>
                        <strong>NEC note: </strong>{c.code_note}
                      </p>
                    )}

                    {hasMeas && (
                      <div style={{ marginBottom: fixSteps.length > 0 || parts.length > 0 ? '0.75rem' : 0 }}>
                        <p className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>
                          Measurement Expectations
                        </p>
                        <div style={{ fontSize: '0.875rem' }}>
                          {Object.entries(meas).map(([k, v]) => (
                            v ? (
                              <p key={k} style={{ marginBottom: '0.25rem' }}>
                                <strong style={{ textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}:</strong> {v}
                              </p>
                            ) : null
                          ))}
                        </div>
                      </div>
                    )}

                    {parts.length > 0 && (
                      <div style={{ marginBottom: fixSteps.length > 0 ? '0.75rem' : 0 }}>
                        <p className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>
                          Parts to Check
                        </p>
                        <div className="stack-sm">
                          {parts.map((p, pi) => (
                            <div key={pi} style={{ padding: '0.5rem 0.625rem', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                              <div className="row-between" style={{ marginBottom: '0.25rem', alignItems: 'flex-start' }}>
                                <strong style={{ fontSize: '0.9375rem' }}>{p.part}</strong>
                                {p.estimated_cost && <span className="text-secondary" style={{ fontSize: '0.8125rem', flexShrink: 0, marginLeft: '0.5rem' }}>{p.estimated_cost}</span>}
                              </div>
                              {p.symptom_if_failed && (
                                <p className="text-secondary" style={{ fontSize: '0.8125rem' }}>
                                  <em>If failed:</em> {p.symptom_if_failed}
                                </p>
                              )}
                              {p.test_method && (
                                <p className="text-secondary" style={{ fontSize: '0.8125rem', marginTop: '0.125rem' }}>
                                  <em>Test:</em> {p.test_method}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {fixSteps.length > 0 && (
                      <div style={{ paddingLeft: '0.5rem', borderLeft: '2px solid #2A2A2E' }}>
                        <p className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                          Fix Path
                        </p>
                        <div className="stack-sm">
                          {fixSteps.map((step, si) => (
                            <div key={si} className="row" style={{ gap: '0.5rem', alignItems: 'flex-start' }}>
                              <span style={{ fontWeight: 600, color: '#FACC15', minWidth: 18, fontSize: '0.875rem' }}>
                                {step.step ?? si + 1}.
                              </span>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.9375rem' }}>{step.action || step.instruction || step}</p>
                                {step.tip && (
                                  <p className="text-secondary" style={{ fontSize: '0.8125rem', marginTop: '0.25rem', fontStyle: 'italic' }}>
                                    Tip: {step.tip}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Code disposition & NEC reference */}
          {(result.code_disposition || result.nec_reference) && (
            <div className="card">
              {result.code_disposition && (
                <p style={{ fontSize: '0.9375rem', marginBottom: result.nec_reference ? '0.5rem' : 0 }}>
                  <span className="text-secondary">Code disposition: </span>
                  {result.code_disposition}
                </p>
              )}
              {result.nec_reference && (
                <p style={{ fontSize: '0.9375rem' }}>
                  <span className="text-secondary">NEC reference: </span>
                  <strong>{result.nec_reference}</strong>
                </p>
              )}
            </div>
          )}

          {/* Escalation */}
          {result.escalate_if && (
            <div className="warning-box">
              <strong>Escalate if: </strong>{result.escalate_if}
            </div>
          )}

          {/* Estimated Fix Time */}
          {result.estimated_fix_time && (
            <div className="card">
              <div className="row-between">
                <span className="text-secondary">Estimated fix time</span>
                <strong>{result.estimated_fix_time}</strong>
              </div>
            </div>
          )}

          {/* Confidence */}
          {result.confidence && (
            <div className="card">
              <div className="row-between" style={{ alignItems: 'center' }}>
                <span className="text-secondary">Confidence</span>
                <span className={`badge ${result.confidence === 'high' ? 'badge-green' : result.confidence === 'medium' ? 'badge-amber' : 'badge-red'}`}>
                  {result.confidence}
                </span>
              </div>
              {result.confidence_reasoning && (
                <p className="text-secondary" style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                  {result.confidence_reasoning}
                </p>
              )}
            </div>
          )}

          {/* Follow-up question history */}
          {followUps.length > 0 && (
            <div className="stack-sm">
              {followUps.map((fu, i) => (
                <div key={i} className="card" style={{ background: 'rgba(250,204,21,0.06)' }}>
                  <p className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                    Follow-up #{i + 1}
                  </p>
                  <p style={{ fontSize: '0.9375rem' }}>{fu.question}</p>
                </div>
              ))}
            </div>
          )}

          {/* Ask a follow-up */}
          {sessionId && (
            <form onSubmit={handleFollowUp} className="stack-sm">
              <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Ask a follow-up</label>
              <textarea
                className="textarea"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder="e.g. I checked the coil and it reads normal — what else?"
                rows={2}
              />
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={followUpLoading || !followUp.trim()}
              >
                {followUpLoading ? 'Asking...' : 'Ask'}
              </button>
            </form>
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
              setBrandIsOther(false);
            }}
          >
            <option value="">Select...</option>
            {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {brandOptions.length > 0 ? (
          <div className="form-group">
            <label>Equipment Brand / Model</label>
            <select
              className="select"
              value={brandIsOther ? '__other' : form.equipment_brand}
              onChange={(e) => {
                if (e.target.value === '__other') {
                  setBrandIsOther(true);
                  set('equipment_brand', '');
                } else {
                  setBrandIsOther(false);
                  set('equipment_brand', e.target.value);
                }
              }}
            >
              <option value="">Select...</option>
              {brandOptions.map((b) => <option key={b} value={b}>{b}</option>)}
              <option value="__other">Other (not listed)</option>
            </select>
            {brandIsOther && (
              <input
                className="input"
                style={{ marginTop: '0.5rem' }}
                placeholder="Type brand / model"
                value={form.equipment_brand}
                onChange={(e) => set('equipment_brand', e.target.value)}
              />
            )}
          </div>
        ) : form.equipment_type && brandOptions.length === 0 && !['Smoke / CO Detector', 'Doorbell / Low Voltage', 'Grounding / Bonding', 'Conduit / Raceway', 'Other'].includes(form.equipment_type) ? (
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
