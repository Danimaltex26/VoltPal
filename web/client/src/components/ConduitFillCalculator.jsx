import { useState, useMemo } from 'react';

// Wire areas (THHN/THWN-2) — NEC Chapter 9 Table 5
const WIRE_SIZES = [
  { gauge: '14 AWG', area: 0.0097 },
  { gauge: '12 AWG', area: 0.0133 },
  { gauge: '10 AWG', area: 0.0211 },
  { gauge: '8 AWG', area: 0.0366 },
  { gauge: '6 AWG', area: 0.0507 },
  { gauge: '4 AWG', area: 0.0824 },
  { gauge: '3 AWG', area: 0.0973 },
  { gauge: '2 AWG', area: 0.1158 },
  { gauge: '1 AWG', area: 0.1562 },
  { gauge: '1/0 AWG', area: 0.1855 },
  { gauge: '2/0 AWG', area: 0.2223 },
  { gauge: '3/0 AWG', area: 0.2679 },
  { gauge: '4/0 AWG', area: 0.3237 },
  { gauge: '250 kcmil', area: 0.3970 },
  { gauge: '300 kcmil', area: 0.4608 },
  { gauge: '350 kcmil', area: 0.5242 },
  { gauge: '500 kcmil', area: 0.7073 },
];

// Conduit internal areas (sq in) — EMT
const CONDUIT_SIZES = [
  { size: '1/2"', area: 0.304 },
  { size: '3/4"', area: 0.533 },
  { size: '1"', area: 0.864 },
  { size: '1-1/4"', area: 1.496 },
  { size: '1-1/2"', area: 1.946 },
  { size: '2"', area: 3.356 },
  { size: '2-1/2"', area: 5.858 },
  { size: '3"', area: 8.846 },
  { size: '4"', area: 15.68 },
];

function getFillPercent(count) {
  if (count === 1) return 0.53;
  if (count === 2) return 0.31;
  return 0.40;
}

export default function ConduitFillCalculator() {
  const [wireGauge, setWireGauge] = useState('12 AWG');
  const [wireCount, setWireCount] = useState('');

  const result = useMemo(() => {
    const count = parseInt(wireCount);
    if (!count || count <= 0) return null;

    const wire = WIRE_SIZES.find(w => w.gauge === wireGauge);
    if (!wire) return null;

    const totalArea = wire.area * count;
    const fillPct = getFillPercent(count);

    const minConduit = CONDUIT_SIZES.find(c => (c.area * fillPct) >= totalArea);
    const allFitting = CONDUIT_SIZES.map(c => {
      const allowed = c.area * fillPct;
      const maxWires = Math.floor(allowed / wire.area);
      const usedPct = (totalArea / c.area) * 100;
      return { ...c, maxWires, usedPct, fits: allowed >= totalArea };
    });

    return {
      totalArea: totalArea.toFixed(4),
      fillRule: count === 1 ? '53%' : count === 2 ? '31%' : '40%',
      minConduit: minConduit?.size || 'Exceeds 4" EMT',
      table: allFitting,
    };
  }, [wireGauge, wireCount]);

  return (
    <div className="stack">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div className="form-group">
          <label>Wire Size (THHN)</label>
          <select className="select" value={wireGauge} onChange={e => setWireGauge(e.target.value)}>
            {WIRE_SIZES.map(w => <option key={w.gauge} value={w.gauge}>{w.gauge}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Number of Conductors</label>
          <input className="input" type="number" placeholder="e.g. 4" value={wireCount} onChange={e => setWireCount(e.target.value)} />
        </div>
      </div>

      {result && (
        <>
          <div className="card" style={{ textAlign: 'center' }}>
            <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Minimum Conduit Size (EMT)</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FACC15' }}>{result.minConduit}</p>
            <p className="text-secondary" style={{ fontSize: '0.75rem', marginTop: 4 }}>
              Fill rule: {result.fillRule} for {wireCount} conductor{parseInt(wireCount) !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="card" style={{ padding: '0.75rem' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem' }}>Conduit Capacity Table</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                  <th style={{ textAlign: 'left', padding: 4 }}>EMT Size</th>
                  <th style={{ textAlign: 'center', padding: 4 }}>Max {wireGauge}</th>
                  <th style={{ textAlign: 'center', padding: 4 }}>Fill %</th>
                  <th style={{ textAlign: 'center', padding: 4 }}></th>
                </tr>
              </thead>
              <tbody>
                {result.table.filter(r => r.maxWires > 0).map(r => (
                  <tr key={r.size} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: 4, fontWeight: 600 }}>{r.size}</td>
                    <td style={{ textAlign: 'center', padding: 4 }}>{r.maxWires}</td>
                    <td style={{ textAlign: 'center', padding: 4, color: r.fits ? '#A0A0A8' : '#EF4444' }}>
                      {r.usedPct.toFixed(0)}%
                    </td>
                    <td style={{ textAlign: 'center', padding: 4 }}>
                      {r.fits ? <span style={{ color: '#22C55E' }}>OK</span> : <span style={{ color: '#EF4444' }}>Over</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="info-box" style={{ fontSize: '0.8125rem' }}>
        Based on THHN/THWN-2 wire areas per NEC Chapter 9 Table 5, EMT conduit per Table 4. Nipples (24" or less) allow 60% fill.
      </div>
    </div>
  );
}
