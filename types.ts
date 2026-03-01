export interface Alert {
  id: string;
  timestamp: string;
  sourceIp: string;
  destIp: string;
  type: 'Signature' | 'ML' | 'Hybrid';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  score: number;
}

export interface MetricData {
  time: string;
  traffic: number;
  anomalies: number;
}

export interface TenantStat {
  name: string;
  alerts: number;
  traffic: string;
  status: 'Secure' | 'Warning' | 'Critical';
}

export interface DatabaseField {
  name: string;
  type: string;
  description: string;
}

export interface DatabaseTable {
  tableName: string;
  fields: DatabaseField[];
}