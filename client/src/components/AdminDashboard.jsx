import { useState, useEffect } from 'react';
import LogsTab from './admin/LogsTab';
import ParticipantsTab from './admin/ParticipantsTab';
import ParametersTab from './admin/ParametersTab';
import { MST_COLORS } from '../constants/mst';

const TABS = ['Logs', 'Participants', 'Parameters'];

function StatsBar() {
  const [stats, setStats] = useState([]);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats);
  }, []);

  if (stats.length === 0) return null;

  const max = Math.max(...stats.map(s => s.avg_battery));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Avg Battery % by MST Group</h3>
      <div className="space-y-2">
        {stats.map(s => (
          <div key={s.mst_group} className="flex items-center gap-3">
            <span
              className="w-5 h-5 rounded-full flex-shrink-0 border border-gray-300"
              style={{ backgroundColor: MST_COLORS[s.mst_group] }}
            />
            <span className="text-xs text-gray-600 w-12">MST {s.mst_group}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-blue-500 transition-all"
                style={{ width: `${(s.avg_battery / 100) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-700 w-10 text-right">{s.avg_battery}%</span>
            <span className="text-xs text-gray-400">({s.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Logs');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-bold text-gray-800">Smartwatch Battery Study — Admin</h1>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <StatsBar />

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Logs' && <LogsTab />}
        {activeTab === 'Participants' && <ParticipantsTab />}
        {activeTab === 'Parameters' && <ParametersTab />}
      </main>
    </div>
  );
}
