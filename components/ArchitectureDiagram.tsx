import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { Cloud, Server, ShieldAlert, Cpu, Database, Monitor, Share2, ArrowDown, ArrowRight, X, Volume2, Languages, Loader2, StopCircle, Download, BookOpen, Mic } from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import clsx from 'clsx';
// @ts-ignore
import html2canvas from 'html2canvas';

// --- WAV Encoding Helpers (Duplicated for standalone component usage) ---
function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function encodeWAV(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPCM(view, 44, samples);

  return view;
}

// --- Types & Data ---

type NodeKey = 'workloads' | 'mirroring' | 'ingestion' | 'signature' | 'ml' | 'correlation' | 'console' | 'integrations';

interface NodeDetail {
  title: string;
  icon: React.ReactNode;
  description: string;
  why: string;
  when: string;
  examples: string[];
}

const NODE_DETAILS: Record<NodeKey, NodeDetail> = {
  workloads: {
    title: "Cloud Workloads",
    icon: <Cloud className="w-8 h-8 text-blue-400" />,
    description: "The computing resources (Virtual Machines, Containers, Serverless functions) running your applications in the cloud environment.",
    why: "These are the primary assets that require protection from network-based attacks.",
    when: "Continuously active; the source and destination of all network traffic.",
    examples: ["AWS EC2 Instances", "Kubernetes Pods", "Google Cloud Functions", "Azure VMs"]
  },
  mirroring: {
    title: "Traffic Mirroring",
    icon: <Share2 className="w-8 h-8 text-purple-400" />,
    description: "A non-intrusive method to copy network traffic from an elastic network interface and send it to an out-of-band security appliance.",
    why: "Allows for deep packet inspection without adding latency to the actual application traffic (passive monitoring).",
    when: "Real-time, as packets traverse the network interface.",
    examples: ["AWS VPC Traffic Mirroring", "GCP Packet Mirroring", "Virtual Switch Port Mirroring (SPAN)"]
  },
  ingestion: {
    title: "Ingestion Layer",
    icon: <Database className="w-8 h-8 text-yellow-400" />,
    description: "A high-throughput buffering system that collects raw packets or flow logs before processing.",
    why: "Decouples the high-speed data stream from the processing engines, preventing data loss during traffic spikes.",
    when: "Between the mirroring source and the analysis engines.",
    examples: ["Apache Kafka", "Redis Streams", "RabbitMQ", "AWS Kinesis"]
  },
  signature: {
    title: "Signature Engine",
    icon: <ShieldAlert className="w-10 h-10 text-blue-400" />,
    description: "A rule-based detection system that compares packet contents against a database of known threat patterns.",
    why: "Extremely fast and accurate for detecting known exploits, malware signatures, and policy violations.",
    when: "Processed immediately after ingestion; effective against historical/known threats.",
    examples: ["Suricata IDS", "Snort", "Zeek (Bro)", "Emerging Threats Rule Set"]
  },
  ml: {
    title: "ML Detection Engine",
    icon: <Cpu className="w-10 h-10 text-green-400" />,
    description: "An AI-driven analysis engine that uses statistical models to identify anomalies in traffic behavior.",
    why: "Essential for detecting zero-day attacks, slow brute-force attempts, and data exfiltration patterns that have no known signature.",
    when: "Runs in parallel with signature detection; often uses windowed time-series data.",
    examples: ["Random Forest Classifier", "LSTM Autoencoders", "Isolation Forest", "SVM"]
  },
  correlation: {
    title: "Hybrid Correlation Engine",
    icon: <Server className="w-10 h-10 text-indigo-400" />,
    description: "The core logic unit that combines outputs from both Signature and ML engines to generate a unified risk score.",
    why: "Reduces false positives by requiring multi-factor evidence (e.g., a weak signature match reinforced by a strong ML anomaly score).",
    when: "Post-processing, after both engines have analyzed a flow window.",
    examples: ["Weighted Scoring Algorithms", "Bayesian Networks", "Rule-based Aggregation"]
  },
  console: {
    title: "Web Console",
    icon: <Monitor className="w-8 h-8 text-cyan-400" />,
    description: "The user interface for security analysts to visualize network health, investigate alerts, and configure the system.",
    why: "Provides human-readable insights from complex network data.",
    when: "Used on-demand by SecOps teams for monitoring and reporting.",
    examples: ["React Dashboard", "Kibana", "Grafana"]
  },
  integrations: {
    title: "External Integrations",
    icon: <Share2 className="w-8 h-8 text-orange-400" />,
    description: "Connectors that push alert data to broader security ecosystems for incident response.",
    why: "Ensures alerts trigger workflows (like isolating a VM) in external systems.",
    when: "Triggered immediately when a High/Critical alert is confirmed.",
    examples: ["Splunk (SIEM)", "PagerDuty", "Slack Webhooks", "Jira Tickets"]
  }
};

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

