import React, { useState } from 'react';
import { seedData, clearAllEvents, ingestEvent } from '../api.js';

export default function DataControls({ onDataChanged }) {
  const [seedDays, setSeedDays] = useState(5);
  const [clearFirst, setClearFirst] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Single event form
  const [eventForm, setEventForm] = useState({
    timestamp: '2026-01-15T10:15:00Z',
    worker_id: 'W1',
    workstation_id: 'S3',
    event_type: 'working',
    confidence: 0.93,
    count: 1,
  });

  const handleSeed = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await seedData(seedDays, clearFirst);
      setMessage({ type: 'success', text: result.message });
      onDataChanged();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to delete ALL events?')) return;
    setLoading(true);
    setMessage(null);
    try {
      const result = await clearAllEvents();
      setMessage({ type: 'success', text: result.message });
      onDataChanged();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleIngestEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const result = await ingestEvent({
        ...eventForm,
        confidence: parseFloat(eventForm.confidence),
        count: parseInt(eventForm.count, 10) || 0,
      });
      setMessage({ type: 'success', text: `Event ingested (ID: ${result.id})` });
      onDataChanged();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Data Management</h2>

      {/* Message */}
      {message && (
        <div className={`px-4 py-3 rounded-lg border ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seed / Reset Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Seed / Reset Data</h3>
          <p className="text-xs text-gray-500 mb-4">
            Use these controls to generate or refresh dummy data. Evaluators can use
            this to reset the database without editing code.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Number of days</label>
              <input
                type="number"
                min={1}
                max={30}
                value={seedDays}
                onChange={e => setSeedDays(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={clearFirst}
                onChange={e => setClearFirst(e.target.checked)}
                className="rounded border-gray-300"
              />
              Clear existing events before seeding
            </label>

            <div className="flex gap-3">
              <button
                onClick={handleSeed}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {loading ? 'Working...' : 'Generate Dummy Data'}
              </button>
              <button
                onClick={handleClear}
                disabled={loading}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 text-sm font-medium"
              >
                Clear All Events
              </button>
            </div>
          </div>
        </div>

        {/* Ingest Single Event */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Ingest Single Event</h3>
          <p className="text-xs text-gray-500 mb-4">
            Simulate sending an event from the CCTV AI system.
          </p>

          <form onSubmit={handleIngestEvent} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Timestamp</label>
                <input
                  type="text"
                  value={eventForm.timestamp}
                  onChange={e => setEventForm(f => ({ ...f, timestamp: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Worker ID</label>
                <select
                  value={eventForm.worker_id}
                  onChange={e => setEventForm(f => ({ ...f, worker_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['W1','W2','W3','W4','W5','W6'].map(id => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Workstation ID</label>
                <select
                  value={eventForm.workstation_id}
                  onChange={e => setEventForm(f => ({ ...f, workstation_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['S1','S2','S3','S4','S5','S6'].map(id => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Event Type</label>
                <select
                  value={eventForm.event_type}
                  onChange={e => setEventForm(f => ({ ...f, event_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['working','idle','absent','product_count'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Confidence</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={eventForm.confidence}
                  onChange={e => setEventForm(f => ({ ...f, confidence: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Count</label>
                <input
                  type="number"
                  min="0"
                  value={eventForm.count}
                  onChange={e => setEventForm(f => ({ ...f, count: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              {loading ? 'Sending...' : 'Ingest Event'}
            </button>
          </form>
        </div>
      </div>

      {/* API Reference */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">API Reference</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-gray-600">Method</th>
                <th className="px-3 py-2 text-gray-600">Endpoint</th>
                <th className="px-3 py-2 text-gray-600">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ['POST', '/api/events', 'Ingest a single AI event'],
                ['POST', '/api/events/batch', 'Ingest a batch of events'],
                ['GET', '/api/events', 'List events with filters'],
                ['GET', '/api/metrics/factory', 'Factory-level metrics'],
                ['GET', '/api/metrics/workers', 'Worker metrics (optional ?worker_id=W1)'],
                ['GET', '/api/metrics/workstations', 'Workstation metrics (optional ?station_id=S1)'],
                ['GET', '/api/workers', 'List all workers'],
                ['GET', '/api/workstations', 'List all workstations'],
                ['POST', '/api/seed?days=5&clear=true', 'Seed/refresh dummy data'],
                ['DELETE', '/api/events/all', 'Clear all events'],
                ['GET', '/api/health', 'Health check'],
              ].map(([method, path, desc], i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5">
                    <span className={`font-mono font-bold ${method === 'GET' ? 'text-green-600' : method === 'POST' ? 'text-blue-600' : 'text-red-600'}`}>
                      {method}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-gray-800">{path}</td>
                  <td className="px-3 py-1.5 text-gray-500">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
