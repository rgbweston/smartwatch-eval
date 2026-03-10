import { MST_COLORS } from '../constants/mst';

export default function ProfilePicker({ profiles, activeProfileIndex, onSwitch, onAddNew, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white w-full max-w-sm rounded-t-2xl p-5 pb-8"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-800 mb-4">Switch Profile</h2>
        <ul className="space-y-2 mb-4">
          {profiles.map((p, i) => (
            <li key={p.participantCode}>
              <button
                onClick={() => { onSwitch(i); onClose(); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                  i === activeProfileIndex ? 'bg-blue-50 border border-blue-300' : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <span
                  className="w-7 h-7 rounded-full flex-shrink-0 border border-gray-300"
                  style={{ backgroundColor: MST_COLORS[p.mstGroup] }}
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.participantCode}</p>
                  <p className="text-xs text-gray-500">{p.deviceModel} · MST {p.mstGroup}</p>
                </div>
                {i === activeProfileIndex && (
                  <span className="ml-auto text-blue-600 text-xs font-medium">Active</span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={() => { onAddNew(); onClose(); }}
          className="w-full text-center text-sm text-blue-600 font-medium py-2 hover:underline"
        >
          + Add new profile
        </button>
      </div>
    </div>
  );
}
