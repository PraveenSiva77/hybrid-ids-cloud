import React, { useState, useRef, useEffect } from 'react';
import { Download, Database, Layers, CheckCircle, BrainCircuit, PlayCircle, StopCircle, Globe, Loader2, User, Building, FileText, Monitor, Server, Cpu, Save, Shield, ClipboardCheck, Terminal, Code2, FileType, Printer, FileCode, Play, X, Zap, Volume2, Presentation, FileBarChart, ArrowRight, ChevronRight, ChevronLeft } from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import { DB_SCHEMA, PHASES } from '../constants';
import ArchitectureDiagram from '../components/ArchitectureDiagram';
import clsx from 'clsx';
import { DatabaseTable } from '../types';
// @ts-ignore
import jsPDF from 'jspdf';
// @ts-ignore
import 'jspdf-autotable';
// @ts-ignore
import PptxGenJS from 'pptxgenjs';
// @ts-ignore
import html2canvas from 'html2canvas';

const LANGUAGES = [
  { code: 'tanglish', name: 'Tanglish', voice: 'Kore' },
  { code: 'en', name: 'English', voice: 'Kore' },
  { code: 'ta', name: 'Tamil', voice: 'Kore' },
  { code: 'es', name: 'Spanish', voice: 'Puck' },
  { code: 'fr', name: 'French', voice: 'Charon' },
  { code: 'de', name: 'German', voice: 'Fenrir' },
  { code: 'hi', name: 'Hindi', voice: 'Kore' }, 
  { code: 'ja', name: 'Japanese', voice: 'Kore' },
];

// --- Type Definitions for Review Content ---
type ContentSlide = {
  type: 'title' | 'text' | 'list';
  title: string;
  content: string[];
};

type DiagramSlide = {
  type: 'diagram';
  title: string;
  content: string;
};

type SplitSlide = {
  type: 'split';
  title: string;
  leftHeader: string;
  rightHeader: string;
  left: string[];
  right: string[];
};

type TableSlide = {
  type: 'table';
  title: string;
  tables: DatabaseTable[];
};

type Slide = ContentSlide | DiagramSlide | SplitSlide | TableSlide;

interface ReviewSection {
  title: string;
  slides: Slide[];
}

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

