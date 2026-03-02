import React, { useState, useEffect } from 'react';
import { getEvents } from '../api.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

export default function WorkerDetail({ worker, metrics, onBack }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getEvents({ worker_id: worker.worker_id, limit: 500 })
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [worker.worker_id]);

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No metrics available for this worker.</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">← Back to Workers</button>
      </div>
    );
  }

  const timeData = [
    { name: 'Working', value: Math.round(metrics.total_active_minutes), color: '#3B82F6' },
    { name: 'Idle', value: Math.round(metrics.total_idle_minutes), color: '#F59E0B' },
    { name: 'Absent', value: Math.round(metrics.total_absent_minutes), color: '#EF4444' },
  ];

  // Event type distribution
  const eventCounts = events.reduce((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] || 0) + 1;
    return acc;
  }, {});
  const eventDistribution = Object.entries(eventCounts).map(([type, count]) => ({
    name: type,
    count,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{metrics.worker_name}</h2>
          <p className="text-sm text-gray-400 font-mono">{worker.worker_id}</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Active Time" value={`${(metrics.total_active_minutes / 60).toFixed(1)} hrs`} />
        <StatCard label="Idle Time" value={`${(metrics.total_idle_minutes / 60).toFixed(1)} hrs`} />
        <StatCard label="Absent Time" value={`${(metrics.total_absent_minutes / 60).toFixed(1)} hrs`} />
        <StatCard label="Utilization" value={`${metrics.utilization_percentage.toFixed(1)}%`} highlight />
        <StatCard label="Units Produced" value={metrics.total_units_produced.toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Time Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={timeData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}m`}
              >
                {timeData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} minutes`]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Event Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Event Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={eventDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Recent Events ({events.length} loaded)
        </h3>
        {loading ? (
          <p className="text-gray-400 text-sm">Loading events...</p>
        ) : (
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-gray-600">Timestamp</th>
                  <th className="px-3 py-2 text-gray-600">Workstation</th>
                  <th className="px-3 py-2 text-gray-600">Event Type</th>
                  <th className="px-3 py-2 text-gray-600">Confidence</th>
                  <th className="px-3 py-2 text-gray-600">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {events.slice(0, 50).map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5 font-mono text-gray-500">
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-gray-700">{e.workstation_id}</td>
                    <td className="px-3 py-1.5">
                      <EventBadge type={e.event_type} />
                    </td>
                    <td className="px-3 py-1.5 text-gray-700">{(e.confidence * 100).toFixed(0)}%</td>
                    <td className="px-3 py-1.5 text-gray-700">{e.count || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-100'} shadow-sm`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-blue-700' : 'text-gray-800'}`}>{value}</p>
    </div>
  );
}

function EventBadge({ type }) {
  const styles = {
    working: 'bg-green-100 text-green-700',
    idle: 'bg-yellow-100 text-yellow-700',
    absent: 'bg-red-100 text-red-700',
    product_count: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-700'}`}>
      {type}
    </span>
  );
}
