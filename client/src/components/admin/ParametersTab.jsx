import { useState, useEffect } from 'react';

export default function ParametersTab() {
  const [params, setParams] = useState([]);
  const [form, setForm] = useState({ name: '', label: '', type: 'text', scope: 'log' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function fetchParams() {
    const res = await fetch('/api/parameters');
    setParams(await res.json());
  }

  useEffect(() => { fetchParams(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.label.trim()) return setError('Name and label are required.');
    if (!/^[a-z_][a-z0-9_]*$/.test(form.name)) return setError('Name must be lowercase letters, numbers, and underscores only.');
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/parameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create parameter');
      } else {
        setForm({ name: '', label: '', type: 'text', scope: 'log' });
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
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
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
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {list.map(p => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">{p.name}</td>
                    <td className="px-4 py-2 text-gray-700">{p.label}</td>
                    <td className="px-4 py-2 text-gray-500">{p.type}</td>
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
