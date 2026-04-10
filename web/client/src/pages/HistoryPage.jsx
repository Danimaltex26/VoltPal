import { useState, useEffect } from 'react';
import { apiGet, apiPatch, apiDelete } from '../utils/api';

export default function HistoryPage() {
  const [tab, setTab] = useState('analyses');
  const [analyses, setAnalyses] = useState([]);
  const [troubleshoots, setTroubleshoots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [editing, setEditing] = useState({});
  const [editValues, setEditValues] = useState({});

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet('/history');
      setAnalyses(data.electrical_analyses || []);
      setTroubleshoots(data.troubleshoot_sessions || []);
    } catch (err) {
      setError(err.message || 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const startEdit = (item) => {
    setEditing((prev) => ({ ...prev, [item.id]: true }));
    setEditValues((prev) => ({ ...prev, [item.id]: { title: item.title || '', notes: item.notes || '' } }));
  };

  const cancelEdit = (id) => setEditing((prev) => ({ ...prev, [id]: false }));

  const saveEdit = async (id, type) => {
    try {
      const endpoint = type === 'analysis' ? `/history/analysis/${id}` : `/history/troubleshoot/${id}`;
      await apiPatch(endpoint, editValues[id]);
      setEditing((prev) => ({ ...prev, [id]: false }));
      fetchHistory();
    } catch (err) {
      setError(err.message || 'Save failed.');
    }
  };

  const handleDelete = async (id, type) => {
    if (!confirm('Delete this entry?')) return;
    try {
      const endpoint = type === 'analysis' ? `/history/analysis/${id}` : `/history/troubleshoot/${id}`;
      await apiDelete(endpoint);
      fetchHistory();
    } catch (err) {
      setError(err.message || 'Delete failed.');
    }
  };

  const markResolved = async (id) => {
    try {
      await apiPatch(`/history/troubleshoot/${id}/resolve`, {});
      fetchHistory();
    } catch (err) {
      setError(err.message || 'Update failed.');
    }
  };

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
      });
    } catch { return d; }
  };

  // Extract a summary from troubleshoot conversation JSON
  const getTroubleshootSummary = (item) => {
    if (!item.conversation_json || !Array.isArray(item.conversation_json)) return null;
    const assistant = item.conversation_json.find((m) => m.role === 'assistant');
    if (!assistant) return null;
    try {
      const parsed = JSON.parse(assistant.content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim());
      return parsed.plain_english_summary || null;
    } catch {
      return null;
    }
  };

  const renderAnalysis = (item) => {
    const isOpen = expanded[item.id];
    const isEditing = editing[item.id];

    return (
      <div key={item.id} className="card">
        <div className="expandable-header" onClick={() => toggle(item.id)}>
          <div style={{ flex: 1 }}>
            <div className="row-between">
              <strong>{item.title || 'Electrical Analysis'}</strong>
              <span className="text-secondary" style={{ fontSize: 13 }}>{formatDate(item.created_at)}</span>
            </div>
            <div className="row" style={{ gap: 6, marginTop: 4 }}>
              {item.analysis_type && <span className="badge badge-blue">{item.analysis_type}</span>}
              {item.confidence && <span className="badge badge-green">{item.confidence}</span>}
            </div>
          </div>
          <span style={{ color: '#6B6B73', fontSize: '1.25rem', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none', marginLeft: 8 }}>&#9662;</span>
        </div>

        {isOpen && (
          <div style={{ marginTop: 12 }}>
            {isEditing ? (
              <div className="stack-sm">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    className="input"
                    value={editValues[item.id]?.title || ''}
                    placeholder="e.g. Plant A motor fault"
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [item.id]: { ...prev[item.id], title: e.target.value } }))}
                  />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Add notes about this analysis..."
                    value={editValues[item.id]?.notes || ''}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [item.id]: { ...prev[item.id], notes: e.target.value } }))}
                  />
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => saveEdit(item.id, 'analysis')}>Save</button>
                  <button className="btn btn-ghost" onClick={() => cancelEdit(item.id)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                {item.diagnosis && (
                  <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 8 }}>{item.diagnosis}</p>
                )}
                {item.recommended_action && (
                  <div className="info-box" style={{ fontSize: '0.875rem', marginBottom: 8 }}>
                    <strong>Recommended:</strong> {item.recommended_action}
                  </div>
                )}
                {item.notes && (
                  <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: 8 }}>
                    <strong style={{ color: '#F5F5F5' }}>Notes:</strong> {item.notes}
                  </p>
                )}
                <div className="row" style={{ gap: 8, marginTop: 8 }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => startEdit(item)}>Edit</button>
                  <button className="btn btn-danger" onClick={() => handleDelete(item.id, 'analysis')}>Delete</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTroubleshoot = (item) => {
    const isOpen = expanded[item.id];
    const isEditing = editing[item.id];
    const summary = getTroubleshootSummary(item);

    return (
      <div key={item.id} className="card">
        <div className="expandable-header" onClick={() => toggle(item.id)}>
          <div style={{ flex: 1 }}>
            <div className="row-between">
              <strong>{item.title || item.symptom || 'Troubleshoot Session'}</strong>
              <span className="text-secondary" style={{ fontSize: 13 }}>{formatDate(item.created_at)}</span>
            </div>
            <div className="row" style={{ gap: 6, marginTop: 4 }}>
              {item.equipment_type && <span className="badge badge-blue">{item.equipment_type}</span>}
              {item.equipment_brand && <span className="badge badge-gray">{item.equipment_brand}</span>}
              {item.resolved ? <span className="badge badge-green">Resolved</span> : <span className="badge badge-amber">Open</span>}
            </div>
          </div>
          <span style={{ color: '#6B6B73', fontSize: '1.25rem', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none', marginLeft: 8 }}>&#9662;</span>
        </div>

        {isOpen && (
          <div style={{ marginTop: 12 }}>
            {isEditing ? (
              <div className="stack-sm">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    className="input"
                    value={editValues[item.id]?.title || ''}
                    placeholder="e.g. Building 3 VFD fault"
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [item.id]: { ...prev[item.id], title: e.target.value } }))}
                  />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Add notes about this session..."
                    value={editValues[item.id]?.notes || ''}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [item.id]: { ...prev[item.id], notes: e.target.value } }))}
                  />
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => saveEdit(item.id, 'troubleshoot')}>Save</button>
                  <button className="btn btn-ghost" onClick={() => cancelEdit(item.id)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                {item.symptom && (
                  <div style={{ marginBottom: 8, padding: '8px 0', borderBottom: '1px solid #2A2A2E' }}>
                    <span className="text-secondary" style={{ fontSize: '0.8125rem' }}>Symptom:</span>
                    <p style={{ fontSize: '0.9375rem' }}>{item.symptom}</p>
                  </div>
                )}
                {summary && (
                  <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 8 }}>{summary}</p>
                )}
                {item.notes && (
                  <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: 8 }}>
                    <strong style={{ color: '#F5F5F5' }}>Notes:</strong> {item.notes}
                  </p>
                )}
                <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => startEdit(item)}>Edit</button>
                  {!item.resolved && (
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => markResolved(item.id)}>Resolve</button>
                  )}
                  <button className="btn btn-danger" onClick={() => handleDelete(item.id, 'troubleshoot')}>Delete</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page">
      <h2 className="page-header">History</h2>

      {error && <div className="error-banner">{error}</div>}

      <div className="toggle-group" style={{ marginBottom: '1rem' }}>
        <button className={`toggle-option ${tab === 'analyses' ? 'active' : ''}`} onClick={() => setTab('analyses')}>
          Analyses ({analyses.length})
        </button>
        <button className={`toggle-option ${tab === 'troubleshoot' ? 'active' : ''}`} onClick={() => setTab('troubleshoot')}>
          Troubleshoot ({troubleshoots.length})
        </button>
      </div>

      {loading && (
        <div className="spinner-container">
          <div className="spinner" />
          <p className="spinner-message">Loading history...</p>
        </div>
      )}

      {!loading && tab === 'analyses' && (
        analyses.length === 0
          ? <p className="text-center text-secondary" style={{ padding: '2rem 0' }}>No electrical analyses yet.</p>
          : <div className="stack">{analyses.map(renderAnalysis)}</div>
      )}

      {!loading && tab === 'troubleshoot' && (
        troubleshoots.length === 0
          ? <p className="text-center text-secondary" style={{ padding: '2rem 0' }}>No troubleshoot sessions yet.</p>
          : <div className="stack">{troubleshoots.map(renderTroubleshoot)}</div>
      )}
    </div>
  );
}
