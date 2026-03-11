import { useState, useEffect } from 'react';
import { MST_COLORS } from '../../constants/mst';

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

function SensorConfigModal({ participant, logParams, onClose, onSaved }) {
  const [draft, setDraft] = useState({});
  const [deviceCfg, setDeviceCfg] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load participant's existing _sensor_config
    const meta = JSON.parse(participant.metadata || '{}');
    setDraft(meta._sensor_config || {});

    // Load device model overrides
    fetch(`/api/device-model-configs?device_model=${encodeURIComponent(participant.device_model)}`)
      .then(r => r.json())
      .then(rows => {
        const map = {};
        for (const r of rows) map[r.param_name] = r.value;
        setDeviceCfg(map);
      });
  }, [participant]);

  function getEffective(paramName, globalDefault) {
    if (paramName in draft) return draft[paramName];
    if (paramName in deviceCfg) return deviceCfg[paramName];
    return globalDefault;
  }

  function setValue(paramName, value) {
    setDraft(d => ({ ...d, [paramName]: value }));
  }

  function resetParam(paramName) {
    setDraft(d => {
      const next = { ...d };
      delete next[paramName];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/participants/${participant.participant_code}/sensor-config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft)
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Sensor Config — {participant.participant_code}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{participant.device_model}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left">Sensor</th>
                <th className="px-4 py-2 text-left">Value</th>
                <th className="px-4 py-2 text-left w-16"></th>
              </tr>
            </thead>
            <tbody>
              {logParams.map(p => {
                const effective = getEffective(p.name, p.default_value);
                const isOverridden = p.name in draft;
                const isDeviceOverridden = !isOverridden && p.name in deviceCfg;
                const options = p.options ? JSON.parse(p.options) : [];
                return (
                  <tr key={p.name} className="border-t border-gray-100">
                    <td className="px-4 py-2 text-gray-700">
                      <span className="flex items-center gap-1.5">
                        {isOverridden && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block flex-shrink-0" title="Participant override" />
                        )}
                        {isDeviceOverridden && (
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block flex-shrink-0" title="Device model override" />
                        )}
                        {!isOverridden && !isDeviceOverridden && (
                          <span className="w-1.5 h-1.5 rounded-full bg-transparent inline-block flex-shrink-0" />
                        )}
                        {p.label}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {p.type === 'boolean' ? (
                        <BoolToggle value={effective} onSave={v => setValue(p.name, v)} />
                      ) : p.type === 'select' ? (
                        <SelectCell value={effective} options={options} onSave={v => setValue(p.name, v)} />
                      ) : (
                        <InlineEdit value={effective} type={p.type} onSave={v => setValue(p.name, v)} />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isOverridden && (
                        <button
                          onClick={() => resetParam(p.name)}
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
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" /> participant override</span>
            {' · '}
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" /> device default</span>
          </p>
          <button
            onClick={save}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ParticipantsTab() {
  const [participants, setParticipants] = useState([]);
  const [paramDefs, setParamDefs] = useState([]);
  const [logParams, setLogParams] = useState([]);
  const [sensorModal, setSensorModal] = useState(null); // participant object or null

  async function fetchAll() {
    const [pRes, dRes] = await Promise.all([
      fetch('/api/participants'),
      fetch('/api/parameters')
    ]);
    setParticipants(await pRes.json());
    const allParams = await dRes.json();
    setParamDefs(allParams.filter(p => p.scope === 'participant'));
    setLogParams(allParams.filter(p => p.scope === 'log'));
  }

  useEffect(() => { fetchAll(); }, []);

  async function deleteParticipant(code) {
    if (!confirm(`Delete participant "${code}"? This cannot be undone.`)) return;
    await fetch(`/api/participants/${code}`, { method: 'DELETE' });
    fetchAll();
  }

  async function saveMetadata(code, key, value) {
    await fetch(`/api/participants/${code}/metadata`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value })
    });
    fetchAll();
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Code</th>
              <th className="px-4 py-2 text-left">MST</th>
              <th className="px-4 py-2 text-left">Device</th>
              {paramDefs.map(p => (
                <th key={p.id} className="px-4 py-2 text-left whitespace-nowrap">{p.label}</th>
              ))}
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {participants.length === 0 ? (
              <tr><td colSpan={4 + paramDefs.length} className="px-4 py-8 text-center text-gray-400">No participants yet.</td></tr>
            ) : participants.map(p => {
              const meta = JSON.parse(p.metadata || '{}');
              return (
                <tr key={p.participant_code} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{p.participant_code}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border border-gray-300 inline-block"
                        style={{ backgroundColor: MST_COLORS[p.mst_group] }}
                      />
                      {p.mst_group}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{p.device_model}</td>
                  {paramDefs.map(d => {
                    const val = meta[d.name];
                    const save = v => saveMetadata(p.participant_code, d.name, v);
                    if (d.type === 'boolean') {
                      return (
                        <td key={d.id} className="px-4 py-2">
                          <BoolToggle value={val} onSave={save} />
                        </td>
                      );
                    }
                    if (d.type === 'select') {
                      const options = JSON.parse(d.options || '[]');
                      return (
                        <td key={d.id} className="px-4 py-2">
                          <SelectCell value={val} options={options} onSave={save} />
                        </td>
                      );
                    }
                    return (
                      <td key={d.id} className="px-4 py-2">
                        <InlineEdit value={val} type={d.type} onSave={save} />
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setSensorModal(p)}
                        className="text-blue-500 hover:text-blue-700 text-xs"
                      >
                        Sensors
                      </button>
                      <button
                        onClick={() => deleteParticipant(p.participant_code)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sensorModal && (
        <SensorConfigModal
          participant={sensorModal}
          logParams={logParams}
          onClose={() => setSensorModal(null)}
          onSaved={fetchAll}
        />
      )}
    </>
  );
}
