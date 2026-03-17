import { useState, useEffect } from 'react';

export default function MessagesTab() {
  const [announcements, setAnnouncements] = useState([]);
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [targetValue, setTargetValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) setAnnouncements(await res.json());
    } catch {}
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          target_type: targetType,
          target_value: targetType !== 'all' ? targetValue : undefined
        })
      });
      if (res.ok) {
        setMessage('');
        setTargetType('all');
        setTargetValue('');
        await load();
      }
    } catch {}
    setSubmitting(false);
  }

  async function handleDelete(id) {
    try {
      await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch {}
  }

  function targetBadge(a) {
    if (a.target_type === 'all') return 'Everyone';
    if (a.target_type === 'mst_group') return `MST ${a.target_value}`;
    return a.target_value;
  }

  return (
    <div className="space-y-6">
      {/* Active announcements */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Active Messages</h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-gray-400">No active messages.</p>
        ) : (
          <div className="space-y-2">
            {announcements.map(a => (
              <div key={a.id} className="flex items-start justify-between gap-3 border border-gray-100 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{a.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                      {targetBadge(a)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-xs text-red-500 hover:underline flex-shrink-0"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create form */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Send Message</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Message text…"
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            required
          />
          <div className="space-y-2">
            <select
              value={targetType}
              onChange={e => { setTargetType(e.target.value); setTargetValue(''); }}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Everyone</option>
              <option value="mst_group">MST Group</option>
              <option value="participant">Specific Participant</option>
            </select>
            {targetType === 'mst_group' && (
              <input
                type="number"
                min="1"
                max="10"
                value={targetValue}
                onChange={e => setTargetValue(e.target.value)}
                placeholder="MST group number"
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            )}
            {targetType === 'participant' && (
              <input
                type="text"
                value={targetValue}
                onChange={e => setTargetValue(e.target.value)}
                placeholder="Participant code"
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            )}
          </div>
          <button
            type="submit"
            disabled={submitting || !message.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {submitting ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
}
