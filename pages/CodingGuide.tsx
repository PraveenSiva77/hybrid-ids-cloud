import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Database, FileCode, Cpu, BarChart, Server, Play, Copy, Check, Layers, Monitor, Volume2, StopCircle, Loader2, Globe } from 'lucide-react';
import clsx from 'clsx';
import { GoogleGenAI, Modality } from "@google/genai";

// Helper Icon for step 5
const ShieldCheckIcon = (props: any) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" viewBox="0 0 24 24" 
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
      {...props}
    >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);

const steps = [
  {
    id: 'setup',
    title: '1. Initialization & Setup',
    icon: <Terminal className="w-6 h-6 text-blue-400" />,
    desc: 'Setting up the Python environment and necessary libraries for network analysis.',
    code: `# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\\Scripts\\activate on Windows

# Install dependencies
pip install pandas numpy scikit-learn tensorflow keras matplotlib seaborn scapy fastapi uvicorn`
  },
  {
    id: 'dataset',
    title: '2. Dataset Acquisition',
    icon: <Database className="w-6 h-6 text-yellow-400" />,
    desc: 'Loading network traffic data (e.g., CICIDS2017 or KDD99) into a Pandas DataFrame.',
    code: `import pandas as pd

# Load the dataset
# Common columns: Source IP, Dest IP, Protocol, Packet Length Mean, Flow Duration
df = pd.read_csv('network_traffic_data.csv')

# Inspect the data
print(df.head())
print(df.info())  # Check for null values and data types`
  },
  {
    id: 'preprocess',
    title: '3. Data Preprocessing',
    icon: <FileCode className="w-6 h-6 text-purple-400" />,
    desc: 'Cleaning, encoding categorical data, and scaling numerical features for the ML model.',
    code: `from sklearn.preprocessing import LabelEncoder, MinMaxScaler
from sklearn.model_selection import train_test_split

# 1. Clean Data (Remove nulls/infinite values)
df.dropna(inplace=True)

# 2. Encode Categorical Features 
# e.g., Protocol: TCP->0, UDP->1
le = LabelEncoder()
df['protocol_encoded'] = le.fit_transform(df['protocol'])

# 3. Select Features & Target
# X = Input Features, y = Label (Benign/Malicious)
X = df[['dst_port', 'protocol_encoded', 'flow_duration', 'tot_fwd_pkts', 'tot_bwd_pkts', 'pkt_len_mean']]
y = df['label']

# 4. Normalize/Scale Numerical Data (0 to 1 range)
scaler = MinMaxScaler()
X_scaled = scaler.fit_transform(X)

# 5. Split Data into Training and Testing sets
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)`
  },
  {
    id: 'training',
    title: '4. Model Training (ML Engine)',
    icon: <Cpu className="w-6 h-6 text-green-400" />,
    desc: 'Training a Random Forest Classifier and a Deep Neural Network.',
    code: `from sklearn.ensemble import RandomForestClassifier
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout

# --- Option A: Random Forest (Traditional ML) ---
rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
rf_model.fit(X_train, y_train)
print("RF Accuracy:", rf_model.score(X_test, y_test))

# --- Option B: Deep Neural Network (Deep Learning) ---
model = Sequential([
    Dense(64, activation='relu', input_shape=(X_train.shape[1],)),
    Dropout(0.2),
    Dense(32, activation='relu'),
    Dense(1, activation='sigmoid')  # Binary classification
])

model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
model.fit(X_train, y_train, epochs=10, batch_size=32)`
  },
    {
    id: 'signature',
    title: '5. Signature & Packet Processing',
    icon: <ShieldCheckIcon className="w-6 h-6 text-orange-400" />,
    desc: 'Using Scapy to sniff packets and apply signature rules.',
    code: `from scapy.all import sniff, IP, TCP

# Define a simple signature (e.g., checking for specific content)
def check_signature(packet):
    if packet.haslayer(TCP) and packet.haslayer(Raw):
        payload = str(packet[Raw].load)
        if "UNION SELECT" in payload:
            return True, "SQL Injection Detected"
    return False, None

# Callback function for live traffic sniffing
def process_packet(packet):
    is_threat, msg = check_signature(packet)
    if is_threat:
        print(f"ALERT: {msg} from {packet[IP].src}")

# Start sniffing on interface (requires sudo/admin)
# sniff(filter="tcp", prn=process_packet, count=10)`
  },
  {
    id: 'hybrid',
    title: '6. Hybrid Correlation Logic',
    icon: <Server className="w-6 h-6 text-red-400" />,
    desc: 'Combining ML probabilities with Signature alerts to reduce false positives.',
    code: `def hybrid_analysis(packet, ml_model, signature_db):
    # 1. Check Signature (Scapy-based logic)
    sig_match, sig_msg = check_signature(packet)
    
    # 2. Check ML Model
    features = extract_features(packet) # Helper to convert packet to model input
    ml_prob = ml_model.predict_proba([features])[0][1] # Probability of being malicious
    
    # 3. Correlation Logic
    final_score = 0
    reason = "Safe"
    
    if sig_match:
        final_score = 1.0
        reason = f"Signature Match: {sig_msg}"
    elif ml_prob > 0.8:
        final_score = ml_prob
        reason = "High ML Anomaly Score"
    elif ml_prob > 0.5 and not sig_match:
         # Lower confidence anomaly, maybe flag for review
         final_score = ml_prob
         reason = "Suspicious Behavioral Pattern"
         
    return {"score": final_score, "reason": reason}`
  },
  {
    id: 'visualize',
    title: '7. Visualization (Backend API)',
    icon: <BarChart className="w-6 h-6 text-cyan-400" />,
    desc: 'Exposing results via FastAPI for the React frontend.',
    code: `from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI()

class Alert(BaseModel):
    id: int
    type: str
    score: float
    desc: str

@app.get("/api/alerts", response_model=List[Alert])
def get_alerts():
    # Fetch processed alerts from database (PostgreSQL/SQLite)
    return [
        {"id": 1, "type": "Hybrid", "score": 0.95, "desc": "SQL Injection + High Anomaly"},
        {"id": 2, "type": "ML", "score": 0.82, "desc": "Abnormal Data Exfiltration"}
    ]

# Run with: uvicorn main:app --reload`
  },
  {
    id: 'deploy',
    title: '8. Deployment (Docker)',
    icon: <Play className="w-6 h-6 text-pink-400" />,
    desc: 'Containerizing the application for consistency.',
    code: `# Dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

# Start FastAPI using Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`
  }
];

