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
  const [spo2, setSpo2] = useState(null);
  const [showSpo2Popup, setShowSpo2Popup] = useState(false);
  const [spo2Selected, setSpo2Selected] = useState('On Demand');
  const [showHowToFind, setShowHowToFind] = useState(false);

  useEffect(() => {
    const times = JSON.parse(localStorage.getItem('last_log_times') || '{}');
    setLastLogTime(times[profile.participantCode] || null);
  }, [profile.participantCode]);

  useEffect(() => {
    async function loadSpo2() {
      try {
        const res = await fetch(`/api/logs?participant_code=${profile.participantCode}`);
        if (!res.ok) throw new Error();
        const logs = await res.json();
        if (logs.length > 0) {
          const meta = JSON.parse(logs[0].metadata || '{}');
          setSpo2(meta.spo2 || 'On Demand');
        } else {
          setSpo2('On Demand');
        }
      } catch {
        setSpo2('On Demand');
      }
    }
    loadSpo2();
  }, [profile.participantCode]);

  async function handleSpo2Save() {
    try {
      await fetch(`/api/participants/${profile.participantCode}/sensor-config-field`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'spo2', value: spo2Selected })
      });
      setSpo2(spo2Selected);
      setShowSpo2Popup(false);
    } catch {
      // silently ignore — non-critical
    }
  }

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
          <h1 className="text-lg font-bold text-gray-800 mb-2">Log Battery</h1>

          {spo2 !== null && (
            <div className="mb-4">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">SpO2: {spo2}</span>
                <button
                  type="button"
                  onClick={() => { setSpo2Selected(spo2); setShowSpo2Popup(true); setShowHowToFind(false); }}
                  className="text-xs text-blue-500 underline"
                >
                  change
                </button>
              </div>
              {showSpo2Popup && (
                <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <select
                    value={spo2Selected}
                    onChange={e => setSpo2Selected(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2"
                  >
                    <option>All day</option>
                    <option>Sleep Only</option>
                    <option>On Demand</option>
                  </select>
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() => setShowHowToFind(v => !v)}
                      className="text-xs text-gray-400 underline"
                    >
                      {showHowToFind ? 'Hide' : 'How to find this'}
                    </button>
                    {showHowToFind && (
                      <p className="text-xs text-gray-500 mt-1">
                        Navigate to <strong>Settings → Watch Sensors / Health &amp; Wellness → Pulse Oximeter</strong> to check your current setting.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSpo2Save}
                      className="text-xs bg-blue-600 text-white rounded px-3 py-1"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSpo2Popup(false)}
                      className="text-xs text-gray-500 rounded px-3 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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
