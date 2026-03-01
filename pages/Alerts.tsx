import React, { useState } from 'react';
import { Search, AlertTriangle, ShieldAlert, CheckCircle, Eye, Download, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { RECENT_ALERTS } from '../constants';
import { Alert } from '../types';

// Mock generating more alerts for the full page to simulate a richer dataset
const ALL_ALERTS: Alert[] = [
  ...RECENT_ALERTS,
  { id: 'ALT-1020', timestamp: '2026-02-12 09:12:00', sourceIp: '192.168.1.15', destIp: '10.0.5.20', type: 'Signature', severity: 'Medium', description: 'SSH Brute Force Attempt', score: 0.65 },
  { id: 'ALT-1019', timestamp: '2026-02-12 08:45:33', sourceIp: '203.0.113.55', destIp: '10.0.2.15', type: 'ML', severity: 'Low', description: 'Unusual Outbound Traffic Volume', score: 0.45 },
  { id: 'ALT-1018', timestamp: '2026-02-12 08:30:10', sourceIp: '192.168.1.200', destIp: '10.0.5.2', type: 'Hybrid', severity: 'Critical', description: 'Remote Code Execution (RCE) Pattern', score: 0.99 },
  { id: 'ALT-1017', timestamp: '2026-02-12 08:15:00', sourceIp: '10.0.1.5', destIp: '10.0.5.55', type: 'Signature', severity: 'High', description: 'XSS Attack Payload Detected', score: 0.88 },
  { id: 'ALT-1016', timestamp: '2026-02-12 07:55:12', sourceIp: '172.16.0.44', destIp: '10.0.2.10', type: 'ML', severity: 'Medium', description: 'Protocol Anomaly: Non-standard HTTP Port', score: 0.72 },
];

const Alerts: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('All');
    const [filterSeverity, setFilterSeverity] = useState<string>('All');

    // Filtering logic
    const filteredAlerts = ALL_ALERTS.filter(alert => {
        const matchesSearch = alert.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              alert.sourceIp.includes(searchTerm) || 
                              alert.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'All' || alert.type === filterType;
        const matchesSeverity = filterSeverity === 'All' || alert.severity === filterSeverity;
        return matchesSearch && matchesType && matchesSeverity;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Security Alerts</h1>
                    <p className="text-slate-400">Investigate and manage detected threats across the network.</p>
                </div>
                 <div className="flex gap-2">
                    <button className="flex items-center gap-2 bg-slate-900 text-slate-300 px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-sm transition-colors">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                    <button className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-500 text-sm shadow-lg shadow-cyan-900/20 transition-colors">
                        <RefreshCw className="w-4 h-4" />
                        Refresh Data
                    </button>
                 </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Search by ID, IP, or Description..." 
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition-all placeholder:text-slate-600"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <select 
                        className="flex-1 md:w-40 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-300 focus:outline-none focus:border-cyan-500 text-sm transition-all"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="All">All Types</option>
                        <option value="Signature">Signature</option>
                        <option value="ML">ML Anomaly</option>
                        <option value="Hybrid">Hybrid</option>
                    </select>
                    <select 
                        className="flex-1 md:w-40 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-300 focus:outline-none focus:border-cyan-500 text-sm transition-all"
                        value={filterSeverity}
                        onChange={(e) => setFilterSeverity(e.target.value)}
                    >
                        <option value="All">All Severities</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                </div>
            </div>

            {/* Alerts Table */}
             <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950/80 text-slate-200 uppercase font-medium border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-4 whitespace-nowrap">ID</th>
                                <th className="px-6 py-4 whitespace-nowrap">Timestamp</th>
                                <th className="px-6 py-4">Severity</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4 whitespace-nowrap">Source IP</th>
                                <th className="px-6 py-4 whitespace-nowrap">Dest IP</th>
                                <th className="px-6 py-4 w-1/3">Description</th>
                                <th className="px-6 py-4 text-center">Score</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-slate-800">
                            {filteredAlerts.length > 0 ? filteredAlerts.map((alert) => (
                                <tr key={alert.id} className="hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-cyan-400 font-medium">{alert.id}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{alert.timestamp}</td>
                                    <td className="px-6 py-4">
                                        <SeverityBadge severity={alert.severity} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <TypeBadge type={alert.type} />
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-300">{alert.sourceIp}</td>
                                    <td className="px-6 py-4 font-mono text-slate-300">{alert.destIp}</td>
                                    <td className="px-6 py-4 text-slate-300 font-medium">{alert.description}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className={clsx(
                                            "inline-block px-2 py-1 rounded text-xs font-bold",
                                            alert.score > 0.8 ? "bg-red-900/40 text-red-400" : "bg-slate-800 text-slate-300"
                                        )}>
                                            {alert.score.toFixed(2)}
                                        </div>
                                    </td>
                                     <td className="px-6 py-4">
                                        <button className="p-2 rounded-lg hover:bg-cyan-900/30 text-slate-500 hover:text-cyan-400 transition-colors" title="View Details">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                     </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500">
                                            <ShieldAlert className="w-12 h-12 mb-4 opacity-20" />
                                            <p className="text-lg font-medium">No alerts found</p>
                                            <p className="text-sm">Try adjusting your search or filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination (Mock) */}
                <div className="bg-slate-950/50 px-6 py-4 border-t border-slate-800 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Showing <span className="text-slate-200 font-medium">1-{filteredAlerts.length}</span> of <span className="text-slate-200 font-medium">{filteredAlerts.length}</span> results</span>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-50" disabled>Previous</button>
                        <button className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-50" disabled>Next</button>
                    </div>
                </div>
             </div>
        </div>
    );
};

const SeverityBadge = ({ severity }: { severity: string }) => {
    const styles = {
        Critical: 'bg-red-900/30 text-red-400 border-red-800',
        High: 'bg-orange-900/30 text-orange-400 border-orange-800',
        Medium: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
        Low: 'bg-blue-900/30 text-blue-400 border-blue-800',
    }[severity] || 'bg-slate-800 text-slate-400';

    const Icon = {
        Critical: AlertTriangle,
        High: ShieldAlert,
        Medium: AlertTriangle,
        Low: CheckCircle, // or Info
    }[severity] || AlertTriangle;

    return (
        <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border", styles)}>
             <Icon className="w-3 h-3" />
             {severity}
        </span>
    );
};

const TypeBadge = ({ type }: { type: string }) => {
     const styles = {
        Hybrid: 'text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded border border-purple-900/50',
        ML: 'text-green-400 bg-green-900/20 px-2 py-0.5 rounded border border-green-900/50',
        Signature: 'text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded border border-blue-900/50',
    }[type] || 'text-slate-400';
    
    return <span className={clsx("text-xs font-medium", styles)}>{type}</span>
}

export default Alerts;