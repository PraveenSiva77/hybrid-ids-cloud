import React, { useState } from 'react';
import { Save, RefreshCw, Shield, Bell, Network, Database } from 'lucide-react';

const Settings: React.FC = () => {
  const [useSignature, setUseSignature] = useState(true);
  const [useML, setUseML] = useState(true);
  const [mlThreshold, setMlThreshold] = useState(0.75);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Configuration</h1>
          <p className="text-slate-400">Manage detection engines, notifications, and system preferences</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium">
            <RefreshCw className="w-4 h-4" />
            Reset Defaults
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-900/20 text-sm font-medium">
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Detection Engine */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center gap-3">
            <Shield className="text-cyan-400 w-5 h-5" />
            <h2 className="font-semibold text-slate-200">Detection Engine Parameters</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-200">Signature-Based Detection</label>
                <p className="text-sm text-slate-500">Enable traditional rule-matching (Suricata/Snort).</p>
              </div>
              <Toggle checked={useSignature} onChange={setUseSignature} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-200">Machine Learning Anomaly Detection</label>
                <p className="text-sm text-slate-500">Enable behavioral analysis for zero-day threats.</p>
              </div>
              <Toggle checked={useML} onChange={setUseML} />
            </div>

            <div className="pt-4 border-t border-slate-800">
              <div className="flex justify-between mb-2">
                <label className="block text-sm font-medium text-slate-200">ML Confidence Threshold</label>
                <span className="text-sm font-mono text-cyan-400">{mlThreshold}</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="0.99" 
                step="0.01" 
                value={mlThreshold}
                onChange={(e) => setMlThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>More Sensitive (Low Confidence)</span>
                <span>Less Sensitive (High Confidence)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center gap-3">
            <Bell className="text-orange-400 w-5 h-5" />
            <h2 className="font-semibold text-slate-200">Alerts & Notifications</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Admin Email</label>
                  <input type="email" defaultValue="admin@cloudguard.io" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Slack Webhook URL</label>
                  <input type="password" value="https://hooks.slack.com/services/..." readOnly className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
              </div>
            </div>
            <div className="flex items-center gap-2">
                <input type="checkbox" id="criticalOnly" defaultChecked className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-600 focus:ring-offset-slate-900 focus:ring-cyan-500" />
                <label htmlFor="criticalOnly" className="text-sm text-slate-400">Only send notifications for <strong>Critical</strong> severity alerts</label>
            </div>
          </div>
        </section>

        {/* Network & Storage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center gap-3">
              <Network className="text-purple-400 w-5 h-5" />
              <h2 className="font-semibold text-slate-200">Active Interfaces</h2>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                {['eth0 (WAN)', 'eth1 (LAN)', 'docker0 (Container Bridge)'].map((iface, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                      <span className="font-mono text-sm text-slate-300">{iface}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs text-green-400 font-medium">Active</span>
                      </div>
                    </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center gap-3">
              <Database className="text-blue-400 w-5 h-5" />
              <h2 className="font-semibold text-slate-200">Data Retention</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Log Retention Policy</label>
                <select className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500">
                  <option>7 Days</option>
                  <option defaultValue="30">30 Days</option>
                  <option>90 Days</option>
                  <option>1 Year</option>
                </select>
              </div>
              <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                 <div className="text-xs text-slate-500">Estimated Storage Usage</div>
                 <div className="text-lg font-bold text-slate-300">450 GB <span className="text-xs font-normal text-slate-500">/ 1 TB</span></div>
                 <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2">
                   <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
                 </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button 
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${checked ? 'bg-cyan-600' : 'bg-slate-700'}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

export default Settings;