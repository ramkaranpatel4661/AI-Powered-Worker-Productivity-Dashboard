import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function MetricCard({ title, value, subtitle, icon, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`rounded-lg p-2 border ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FactorySummary({ factoryMetrics, workerMetrics, workstationMetrics }) {
  if (!factoryMetrics) return null;

  const productiveHours = (factoryMetrics.total_productive_minutes / 60).toFixed(1);

  // Worker utilization chart data
  const workerUtilData = workerMetrics.map(w => ({
    name: w.worker_name.split(' ')[0],
    utilization: w.utilization_percentage,
    units: w.total_units_produced,
  }));

  // Worker time breakdown for pie chart
  const totalActive = workerMetrics.reduce((s, w) => s + w.total_active_minutes, 0);
  const totalIdle = workerMetrics.reduce((s, w) => s + w.total_idle_minutes, 0);
  const totalAbsent = workerMetrics.reduce((s, w) => s + w.total_absent_minutes, 0);
  const timeBreakdown = [
    { name: 'Working', value: Math.round(totalActive) },
    { name: 'Idle', value: Math.round(totalIdle) },
    { name: 'Absent', value: Math.round(totalAbsent) },
  ];
  const PIE_COLORS = ['#3B82F6', '#F59E0B', '#EF4444'];

  // Workstation throughput data
  const stationData = workstationMetrics.map(s => ({
    name: s.station_name.length > 12 ? s.station_name.substring(0, 12) + '…' : s.station_name,
    throughput: s.throughput_rate,
    units: s.total_units_produced,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Productive Time"
          value={`${productiveHours} hrs`}
          subtitle={`${factoryMetrics.total_productive_minutes.toFixed(0)} minutes across all workers`}
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          title="Total Production"
          value={`${factoryMetrics.total_production_count.toLocaleString()} units`}
          subtitle="Across all workers and stations"
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <MetricCard
          title="Avg Production Rate"
          value={`${factoryMetrics.average_production_rate.toFixed(1)} u/hr`}
          subtitle="Average units per hour per worker"
          color="purple"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <MetricCard
          title="Avg Utilization"
          value={`${factoryMetrics.average_utilization.toFixed(1)}%`}
          subtitle={`${factoryMetrics.total_workers} workers • ${factoryMetrics.total_events.toLocaleString()} events`}
          color="yellow"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Worker Utilization Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Worker Utilization (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={workerUtilData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                formatter={(value) => [`${value.toFixed(1)}%`, 'Utilization']}
              />
              <Bar dataKey="utilization" radius={[4, 4, 0, 0]}>
                {workerUtilData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Time Breakdown Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Factory Time Breakdown</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={timeBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}m`}
              >
                {timeBreakdown.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} minutes`]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Workstation Throughput */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Workstation Throughput (units/hr)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stationData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              formatter={(value, name) => {
                if (name === 'throughput') return [`${value.toFixed(1)} u/hr`, 'Throughput'];
                return [`${value}`, 'Total Units'];
              }}
            />
            <Legend />
            <Bar dataKey="throughput" fill="#3B82F6" name="Throughput (u/hr)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="units" fill="#10B981" name="Total Units" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
