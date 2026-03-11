import { useState, useEffect } from 'react';
import { MST_COLORS } from '../constants/mst';
import ProfilePicker from './ProfilePicker';

function formatTimeSince(isoTimestamp) {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return '< 1m ago';
  if (diffMins < 60) return `${diffMins}m ago`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours}h ${mins}m ago` : `${hours}h ago`;
}

export default function LogScreen({ profile, profiles, activeProfileIndex, onSwitchProfile, onAddNew }) {
  const [battery, setBattery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [lastLogTime, setLastLogTime] = useState(null);

  useEffect(() => {
    const times = JSON.parse(localStorage.getItem('last_log_times') || '{}');
    setLastLogTime(times[profile.participantCode] || null);
  }, [profile.participantCode]);

  async function handleSubmit(e) {
    e.preventDefault();
    const pct = parseInt(battery, 10);
    if (isNaN(pct) || pct < 0 || pct > 100) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_code: profile.participantCode,
          mst_group: profile.mstGroup,
          battery_percentage: pct,
          device_model: profile.deviceModel
        })
      });
      if (!res.ok) throw new Error('Failed to log');
      const now = new Date();
      const isoNow = now.toISOString();

      const times = JSON.parse(localStorage.getItem('last_log_times') || '{}');
      times[profile.participantCode] = isoNow;
      localStorage.setItem('last_log_times', JSON.stringify(times));
      setLastLogTime(isoNow);

      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setFlash(`Logged: ${pct}% at ${time}`);
      setBattery('');
      setTimeout(() => setFlash(''), 3000);
    } catch {
      setFlash('Error — please try again');
      setTimeout(() => setFlash(''), 3000);
    } finally {
      setSubmitting(false);
    }
  }

  const dotColor = MST_COLORS[profile.mstGroup];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {showPicker && (
        <ProfilePicker
          profiles={profiles}
          activeProfileIndex={activeProfileIndex}
          onSwitch={onSwitchProfile}
          onAddNew={onAddNew}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div className="w-full max-w-sm">
        {/* Banner */}
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 mb-1 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-4 h-4 rounded-full flex-shrink-0 border border-gray-300"
              style={{ backgroundColor: dotColor }}
            />
            <span className="text-sm font-medium text-gray-800 truncate">
              {profile.participantCode} · {profile.deviceModel} · MST {profile.mstGroup}
            </span>
          </div>
          <button
            onClick={() => setShowPicker(true)}
            className="text-xs text-blue-600 ml-2 flex-shrink-0 hover:underline"
          >
            Not you?
          </button>
        </div>

        {lastLogTime ? (
          <p className="text-xs text-gray-400 text-center mb-3">
            Last logged {formatTimeSince(lastLogTime)}
          </p>
        ) : (
          <div className="mb-4" />
        )}

        {/* Log form */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h1 className="text-lg font-bold text-gray-800 mb-5">Log Battery</h1>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Battery % */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Battery %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={battery}
                onChange={e => setBattery(e.target.value)}
                placeholder="0–100"
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-2xl text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                inputMode="numeric"
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !battery}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl py-4 text-lg transition-colors"
            >
              {submitting ? 'Saving…' : 'Submit'}
            </button>

            {/* Flash */}
            {flash && (
              <p className={`text-center text-sm font-medium ${flash.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
                {flash}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
