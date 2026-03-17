import { useState, useEffect } from 'react';
import LogsTab from './admin/LogsTab';
import ParticipantsTab from './admin/ParticipantsTab';
import ParametersTab from './admin/ParametersTab';
import MethodologyTab from './admin/MethodologyTab';
import ConfigsTab from './admin/ConfigsTab';
import MessagesTab from './admin/MessagesTab';
import { MST_COLORS } from '../constants/mst';

const TABS = ['Logs', 'Participants', 'Parameters', 'Methodology', 'Configs', 'Messages'];

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

function formatConfigLabel(c) {
  const start = new Date(c.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const end = c.end_date ? new Date(c.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'ongoing';
  return `${c.name} (${start} – ${end})`;
}

function AnalyticsPanel() {
  const [stats, setStats] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState('');

  useEffect(() => {
    fetch('/api/sampling-configs').then(r => r.json()).then(setConfigs).catch(() => {});
  }, []);

  useEffect(() => {
    const url = selectedConfig ? `/api/stats?config_id=${selectedConfig}` : '/api/stats';
    fetch(url).then(r => r.json()).then(setStats);
  }, [selectedConfig]);

  if (!stats) return null;

  const { overall, by_mst, by_device, by_participant, snapshot } = stats;
  const maxLoss = by_mst.length > 0 ? Math.max(...by_mst.map(s => s.avg_hourly_loss ?? 0)) : 1;
  const maxDeviceLoss = by_device && by_device.length > 0 ? Math.max(...by_device.map(s => s.avg_hourly_loss ?? 0)) : 1;

  return (
    <div className="space-y-4 mb-6">
      {/* Config selector */}
      {configs.length > 0 && (
        <div className="flex justify-end items-center gap-2">
          <span className="text-xs text-gray-500">View:</span>
          <select
            value={selectedConfig}
            onChange={e => setSelectedConfig(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All time</option>
            {configs.map(c => (
              <option key={c.id} value={c.id}>{formatConfigLabel(c)}</option>
            ))}
          </select>
        </div>
      )}

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

      {/* Row 4: Hourly loss by device model */}
      {by_device && by_device.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Avg Hourly Loss % by Device</h3>
          <div className="space-y-2">
            {by_device.map(s => (
              <div key={s.device_model} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-32 truncate">{s.device_model ?? '—'}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-blue-400 transition-all"
                    style={{ width: maxDeviceLoss > 0 ? `${((s.avg_hourly_loss ?? 0) / maxDeviceLoss) * 100}%` : '0%' }}
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

      {/* Row 5: Per-participant metrics table */}
      {by_participant && by_participant.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Per-Participant Metrics</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left py-1 pr-4 font-medium">Code</th>
                  <th className="text-left py-1 pr-4 font-medium">Device</th>
                  <th className="text-right py-1 pr-4 font-medium">Hourly</th>
                  <th className="text-right py-1 pr-4 font-medium">Daily</th>
                  <th className="text-right py-1 pr-4 font-medium">Nightly</th>
                  <th className="text-right py-1 font-medium">Pairs</th>
                </tr>
              </thead>
              <tbody>
                {by_participant.map(p => (
                  <tr key={p.participant_code} className="border-t border-gray-50">
                    <td className="py-1 pr-4 font-medium text-gray-700">{p.participant_code}</td>
                    <td className="py-1 pr-4 text-gray-500">{p.device_model ?? '—'}</td>
                    <td className="py-1 pr-4 text-right tabular-nums text-gray-700">
                      {p.avg_hourly_loss !== null ? `${p.avg_hourly_loss}%/hr` : '—'}
                    </td>
                    <td className="py-1 pr-4 text-right tabular-nums text-gray-700">
                      {p.avg_daily_loss !== null ? `${p.avg_daily_loss}%` : '—'}
                    </td>
                    <td className="py-1 pr-4 text-right tabular-nums text-gray-700">
                      {p.nighttime_loss !== null ? `${p.nighttime_loss}%/hr` : '—'}
                    </td>
                    <td className="py-1 text-right tabular-nums text-gray-400">{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        {activeTab === 'Methodology' && <MethodologyTab />}
        {activeTab === 'Configs' && <ConfigsTab />}
        {activeTab === 'Messages' && <MessagesTab />}
      </main>
    </div>
  );
}
