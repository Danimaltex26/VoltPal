import { useState, useMemo } from 'react';

// NEC 310.16 75°C column — copper
const COPPER_AMPACITY = [
  { gauge: '14 AWG', amps: 15, area_cmil: 4110, resistance: 3.14 },
  { gauge: '12 AWG', amps: 20, area_cmil: 6530, resistance: 1.93 },
  { gauge: '10 AWG', amps: 30, area_cmil: 10380, resistance: 1.21 },
  { gauge: '8 AWG', amps: 40, area_cmil: 16510, resistance: 0.764 },
  { gauge: '6 AWG', amps: 55, area_cmil: 26240, resistance: 0.491 },
  { gauge: '4 AWG', amps: 70, area_cmil: 41740, resistance: 0.308 },
  { gauge: '3 AWG', amps: 85, area_cmil: 52620, resistance: 0.245 },
  { gauge: '2 AWG', amps: 95, area_cmil: 66360, resistance: 0.194 },
  { gauge: '1 AWG', amps: 110, area_cmil: 83690, resistance: 0.154 },
  { gauge: '1/0 AWG', amps: 125, area_cmil: 105600, resistance: 0.122 },
  { gauge: '2/0 AWG', amps: 145, area_cmil: 133100, resistance: 0.0967 },
  { gauge: '3/0 AWG', amps: 165, area_cmil: 167800, resistance: 0.0766 },
  { gauge: '4/0 AWG', amps: 195, area_cmil: 211600, resistance: 0.0608 },
  { gauge: '250 kcmil', amps: 215, area_cmil: 250000, resistance: 0.0515 },
  { gauge: '300 kcmil', amps: 240, area_cmil: 300000, resistance: 0.0429 },
  { gauge: '350 kcmil', amps: 260, area_cmil: 350000, resistance: 0.0367 },
  { gauge: '500 kcmil', amps: 320, area_cmil: 500000, resistance: 0.0258 },
];

const PHASES = [
  { id: '1ph', label: 'Single Phase', factor: 2 },
  { id: '3ph', label: 'Three Phase', factor: 1.732 },
];

const VOLTAGES = [120, 208, 240, 277, 480, 600];

export default function WireSizingCalculator() {
  const [amps, setAmps] = useState('');
  const [voltage, setVoltage] = useState('240');
  const [phase, setPhase] = useState('1ph');
  const [distance, setDistance] = useState('');
  const [maxDrop, setMaxDrop] = useState('3');

  const result = useMemo(() => {
    const a = parseFloat(amps);
    const v = parseFloat(voltage);
    const d = parseFloat(distance);
    const drop = parseFloat(maxDrop);
    if (!a || !v || !d || !drop || a <= 0 || d <= 0) return null;

    const phaseFactor = PHASES.find(p => p.id === phase)?.factor || 2;
    const maxVoltageDrop = v * (drop / 100);

    // Find minimum wire by ampacity (125% for continuous loads)
    const ampMin = a;
    const byAmpacity = COPPER_AMPACITY.find(w => w.amps >= ampMin);

    // Find minimum wire by voltage drop
    // Vd = (factor × L × I × R) / 1000
    // R = (Vd × 1000) / (factor × L × I)
    const maxR = (maxVoltageDrop * 1000) / (phaseFactor * d * a);
    const byVoltageDrop = COPPER_AMPACITY.find(w => w.resistance <= maxR);

    if (!byAmpacity) return { error: 'Load exceeds 500 kcmil capacity. Use parallel conductors.' };

    const recommended = byVoltageDrop && COPPER_AMPACITY.indexOf(byVoltageDrop) > COPPER_AMPACITY.indexOf(byAmpacity)
      ? byVoltageDrop : byAmpacity;

    const actualDrop = (phaseFactor * d * a * recommended.resistance) / 1000;
    const actualDropPct = (actualDrop / v) * 100;
    const upsized = recommended !== byAmpacity;

    return {
      ampacity: byAmpacity.gauge,
      voltageDrop: byVoltageDrop?.gauge || 'Exceeds table — use parallel runs',
      recommended: recommended.gauge,
      actualDrop: actualDrop.toFixed(2),
      actualDropPct: actualDropPct.toFixed(1),
      upsized,
    };
  }, [amps, voltage, phase, distance, maxDrop]);

  return (
    <div className="stack">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div className="form-group">
          <label>Load (Amps)</label>
          <input className="input" type="number" placeholder="e.g. 40" value={amps} onChange={e => setAmps(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Voltage</label>
          <select className="select" value={voltage} onChange={e => setVoltage(e.target.value)}>
            {VOLTAGES.map(v => <option key={v} value={v}>{v}V</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Phase</label>
          <select className="select" value={phase} onChange={e => setPhase(e.target.value)}>
            {PHASES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>One-way Distance (ft)</label>
          <input className="input" type="number" placeholder="e.g. 150" value={distance} onChange={e => setDistance(e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label>Max Voltage Drop (%)</label>
        <select className="select" value={maxDrop} onChange={e => setMaxDrop(e.target.value)}>
          <option value="3">3% (branch circuit)</option>
          <option value="5">5% (total feeder + branch)</option>
          <option value="2">2% (sensitive equipment)</option>
        </select>
      </div>

      {result && !result.error && (
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Recommended Wire Size</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FACC15' }}>{result.recommended}</p>
            {result.upsized && (
              <span className="badge badge-amber" style={{ marginTop: 4 }}>Upsized for voltage drop</span>
            )}
          </div>
          <div className="stack-sm" style={{ fontSize: '0.875rem' }}>
            <div className="row-between">
              <span className="text-secondary">By ampacity (NEC 310.16)</span>
              <span>{result.ampacity}</span>
            </div>
            <div className="row-between">
              <span className="text-secondary">By voltage drop</span>
              <span>{result.voltageDrop}</span>
            </div>
            <div className="row-between">
              <span className="text-secondary">Actual voltage drop</span>
              <span>{result.actualDrop}V ({result.actualDropPct}%)</span>
            </div>
          </div>
        </div>
      )}

      {result?.error && <div className="warning-box">{result.error}</div>}

      <div className="info-box" style={{ fontSize: '0.8125rem' }}>
        Based on copper conductors, NEC 310.16 (75°C column). Does not include derating for ambient temperature or conduit fill. Always verify with a licensed engineer for critical installations.
      </div>
    </div>
  );
}
