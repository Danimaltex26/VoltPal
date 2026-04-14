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
    } catch (err) {
      setError(err.message || 'Troubleshoot failed.');
    } finally {
      setLoading(false);
    }
  };

  function handleReset() {
    setResult(null);
    setModel('');
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
            <h2 style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>Diagnosis {model && <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: '#6B6B73' }}>{model}</span>}</h2>
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
