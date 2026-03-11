import { useState, useEffect } from 'react';

export default function ParametersTab() {
  const [params, setParams] = useState([]);
  const [form, setForm] = useState({ name: '', label: '', type: 'text', scope: 'log', default_value: '', options_raw: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function fetchParams() {
    const res = await fetch('/api/parameters');
    setParams(await res.json());
  }

  useEffect(() => { fetchParams(); }, []);

  function handleTypeChange(newType) {
    setForm(f => ({ ...f, type: newType, default_value: '', options_raw: '' }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.label.trim()) return setError('Name and label are required.');
    if (!/^[a-z_][a-z0-9_]*$/.test(form.name)) return setError('Name must be lowercase letters, numbers, and underscores only.');

    let options = null;
    if (form.type === 'select') {
      const parts = form.options_raw.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length === 0) return setError('Options are required for select type.');
      options = JSON.stringify(parts);
    }

    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/parameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          label: form.label,
          type: form.type,
          scope: form.scope,
          default_value: form.default_value || null,
          options
        })
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create parameter');
      } else {
        setForm({ name: '', label: '', type: 'text', scope: 'log', default_value: '', options_raw: '' });
        fetchParams();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this parameter? Existing data in JSON blobs will remain but won\'t be shown.')) return;
    await fetch(`/api/parameters/${id}`, { method: 'DELETE' });
    fetchParams();
  }

  const participantParams = params.filter(p => p.scope === 'participant');
  const logParams = params.filter(p => p.scope === 'log');

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Add Parameter</h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Field Name (snake_case)</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. strap_material"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Display Label</label>
            <input
              type="text"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Strap Material"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              value={form.type}
              onChange={e => handleTypeChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="select">Select</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Scope</label>
            <select
              value={form.scope}
              onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="log">Per-log</option>
              <option value="participant">Per-participant</option>
            </select>
          </div>

          {/* Options field for select type */}
          {form.type === 'select' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Options (comma-separated)</label>
              <input
                type="text"
                value={form.options_raw}
                onChange={e => setForm(f => ({ ...f, options_raw: e.target.value }))}
                placeholder="e.g. All day, Sleep Only, On Demand"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Default value field */}
          {(form.type === 'boolean' || form.type === 'select') && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Default Value</label>
              {form.type === 'boolean' ? (
                <select
                  value={form.default_value}
                  onChange={e => setForm(f => ({ ...f, default_value: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— no default —</option>
                  <option value="true">On (true)</option>
                  <option value="false">Off (false)</option>
                </select>
              ) : (
                <select
                  value={form.default_value}
                  onChange={e => setForm(f => ({ ...f, default_value: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— no default —</option>
                  {form.options_raw.split(',').map(s => s.trim()).filter(Boolean).map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="sm:col-span-2">
            {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Add Parameter
            </button>
          </div>
        </form>
      </div>

      {/* Existing parameters */}
      {[['Per-log Parameters', logParams], ['Per-participant Parameters', participantParams]].map(([title, list]) => (
        <div key={title} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
          </div>
          {list.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">None defined yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Label</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Default</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {list.map(p => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">{p.name}</td>
                    <td className="px-4 py-2 text-gray-700">{p.label}</td>
                    <td className="px-4 py-2 text-gray-500">{p.type}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {p.default_value != null ? (
                        p.type === 'boolean' ? (
                          <span className={`px-2 py-0.5 rounded-full font-medium ${
                            p.default_value === 'true'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {p.default_value === 'true' ? 'On' : 'Off'}
                          </span>
                        ) : p.default_value
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
