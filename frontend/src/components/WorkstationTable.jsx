import React, { useState } from 'react';

function UtilBar({ percentage }) {
  const color =
    percentage >= 80 ? 'bg-green-500' :
    percentage >= 60 ? 'bg-yellow-500' :
    percentage >= 40 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 bg-gray-200 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
      </div>
      <span className="text-sm font-medium text-gray-700">{percentage.toFixed(1)}%</span>
    </div>
  );
}

export default function WorkstationTable({ workstations, metrics, onSelect }) {
  const [filter, setFilter] = useState('');

  const merged = workstations.map(s => {
    const m = metrics.find(m => m.station_id === s.station_id) || {};
    return { ...s, ...m };
  });

  const filtered = merged.filter(s =>
    s.name?.toLowerCase().includes(filter.toLowerCase()) ||
    s.station_id?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Workstation Metrics</h2>
        <input
          type="text"
          placeholder="Filter by name or ID..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => (
          <div
            key={s.station_id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onSelect(s)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-800">{s.station_name || s.name}</h3>
                <p className="text-xs text-gray-400 font-mono">{s.station_id}</p>
              </div>
              <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                {s.station_type || 'general'}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Utilization</span>
                {s.utilization_percentage != null ? (
                  <UtilBar percentage={s.utilization_percentage} />
                ) : <span className="text-gray-400">—</span>}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Occupancy</span>
                <span className="text-sm font-medium text-gray-700">
                  {s.occupancy_minutes != null ? `${(s.occupancy_minutes / 60).toFixed(1)} hrs` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Units Produced</span>
                <span className="text-sm font-semibold text-gray-800">{s.total_units_produced ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Throughput</span>
                <span className="text-sm font-medium text-gray-700">
                  {s.throughput_rate != null ? `${s.throughput_rate.toFixed(1)} u/hr` : '—'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100">
              <button className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                View Details →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
