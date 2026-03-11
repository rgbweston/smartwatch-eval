import { useState, useEffect } from 'react';

function InlineEdit({ value, onSave, type = 'text' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  if (!editing) {
    return (
      <span
        className="cursor-pointer hover:bg-blue-50 px-1 rounded min-w-[2rem] inline-block text-gray-700"
        onClick={() => { setDraft(value ?? ''); setEditing(true); }}
        title="Click to edit"
      >
        {value != null && value !== '' ? String(value) : <span className="text-gray-300">—</span>}
      </span>
    );
  }

  return (
    <input
      autoFocus
      type={type === 'number' ? 'number' : 'text'}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { setEditing(false); onSave(draft); }}
      onKeyDown={e => {
        if (e.key === 'Enter') { setEditing(false); onSave(draft); }
        if (e.key === 'Escape') setEditing(false);
      }}
      className="border border-blue-400 rounded px-1 py-0.5 text-sm w-24 focus:outline-none"
    />
  );
}

export default function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [paramDefs, setParamDefs] = useState([]);
  const [filters, setFilters] = useState({ participant_code: '', mst_group: '', source: '' });
  const [showBacklog, setShowBacklog] = useState(false);
  const [backlog, setBacklog] = useState({
    participant_code: '', mst_group: '', battery_percentage: '',
    device_model: '', timestamp: ''
  });

  async function fetchAll() {
    const params = new URLSearchParams();
    if (filters.participant_code) params.set('participant_code', filters.participant_code);
    if (filters.mst_group) params.set('mst_group', filters.mst_group);
    if (filters.source) params.set('source', filters.source);

    const [logsRes, paramsRes] = await Promise.all([
      fetch(`/api/logs?${params}`),
      fetch('/api/parameters')
    ]);
    setLogs(await logsRes.json());
    const allParams = await paramsRes.json();
    setParamDefs(allParams.filter(p => p.scope === 'log'));
  }

  useEffect(() => { fetchAll(); }, [filters]);

  async function saveMetadata(logId, key, value) {
    await fetch(`/api/logs/${logId}/metadata`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value })
    });
    fetchAll();
  }

  async function submitBacklog(e) {
    e.preventDefault();
    await fetch('/api/logs/backlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...backlog,
        mst_group: Number(backlog.mst_group),
        battery_percentage: Number(backlog.battery_percentage)
      })
    });
    setShowBacklog(false);
    setBacklog({
      participant_code: '', mst_group: '', battery_percentage: '',
      device_model: '', timestamp: ''
    });
    fetchAll();
  }

  return (
    <div className="space-y-4">
      {/* Filters + actions */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Filter by code"
          value={filters.participant_code}
          onChange={e => setFilters(f => ({ ...f, participant_code: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
        />
        <select
          value={filters.mst_group}
          onChange={e => setFilters(f => ({ ...f, mst_group: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All MST</option>
          {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>MST {i+1}</option>)}
        </select>
        <select
          value={filters.source}
          onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All sources</option>
          <option value="participant">Participant</option>
          <option value="backlog">Backlog</option>
        </select>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowBacklog(true)}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg"
          >
            + Add Backlog
          </button>
          <a
            href="/api/logs/export"
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">MST</th>
              <th className="px-3 py-2 text-left">Battery</th>
              <th className="px-3 py-2 text-left">Device</th>
              <th className="px-3 py-2 text-left">Timestamp</th>
              <th className="px-3 py-2 text-left">Source</th>
              {paramDefs.map(p => (
                <th key={p.id} className="px-3 py-2 text-left whitespace-nowrap">{p.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={7 + paramDefs.length} className="px-4 py-8 text-center text-gray-400">No logs yet.</td></tr>
            ) : logs.map(log => {
              const meta = JSON.parse(log.metadata || '{}');
              return (
                <tr key={log.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400">{log.id}</td>
                  <td className="px-3 py-2 font-medium">{log.participant_code}</td>
                  <td className="px-3 py-2">{log.mst_group}</td>
                  <td className="px-3 py-2">{log.battery_percentage}%</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{log.device_model}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      log.source === 'backlog'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {log.source}
                    </span>
                  </td>
                  {paramDefs.map(p => (
                    <td key={p.id} className="px-3 py-2">
                      <InlineEdit
                        value={meta[p.name]}
                        type={p.type}
                        onSave={v => saveMetadata(log.id, p.name, v)}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Backlog modal */}
      {showBacklog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowBacklog(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-4">Add Backlog Entry</h3>
            <form onSubmit={submitBacklog} className="space-y-3">
              {[
                ['Participant Code', 'participant_code', 'text'],
                ['MST Group (1-10)', 'mst_group', 'number'],
                ['Battery %', 'battery_percentage', 'number'],
                ['Device Model', 'device_model', 'text'],
              ].map(([label, key, type]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type={type}
                    required
                    value={backlog[key]}
                    onChange={e => setBacklog(b => ({ ...b, [key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Timestamp</label>
                <input
                  type="datetime-local"
                  required
                  value={backlog.timestamp}
                  onChange={e => setBacklog(b => ({ ...b, timestamp: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBacklog(false)}
                  className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium"
                >
                  Add Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
