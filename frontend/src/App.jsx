import React, { useState, useEffect, useCallback } from 'react';
import FactorySummary from './components/FactorySummary.jsx';
import WorkerTable from './components/WorkerTable.jsx';
import WorkstationTable from './components/WorkstationTable.jsx';
import WorkerDetail from './components/WorkerDetail.jsx';
import WorkstationDetail from './components/WorkstationDetail.jsx';
import DataControls from './components/DataControls.jsx';
import {
  getFactoryMetrics,
  getWorkerMetrics,
  getWorkstationMetrics,
  getWorkers,
  getWorkstations,
} from './api.js';

export default function App() {
  const [factoryMetrics, setFactoryMetrics] = useState(null);
  const [workerMetrics, setWorkerMetrics] = useState([]);
  const [workstationMetrics, setWorkstationMetrics] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [workstations, setWorkstations] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedWorkstation, setSelectedWorkstation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [factory, wMetrics, sMetrics, wList, sList] = await Promise.all([
        getFactoryMetrics(),
        getWorkerMetrics(),
        getWorkstationMetrics(),
        getWorkers(),
        getWorkstations(),
      ]);
      setFactoryMetrics(factory);
      setWorkerMetrics(wMetrics);
      setWorkstationMetrics(sMetrics);
      setWorkers(wList);
      setWorkstations(sList);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const tabs = [
    { id: 'overview', label: 'Factory Overview' },
    { id: 'workers', label: 'Workers' },
    { id: 'workstations', label: 'Workstations' },
    { id: 'manage', label: 'Data Management' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 rounded-lg p-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Worker Productivity Dashboard</h1>
                <p className="text-sm text-gray-500">Real-time factory monitoring powered by computer vision</p>
              </div>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {loading ? 'Loading...' : 'Refresh Data'}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedWorker(null);
                  setSelectedWorkstation(null);
                }}
                className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <strong>Error:</strong> {error}
            <button onClick={loadData} className="ml-4 underline">Retry</button>
          </div>
        )}

        {loading && !factoryMetrics ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading dashboard data...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <FactorySummary
                factoryMetrics={factoryMetrics}
                workerMetrics={workerMetrics}
                workstationMetrics={workstationMetrics}
              />
            )}

            {activeTab === 'workers' && (
              <>
                {selectedWorker ? (
                  <WorkerDetail
                    worker={selectedWorker}
                    metrics={workerMetrics.find(w => w.worker_id === selectedWorker.worker_id)}
                    onBack={() => setSelectedWorker(null)}
                  />
                ) : (
                  <WorkerTable
                    workers={workers}
                    metrics={workerMetrics}
                    onSelect={setSelectedWorker}
                  />
                )}
              </>
            )}

            {activeTab === 'workstations' && (
              <>
                {selectedWorkstation ? (
                  <WorkstationDetail
                    workstation={selectedWorkstation}
                    metrics={workstationMetrics.find(s => s.station_id === selectedWorkstation.station_id)}
                    onBack={() => setSelectedWorkstation(null)}
                  />
                ) : (
                  <WorkstationTable
                    workstations={workstations}
                    metrics={workstationMetrics}
                    onSelect={setSelectedWorkstation}
                  />
                )}
              </>
            )}

            {activeTab === 'manage' && (
              <DataControls onDataChanged={loadData} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-gray-400">
          AI Worker Productivity Dashboard &mdash; Biz-Tech Analytics Technical Assessment
        </div>
      </footer>
    </div>
  );
}
