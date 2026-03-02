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

export default function WorkerTable({ workers, metrics, onSelect }) {
  const [sortBy, setSortBy] = useState('worker_id');
  const [sortDir, setSortDir] = useState('asc');
  const [filter, setFilter] = useState('');

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const merged = workers.map(w => {
    const m = metrics.find(m => m.worker_id === w.worker_id) || {};
    return { ...w, ...m };
  });

  const filtered = merged.filter(w =>
    w.name?.toLowerCase().includes(filter.toLowerCase()) ||
    w.worker_id?.toLowerCase().includes(filter.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortBy], bVal = b[sortBy];
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }) => (
    <span className="ml-1 text-gray-400">
      {sortBy === field ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Worker Metrics</h2>
        <input
          type="text"
          placeholder="Filter by name or ID..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  { key: 'worker_id', label: 'ID' },
                  { key: 'worker_name', label: 'Name' },
                  { key: 'total_active_minutes', label: 'Active (min)' },
                  { key: 'total_idle_minutes', label: 'Idle (min)' },
                  { key: 'utilization_percentage', label: 'Utilization' },
                  { key: 'total_units_produced', label: 'Units Produced' },
                  { key: 'units_per_hour', label: 'Units/Hr' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-gray-800 select-none"
                  >
                    {col.label}<SortIcon field={col.key} />
                  </th>
                ))}
                <th className="px-4 py-3 font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(w => (
                <tr key={w.worker_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{w.worker_id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{w.worker_name || w.name}</td>
                  <td className="px-4 py-3 text-gray-700">{w.total_active_minutes?.toFixed(1) || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{w.total_idle_minutes?.toFixed(1) || '—'}</td>
                  <td className="px-4 py-3">
                    {w.utilization_percentage != null ? (
                      <UtilBar percentage={w.utilization_percentage} />
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{w.total_units_produced ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{w.units_per_hour?.toFixed(1) || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onSelect(w)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      View Details →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
