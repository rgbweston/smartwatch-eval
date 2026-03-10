import { useState } from 'react';
import MSTSwatch from './MSTSwatch';

export default function OnboardingScreen({ onSave }) {
  const [participantCode, setParticipantCode] = useState('');
  const [mstGroup, setMstGroup] = useState(null);
  const [deviceModel, setDeviceModel] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!participantCode.trim()) return setError('Please enter a participant code.');
    if (!mstGroup) return setError('Please select your skin tone.');
    if (!deviceModel.trim()) return setError('Please enter your device model.');
    setError('');
    onSave({
      participantCode: participantCode.trim().toUpperCase(),
      mstGroup,
      deviceModel: deviceModel.trim()
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-6">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Welcome</h1>
        <p className="text-sm text-gray-500 mb-6">Set up your profile to start logging battery data.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Participant Code
            </label>
            <input
              type="text"
              value={participantCode}
              onChange={e => setParticipantCode(e.target.value)}
              placeholder="e.g. P001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoCapitalize="characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monk Skin Tone
            </label>
            <MSTSwatch selected={mstGroup} onChange={setMstGroup} />
            {mstGroup && (
              <p className="text-center text-xs text-gray-500 mt-2">Selected: MST {mstGroup}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device Model
            </label>
            <input
              type="text"
              value={deviceModel}
              onChange={e => setDeviceModel(e.target.value)}
              placeholder="e.g. Garmin Venu 3"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-3 transition-colors"
          >
            Save Profile
          </button>
        </form>
      </div>
    </div>
  );
}