const About: React.FC = () => {
  const [activeReview, setActiveReview] = useState<'review1' | 'review2' | 'review3'>('review1');
  const [language, setLanguage] = useState('tanglish');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [audioDownloadUrl, setAudioDownloadUrl] = useState<string | null>(null);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  
  // Viewer States
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPPTModal, setShowPPTModal] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Test Terminal State
  const [showTerminal, setShowTerminal] = useState(false);
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const diagramRef = useRef<HTMLDivElement>(null);

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
    setIsPlaying(false);
  };

  const getReviewTitle = () => {
      switch(activeReview) {
          case 'review1': return 'Phase 1: Intro & Survey';
          case 'review2': return 'Phase 2: System Design & Architecture';
          case 'review3': return 'Phase 3: Implementation & Testing';
      }
  }

  // --- Data for Reports/PPTs ---
  const COMMON_DATA = {
      title: "CloudGuard IDS - Hybrid Intrusion Detection System",
      guide: "Dr. K. Siva Kumar",
      guideDetails: [
          "MSc., M.C.A, M.Phil., Ph.D",
          "Associate Professor and Head",
          "PG-Department of Computer Science",
          "Kathir College of Arts and Science"
      ],
      student: "Bharathi Rathinam .S",
      studentDetails: [
          "21MSCCS03",
          "II – M.SC (CS)",
          "PG-Department of Computer Science",
          "Kathir College of Arts and Science"
      ],
      company: "Kathir College of Arts and Science",
      synopsis: "CloudGuard is a Hybrid IDS leveraging Traffic Mirroring to detect both known (Signature) and unknown (ML) threats in cloud environments (East-West traffic).",
  };

  // Structured content for generation
  const REVIEW_CONTENT: Record<string, ReviewSection> = {
      review1: {
          title: "Review I: Introduction & Survey",
          slides: [
              { title: "Project Overview", type: 'title', content: [COMMON_DATA.title, "Guide: " + COMMON_DATA.guide, "Student: " + COMMON_DATA.student] },
              { title: "Institution Profile", type: 'text', content: ["Institution: Kathir College of Arts and Science", "Department: PG-Department of Computer Science", "Project: Final Year M.SC (CS) Project"] },
              { title: "Abstract", type: 'text', content: [COMMON_DATA.synopsis] },
              { title: "Project Phases", type: 'list', content: PHASES.map(p => `Phase ${p.id}: ${p.title} - ${p.desc}`) },
              { title: "Hardware Requirements", type: 'list', content: ["Processor: Intel Core i5 (Quad Core) or equivalent", "RAM: 8GB Minimum (16GB Recommended)", "Storage: 256GB SSD (NVMe preferred)", "Network: Gigabit Ethernet Adapter"] },
              { title: "Software Requirements", type: 'list', content: ["OS: Ubuntu Linux 20.04 LTS", "Language: Python 3.9, Node.js v18", "Database: PostgreSQL 14", "Tools: VS Code, Docker, Scapy, Suricata"] },
              { title: "Existing System", type: 'split', leftHeader: "Existing", rightHeader: "Drawbacks", left: ["Traditional Perimeter Firewalls", "Standalone Signature IDSs (Snort)"], right: ["Blind to East-West (Internal) Traffic", "High False Positive Rate", "Cannot detect Zero-day exploits"] },
              { title: "Proposed System", type: 'split', leftHeader: "Proposed", rightHeader: "Advantages", left: ["Hybrid Engine (Signature + ML)", "Traffic Mirroring (Agentless)"], right: ["Real-time Correlation", "Low Latency & High Accuracy (98.5%)", "Scalable Cloud Architecture"] },
          ]
      },
      review2: {
          title: "Review II: System Design & Architecture",
          slides: [
              { title: "System Design", type: 'title', content: [COMMON_DATA.title, "Review II: Architecture & Design"] },
              { title: "Abstract", type: 'text', content: [COMMON_DATA.synopsis] },
              { title: "Phases (Overview)", type: 'list', content: PHASES.map(p => `Phase ${p.id}: ${p.title}`) },
              { title: "Overall Architecture", type: 'diagram', content: "Flow: Cloud Workloads -> Traffic Mirror -> Kafka Ingestion -> [Signature Engine || ML Engine] -> Correlation -> Dashboard" },
              { title: "Database Design", type: 'table', tables: DB_SCHEMA },
              { title: "UI Module 1: Dashboard", type: 'text', content: ["Key Features:", "- Real-time traffic volume chart", "- Recent Alerts Table", "- Threat Distribution Pie Chart", "- System Health Indicators"] },
              { title: "UI Module 2: Live Monitor", type: 'text', content: ["Key Features:", "- Multi-tenant traffic stats", "- Active Flow Table", "- Anomaly Scoring Visuals", "- Resource Usage Metrics"] },
          ]
      },
      review3: {
          title: "Review III: Implementation & Testing",
          slides: [
              { title: "Final Implementation", type: 'title', content: [COMMON_DATA.title, "Review III: Implementation & Results"] },
              { title: "Abstract", type: 'text', content: [COMMON_DATA.synopsis] },
              { title: "Phases Completed", type: 'list', content: PHASES.map(p => `Phase ${p.id}: ${p.title}`) },
              { title: "Final Architecture", type: 'diagram', content: "Integrated System with Docker Containers" },
              { title: "Database Implementation", type: 'table', tables: DB_SCHEMA },
              { title: "Module Screenshots", type: 'text', content: ["(Live Demo of Dashboard)", "(Live Demo of Settings & Reports)"] },
              { title: "Testing Methodology", type: 'list', content: ["Unit Testing: PyTest for Packet Parser", "Integration Testing: API Endpoints (FastAPI)", "System Testing: PCAP Replay Latency Check", "ML Validation: K-Fold Cross Validation (98.5% Accuracy)"] },
              { title: "Conclusion", type: 'text', content: ["Successfully implemented Hybrid IDS", "Reduced False Positives by 40%", "Future Scope: Integration with SOAR and IPS capabilities"] },
          ]
      }
  };

  // --- Document Generation Logic ---

  const generatePDF = () => {
      const doc = new jsPDF();
      const content = REVIEW_CONTENT[activeReview];

      // Title Page
      doc.setFontSize(22);
      doc.setTextColor(41, 128, 185);
      doc.text(COMMON_DATA.title, 20, 30, { maxWidth: 170 });
      
      doc.setFontSize(16);
      doc.setTextColor(100);
      doc.text(content.title, 20, 50);

      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Guide: ${COMMON_DATA.guide}`, 20, 70);
      doc.text(`Student: ${COMMON_DATA.student}`, 20, 80);
      doc.text(`Company: ${COMMON_DATA.company}`, 20, 90);
      
      doc.line(20, 100, 190, 100);

      let yPos = 120;

      content.slides.forEach((slide, index) => {
          if (slide.type === 'title') return; // Skip title slide repeat

          // Add new page if running out of space
          if (yPos > 250) {
              doc.addPage();
              yPos = 30;
          }

          doc.setFontSize(14);
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "bold");
          doc.text(`${index + 1}. ${slide.title}`, 20, yPos);
          yPos += 10;

          doc.setFontSize(11);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(60);

          if (slide.type === 'list' || slide.type === 'text') {
              (slide.content as string[]).forEach(line => {
                   const splitText = doc.splitTextToSize(`• ${line}`, 170);
                   doc.text(splitText, 25, yPos);
                   yPos += (splitText.length * 6) + 2;
              });
          } else if (slide.type === 'split') {
              doc.text(`${slide.leftHeader}:`, 25, yPos);
              yPos += 6;
              (slide.left as string[]).forEach(l => {
                  doc.text(`- ${l}`, 30, yPos);
                  yPos += 6;
              });
              yPos += 4;
              doc.text(`${slide.rightHeader}:`, 25, yPos);
              yPos += 6;
              (slide.right as string[]).forEach(r => {
                  doc.text(`- ${r}`, 30, yPos);
                  yPos += 6;
              });
          } else if (slide.type === 'diagram') {
              // Draw simple box diagram representation
              doc.setDrawColor(100);
              doc.rect(30, yPos, 150, 40);
              doc.text("Architecture Flow Diagram", 80, yPos + 20);
              doc.setFontSize(9);
              doc.text(slide.content as string, 35, yPos + 30, { maxWidth: 140 });
              yPos += 50;
          } else if (slide.type === 'table') {
               // @ts-ignore
               if (slide.tables) {
                   // @ts-ignore
                   slide.tables.forEach(table => {
                        doc.text(`Table: ${table.tableName}`, 25, yPos);
                        yPos += 5;
                        (doc as any).autoTable({
                            startY: yPos,
                            head: [['Field', 'Type', 'Description']],
                            body: table.fields.map((f: any) => [f.name, f.type, f.description]),
                            margin: { left: 25 },
                            theme: 'grid'
                        });
                        // @ts-ignore
                        yPos = (doc as any).lastAutoTable.finalY + 10;
                   });
               }
          }
          yPos += 10;
      });

      doc.save(`report_${activeReview}.pdf`);
  };

  const generatePPT = async () => {
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';
      pptx.author = COMMON_DATA.student;
      pptx.company = COMMON_DATA.company;
      pptx.title = COMMON_DATA.title;

      const content = REVIEW_CONTENT[activeReview];

      // 1. Title Slide
      let slide = pptx.addSlide();
      slide.background = { color: '0F172A' };
      slide.addText(COMMON_DATA.title, { x: 1, y: 1.5, w: '80%', h: 1.5, fontSize: 28, color: '00A3CC', bold: true, align: 'center' });
      slide.addText(`Review: ${content.title}`, { x: 1, y: 3, w: '80%', fontSize: 18, color: 'E2E8F0', align: 'center' });
      slide.addText(`${COMMON_DATA.student}\n${COMMON_DATA.guide}`, { x: 1, y: 4.5, w: '80%', fontSize: 14, color: '94A3B8', align: 'center' });

      // 2. Content Slides
      for (const s of content.slides) {
          if (s.type === 'title') continue;

          // Special handling for tables: Create a separate slide for EACH table to prevent overlap
          if (s.type === 'table') {
               // @ts-ignore
               if (s.tables) {
                   // @ts-ignore
                   s.tables.forEach(table => {
                        slide = pptx.addSlide();
                        slide.background = { color: 'FFFFFF' };
                        
                        slide.addText(`${s.title}: ${table.tableName}`, { 
                            x: 0.5, y: 0.5, w: '90%', fontSize: 20, color: '0F172A', bold: true 
                        });

                        // Fix: Explicitly format each cell to ensure black text on white background
                        const headers = [
                            { text: 'Field', options: { bold: true, fill: { color: '0F172A' }, color: 'FFFFFF' } }, 
                            { text: 'Type', options: { bold: true, fill: { color: '0F172A' }, color: 'FFFFFF' } }, 
                            { text: 'Description', options: { bold: true, fill: { color: '0F172A' }, color: 'FFFFFF' } }
                        ];

                        const rows = table.fields.map((f: any) => [
                            { text: f.name, options: { color: '000000', fontFace: 'Courier New' } }, // Monospace for field name
                            { text: f.type, options: { color: '005588' } }, // Blue for type
                            { text: f.description, options: { color: '333333' } } // Dark gray for desc
                        ]);
                        
                        slide.addTable([headers, ...rows], {
                            x: 0.5, y: 1.2, w: 9,
                            fontSize: 12, // Increased font size
                            border: { pt: 1, color: 'd1d5db' },
                            fill: { color: 'FFFFFF' }, // Explicit white background
                            color: '000000',
                            autoPage: true,
                            newPageStartY: 1.2,
                        } as any);
                   });
               }
               continue; 
          }

          // Special handling for Diagram: Dark background + Opaque Capture
          if (s.type === 'diagram') {
              slide = pptx.addSlide();
              slide.background = { color: '0F172A' }; // Dark background matching the app theme
              
              slide.addText(s.title, { 
                  x: 0.5, y: 0.5, w: '90%', fontSize: 24, color: 'FFFFFF', bold: true, 
                  border: { pt: 0, pb: '2', color: '00A3CC' } 
              } as any);

              if (diagramRef.current) {
                  try {
                    // Force dark background on the captured canvas
                    const canvas = await html2canvas(diagramRef.current, {
                        backgroundColor: '#0F172A', 
                        scale: 3,
                        useCORS: true,
                        logging: false,
                        ignoreElements: (element) => element.tagName === 'BUTTON' || element.tagName === 'SELECT' // Clean capture
                    });
                    const imgData = canvas.toDataURL('image/png');
                    slide.addImage({ data: imgData, x: 0.5, y: 1.5, w: 9, h: 5, sizing: { type: 'contain', w: 9, h: 5 } });
                  } catch (e) {
                      console.error("Failed to capture diagram for PPT", e);
                      slide.addText("(Diagram Image Capture Failed)", { x: 1, y: 3, w: 8, align: 'center', color: 'FF0000' });
                  }
              } else {
                   slide.addShape(pptx.ShapeType.rect, { x: 1, y: 2.5, w: 8, h: 2, fill: { color: '334155' } });
                   slide.addText("Diagram available in live view", { x: 1, y: 3, w: 8, align: 'center', color: 'FFFFFF' });
              }
              continue;
          }

          // Default handling for other slides (white background)
          slide = pptx.addSlide();
          slide.background = { color: 'FFFFFF' }; 
          slide.addText(s.title, { x: 0.5, y: 0.5, w: '90%', fontSize: 24, color: '0F172A', bold: true, border: { pt: 0, pb: '2', color: '00A3CC' } } as any);

          if (s.type === 'list' || s.type === 'text') {
              const items = (s.content as string[]).map(line => ({ text: line, options: { fontSize: 16, color: '333333', bullet: true } }));
              slide.addText(items, { x: 0.5, y: 1.5, w: '90%', h: 4, lineSpacing: 30 });
          } 
          else if (s.type === 'split') {
              slide.addText(s.leftHeader, { x: 0.5, y: 1.5, w: 4, fontSize: 18, bold: true, color: '005588' });
              const leftItems = (s.left as string[]).map(l => ({ text: l, options: { fontSize: 14, bullet: true } }));
              slide.addText(leftItems, { x: 0.5, y: 2, w: 4.5, h: 4 });

              slide.addText(s.rightHeader, { x: 5.5, y: 1.5, w: 4, fontSize: 18, bold: true, color: '008855' });
              const rightItems = (s.right as string[]).map(r => ({ text: r, options: { fontSize: 14, bullet: true } }));
              slide.addText(rightItems, { x: 5.5, y: 2, w: 4.5, h: 4 });
          }
      }

      pptx.writeFile({ fileName: `presentation_${activeReview}.pptx` });
  };


  const getContentForAudio = () => {
      const content = REVIEW_CONTENT[activeReview];
      let text = `Presentation Section: ${content.title}\n\n`;

      content.slides.forEach((slide, idx) => {
          text += `Slide ${idx + 1}: ${slide.title}\n`;
          
          if (slide.type === 'split') {
              // @ts-ignore
              text += `${slide.leftHeader}:\n${slide.left.join('\n')}\n`;
              // @ts-ignore
              text += `${slide.rightHeader}:\n${slide.right.join('\n')}\n`;
          } else if (slide.type === 'table') {
              // @ts-ignore
              if (slide.tables) {
                  // @ts-ignore
                  slide.tables.forEach(t => {
                      text += `Table Schema: ${t.tableName}\n`;
                      // @ts-ignore
                      t.fields.forEach(f => text += `- ${f.name}: ${f.description}\n`);
                  });
              }
          } else {
               // text, list, title, diagram
               if (Array.isArray(slide.content)) {
                   text += slide.content.join('\n');
               } else {
                   text += slide.content;
               }
          }
          text += '\n\n';
      });
      return text;
  }

  const handleExplainProject = async () => {
    if (isPlaying) { stopAudio(); return; }
    if (!process.env.API_KEY) { alert("API Key not found."); return; }

    setIsProcessing(true);
    setAudioDownloadUrl(null); 
    setGeneratedScript(null);
    setLoadingMessage("Generating presentation script from review slides...");

    try {
      const topics = getContentForAudio();
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let prompt = "";
      const langName = LANGUAGES.find(l => l.code === language)?.name || 'English';
      
      if (language === 'tanglish') {
          prompt = `You are Bharathi Rathinam .S, presenting your project 'CloudGuard IDS'.
          
          Here is the exact content of your presentation slides for ${activeReview}:
          ${topics}

          Task: Write a detailed presentation script covering ONLY these specific slide contents. Do not make up facts outside this scope.
          Language: Tanglish (Colloquial Tamil mixed with English). Use English for technical terms.
          Tone: Professional yet conversational.
          Duration: Approx 3-5 minutes.
          `;
      } else {
          prompt = `You are Bharathi Rathinam .S, presenting your project 'CloudGuard IDS'.
          
          Here is the exact content of your presentation slides for ${activeReview}:
          ${topics}

          Task: Write a detailed presentation script covering ONLY these specific slide contents. Do not make up facts outside this scope.
          Language: ${langName}. 
          Tone: Professional.
          Duration: Approx 3-5 minutes.
          `;
      }

      const scriptResp = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
      const fullScript = scriptResp.text || "Failed to generate script.";
      setGeneratedScript(fullScript);

      setLoadingMessage("Synthesizing audio...");
      const ttsResp = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: { parts: [{ text: fullScript }] },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: LANGUAGES.find(l => l.code === language)?.voice || 'Kore' } } },
        },
      });

      const audioData = ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioData) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const decodedBytes = decode(audioData);
        const audioBuffer = await decodeAudioData(decodedBytes, audioContextRef.current, 24000, 1);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => setIsPlaying(false);
        source.start();
        sourceNodeRef.current = source;
        setIsPlaying(true);
        const wavData = encodeWAV(audioBuffer.getChannelData(0), 24000);
        const blob = new Blob([wavData], { type: 'audio/wav' });
        setAudioDownloadUrl(URL.createObjectURL(blob));
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate audio.");
    } finally {
      setIsProcessing(false);
      setLoadingMessage("");
    }
  };

  const handleDownloadScript = () => {
    if (!generatedScript) return;
    const element = document.createElement("a");
    const file = new Blob([generatedScript], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `CloudGuard_Script_${activeReview}_${language}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // --- Specific Review Actions ---

  const handleDownloadAbstract = () => {
    const abstract = `Title: ${COMMON_DATA.title}\nStudent: ${COMMON_DATA.student}\nGuide: ${COMMON_DATA.guide}\n\nAbstract:\n${COMMON_DATA.synopsis}`;
    const element = document.createElement("a");
    const file = new Blob([abstract], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `CloudGuard_Abstract.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCheckRequirements = () => {
     alert("System Compatibility Check:\n\n✅ Processor: 8 Cores (Simulated)\n✅ Memory: 16 GB Available (Simulated)\n✅ Storage: 256 GB NVMe (Simulated)\n✅ Network: Gigabit Connection\n\nStatus: READY for CloudGuard Deployment.");
  };

  const handleDownloadSchema = () => {
      let sql = "-- CloudGuard IDS Database Schema Export\n";
      sql += "-- Generated: " + new Date().toISOString() + "\n\n";
      DB_SCHEMA.forEach(table => {
          sql += `CREATE TABLE ${table.tableName} (\n`;
          const fields = table.fields.map(f => {
             const type = f.type.replace('PK', 'PRIMARY KEY').replace('FK', '');
             return `    ${f.name} ${type} -- ${f.description}`;
          });
          sql += fields.join(",\n");
          sql += "\n);\n\n";
      });
      const element = document.createElement("a");
      const file = new Blob([sql], {type: 'application/sql'});
      element.href = URL.createObjectURL(file);
      element.download = `CloudGuard_Schema.sql`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
  };

  const handleRunTests = () => {
      setShowTerminal(true);
      if (isTestRunning) return;
      setIsTestRunning(true);
      setTestLogs([]);
      const logs = [
          "> Initializing Test Suite (PyTest)...", "> Loading configuration...", "> Connected to Test DB (sqlite://:memory:)",
          "> [TEST] unit/test_packet_parser.py ............. [PASS]", "> [TEST] unit/test_feature_extractor.py ......... [PASS]",
          "> [TEST] integration/test_api_endpoints.py ...... [PASS]", "> [TEST] integration/test_kafka_consumer.py ..... [PASS]",
          "> [TEST] ml/test_model_accuracy.py", "  - Loading Random Forest Model...", "  - Running Validation Set (10k flows)...", "  - Accuracy: 98.52% ... [PASS]",
          "> [TEST] system/test_latency.py ................. [PASS]", "> Generating Coverage Report...", "> Coverage: 94%", "> ALL TESTS PASSED Successfully."
      ];
      let i = 0;
      const interval = setInterval(() => {
          if (i >= logs.length) { clearInterval(interval); setIsTestRunning(false); } 
          else { setTestLogs(prev => [...prev, logs[i]]); i++; }
      }, 500);
  };

  const handleDownloadDataset = () => {
    const headers = "flow_id,src_ip,src_port,dst_ip,dst_port,protocol,label\n";
    const rows = "1001,192.168.1.5,443,10.0.0.5,8080,TCP,Benign\n1002,172.16.0.4,22,10.0.0.8,22,TCP,Malicious";
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "cloud_ids_sample_dataset.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- UI Components ---

  const ReviewActions = ({ children, title = "Review Actions" }: { children?: React.ReactNode, title?: string }) => (
    <div className="mt-8 pt-6 border-t border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            {title}
        </h4>
        <div className="flex flex-wrap gap-4">
            {children}
        </div>
    </div>
  );

  const ActionButton = ({ onClick, icon: Icon, label, variant = 'primary' }: { onClick: () => void, icon: any, label: string, variant?: 'primary' | 'secondary' }) => (
      <button onClick={onClick} className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all transform hover:scale-105 active:scale-95", variant === 'primary' ? "bg-slate-800 text-cyan-400 border border-slate-700 hover:bg-slate-700 hover:border-cyan-500/50" : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700")}>
          <Icon className="w-4 h-4" />
          {label}
      </button>
  );

  const ReviewAudioControls = () => (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-0 mb-8 bg-slate-900/50 rounded-xl border border-slate-800 animate-in fade-in slide-in-from-top-2 overflow-hidden">
        
        {/* Left Section: Language & Active Review */}
        <div className="flex items-center h-14 divide-x divide-slate-800 w-full lg:w-auto border-b lg:border-b-0 border-slate-800">
             <div className="px-4 flex items-center gap-2 h-full bg-slate-950/30">
                 <Globe className="h-4 w-4 text-slate-400" />
                 <select value={language} onChange={(e) => { setLanguage(e.target.value); stopAudio(); setAudioDownloadUrl(null); setGeneratedScript(null); }} className="bg-transparent text-sm text-slate-200 outline-none cursor-pointer w-20 appearance-none font-medium">
                     {LANGUAGES.map(lang => <option key={lang.code} value={lang.code} className="bg-slate-800">{lang.name}</option>)}
                 </select>
             </div>
             
             <div className="px-4 flex items-center gap-3 h-full flex-1">
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline-block">Active Review</span>
                 <div className="h-4 w-px bg-slate-700 hidden sm:block"></div>
                 <span className="text-sm font-bold text-slate-100 whitespace-nowrap">{getReviewTitle()}</span>
             </div>
        </div>

        {/* Center/Right Section: Actions */}
        <div className="flex items-center h-14 divide-x divide-slate-800 w-full lg:w-auto">
            {/* Download Audio/Script Buttons (Only when generated) */}
            {audioDownloadUrl && generatedScript && (
              <>
                 <a href={audioDownloadUrl} download={`cloudguard_audio_${activeReview}.wav`} className="flex-1 lg:flex-none px-4 flex items-center justify-center gap-2 h-full text-green-400 hover:bg-green-900/20 transition-colors text-xs font-medium border-l border-slate-800">
                    <Download className="w-3 h-3" /> Audio
                 </a>
                 <button onClick={handleDownloadScript} className="flex-1 lg:flex-none px-4 flex items-center justify-center gap-2 h-full text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors text-xs font-medium">
                    <FileCode className="w-3 h-3" /> Transcript
                 </button>
              </>
            )}

            <button onClick={() => setShowReportModal(true)} className="flex-1 lg:flex-none px-6 flex items-center justify-center gap-2 h-full text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 transition-colors text-sm font-medium border-l border-slate-800">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Report</span>
                <span className="sm:hidden">PDF</span>
            </button>

            <button onClick={() => { setShowPPTModal(true); setCurrentSlide(0); }} className="flex-1 lg:flex-none px-6 flex items-center justify-center gap-2 h-full text-slate-400 hover:text-purple-400 hover:bg-slate-800/50 transition-colors text-sm font-medium">
                <Presentation className="w-4 h-4" />
                <span className="hidden sm:inline">PPT</span>
                <span className="sm:hidden">PPT</span>
            </button>

            <button 
                onClick={handleExplainProject}
                disabled={isProcessing}
                className={clsx("flex-none px-6 flex items-center justify-center gap-2 h-full transition-all font-medium text-sm min-w-[140px]", isPlaying ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-600 text-white hover:bg-green-500')}
            >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : isPlaying ? <StopCircle className="h-4 w-4 fill-current" /> : <PlayCircle className="h-4 w-4 fill-current" />}
                {isPlaying ? 'Stop Audio' : 'Play Audio'}
            </button>
        </div>
    </div>
  );

  const ReviewNav = () => (
    <div className="flex space-x-6 mb-8 border-b border-slate-700 overflow-x-auto">
       <button onClick={() => { setActiveReview('review1'); stopAudio(); setAudioDownloadUrl(null); setGeneratedScript(null); }} className={clsx("pb-3 px-4 font-medium transition-colors border-b-2 whitespace-nowrap", activeReview === 'review1' ? 'border-cyan-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200')}>Review I</button>
       <button onClick={() => { setActiveReview('review2'); stopAudio(); setAudioDownloadUrl(null); setGeneratedScript(null); }} className={clsx("pb-3 px-4 font-medium transition-colors border-b-2 whitespace-nowrap", activeReview === 'review2' ? 'border-cyan-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200')}>Review II</button>
       <button onClick={() => { setActiveReview('review3'); stopAudio(); setAudioDownloadUrl(null); setGeneratedScript(null); }} className={clsx("pb-3 px-4 font-medium transition-colors border-b-2 whitespace-nowrap", activeReview === 'review3' ? 'border-cyan-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200')}>Review III</button>
    </div>
  );

  const ProjectHeader = () => (
     <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 mb-8 text-center shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"></div>
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
          {COMMON_DATA.title}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 text-left max-w-4xl mx-auto">
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                <div className="flex items-center gap-2 mb-4 relative z-10">
                    <div className="p-2 bg-purple-500/20 rounded-lg"><User className="text-purple-400 h-5 w-5" /></div>
                    <h3 className="font-bold text-slate-200">Project Guide</h3>
                </div>
                <div className="space-y-1 relative z-10">
                    <p className="text-white font-bold text-lg">{COMMON_DATA.guide}</p>
                    {COMMON_DATA.guideDetails.map((line, i) => (
                        <p key={i} className="text-slate-400 text-sm">{line}</p>
                    ))}
                </div>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                <div className="flex items-center gap-2 mb-4 relative z-10">
                     <div className="p-2 bg-blue-500/20 rounded-lg"><User className="text-blue-400 h-5 w-5" /></div>
                    <h3 className="font-bold text-slate-200">Student Details</h3>
                </div>
                <div className="space-y-1 relative z-10">
                    <p className="text-white font-bold text-lg">{COMMON_DATA.student}</p>
                    {COMMON_DATA.studentDetails.map((line, i) => (
                        <p key={i} className="text-slate-400 text-sm">{line}</p>
                    ))}
                </div>
            </div>
        </div>
     </div>
  );

  const Synopsis = () => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8 shadow-sm">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><FileText className="text-cyan-400 h-5 w-5" /> Synopsis / Abstract</h3>
        <p className="text-slate-400 leading-relaxed text-justify">{COMMON_DATA.synopsis}</p>
    </div>
  );

  // Review 1 Content
  const Review1Content = () => (
      <div className="space-y-8 animate-in fade-in duration-500">
          <ProjectHeader />
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Building className="text-purple-400 h-5 w-5" /> Company Profile</h3>
              <p className="text-slate-400 leading-relaxed">Kathir College of Arts and Science is a premier institution providing quality education. The PG-Department of Computer Science focuses on cutting-edge research in cybersecurity, machine learning, and network analytics, providing the necessary guidance and infrastructure for this project.</p>
          </div>
          <Synopsis />
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Layers className="text-green-400 h-5 w-5" /> Project Phases</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PHASES.map((phase) => (
                    <div key={phase.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 hover:border-green-500/30 transition-colors">
                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">Phase {phase.id}</div>
                        <h4 className="font-bold text-slate-200">{phase.title}</h4>
                        <p className="text-sm text-slate-400 mt-2">{phase.desc}</p>
                    </div>
                  ))}
              </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
             <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><FileBarChart className="text-orange-400 h-5 w-5" /> System Analysis</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                     <h4 className="font-bold text-red-400 mb-2">Existing System</h4>
                     <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
                         <li>Standalone Signature IDSs (Snort)</li>
                         <li>Perimeter-only Firewalls</li>
                         <li>High False Positive Rate</li>
                         <li>Blind to Internal (East-West) Traffic</li>
                     </ul>
                 </div>
                 <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                     <h4 className="font-bold text-green-400 mb-2">Proposed System</h4>
                     <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
                         <li>Hybrid Engine (Sig + ML)</li>
                         <li>Traffic Mirroring (Agentless)</li>
                         <li>Correlation for Low False Positives</li>
                         <li>Real-time Dashboard</li>
                     </ul>
                 </div>
             </div>
          </div>
          <ReviewActions title="Review I - Action Items">
              <ActionButton onClick={handleDownloadAbstract} icon={Printer} label="Download Abstract (PDF)" />
              <ActionButton onClick={handleCheckRequirements} icon={CheckCircle} label="Verify System Compatibility" variant="secondary" />
          </ReviewActions>
      </div>
  );

  // Review 2 Content
  const Review2Content = () => (
      <div className="space-y-8 animate-in fade-in duration-500">
          <ProjectHeader />
          <Synopsis />
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Layers className="text-green-400 h-5 w-5" /> Project Phases</h3>
              <div className="flex flex-wrap gap-3">
                  {PHASES.map((phase) => (
                    <div key={phase.id} className="px-5 py-3 bg-slate-800 rounded-lg border border-slate-700 text-slate-300 text-sm flex items-center hover:bg-slate-750 transition-colors">
                        <span className="flex items-center justify-center w-6 h-6 bg-slate-700 rounded-full text-blue-400 font-bold text-xs mr-3">{phase.id}</span>
                        {phase.title}
                    </div>
                  ))}
              </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Cpu className="text-purple-400 h-5 w-5" /> Overall Architecture</h3>
              <ArchitectureDiagram ref={diagramRef} />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
               <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Database className="text-yellow-400 h-5 w-5" /> Database Design</h3>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {DB_SCHEMA.map((table) => (
                    <div key={table.tableName} className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                        <h3 className="font-mono text-cyan-400 font-bold">{table.tableName}</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                        <thead className="bg-slate-900/50 text-slate-500">
                            <tr><th className="px-4 py-2 text-left font-medium">Field</th><th className="px-4 py-2 text-left font-medium">Type</th><th className="px-4 py-2 text-left font-medium">Description</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {table.fields.map((field) => (
                            <tr key={field.name} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-2 font-mono text-slate-300">{field.name}</td>
                                <td className="px-4 py-2 text-purple-300 text-xs">{field.type}</td>
                                <td className="px-4 py-2 text-slate-400">{field.description}</td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                    </div>
                ))}
                </div>
          </div>
          <ReviewActions title="Review II - Action Items">
              <ActionButton onClick={handleDownloadSchema} icon={FileCode} label="Export Database Schema (.sql)" />
              <ActionButton onClick={() => alert("Architecture Report not available in Demo mode.")} icon={FileText} label="Architecture Summary" variant="secondary" />
          </ReviewActions>
      </div>
  );

  // Review 3 Content
  const Review3Content = () => (
      <div className="space-y-8 animate-in fade-in duration-500">
          <ProjectHeader />
          <Synopsis />
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Cpu className="text-purple-400 h-5 w-5" /> Overall Architecture</h3>
              <ArchitectureDiagram ref={diagramRef} />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
             <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><ClipboardCheck className="text-orange-400 h-5 w-5" /> Testing Methodology</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700"><h4 className="font-bold text-white mb-2 text-sm">Unit Testing</h4><p className="text-xs text-slate-400">Validated individual functions (PyTest).</p></div>
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700"><h4 className="font-bold text-white mb-2 text-sm">Integration Testing</h4><p className="text-xs text-slate-400">Verified API communication.</p></div>
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700"><h4 className="font-bold text-white mb-2 text-sm">System Testing</h4><p className="text-xs text-slate-400">Replayed PCAP files.</p></div>
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700"><h4 className="font-bold text-white mb-2 text-sm">ML Validation</h4><p className="text-xs text-slate-400">K-Fold Validation (98.5%).</p></div>
              </div>
          </div>
          <ReviewActions title="Review III - Action Items">
              <ActionButton onClick={handleRunTests} icon={Play} label="Run Unit Tests" />
              <ActionButton onClick={handleDownloadDataset} icon={Download} label="Download Dataset & Results" variant="secondary" />
          </ReviewActions>
      </div>
  );

  // --- Document / PPT Modals ---

  const ReportModal = () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-4xl bg-white text-slate-900 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                  <div className="flex items-center gap-2">
                      <FileText className="text-red-600" />
                      <h2 className="font-bold text-lg">Report Preview: {getReviewTitle()}</h2>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={generatePDF} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-2"><Download className="w-4 h-4"/> Download PDF</button>
                      <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5"/></button>
                  </div>
              </div>
              <div className="p-8 overflow-y-auto font-serif leading-relaxed">
                  <div className="text-center mb-8 border-b-2 border-slate-900 pb-4">
                      <h1 className="text-3xl font-bold mb-2 uppercase">{COMMON_DATA.title}</h1>
                      <p className="text-lg italic text-slate-600">{REVIEW_CONTENT[activeReview].title}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
                      <div>
                          <p className="font-bold text-slate-500 uppercase text-xs">Student Details</p>
                          <p>{COMMON_DATA.student}</p>
                          {COMMON_DATA.studentDetails.map((l,i) => <p key={i} className="text-xs text-slate-500">{l}</p>)}
                      </div>
                      <div className="text-right">
                          <p className="font-bold text-slate-500 uppercase text-xs">Guide Details</p>
                          <p>{COMMON_DATA.guide}</p>
                          {COMMON_DATA.guideDetails.map((l,i) => <p key={i} className="text-xs text-slate-500">{l}</p>)}
                      </div>
                  </div>
                  
                  {REVIEW_CONTENT[activeReview].slides.filter(s => s.type !== 'title').map((section, i) => (
                      <div key={i} className="mb-6">
                          <h3 className="text-xl font-bold text-blue-800 mb-2 border-l-4 border-blue-600 pl-3">{section.title}</h3>
                          
                          {/* Handle Different Content Types */}
                          {section.type === 'text' || section.type === 'list' ? (
                             <ul className="list-disc list-inside space-y-1 text-slate-800">
                                {(section.content as string[]).map((line, j) => <li key={j}>{line}</li>)}
                             </ul>
                          ) : section.type === 'split' ? (
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                     <h4 className="font-bold mb-1 text-slate-700">{section.leftHeader}</h4>
                                     <ul className="list-disc list-inside text-sm">
                                         {(section.left as string[]).map((l, j) => <li key={j}>{l}</li>)}
                                     </ul>
                                 </div>
                                 <div>
                                     <h4 className="font-bold mb-1 text-slate-700">{section.rightHeader}</h4>
                                     <ul className="list-disc list-inside text-sm">
                                         {(section.right as string[]).map((r, j) => <li key={j}>{r}</li>)}
                                     </ul>
                                 </div>
                             </div>
                          ) : section.type === 'table' ? (
                             // @ts-ignore
                             section.tables && section.tables.map((t, idx) => (
                                 <div key={idx} className="mb-4">
                                     <h4 className="font-bold text-sm mb-1">Table: {t.tableName}</h4>
                                     <table className="w-full text-xs border border-slate-300">
                                         <thead className="bg-slate-100 font-bold">
                                             <tr><th className="p-1 border">Field</th><th className="p-1 border">Type</th><th className="p-1 border">Description</th></tr>
                                         </thead>
                                         <tbody>
                                             {t.fields.map((f: any, fidx: number) => (
                                                 <tr key={fidx}><td className="p-1 border font-mono">{f.name}</td><td className="p-1 border">{f.type}</td><td className="p-1 border">{f.description}</td></tr>
                                             ))}
                                         </tbody>
                                     </table>
                                 </div>
                             ))
                          ) : section.type === 'diagram' ? (
                              <div className="p-4 border border-dashed border-slate-400 bg-slate-50 text-center text-slate-500 italic rounded">
                                  [Diagram Placeholder: {section.content as string}]
                              </div>
                          ) : null}
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  const PPTModal = () => {
      const slides = REVIEW_CONTENT[activeReview].slides;
      const currentSlideData = slides[currentSlide];

      return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-5xl bg-slate-900 text-white rounded-xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
               <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                  <div className="flex items-center gap-2">
                      <Presentation className="text-orange-500" />
                      <h2 className="font-bold text-lg">Presentation: {getReviewTitle()}</h2>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={generatePPT} className="px-3 py-1.5 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 flex items-center gap-2"><Download className="w-4 h-4"/> Download PPTX</button>
                      <button onClick={() => setShowPPTModal(false)} className="p-2 hover:bg-slate-800 rounded-full"><X className="w-5 h-5"/></button>
                  </div>
              </div>
              
              <div className="flex-1 flex overflow-hidden">
                  {/* Slide Sidebar */}
                  <div className="w-48 bg-slate-950 border-r border-slate-800 overflow-y-auto hidden md:block">
                      {slides.map((slide, i) => (
                          <div key={i} onClick={() => setCurrentSlide(i)} className={clsx("p-3 border-b border-slate-900 cursor-pointer hover:bg-slate-900", currentSlide === i && "bg-slate-800 border-l-2 border-orange-500")}>
                              <p className="text-xs text-slate-500 mb-1">Slide {i + 1}</p>
                              <p className="text-xs font-bold truncate">{slide.title}</p>
                          </div>
                      ))}
                  </div>

                  {/* Main Slide Area */}
                  <div className="flex-1 p-8 flex flex-col justify-center items-center bg-gradient-to-br from-slate-900 to-slate-800 relative">
                      <div className="w-full max-w-4xl aspect-video bg-white text-slate-900 rounded-lg shadow-2xl p-8 flex flex-col relative overflow-hidden">
                          {/* Slide Design Decorators */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-bl-full"></div>
                          <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-orange-500"></div>
                          
                          {/* Slide Content */}
                          <div className="flex-1 flex flex-col">
                              {currentSlideData.type === 'title' ? (
                                  <div className="h-full flex flex-col justify-center items-center text-center">
                                      <h1 className="text-4xl font-bold text-slate-900 mb-4">{currentSlideData.content[0]}</h1>
                                      <h2 className="text-xl text-blue-600 mb-8">{REVIEW_CONTENT[activeReview].title}</h2>
                                      <div className="text-slate-500 space-y-1">
                                          <p>{currentSlideData.content[1]}</p>
                                          <p>{currentSlideData.content[2]}</p>
                                      </div>
                                  </div>
                              ) : (
                                  <>
                                      <h2 className="text-3xl font-bold text-slate-800 mb-6 border-b-2 border-orange-500/50 pb-2 inline-block w-full">{currentSlideData.title}</h2>
                                      
                                      <div className="space-y-3 overflow-y-auto flex-1">
                                          {currentSlideData.type === 'text' || currentSlideData.type === 'list' ? (
                                               (currentSlideData.content as string[]).map((point, idx) => (
                                                  <div key={idx} className="flex items-start gap-3">
                                                      <div className="mt-2 w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                                                      <p className="text-lg text-slate-700">{point}</p>
                                                  </div>
                                              ))
                                          ) : currentSlideData.type === 'split' ? (
                                              <div className="grid grid-cols-2 gap-8 h-full">
                                                  <div className="bg-slate-50 p-4 rounded-lg">
                                                      <h3 className="text-xl font-bold text-blue-700 mb-4">{currentSlideData.leftHeader}</h3>
                                                      <ul className="space-y-2">
                                                          {(currentSlideData.left as string[]).map((l, j) => <li key={j} className="text-slate-700 text-sm">• {l}</li>)}
                                                      </ul>
                                                  </div>
                                                  <div className="bg-slate-50 p-4 rounded-lg">
                                                      <h3 className="text-xl font-bold text-green-700 mb-4">{currentSlideData.rightHeader}</h3>
                                                      <ul className="space-y-2">
                                                          {(currentSlideData.right as string[]).map((r, j) => <li key={j} className="text-slate-700 text-sm">• {r}</li>)}
                                                      </ul>
                                                  </div>
                                              </div>
                                          ) : currentSlideData.type === 'diagram' ? (
                                              <div className="w-full h-full flex items-center justify-center p-4">
                                                  <div className="w-full h-full overflow-hidden relative rounded-xl border border-slate-700 bg-slate-900">
                                                      <div className="absolute inset-0 flex items-center justify-center">
                                                          <div className="scale-[0.6] origin-center w-[1200px]">
                                                              <ArchitectureDiagram />
                                                          </div>
                                                      </div>
                                                  </div>
                                              </div>
                                          ) : currentSlideData.type === 'table' ? (
                                              <div className="overflow-y-auto max-h-[300px]">
                                                  {/* @ts-ignore */}
                                                  {currentSlideData.tables && currentSlideData.tables.map((t, idx) => (
                                                      <div key={idx} className="mb-4">
                                                          <h4 className="font-bold text-sm mb-1 text-slate-600">Table: {t.tableName}</h4>
                                                          <table className="w-full text-xs border border-slate-200">
                                                              <thead className="bg-slate-100 font-bold text-slate-700">
                                                                  <tr><th className="p-2 border">Field</th><th className="p-2 border">Type</th><th className="p-2 border">Description</th></tr>
                                                              </thead>
                                                              <tbody>
                                                                  {t.fields.map((f: any, fidx: number) => (
                                                                      <tr key={fidx} className="even:bg-slate-50"><td className="p-2 border font-mono text-slate-900">{f.name}</td><td className="p-2 border text-slate-900">{f.type}</td><td className="p-2 border text-slate-900">{f.description}</td></tr>
                                                                  ))}
                                                              </tbody>
                                                          </table>
                                                      </div>
                                                  ))}
                                              </div>
                                          ) : null}
                                      </div>
                                  </>
                              )}
                          </div>
                          
                          <div className="mt-auto flex justify-between items-end pt-4 text-xs text-slate-400 uppercase tracking-widest font-bold border-t border-slate-100">
                              <span>CloudGuard IDS</span>
                              <span>{i18nDate()}</span>
                              <span>{currentSlide + 1} / {slides.length}</span>
                          </div>
                      </div>

                      {/* Controls */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-950/80 p-2 rounded-full border border-slate-700 shadow-xl">
                          <button onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))} className="p-2 hover:bg-slate-800 rounded-full disabled:opacity-50" disabled={currentSlide === 0}><ChevronLeft/></button>
                          <span className="text-sm font-mono text-white w-12 text-center">{currentSlide + 1} / {slides.length}</span>
                          <button onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))} className="p-2 hover:bg-slate-800 rounded-full disabled:opacity-50" disabled={currentSlide === slides.length - 1}><ChevronRight/></button>
                      </div>
                  </div>
              </div>
          </div>
      </div>
      );
  };

  const i18nDate = () => new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
      <div className="max-w-6xl mx-auto pb-12 px-2">
          {/* Simplified Main Title */}
          <div className="mb-8">
              <h2 className="text-2xl font-bold text-white">Project Documentation</h2>
              <p className="text-slate-400 text-sm mt-1">Academic & Technical Reference</p>
          </div>
          
          {isProcessing && (
              <div className="mb-4 text-center text-sm text-cyan-400 animate-pulse bg-slate-900/50 py-2 rounded-lg border border-slate-800">
                  {loadingMessage || "Processing..."}
              </div>
          )}

          <ReviewNav />
          <ReviewAudioControls />

          {activeReview === 'review1' && <Review1Content />}
          {activeReview === 'review2' && <Review2Content />}
          {activeReview === 'review3' && <Review3Content />}

          {/* Test Terminal Modal */}
          {showTerminal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="w-full max-w-2xl bg-[#0F172A] rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-[#1E293B] border-b border-slate-700">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-green-400" />
                            <span className="text-sm font-mono text-slate-200">Test Suite Execution (Simulation)</span>
                        </div>
                        <button onClick={() => setShowTerminal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="p-4 h-80 overflow-y-auto font-mono text-sm bg-black text-slate-300 space-y-1">
                        {testLogs.map((log, i) => (
                            <div key={i} className={clsx(log.includes("PASS") ? "text-green-400" : "text-slate-300")}>{log}</div>
                        ))}
                        {isTestRunning && <div className="animate-pulse">_</div>}
                    </div>
                </div>
            </div>
          )}

          {/* Report & PPT Modals */}
          {showReportModal && <ReportModal />}
          {showPPTModal && <PPTModal />}
      </div>
  );
};

export default About;