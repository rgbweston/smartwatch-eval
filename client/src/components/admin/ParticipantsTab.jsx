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

export default function ParticipantsTab() {
  const [participants, setParticipants] = useState([]);
  const [paramDefs, setParamDefs] = useState([]);

  async function fetchAll() {
    const [pRes, dRes] = await Promise.all([
      fetch('/api/participants'),
      fetch('/api/parameters')
    ]);
    setParticipants(await pRes.json());
    const allParams = await dRes.json();
    setParamDefs(allParams.filter(p => p.scope === 'participant'));
  }

  useEffect(() => { fetchAll(); }, []);

  async function saveMetadata(code, key, value) {
    await fetch(`/api/participants/${code}/metadata`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value })
    });
    fetchAll();
  }

  return (
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
          </tr>
        </thead>
        <tbody>
          {participants.length === 0 ? (
            <tr><td colSpan={3 + paramDefs.length} className="px-4 py-8 text-center text-gray-400">No participants yet.</td></tr>
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
                {paramDefs.map(d => (
                  <td key={d.id} className="px-4 py-2">
                    <InlineEdit
                      value={meta[d.name]}
                      type={d.type}
                      onSave={v => saveMetadata(p.participant_code, d.name, v)}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
