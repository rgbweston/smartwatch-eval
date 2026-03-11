import { useState, useEffect } from 'react';
import MSTSwatch from './MSTSwatch';
import { generate } from '../constants/username';

const PRESET_MODELS = ['Vivoactive 5', 'Vivoactive 6', 'Venu 3S', 'Venu 4'];

export default function OnboardingScreen({ onSave }) {
  const [favouriteNumber, setFavouriteNumber] = useState('');
  const [username, setUsername] = useState('');
  const [mstGroup, setMstGroup] = useState(null);
  const [deviceModel, setDeviceModel] = useState('');
  const [deviceModels, setDeviceModels] = useState(PRESET_MODELS);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customModelDraft, setCustomModelDraft] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const customModels = JSON.parse(localStorage.getItem('custom_device_models') || '[]');
    fetch('/api/device-models')
      .then(r => r.json())
      .then(serverModels => {
        const countMap = {};
        serverModels.forEach(m => { countMap[m.device_model] = m.count; });

        const sortedPresets = [...PRESET_MODELS].sort((a, b) =>
          (countMap[b] || 0) - (countMap[a] || 0)
        );

        const unknownFromServer = serverModels
          .filter(m => !PRESET_MODELS.includes(m.device_model) && !customModels.includes(m.device_model))
          .map(m => m.device_model);

        setDeviceModels([...sortedPresets, ...unknownFromServer, ...customModels]);
      })
      .catch(() => {
        setDeviceModels([...PRESET_MODELS, ...customModels]);
      });
  }, []);

  useEffect(() => {
    const num = parseInt(favouriteNumber, 10);
    if (favouriteNumber && num >= 1 && num <= 999) {
      setUsername(generate(num));
    } else {
      setUsername('');
    }
  }, [favouriteNumber]);

  function handleTryAnother() {
    const num = parseInt(favouriteNumber, 10);
    if (num >= 1 && num <= 999) {
      setUsername(generate(num));
    }
  }

  function handleAddCustomModel() {
    const trimmed = customModelDraft.trim();
    if (!trimmed) return;
    const existing = JSON.parse(localStorage.getItem('custom_device_models') || '[]');
    if (!existing.includes(trimmed)) {
      const updated = [...existing, trimmed];
      localStorage.setItem('custom_device_models', JSON.stringify(updated));
      setDeviceModels(prev => [...prev, trimmed]);
    }
    setDeviceModel(trimmed);
    setShowCustomInput(false);
    setCustomModelDraft('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!favouriteNumber || !username) return setError('Please enter your favourite number.');
    if (!mstGroup) return setError('Please select your skin tone.');
    if (!deviceModel) return setError('Please select your device model.');
    setError('');
    onSave({ participantCode: username, mstGroup, deviceModel });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-6">
        <h1 className="text-xl font-bold text-gray-800 mb-1">Welcome</h1>
        <p className="text-sm text-gray-500 mb-6">Set up your profile to start logging battery data.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Favourite number + username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What's your favourite number?
            </label>
            <input
              type="number"
              min="1"
              max="999"
              value={favouriteNumber}
              onChange={e => setFavouriteNumber(e.target.value)}
              placeholder="1–999"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              inputMode="numeric"
              required
            />
            {username && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-gray-400 flex-shrink-0">Your username:</span>
                <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded flex-1">
                  {username}
                </span>
                <button
                  type="button"
                  onClick={handleTryAnother}
                  className="text-xs text-blue-600 hover:underline flex-shrink-0"
                >
                  Try another
                </button>
              </div>
            )}
          </div>

          {/* MST */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monk Skin Tone
            </label>
            <p className="text-xs text-gray-500 mb-2">
              This is a subjective measure — choose the tone that most closely matches your own skin.
            </p>
            <MSTSwatch selected={mstGroup} onChange={setMstGroup} />
            {mstGroup && (
              <p className="text-center text-xs text-gray-500 mt-2">Selected: MST {mstGroup}</p>
            )}
          </div>

          {/* Device model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Watch Model
            </label>
            <div className="space-y-1">
              {deviceModels.map(model => (
                <button
                  key={model}
                  type="button"
                  onClick={() => setDeviceModel(model)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    deviceModel === model
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {model}
                </button>
              ))}
              {showCustomInput ? (
                <div className="flex gap-2 mt-1">
                  <input
                    autoFocus
                    type="text"
                    value={customModelDraft}
                    onChange={e => setCustomModelDraft(e.target.value)}
                    placeholder="Enter model name"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleAddCustomModel(); }
                      if (e.key === 'Escape') { setShowCustomInput(false); setCustomModelDraft(''); }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomModel}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  Add...
                </button>
              )}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-3 transition-colors"
          >
            Save Profile
          </button>

          <p className="text-xs text-gray-400 text-center">
            Your details will be saved on this device for future visits.
          </p>
        </form>
      </div>
    </div>
  );
}
