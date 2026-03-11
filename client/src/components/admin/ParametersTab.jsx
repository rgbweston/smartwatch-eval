import { useState, useEffect } from 'react';

function BoolToggle({ value, onSave }) {
  const isOn = value === 'true' || value === true;
  return (
    <button
      onClick={() => onSave(isOn ? 'false' : 'true')}
      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
        isOn ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      {isOn ? 'On' : 'Off'}
    </button>
  );
}

function SelectCell({ value, options, onSave }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onSave(e.target.value)}
      className="border border-gray-200 rounded px-1 py-0.5 text-xs text-gray-700 focus:outline-none"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function DeviceModelDefaultsSection({ logParams }) {
  const [deviceModels, setDeviceModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [overrides, setOverrides] = useState({});

  async function fetchDeviceModels() {
    const res = await fetch('/api/device-models');
    const rows = await res.json();
    setDeviceModels(rows);
    if (rows.length > 0 && !selectedModel) setSelectedModel(rows[0].device_model);
  }

  async function fetchOverrides(model) {
    if (!model) return;
    const res = await fetch(`/api/device-model-configs?device_model=${encodeURIComponent(model)}`);
    const rows = await res.json();
    const map = {};
    for (const r of rows) map[r.param_name] = r.value;
    setOverrides(map);
  }

  useEffect(() => { fetchDeviceModels(); }, []);
  useEffect(() => { fetchOverrides(selectedModel); }, [selectedModel]);

  async function handleSet(paramName, value) {
    await fetch('/api/device-model-configs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_model: selectedModel, param_name: paramName, value })
    });
    fetchOverrides(selectedModel);
  }

  async function handleReset(paramName) {
    await fetch(`/api/device-model-configs/${encodeURIComponent(selectedModel)}/${encodeURIComponent(paramName)}`, {
      method: 'DELETE'
    });
    fetchOverrides(selectedModel);
  }

  if (deviceModels.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 text-sm">Device Model Defaults</h3>
        <select
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
          className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none"
        >
          {deviceModels.map(m => (
            <option key={m.device_model} value={m.device_model}>{m.device_model}</option>
          ))}
        </select>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
          <tr>
            <th className="px-4 py-2 text-left">Sensor</th>
            <th className="px-4 py-2 text-left">Value</th>
            <th className="px-4 py-2 text-left w-16"></th>
          </tr>
        </thead>
        <tbody>
          {logParams.map(p => {
            const isOverridden = p.name in overrides;
            const displayValue = isOverridden ? overrides[p.name] : p.default_value;
            const options = p.options ? JSON.parse(p.options) : [];
            return (
              <tr key={p.name} className="border-t border-gray-100">
                <td className={`px-4 py-2 ${isOverridden ? 'text-gray-800' : 'text-gray-400'}`}>
                  {p.label}
                </td>
                <td className="px-4 py-2">
                  {p.type === 'boolean' ? (
                    <span className={isOverridden ? '' : 'opacity-50'}>
                      <BoolToggle value={displayValue} onSave={v => handleSet(p.name, v)} />
                    </span>
                  ) : p.type === 'select' ? (
                    <span className={isOverridden ? '' : 'opacity-50'}>
                      <SelectCell value={displayValue} options={options} onSave={v => handleSet(p.name, v)} />
                    </span>
                  ) : (
                    <span className={`text-xs ${isOverridden ? 'text-gray-700' : 'text-gray-400'}`}>
                      {displayValue}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {isOverridden && (
                    <button
                      onClick={() => handleReset(p.name)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Reset
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

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
      <DeviceModelDefaultsSection logParams={logParams} />

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
