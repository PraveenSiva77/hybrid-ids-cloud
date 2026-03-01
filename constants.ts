import { Alert, DatabaseTable, MetricData, TenantStat } from './types';

export const RECENT_ALERTS: Alert[] = [
  { id: 'ALT-1024', timestamp: '2026-02-12 10:45:00', sourceIp: '192.168.1.45', destIp: '10.0.5.2', type: 'Signature', severity: 'High', description: 'SQL Injection Attempt', score: 0.95 },
  { id: 'ALT-1025', timestamp: '2026-02-12 10:48:12', sourceIp: '172.16.0.22', destIp: '10.0.5.8', type: 'ML', severity: 'Medium', description: 'Anomalous Payload Size', score: 0.76 },
  { id: 'ALT-1026', timestamp: '2026-02-12 11:05:30', sourceIp: '45.33.22.11', destIp: '10.0.2.15', type: 'Hybrid', severity: 'Critical', description: 'Zero-day Pattern Correlation', score: 0.98 },
  { id: 'ALT-1027', timestamp: '2026-02-12 11:15:00', sourceIp: '192.168.1.100', destIp: '10.0.5.2', type: 'Signature', severity: 'Low', description: 'Port Scan (Reconnaissance)', score: 0.45 },
  { id: 'ALT-1028', timestamp: '2026-02-12 11:22:18', sourceIp: '10.0.5.99', destIp: 'External', type: 'ML', severity: 'High', description: 'Data Exfiltration Pattern', score: 0.89 },
];

export const TRAFFIC_DATA: MetricData[] = [
  { time: '08:00', traffic: 400, anomalies: 2 },
  { time: '09:00', traffic: 1200, anomalies: 5 },
  { time: '10:00', traffic: 2400, anomalies: 12 },
  { time: '11:00', traffic: 3100, anomalies: 8 },
  { time: '12:00', traffic: 2800, anomalies: 15 },
  { time: '13:00', traffic: 3500, anomalies: 20 },
  { time: '14:00', traffic: 3200, anomalies: 7 },
];

export const TENANT_STATS: TenantStat[] = [
  { name: 'Finance-Prod', alerts: 14, traffic: '1.2 TB', status: 'Warning' },
  { name: 'HR-Internal', alerts: 2, traffic: '450 GB', status: 'Secure' },
  { name: 'Dev-Cluster-A', alerts: 45, traffic: '5.8 TB', status: 'Critical' },
  { name: 'Marketing-Web', alerts: 8, traffic: '2.1 TB', status: 'Secure' },
];

export const DB_SCHEMA: DatabaseTable[] = [
  {
    tableName: 'cloud_flows',
    fields: [
      { name: 'flow_id', type: 'INT PK', description: 'Unique flow identifier' },
      { name: 'src_ip', type: 'VARCHAR', description: 'Source IP (VM/container)' },
      { name: 'src_port', type: 'INT', description: 'Source port' },
      { name: 'dst_ip', type: 'VARCHAR', description: 'Destination IP/service' },
      { name: 'dst_port', type: 'INT', description: 'Destination port' },
      { name: 'protocol', type: 'VARCHAR', description: 'Network protocol (TCP/UDP/ICMP)' },
      { name: 'tenant_id', type: 'VARCHAR', description: 'Tenant or project identifier' },
      { name: 'bytes', type: 'BIGINT', description: 'Total bytes in flow' },
      { name: 'packets', type: 'BIGINT', description: 'Total packets in flow' },
      { name: 'start_time', type: 'DATETIME', description: 'Flow start timestamp' },
      { name: 'end_time', type: 'DATETIME', description: 'Flow end timestamp' },
    ]
  },
  {
    tableName: 'flow_features',
    fields: [
      { name: 'feature_id', type: 'INT PK', description: 'Feature record ID' },
      { name: 'flow_id', type: 'INT FK', description: 'References cloud_flows.flow_id' },
      { name: 'pkt_size_mean', type: 'FLOAT', description: 'Average packet size' },
      { name: 'pkt_size_std', type: 'FLOAT', description: 'Standard deviation of packet size' },
      { name: 'inter_arrival_mean', type: 'FLOAT', description: 'Mean inter-arrival time' },
      { name: 'protocol_entropy', type: 'FLOAT', description: 'Entropy of protocol/port usage' },
      { name: 'direction', type: 'VARCHAR', description: 'Inbound / Outbound / East-West' },
      { name: 'label', type: 'VARCHAR', description: 'Benign / Malicious / Unknown' },
    ]
  },
  {
    tableName: 'hybrid_alerts',
    fields: [
      { name: 'alert_id', type: 'INT PK', description: 'Unique alert identifier' },
      { name: 'tenant_id', type: 'VARCHAR', description: 'Tenant / customer ID' },
      { name: 'signature_id', type: 'VARCHAR', description: 'Matched signature rule ID' },
      { name: 'sig_score', type: 'FLOAT', description: 'Signature engine score' },
      { name: 'ml_score', type: 'FLOAT', description: 'ML anomaly/confidence score' },
      { name: 'combined_score', type: 'FLOAT', description: 'Final hybrid risk score' },
      { name: 'severity', type: 'VARCHAR', description: 'Low / Medium / High / Critical' },
      { name: 'status', type: 'VARCHAR', description: 'Open / In-Progress / Resolved' },
    ]
  }
];

export const PHASES = [
  { id: 1, title: 'Problem Definition & Analysis', desc: 'Study cloud-specific attack vectors (VM escape, lateral movement) and analyze traditional IDS limitations.' },
  { id: 2, title: 'Requirement & Data Collection', desc: 'Define hybrid requirements and collect cloud network datasets (CICIDS2017, AWS PCAPs).' },
  { id: 3, title: 'Signature Engine Development', desc: 'Implement Suricata/Zeek rules for known exploits and cloud-specific signatures.' },
  { id: 4, title: 'ML Model Development', desc: 'Train SVM, Random Forest, and LSTM models on extracted flow features (packet size, inter-arrival times).' },
  { id: 5, title: 'Hybrid Correlation Engine', desc: 'Develop multi-evidence scoring to combine signature hits with ML anomaly scores.' },
  { id: 6, title: 'Cloud Integration', desc: 'Traffic mirroring from gateways/hypervisors and container orchestration.' },
  { id: 7, title: 'Web Console & Deployment', desc: 'Real-time dashboards, RBAC, and cloud marketplace packaging.' },
];
