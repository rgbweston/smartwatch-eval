import { useState, useEffect } from 'react';
import LogsTab from './admin/LogsTab';
import ParticipantsTab from './admin/ParticipantsTab';
import ParametersTab from './admin/ParametersTab';
import { MST_COLORS } from '../constants/mst';

const TABS = ['Logs', 'Participants', 'Parameters'];

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-col gap-0.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xl font-bold text-gray-800">
        {value !== null && value !== undefined ? value : <span className="text-gray-300 text-sm">—</span>}
      </span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

function AnalyticsPanel() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats);
  }, []);

  if (!stats) return null;

  const { overall, by_mst, snapshot } = stats;
  const maxLoss = by_mst.length > 0 ? Math.max(...by_mst.map(s => s.avg_hourly_loss ?? 0)) : 1;

  return (
    <div className="space-y-4 mb-6">
      {/* Row 1: Overall loss rates */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Avg hourly loss" value={overall.avg_hourly_loss !== null ? `${overall.avg_hourly_loss}%` : null} sub="per hour" />
        <StatCard label="Avg daily loss"  value={overall.avg_daily_loss  !== null ? `${overall.avg_daily_loss}%`  : null} sub="per day" />
        <StatCard label="Daytime loss"    value={overall.daytime_loss    !== null ? `${overall.daytime_loss}%`    : null} sub="6am – 10pm" />
        <StatCard label="Nighttime loss"  value={overall.nighttime_loss  !== null ? `${overall.nighttime_loss}%`  : null} sub="10pm – 6am" />
      </div>

      {/* Row 2: Snapshot counts */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        <StatCard label="Participants"       value={snapshot.participant_count} />
        <StatCard label="Total logs"         value={snapshot.total_logs} />
        <StatCard label="Avg logs / person"  value={snapshot.avg_logs_per_participant} />
        <StatCard label="Logs past 24h"      value={snapshot.logs_past_day} />
        <StatCard label="Logs past hour"     value={snapshot.logs_past_hour} />
      </div>

      {/* Row 3: Hourly loss by MST group */}
      {by_mst.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Avg Hourly Loss % by MST Group</h3>
          <div className="space-y-2">
            {by_mst.map(s => (
              <div key={s.mst_group} className="flex items-center gap-3">
                <span
                  className="w-5 h-5 rounded-full flex-shrink-0 border border-gray-300"
                  style={{ backgroundColor: MST_COLORS[s.mst_group] }}
                />
                <span className="text-xs text-gray-600 w-12">MST {s.mst_group}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-orange-400 transition-all"
                    style={{ width: maxLoss > 0 ? `${((s.avg_hourly_loss ?? 0) / maxLoss) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 w-14 text-right">
                  {s.avg_hourly_loss !== null ? `${s.avg_hourly_loss}%/hr` : '—'}
                </span>
                <span className="text-xs text-gray-400">({s.count} pairs)</span>
              </div>
            ))}
          </div>
        </div>
      )}
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
        <AnalyticsPanel />

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