// --- Components ---

const ArchitectureDiagram = forwardRef<HTMLDivElement, {}>((props, ref) => {
  const [selectedNode, setSelectedNode] = useState<NodeKey | null>(null);
  const [speakingMode, setSpeakingMode] = useState<'summary' | 'deep' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [audioDownloadUrl, setAudioDownloadUrl] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const localRef = useRef<HTMLDivElement>(null);

  // Sync refs
  const setRef = (element: HTMLDivElement) => {
    localRef.current = element;
    if (typeof ref === 'function') {
      ref(element);
    } else if (ref) {
      ref.current = element;
    }
  };

  useEffect(() => {
    return () => {
      stopAudio();
    };
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
    setSpeakingMode(null);
  };

  const handleSpeak = async (mode: 'summary' | 'deep') => {
    if (speakingMode === mode) {
      stopAudio();
      return;
    }
    // Stop any existing audio before starting new
    stopAudio();

    if (!selectedNode || !process.env.API_KEY) return;

    setSpeakingMode(mode);
    setIsLoading(true);
    setAudioDownloadUrl(null); // Reset download link

    const detail = NODE_DETAILS[selectedNode];

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const langConfig = LANGUAGES.find(l => l.code === language);
      const langName = langConfig?.name || 'English';
      const voiceName = langConfig?.voice || 'Kore';

      // 1. Generate Rich Explanation Script based on Mode
      let prompt = "";

      if (mode === 'summary') {
          prompt = `
            You are a cybersecurity expert explaining the architecture component "${detail.title}" to a student or junior developer.
            
            Technical Context:
            - Description: ${detail.description}
            - Importance (Why): ${detail.why}
            - Operation (When): ${detail.when}
            - Examples: ${detail.examples.join(', ')}

            Task: Generate a spoken explanation script with the following structure:
            1. **Simple Definition**: Define what it is clearly.
            2. **Real-World Analogy**: Use a non-technical analogy (e.g., comparing a Firewall to a Security Guard, Traffic Mirroring to a CCTV Camera, or Kafka to a Post Office).
            3. **Real-Time Scenario**: Describe how this specific component reacts in a live attack scenario (e.g., "If a hacker tries to launch a DDoS attack, this component will...").
            
            Constraints:
            - Keep the total length around 4-6 sentences.
            - Make it conversational and engaging.
          `;
      } else {
          prompt = `
            You are a Senior System Architect explaining the component "${detail.title}" to a Principal Engineer.
            This is a Deep Technical Dive.

            Technical Context:
            - Description: ${detail.description}
            - Examples: ${detail.examples.join(', ')}

            Task: Generate a detailed technical explanation script covering:
            1. **Technical Definition**: A precise, high-level engineering definition.
            2. **Why this architecture?**: Justify why this component is necessary (e.g., decoupling, scalability, latency reduction).
            3. **Algorithm & Logic**: Explain the specific algorithms or underlying logic. 
               - If Signature Engine: Mention pattern matching algorithms (e.g., Aho-Corasick).
               - If ML Engine: Mention Random Forest/LSTM for anomaly detection.
               - If Traffic Mirroring: Mention VXLAN encapsulation or TAP mechanisms.
            4. **Process Flow**: Step-by-step data flow through this component.

            Constraints:
            - Detailed and technical.
            - Length: Around 8-10 sentences.
          `;
      }

      // Add Language Constraints
      if (language === 'tanglish') {
         prompt += `
         Output Language: Tanglish (Mixed Tamil and English).
         - Use English for all technical terms (like "Traffic Mirroring", "Packets", "Architecture", "Algorithms").
         - Use Tamil for the explanation flow, connecting verbs, and casual conversation.
         - Style: Friendly, colloquial, but technically accurate.
         `;
      } else if (language !== 'en') {
         prompt += `
         Output Language: ${langName}.
         - Translate the explanation naturally into ${langName}.
         `;
      } else {
         prompt += `
         Output Language: English.
         - Style: Professional, clear, and educational.
         `;
      }

      // Generate the text
      const textResp = await ai.models.generateContent({
           model: "gemini-3-flash-preview",
           contents: prompt
      });

      const textToSpeak = textResp.text || `${detail.title}. ${detail.description}`;

      // 2. TTS Generation
      const ttsResp = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: { parts: [{ text: textToSpeak }] },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { 
                voiceName: voiceName 
              },
            },
          },
        },
      });

      const audioData = ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (audioData) {
        // 3. Play Audio
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const decodedBytes = decode(audioData);
        const audioBuffer = await decodeAudioData(
            decodedBytes,
            audioContextRef.current,
            24000,
            1
        );

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => setSpeakingMode(null);
        source.start();
        sourceNodeRef.current = source;
        setSpeakingMode(mode);

        // 4. Create Download Link (WAV)
        const wavData = encodeWAV(audioBuffer.getChannelData(0), 24000);
        const blob = new Blob([wavData], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioDownloadUrl(url);
      }

    } catch (error) {
      console.error("TTS Error:", error);
      alert("Failed to generate audio. Please check API Key or try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadDiagram = async () => {
    if (localRef.current) {
        try {
            const canvas = await html2canvas(localRef.current, {
                backgroundColor: null, // Ensures transparent background
                scale: 2, // High resolution
            });
            const link = document.createElement('a');
            link.download = 'CloudGuard_Architecture.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error("Failed to generate diagram image:", error);
            alert("Could not download diagram.");
        }
    }
  };

  const NodeCard = ({ id, children, className }: { id: NodeKey, children?: React.ReactNode, className?: string }) => (
    <div 
      onClick={() => { setSelectedNode(id); stopAudio(); setAudioDownloadUrl(null); }}
      className={clsx(
        "cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] active:scale-95",
        className
      )}
    >
      {children}
    </div>
  );

  return (
    <>
      <div className="w-full bg-slate-800/50 p-8 rounded-xl border border-slate-700 overflow-hidden relative">
        <div className="flex justify-between items-start mb-8 relative z-20">
            <div className="text-center w-full pointer-events-none">
                <h3 className="text-xl font-semibold text-cyan-400">System Architecture Flow</h3>
                <p className="text-slate-400 text-sm">Click on any component to view details</p>
            </div>
            <button 
                onClick={handleDownloadDiagram}
                className="absolute right-0 top-0 p-2 bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 rounded-lg transition-colors border border-slate-600 hover:border-cyan-500/50 z-30 pointer-events-auto"
                title="Download Diagram (PNG)"
            >
                <Download className="w-5 h-5" />
            </button>
        </div>
        
        {/* We attach the ref to the inner container to capture nodes with transparent background */}
        <div ref={setRef} className="flex flex-col gap-8 max-w-5xl mx-auto p-4">
          
          {/* Layer 1: Infrastructure & Mirroring */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            <NodeCard id="workloads" className="bg-slate-900 border border-slate-600 p-4 rounded-lg flex flex-col items-center text-center relative z-10 hover:border-blue-400">
              <Cloud className="w-8 h-8 text-blue-400 mb-2" />
              <h4 className="font-bold text-white">1. Cloud Workloads</h4>
              <p className="text-xs text-slate-400">VMs, Containers, Serverless</p>
            </NodeCard>
            
            <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2">
               <ArrowRight className="text-slate-500 animate-pulse" />
            </div>

            <NodeCard id="mirroring" className="bg-slate-900 border border-slate-600 p-4 rounded-lg flex flex-col items-center text-center relative z-10 hover:border-purple-400">
              <Share2 className="w-8 h-8 text-purple-400 mb-2" />
              <h4 className="font-bold text-white">2. Traffic Mirroring</h4>
              <p className="text-xs text-slate-400">VPC Taps, Hypervisors</p>
            </NodeCard>
          </div>

          {/* Connector */}
          <div className="flex justify-center -my-4">
            <ArrowDown className="text-slate-500 w-8 h-8" />
          </div>

          {/* Layer 2: Ingestion */}
          <NodeCard id="ingestion" className="mx-auto w-full md:w-1/2 bg-slate-900 border border-slate-600 p-4 rounded-lg flex flex-col items-center text-center hover:border-yellow-400">
            <Database className="w-8 h-8 text-yellow-400 mb-2" />
            <h4 className="font-bold text-white">3. Ingestion Layer</h4>
            <p className="text-xs text-slate-400">Kafka / Packet Aggregation</p>
          </NodeCard>

          {/* Connector */}
          <div className="flex justify-center -my-4">
            <ArrowDown className="text-slate-500 w-8 h-8" />
          </div>

          {/* Layer 3: Dual Engines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <NodeCard id="signature" className="bg-blue-900/20 border border-blue-500/50 p-6 rounded-lg flex flex-col items-center text-center hover:bg-blue-900/30">
              <ShieldAlert className="w-10 h-10 text-blue-400 mb-2" />
              <h4 className="font-bold text-white">4. Signature Engine</h4>
              <p className="text-xs text-blue-200">Suricata / Zeek Rules<br/>Known Exploits</p>
            </NodeCard>

            <NodeCard id="ml" className="bg-green-900/20 border border-green-500/50 p-6 rounded-lg flex flex-col items-center text-center hover:bg-green-900/30">
              <Cpu className="w-10 h-10 text-green-400 mb-2" />
              <h4 className="font-bold text-white">5. ML Detection Engine</h4>
              <p className="text-xs text-green-200">SVM, Random Forest, LSTM<br/>Anomaly Detection</p>
            </NodeCard>
          </div>

          {/* Connector */}
          <div className="flex justify-center -my-4">
            <div className="flex gap-32">
               <ArrowDown className="text-slate-500 w-8 h-8 rotate-[-20deg]" />
               <ArrowDown className="text-slate-500 w-8 h-8 rotate-[20deg]" />
            </div>
          </div>

          {/* Layer 4: Correlation */}
          <NodeCard id="correlation" className="mx-auto w-full bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500 p-6 rounded-lg flex flex-col items-center text-center shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]">
            <Server className="w-10 h-10 text-indigo-400 mb-2" />
            <h4 className="font-bold text-white text-lg">6. Hybrid Correlation & Alert Engine</h4>
            <p className="text-sm text-indigo-200">Multi-evidence scoring, Deduplication, Severity Classification</p>
          </NodeCard>

          {/* Connector */}
          <div className="flex justify-center -my-4">
            <ArrowDown className="text-slate-500 w-8 h-8" />
          </div>

          {/* Layer 5: Output */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <NodeCard id="console" className="bg-slate-900 border border-slate-600 p-4 rounded-lg flex flex-col items-center text-center hover:border-cyan-400">
              <Monitor className="w-8 h-8 text-cyan-400 mb-2" />
              <h4 className="font-bold text-white">7. Web Console</h4>
              <p className="text-xs text-slate-400">Dashboards, Analytics</p>
            </NodeCard>
             <NodeCard id="integrations" className="bg-slate-900 border border-slate-600 p-4 rounded-lg flex flex-col items-center text-center hover:border-orange-400">
              <Share2 className="w-8 h-8 text-orange-400 mb-2" />
              <h4 className="font-bold text-white">8. External Integrations</h4>
              <p className="text-xs text-slate-400">SIEM, SOAR Export</p>
            </NodeCard>
          </div>

        </div>
      </div>

      {/* Detail Modal */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg">
                  {NODE_DETAILS[selectedNode].icon}
                </div>
                <h2 className="text-2xl font-bold text-white">{NODE_DETAILS[selectedNode].title}</h2>
              </div>
              <button 
                onClick={() => { setSelectedNode(null); stopAudio(); }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <div>
                <h3 className="text-lg font-semibold text-cyan-400 mb-2">Description</h3>
                <p className="text-slate-300 leading-relaxed">{NODE_DETAILS[selectedNode].description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  <h3 className="text-sm font-bold text-green-400 uppercase mb-2">Why use this?</h3>
                  <p className="text-sm text-slate-300">{NODE_DETAILS[selectedNode].why}</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  <h3 className="text-sm font-bold text-orange-400 uppercase mb-2">When does it run?</h3>
                  <p className="text-sm text-slate-300">{NODE_DETAILS[selectedNode].when}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-purple-400 uppercase mb-3">Key Examples</h3>
                <div className="flex flex-wrap gap-2">
                  {NODE_DETAILS[selectedNode].examples.map((ex, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-800 text-slate-300 text-sm rounded-full border border-slate-700">
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer / Actions */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col gap-4">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Languages className="text-slate-400 w-5 h-5" />
                  <select 
                    value={language}
                    onChange={(e) => { setLanguage(e.target.value); stopAudio(); setAudioDownloadUrl(null); }}
                    className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg p-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                </div>

                {audioDownloadUrl && (
                    <a 
                      href={audioDownloadUrl} 
                      download={`${selectedNode}_explanation.wav`}
                      className="flex items-center gap-2 text-green-400 hover:text-green-300 text-sm font-medium transition-colors"
                    >
                      <Download className="w-4 h-4" /> Download Audio
                    </a>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button 
                  onClick={() => handleSpeak('summary')}
                  disabled={isLoading}
                  className={clsx(
                    "flex items-center justify-center gap-2 px-4 py-2 rounded-full font-medium transition-all shadow-lg border",
                    speakingMode === 'summary'
                      ? "bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30"
                      : "bg-slate-800 text-cyan-400 border-slate-700 hover:bg-slate-700 hover:border-cyan-500/50"
                  )}
                >
                  {isLoading && speakingMode === 'summary' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : speakingMode === 'summary' ? (
                    <>
                      <StopCircle className="w-4 h-4" /> Stop
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" /> Listen to Overview
                    </>
                  )}
                </button>

                <button 
                  onClick={() => handleSpeak('deep')}
                  disabled={isLoading}
                  className={clsx(
                    "flex items-center justify-center gap-2 px-4 py-2 rounded-full font-medium transition-all shadow-lg border",
                    speakingMode === 'deep'
                      ? "bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30"
                      : "bg-indigo-600/20 text-indigo-400 border-indigo-500/50 hover:bg-indigo-600/30 hover:border-indigo-400"
                  )}
                >
                  {isLoading && speakingMode === 'deep' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : speakingMode === 'deep' ? (
                    <>
                      <StopCircle className="w-4 h-4" /> Stop
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4" /> Deep Dive (Technical)
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
});

ArchitectureDiagram.displayName = "ArchitectureDiagram";

export default ArchitectureDiagram;