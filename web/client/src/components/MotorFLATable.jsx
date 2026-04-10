import { useState } from 'react';

const THREE_PHASE_460V = [
  { hp: '1', fla: 2.1 }, { hp: '1.5', fla: 3.0 }, { hp: '2', fla: 3.4 },
  { hp: '3', fla: 4.8 }, { hp: '5', fla: 7.6 }, { hp: '7.5', fla: 11 },
  { hp: '10', fla: 14 }, { hp: '15', fla: 21 }, { hp: '20', fla: 27 },
  { hp: '25', fla: 34 }, { hp: '30', fla: 40 }, { hp: '40', fla: 52 },
  { hp: '50', fla: 65 }, { hp: '60', fla: 77 }, { hp: '75', fla: 96 },
  { hp: '100', fla: 124 }, { hp: '125', fla: 156 }, { hp: '150', fla: 180 },
  { hp: '200', fla: 240 },
];

const SINGLE_PHASE = [
  { hp: '1/4', fla_115: 5.8, fla_230: 2.9 },
  { hp: '1/3', fla_115: 7.2, fla_230: 3.6 },
  { hp: '1/2', fla_115: 9.8, fla_230: 4.9 },
  { hp: '3/4', fla_115: 13.8, fla_230: 6.9 },
  { hp: '1', fla_115: 16, fla_230: 8 },
  { hp: '1.5', fla_115: 20, fla_230: 10 },
  { hp: '2', fla_115: 24, fla_230: 12 },
  { hp: '3', fla_115: 34, fla_230: 17 },
  { hp: '5', fla_115: 56, fla_230: 28 },
  { hp: '7.5', fla_115: 80, fla_230: 40 },
  { hp: '10', fla_115: 100, fla_230: 50 },
];

const cellStyle = { padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' };
const headerStyle = { ...cellStyle, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.15)', fontSize: '0.8125rem', color: '#A0A0A8' };

export default function MotorFLATable() {
  const [tab, setTab] = useState('3ph');

  return (
    <div className="stack">
      <div className="toggle-group">
        <button className={`toggle-option ${tab === '3ph' ? 'active' : ''}`} onClick={() => setTab('3ph')}>
          3-Phase (NEC 430.250)
        </button>
        <button className={`toggle-option ${tab === '1ph' ? 'active' : ''}`} onClick={() => setTab('1ph')}>
          1-Phase (NEC 430.248)
        </button>
      </div>

      {tab === '3ph' && (
        <div className="card" style={{ padding: '0.75rem' }}>
          <h3 style={{ margin: '0 0 4px' }}>Three-Phase Motor FLA</h3>
          <p className="text-secondary" style={{ fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
            NEC Table 430.250 — use these values (not nameplate) for sizing conductors and protection.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <th style={{ ...headerStyle, textAlign: 'left' }}>HP</th>
                  <th style={{ ...headerStyle, textAlign: 'center' }}>208V</th>
                  <th style={{ ...headerStyle, textAlign: 'center', color: '#FACC15' }}>460V</th>
                  <th style={{ ...headerStyle, textAlign: 'center' }}>575V</th>
                </tr>
              </thead>
              <tbody>
                {THREE_PHASE_460V.map(row => (
                  <tr key={row.hp}>
                    <td style={{ ...cellStyle, fontWeight: 600 }}>{row.hp}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{(row.fla * 2.21).toFixed(1)}</td>
                    <td style={{ ...cellStyle, textAlign: 'center', color: '#FACC15', fontWeight: 600 }}>{row.fla}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{(row.fla * 0.8).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === '1ph' && (
        <div className="card" style={{ padding: '0.75rem' }}>
          <h3 style={{ margin: '0 0 4px' }}>Single-Phase Motor FLA</h3>
          <p className="text-secondary" style={{ fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
            NEC Table 430.248
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <th style={{ ...headerStyle, textAlign: 'left' }}>HP</th>
                  <th style={{ ...headerStyle, textAlign: 'center' }}>115V</th>
                  <th style={{ ...headerStyle, textAlign: 'center', color: '#FACC15' }}>230V</th>
                </tr>
              </thead>
              <tbody>
                {SINGLE_PHASE.map(row => (
                  <tr key={row.hp}>
                    <td style={{ ...cellStyle, fontWeight: 600 }}>{row.hp}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{row.fla_115}</td>
                    <td style={{ ...cellStyle, textAlign: 'center', color: '#FACC15', fontWeight: 600 }}>{row.fla_230}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="warning-box" style={{ fontSize: '0.8125rem' }}>
        <strong>Sizing rules (NEC 430):</strong>
        <ul style={{ margin: '4px 0 0 16px', listStyle: 'disc' }}>
          <li>Conductor: 125% of FLA (NEC 430.22)</li>
          <li>Overload: 115-125% of nameplate FLA (NEC 430.32)</li>
          <li>Branch circuit protection (inverse time breaker): 250% of FLA (NEC 430.52)</li>
          <li>Branch circuit protection (dual element fuse): 175% of FLA</li>
        </ul>
      </div>
    </div>
  );
}
