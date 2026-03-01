import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TENANT_STATS } from '../constants';

const Analytics: React.FC = () => {
  const data = TENANT_STATS.map(t => ({
    name: t.name,
    alerts: t.alerts,
    severity: t.status === 'Critical' ? 100 : t.status === 'Warning' ? 50 : 10
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Multi-Tenant Analytics</h1>
        <p className="text-slate-400">Per-tenant threat analysis and resource monitoring</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TENANT_STATS.map((tenant) => (
          <div key={tenant.name} className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">{tenant.name}</h3>
              <p className="text-sm text-slate-400">Traffic: {tenant.traffic}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{tenant.alerts}</div>
              <div className={`text-xs px-2 py-1 rounded-full border ${
                tenant.status === 'Critical' ? 'bg-red-900/20 border-red-800 text-red-400' :
                tenant.status === 'Warning' ? 'bg-yellow-900/20 border-yellow-800 text-yellow-400' :
                'bg-green-900/20 border-green-800 text-green-400'
              }`}>
                {tenant.status}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
        <h3 className="text-lg font-semibold mb-6 text-slate-200">Alert Volume by Tenant</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#64748b" />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} />
              <Tooltip 
                 cursor={{fill: '#1e293b'}}
                 contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
              />
              <Legend />
              <Bar dataKey="alerts" fill="#06b6d4" radius={[0, 4, 4, 0]} name="Total Alerts" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;