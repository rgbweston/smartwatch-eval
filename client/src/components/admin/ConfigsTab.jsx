import { useState, useEffect } from 'react';

const PARAM_OPTIONS = ['Unknown'];

function InlineEdit({ value, onSave, placeholder = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  if (!editing) {
    return (
      <span
        className="cursor-pointer hover:bg-blue-50 px-1 rounded min-w-[2rem] inline-block text-gray-700"
        onClick={() => { setDraft(value ?? ''); setEditing(true); }}
        title="Click to edit"
      >
        {value != null && value !== '' ? String(value) : <span className="text-gray-400">{placeholder || '—'}</span>}
      </span>
    );
  }

  return (
    <input
      autoFocus
      type="text"
      value={draft}
      placeholder={placeholder}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { setEditing(false); onSave(draft); }}
      onKeyDown={e => {
        if (e.key === 'Enter') { setEditing(false); onSave(draft); }
        if (e.key === 'Escape') setEditing(false);
      }}
      className="border border-blue-400 rounded px-1 py-0.5 text-sm w-48 focus:outline-none"
    />
  );
}

export default function ConfigsTab() {
  const [configs, setConfigs] = useState([]);
  const [logParams, setLogParams] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newConfig, setNewConfig] = useState({ name: '', start_date: '' });

  async function fetchAll() {
    const [cfgRes, paramRes] = await Promise.all([
      fetch('/api/sampling-configs'),
      fetch('/api/parameters')
    ]);
    const cfgData = await cfgRes.json();
    const paramData = await paramRes.json();
    setConfigs(cfgData);
    setLogParams(paramData.filter(p => p.scope === 'log'));
  }

  useEffect(() => { fetchAll(); }, []);

  async function patchConfig(id, body) {
    await fetch(`/api/sampling-configs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    fetchAll();
  }

  async function deleteConfig(id) {
    if (!confirm('Delete this config? This cannot be undone.')) return;
    const res = await fetch(`/api/sampling-configs/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Could not delete config');
      return;
    }
    fetchAll();
  }

  async function submitAdd(e) {
    e.preventDefault();
    await fetch('/api/sampling-configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig)
    });
    setShowAdd(false);
    setNewConfig({ name: '', start_date: '' });
    fetchAll();
  }

  function formatDate(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Sampling Configs</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg"
        >
          + Add Config
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white border border-blue-200 rounded-xl p-4">
          <form onSubmit={submitAdd} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                type="text"
                required
                value={newConfig.name}
                onChange={e => setNewConfig(n => ({ ...n, name: e.target.value }))}
                placeholder="Config 2"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start date</label>
              <input
                type="datetime-local"
                required
                value={newConfig.start_date}
                onChange={e => setNewConfig(n => ({ ...n, start_date: new Date(e.target.value).toISOString() }))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-sm font-medium">
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Config cards */}
      {configs.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No configs yet.</p>
      ) : (
        <div className="space-y-3">
          {configs.map(cfg => (
            <div key={cfg.id} className="bg-white border border-gray-200 rounded-xl p-4">
              {/* Card header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="font-semibold text-gray-800">
                  <InlineEdit
                    value={cfg.name}
                    onSave={v => patchConfig(cfg.id, { name: v })}
                  />
                </span>
                <span className="text-xs text-gray-500">
                  <InlineEdit
                    value={cfg.start_date}
                    placeholder="start date"
                    onSave={v => patchConfig(cfg.id, { start_date: v })}
                  />
                  {' → '}
                  <InlineEdit
                    value={cfg.end_date || ''}
                    placeholder="ongoing"
                    onSave={v => patchConfig(cfg.id, { end_date: v || null })}
                  />
                </span>
                <span className="text-xs text-gray-400 ml-1">
                  ({formatDate(cfg.start_date)} – {cfg.end_date ? formatDate(cfg.end_date) : 'ongoing'})
                </span>
                {configs.length > 1 && (
                  <button
                    onClick={() => deleteConfig(cfg.id)}
                    className="ml-auto text-xs text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Param values */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {logParams.map(p => (
                  <div key={p.name} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 truncate flex-1" title={p.label}>{p.label}:</span>
                    <select
                      value={cfg.values?.[p.name] ?? 'Unknown'}
                      onChange={e => patchConfig(cfg.id, { values: { [p.name]: e.target.value } })}
                      className="border border-gray-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {PARAM_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
