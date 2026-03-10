import { useState } from 'react';
import { MST_COLORS } from '../constants/mst';
import ProfilePicker from './ProfilePicker';

const SHIFT_TYPES = ['Day', 'Night', 'Long Day'];

export default function LogScreen({ profile, profiles, activeProfileIndex, onSwitchProfile, onAddNew }) {
  const [battery, setBattery] = useState('');
  const [shiftType, setShiftType] = useState('Day');
  const [gps, setGps] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [aod, setAod] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState('');
  const [showPicker, setShowPicker] = useState(false);

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
          shift_type: shiftType,
          gps_enabled: gps,
          notifications_enabled: notifications,
          always_on_display: aod,
          device_model: profile.deviceModel
        })
      });
      if (!res.ok) throw new Error('Failed to log');
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setFlash(`Logged: ${pct}% at ${time}`);
      setBattery('');
      setGps(false);
      setNotifications(false);
      setAod(false);
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
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 mb-4 shadow-sm">
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

            {/* Shift type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shift Type
              </label>
              <div className="flex gap-2">
                {SHIFT_TYPES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setShiftType(s)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      shiftType === s
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              {[
                { label: 'GPS', value: gps, setter: setGps },
                { label: 'Notifications', value: notifications, setter: setNotifications },
                { label: 'Always-on Display', value: aod, setter: setAod }
              ].map(({ label, value, setter }) => (
                <label key={label} className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-700">{label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={value}
                    onClick={() => setter(v => !v)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </label>
              ))}
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
