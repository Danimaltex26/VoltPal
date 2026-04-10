import { useState, useEffect } from 'react';
import { apiGet, apiPatch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const SPECIALTIES = ['Industrial', 'Commercial', 'Residential', 'Controls/PLC', 'Motor/VFD', 'High Voltage', 'Fire Alarm', 'Solar/PV'];
const CERTIFICATIONS = ['Journeyman', 'Master Electrician', 'Apprentice', 'NFPA 70E', 'OSHA 10', 'OSHA 30', 'NEC Code Specialist', 'Other'];

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  const fetchProfile = async () => {
    try {
      const data = await apiGet('/profile');
      setProfile(data);
      setNameValue(data.display_name || '');
    } catch (err) {
      setError(err.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const saveName = async () => {
    try {
      await apiPatch('/profile', { display_name: nameValue });
      setEditingName(false);
      fetchProfile();
    } catch (err) {
      setError(err.message || 'Save failed.');
    }
  };

  const toggleSpecialty = async (s) => {
    const current = profile.specialties || [];
    const updated = current.includes(s) ? current.filter((x) => x !== s) : [...current, s];
    try {
      await apiPatch('/profile', { specialties: updated });
      fetchProfile();
    } catch (err) {
      setError(err.message || 'Update failed.');
    }
  };

  const toggleCert = async (c) => {
    const current = profile.certifications || [];
    const updated = current.includes(c) ? current.filter((x) => x !== c) : [...current, c];
    try {
      await apiPatch('/profile', { certifications: updated });
      fetchProfile();
    } catch (err) {
      setError(err.message || 'Update failed.');
    }
  };

  const subBadge = (tier) => {
    const map = { pro: 'badge-green', premium: 'badge-blue', free: 'badge-gray' };
    return map[(tier || '').toLowerCase()] || 'badge-gray';
  };

  const usageBar = (used, limit) => {
    const pct = Math.min((used / limit) * 100, 100);
    return (
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 8, overflow: 'hidden', marginTop: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#FACC15', borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
    );
  };

  if (loading) return <div className="page"><p className="text-center text-secondary">Loading...</p></div>;

  const p = profile || {};
  const usage = p.usage || {};
  const isFree = !p.subscription || p.subscription === 'free';

  return (
    <div className="page">
      <h2 className="page-header">Profile</h2>

      {error && <div className="error-banner">{error}</div>}

      {/* Name / Email / Subscription */}
      <div className="card">
        <div className="row-between" style={{ alignItems: 'center' }}>
          {editingName ? (
            <div className="row" style={{ gap: 8, flex: 1 }}>
              <input className="input" style={{ flex: 1 }} value={nameValue} onChange={(e) => setNameValue(e.target.value)} />
              <button className="btn btn-primary" onClick={saveName}>Save</button>
              <button className="btn btn-ghost" onClick={() => setEditingName(false)}>Cancel</button>
            </div>
          ) : (
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{p.display_name || user?.email || 'User'}</h3>
              <button className="btn btn-ghost" onClick={() => { setNameValue(p.display_name || ''); setEditingName(true); }} style={{ padding: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </button>
            </div>
          )}
        </div>
        <p className="text-secondary" style={{ margin: '4px 0 0' }}>{user?.email || p.email}</p>
        <div style={{ marginTop: 8 }}>
          <span className={`badge ${subBadge(p.subscription)}`}>{(p.subscription || 'Free').toUpperCase()}</span>
        </div>
      </div>

      {/* Usage -- free tier only */}
      {isFree && (
        <div className="card">
          <h4 style={{ margin: '0 0 12px' }}>Usage</h4>
          <div className="stack-sm">
            <div>
              <div className="row-between"><span>Electrical Analyses</span><span>{usage.electrical_analyses || 0}/2</span></div>
              {usageBar(usage.electrical_analyses || 0, 2)}
            </div>
            <div>
              <div className="row-between"><span>Troubleshoot</span><span>{usage.troubleshoot || 0}/2</span></div>
              {usageBar(usage.troubleshoot || 0, 2)}
            </div>
            <div>
              <div className="row-between"><span>AI Reference</span><span>{usage.ai_reference || 0}/5</span></div>
              {usageBar(usage.ai_reference || 0, 5)}
            </div>
          </div>
        </div>
      )}

      {/* Service Specialties */}
      <div className="card">
        <h4 style={{ margin: '0 0 12px' }}>Specialties</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SPECIALTIES.map((s) => {
            const active = (p.specialties || []).includes(s);
            return (
              <button
                key={s}
                className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 13 }}
                onClick={() => toggleSpecialty(s)}
              >
                {active ? `- ${s}` : `+ ${s}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Certifications */}
      <div className="card">
        <h4 style={{ margin: '0 0 12px' }}>Certifications</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CERTIFICATIONS.map((c) => {
            const active = (p.certifications || []).includes(c);
            return (
              <button
                key={c}
                className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 13 }}
                onClick={() => toggleCert(c)}
              >
                {active ? `- ${c}` : `+ ${c}`}
              </button>
            );
          })}
        </div>
      </div>

      <div className="divider" />

      <button className="btn btn-danger btn-block" onClick={signOut}>
        Sign Out
      </button>
    </div>
  );
}