const LANGUAGES = [
  { code: 'en', name: 'English', voice: 'Kore' },
  { code: 'es', name: 'Spanish', voice: 'Puck' },
  { code: 'fr', name: 'French', voice: 'Charon' },
  { code: 'de', name: 'German', voice: 'Fenrir' },
  { code: 'hi', name: 'Hindi', voice: 'Kore' }, 
  { code: 'ja', name: 'Japanese', voice: 'Kore' },
  { code: 'ta', name: 'Tamil', voice: 'Kore' },
  { code: 'tanglish', name: 'Tanglish (Conversational)', voice: 'Kore' }
];

// --- Audio Helper Functions ---

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const CodingGuide: React.FC = () => {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [language, setLanguage] = useState('en');
    const [speakingStepId, setSpeakingStepId] = useState<string | null>(null);
    const [loadingStepId, setLoadingStepId] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

    useEffect(() => {
        return () => stopAudio();
    }, []);

    const stopAudio = () => {
        if (sourceNodeRef.current) {
            sourceNodeRef.current.stop();
            sourceNodeRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setSpeakingStepId(null);
    };

    const handleCopy = (code: string, index: number) => {
        navigator.clipboard.writeText(code);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleExplainStep = async (step: typeof steps[0]) => {
        // If currently speaking this step, stop it
        if (speakingStepId === step.id) {
            stopAudio();
            return;
        }
        
        // If speaking another step, stop that first
        if (speakingStepId) {
            stopAudio();
        }

        if (!process.env.API_KEY) {
            alert("API Key missing.");
            return;
        }

        setLoadingStepId(step.id);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const langConfig = LANGUAGES.find(l => l.code === language);
            const langName = langConfig?.name || 'English';
            const voiceName = langConfig?.voice || 'Kore';

            // 1. Generate Deep Explanation Text
            let prompt = `
                You are a senior computer science professor teaching a cybersecurity course on building an Intrusion Detection System (IDS).
                
                I need a detailed spoken explanation for the following implementation step:
                
                **Step Title**: ${step.title}
                **Description**: ${step.desc}
                **Code Snippet**: 
                ${step.code}

                Please structure your explanation to cover these four key areas clearly:
                1. **What**: Briefly explain what this specific step is achieving in the context of the project.
                2. **Why**: Why is this step critical? What happens if we skip it?
                3. **Algorithm/Process**: Explain the logic inside the code. If it's ML, explain the algorithm (e.g., Random Forest logic). If it's preprocessing, explain why scaling matters. If it's code, explain the key functions used.
                4. **Outcome**: What is the result of running this code block?

                Constraint:
                - Output Language: ${langName}
                - If Tanglish is selected, use a mix of Tamil and English (English for technical terms).
                - Keep it engaging, educational, and easy to follow as an audio script.
                - Duration: Aim for about 45-60 seconds of speech.
            `;

            const textResp = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: prompt
            });

            const explanationText = textResp.text || `Here is an explanation for ${step.title}.`;

            // 2. Generate Audio
            const ttsResp = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: { parts: [{ text: explanationText }] },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voiceName }
                        }
                    }
                }
            });

            const audioData = ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

            if (audioData) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                const audioBuffer = await decodeAudioData(
                    decode(audioData),
                    audioContextRef.current,
                    24000,
                    1
                );

                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContextRef.current.destination);
                source.onended = () => setSpeakingStepId(null);
                source.start();
                sourceNodeRef.current = source;
                setSpeakingStepId(step.id);
            }

        } catch (error) {
            console.error("Explanation Error:", error);
            alert("Failed to generate explanation audio.");
        } finally {
            setLoadingStepId(null);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Development Guide</h1>
                    <p className="text-slate-400">Step-by-step implementation reference for the CloudGuard IDS Project.</p>
                </div>
                
                {/* Language Selector */}
                <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-lg border border-slate-700">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <select 
                        value={language}
                        onChange={(e) => { setLanguage(e.target.value); stopAudio(); }}
                        className="bg-transparent text-sm text-slate-200 outline-none cursor-pointer focus:ring-0"
                    >
                        {LANGUAGES.map(lang => (
                            <option key={lang.code} value={lang.code} className="bg-slate-900">{lang.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tech Stack Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Layers className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-xl font-bold text-white">Technology Stack</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Frontend */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-cyan-500/30 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <Monitor className="w-5 h-5 text-cyan-400" />
                            <h3 className="font-bold text-slate-200">Frontend</h3>
                        </div>
                        <ul className="space-y-2 text-slate-400 text-sm">
                            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>React.js (with Vite)</li>
                            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>Tailwind CSS</li>
                            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>Axios</li>
                            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>Recharts</li>
                        </ul>
                    </div>

                    {/* Backend & ML */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-cyan-500/30 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <Server className="w-5 h-5 text-cyan-400" />
                            <h3 className="font-bold text-slate-200">Backend & ML</h3>
                        </div>
                        <ul className="space-y-2 text-slate-400 text-sm">
                            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>Python FastAPI</li>
                            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>Scikit-learn, TensorFlow/Keras</li>
                            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>Pandas, NumPy</li>
                            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>Scapy (Packet Processing)</li>
                        </ul>
                    </div>

                    {/* Database & Tools */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-cyan-500/30 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <Database className="w-5 h-5 text-cyan-400" />
                            <h3 className="font-bold text-slate-200">Database & Tools</h3>
                        </div>
                        <ul className="space-y-2 text-slate-400 text-sm">
                            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>SQLite / PostgreSQL</li>
                            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>Git / GitHub</li>
                            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>VS Code</li>
                            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>Docker</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {steps.map((step, index) => (
                    <div key={step.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        
                        {/* Header */}
                        <div className="p-6 border-b border-slate-800 bg-slate-950/30 flex items-start gap-4">
                            <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                                {step.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-slate-100">{step.title}</h3>
                                <p className="text-slate-400 text-sm mt-1">{step.desc}</p>
                            </div>
                            
                            {/* Audio Explanation Button */}
                            <button 
                                onClick={() => handleExplainStep(step)}
                                disabled={loadingStepId === step.id}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md min-w-[140px] justify-center",
                                    speakingStepId === step.id 
                                        ? "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30" 
                                        : "bg-cyan-900/30 text-cyan-400 border border-cyan-800 hover:bg-cyan-900/50 hover:text-cyan-300"
                                )}
                            >
                                {loadingStepId === step.id ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Generating...</span>
                                    </>
                                ) : speakingStepId === step.id ? (
                                    <>
                                        <StopCircle className="w-4 h-4" />
                                        <span>Stop Audio</span>
                                    </>
                                ) : (
                                    <>
                                        <Volume2 className="w-4 h-4" />
                                        <span>Explain</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Code Block */}
                        <div className="relative bg-[#0d1117] p-6 overflow-x-auto group">
                            <button 
                                onClick={() => handleCopy(step.code, index)}
                                className="absolute top-4 right-4 p-2 bg-slate-800 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Copy Code"
                            >
                                {copiedIndex === index ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <pre className="text-sm font-mono text-slate-300 leading-relaxed">
                                <code>{step.code}</code>
                            </pre>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-center p-8 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                <div className="text-center">
                    <Layers className="w-10 h-10 text-cyan-400 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-white">Ready to Deploy?</h3>
                    <p className="text-slate-400 text-sm mt-2 max-w-md">
                        Ensure all services (Frontend, Python Backend, Database, Suricata) are running within their respective Docker containers.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CodingGuide;