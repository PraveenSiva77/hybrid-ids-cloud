import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, ShieldCheck, ShieldAlert, Activity } from 'lucide-react';
import { RECENT_ALERTS, TRAFFIC_DATA } from '../constants';
import clsx from 'clsx';

const Dashboard: React.FC = () => {
  const pieData = [
    { name: 'Signature', value: 45 },
    { name: 'ML Anomaly', value: 30 },
    { name: 'Hybrid', value: 25 },
  ];
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Operations Center</h1>
          <p className="text-slate-400">Real-time Hybrid Intrusion Detection Monitoring</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-green-900/30 text-green-400 border border-green-800 rounded-full text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            System Operational
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Traffic" value="8.4 TB" trend="+12%" icon={<Activity className="text-blue-400" />} />
        <StatCard title="Threats Detected" value="1,024" trend="+5%" icon={<ShieldAlert className="text-red-400" />} isAlert />
        <StatCard title="False Positives Reduced" value="89%" trend="Optimization" icon={<ShieldCheck className="text-green-400" />} />
        <StatCard title="ML Confidence" value="98.2%" trend="Stable" icon={<Activity className="text-purple-400" />} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h3 className="text-lg font-semibold mb-4 text-slate-200">Traffic vs Anomalies (24h)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TRAFFIC_DATA}>
                <defs>
                  <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                  itemStyle={{ color: '#f1f5f9' }}
                />
                <Area type="monotone" dataKey="traffic" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorTraffic)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
           <h3 className="text-lg font-semibold mb-4 text-slate-200">Detection Source</h3>
           <div className="h-64 flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                </PieChart>
             </ResponsiveContainer>
           </div>
           <div className="flex justify-center gap-4 text-sm text-slate-400 mt-2">
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#0088FE]"></span> Signature</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#00C49F]"></span> ML</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#FFBB28]"></span> Hybrid</div>
           </div>
        </div>
      </div>

      {/* Recent Alerts Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-200">Recent High Severity Alerts</h3>
          <button className="text-sm text-cyan-400 hover:text-cyan-300">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-950 text-slate-200 uppercase font-medium">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Source IP</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Severity</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {RECENT_ALERTS.map((alert) => (
                <tr key={alert.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-mono">{alert.timestamp}</td>
                  <td className="px-6 py-4 font-mono">{alert.sourceIp}</td>
                  <td className="px-6 py-4">
                    <span className={clsx("px-2 py-1 rounded-md text-xs font-semibold", 
                      alert.type === 'Hybrid' ? 'bg-purple-900/50 text-purple-300 border border-purple-700' :
                      alert.type === 'ML' ? 'bg-green-900/50 text-green-300 border border-green-700' :
                      'bg-blue-900/50 text-blue-300 border border-blue-700'
                    )}>
                      {alert.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx("flex items-center gap-1", 
                      alert.severity === 'Critical' ? 'text-red-400 font-bold' : 
                      alert.severity === 'High' ? 'text-orange-400' : 
                      'text-yellow-400'
                    )}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{alert.description}</td>
                  <td className="px-6 py-4">{alert.score.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; trend: string; icon: React.ReactNode; isAlert?: boolean }> = ({ title, value, trend, icon, isAlert }) => (
  <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-slate-950 rounded-lg">{icon}</div>
      <span className={clsx("text-xs font-medium px-2 py-1 rounded-full", isAlert ? "bg-red-900/30 text-red-400" : "bg-green-900/30 text-green-400")}>
        {trend}
      </span>
    </div>
    <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
    <p className="text-slate-400 text-sm">{title}</p>
  </div>
);

export default Dashboard;