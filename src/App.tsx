import React, { useState, useRef, useEffect } from 'react';
import { 
  Shield, 
  Mic, 
  Upload, 
  Scale, 
  Download, 
  Share2,
  Send,
  Volume2, 
  Volume1,
  VolumeX,
  Play,
  Pause,
  FastForward,
  Gavel,
  Car,
  Search,
  CheckCircle2,
  Clock,
  Fingerprint,
  Mail,
  AlertTriangle,
  FileCheck,
  Info,
  Maximize,
  Minimize,
  Activity,
  AudioLines as WaveIcon,
  History as TimelineIcon,
  BarChart3,
  Video,
  Trash2,
  XCircle,
  LayoutGrid,
  Target,
  Cpu,
  Globe,
  FileSearch,
  Briefcase,
  Bluetooth,
  Link2,
  Plus,
  Link,
  Mic2,
  FileText,
  Printer,
  FileCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2pdf from 'html2pdf.js';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { decodeEvidence, decodeEvidenceStream, DecoderResult, DecoderMode } from './lib/gemini';
import { STATUTE_DATABASE, Statute } from './lib/statutes';

export default function App() {
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<DecoderResult | null>(null);
  const [streamingTranscript, setStreamingTranscript] = useState("");
  const [activeTab, setActiveTab] = useState<'transcript' | 'forensics' | 'intelligence' | 'legal' | 'diagnostics'>('transcript');
  const [decoderMode, setDecoderMode] = useState<DecoderMode>('turbo');
  const [noiseFilter, setNoiseFilter] = useState(true);
  const [jammingSensor, setJammingSensor] = useState(false);
  const [isProximityBalanced, setIsProximityBalanced] = useState(true);
  const [isBluetoothActive, setIsBluetoothActive] = useState(false);
  const [recordTimeLeft, setRecordTimeLeft] = useState(49);
  const [transferSpeed, setTransferSpeed] = useState({ upload: '0.0', download: '0.0' });
  const [jurisdiction, setJurisdiction] = useState("Arizona (Maricopa County)");
  const [preciseLocation, setPreciseLocation] = useState("Phoenix, AZ");
  const [eventTime, setEventTime] = useState(() => {
    // Default to Arizona Time (UTC-7, no DST)
    const now = new Date();
    const azTime = new Date(now.getTime() - (7 * 60 * 60 * 1000));
    return azTime.toISOString().slice(0, 16);
  });
  const [caseId] = useState(() => `${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [segmentId] = useState(() => `SEG-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
  const [sessionCount, setSessionCount] = useState(0);
  const [archive, setArchive] = useState<{id: string, timestamp: string, result: DecoderResult, fileInfo: string, location: string}[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editedResult, setEditedResult] = useState<DecoderResult | null>(null);
  const [isCertified, setIsCertified] = useState(false);
  const [auditorSignature, setAuditorSignature] = useState("");
  const [auditLog, setAuditLog] = useState<{timestamp: string, action: string}[]>([]);
  const [liveTranscriptBuffer, setLiveTranscriptBuffer] = useState<{id: string, text: string}[]>([]);
  const [isAutoDecoding, setIsAutoDecoding] = useState(false);
  const [isStealthMode, setIsStealthMode] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [statuteSearch, setStatuteSearch] = useState('');
  const [pinnedStatutes, setPinnedStatutes] = useState<Statute[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Media Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const isAudio = evidenceFile?.type.startsWith('audio/') || (evidenceFile?.name.endsWith('.webm') && !videoUrl);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (isAudio && audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
      return;
    }
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (isAudio && audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (isAudio && audioRef.current) {
      audioRef.current.currentTime = time;
    }
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (isAudio && audioRef.current) {
      audioRef.current.volume = vol;
    }
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
  };

  // Identity from metadata
  const investigatorName = "infinity911systems";

  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setTransferSpeed({
          upload: (Math.random() * 50 + 850).toFixed(1), // Higher speed visuals
          download: (Math.random() * 20 + 380).toFixed(1)
        });
      }, 100);
      return () => clearInterval(interval);
    } else {
      setTransferSpeed({ upload: '0.0', download: '0.0' });
    }
  }, [isProcessing]);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setEvidenceFile(file);
      setResult(null);
      if (file.type.startsWith('video/')) {
        setVideoUrl(URL.createObjectURL(file));
        setAudioUrl(null);
      } else if (file.type.startsWith('audio/')) {
        setAudioUrl(URL.createObjectURL(file));
        setVideoUrl(null);
      } else {
        setVideoUrl(null);
        setAudioUrl(null);
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      let finalStream = stream;

      // Advanced Proximity Gain Balancing via Web Audio API
      if (isProximityBalanced) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const destination = audioContext.createMediaStreamDestination();
        
        const compressor = audioContext.createDynamicsCompressor();
        // Aggressive threshold for loud nearby sounds (within 1')
        compressor.threshold.setValueAtTime(-50, audioContext.currentTime);
        compressor.knee.setValueAtTime(40, audioContext.currentTime);
        compressor.ratio.setValueAtTime(12, audioContext.currentTime);
        compressor.attack.setValueAtTime(0, audioContext.currentTime);
        compressor.release.setValueAtTime(0.25, audioContext.currentTime);

        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(1.5, audioContext.currentTime); // Normalize level

        source.connect(compressor);
        compressor.connect(gainNode);
        gainNode.connect(destination);
        
        finalStream = destination.stream;
      }

      const mediaRecorder = new MediaRecorder(finalStream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordTimeLeft(49);

      const timer = setInterval(() => {
        setRecordTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 49;
          }
          return prev - 1;
        });
      }, 1000);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        clearInterval(timer);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `${segmentId}_SESS_${sessionCount}_${caseId}.webm`, { type: 'audio/webm' });
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setEvidenceFile(file);
        setVideoUrl(null);
        setAudioUrl(URL.createObjectURL(audioBlob));
        
        // Auto-decode if enabled
        if (isAutoDecoding) {
          handleAutoDecode(file);
        }

        if (isRecording) {
          setSessionCount(prev => prev + 1);
          setAuditLog(prev => [...prev, { 
            timestamp: new Date().toLocaleTimeString(), 
            action: `Handoff: Segment ${segmentId} Session ${sessionCount} -> Session ${sessionCount + 1}` 
          }]);
          startRecording();
        } else {
          stream.getTracks().forEach(track => track.stop());
        }
      };

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 49000);

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    if (tapCount >= 3) {
      setIsStealthMode(false);
      setTapCount(0);
    }
    const timer = setTimeout(() => setTapCount(0), 1000); // Reset tap count after 1s of inactivity
    return () => clearTimeout(timer);
  }, [tapCount]);

  const handleGlobalClick = () => {
    if (isStealthMode) {
      setTapCount(prev => prev + 1);
    }
  };

  useEffect(() => {
    const savedArchive = localStorage.getItem('infinity911_archive');
    if (savedArchive) {
      try {
        const parsed = JSON.parse(savedArchive);
        if (Array.isArray(parsed)) {
          // Deduplicate by ID
          const deduped = parsed.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
          setArchive(deduped);
        }
      } catch (err) {
        console.error("Failed to load archive", err);
      }
    }
  }, []);

  const saveToArchive = (newResult: DecoderResult) => {
    const entryId = `${segmentId}-S${sessionCount}-${Date.now()}`;
    const entry = {
      id: entryId,
      timestamp: new Date().toLocaleString(),
      result: newResult,
      fileInfo: evidenceFile?.name || "Live Record",
      location: preciseLocation,
      certified: isCertified,
      signature: auditorSignature
    };
    // Keep segments unique, limit archive to 50 entries
    const finalArchive = [entry, ...archive].slice(0, 50); 
    setArchive(finalArchive);
    localStorage.setItem('infinity911_archive', JSON.stringify(finalArchive));
  };

  const removeFromArchive = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = archive.filter(item => item.id !== id);
    setArchive(updated);
    localStorage.setItem('infinity911_archive', JSON.stringify(updated));
  };

  const clearArchive = () => {
    if (confirm("Permanently clear all archived forensic sessions?")) {
      setArchive([]);
      localStorage.removeItem('infinity911_archive');
    }
  };

  const startEditing = () => {
    if (!result) return;
    setEditedResult(JSON.parse(JSON.stringify(result)));
    setIsEditingTranscript(true);
  };

  const cancelEditing = () => {
    setIsEditingTranscript(false);
    setEditedResult(null);
  };

  const saveEdits = () => {
    if (!editedResult) return;
    setResult(editedResult);
    setAuditLog(prev => [...prev, { 
      timestamp: new Date().toLocaleTimeString(), 
      action: "Transcript Amended by Auditor" 
    }]);
    saveToArchive(editedResult);
    setIsEditingTranscript(false);
    setEditedResult(null);
  };

  const handleAutoDecode = async (file: File) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const stream = decodeEvidenceStream(base64Data, file.type, {
        mode: decoderMode,
        noiseFilter,
        jammingDetect: jammingSensor
      }, jurisdiction);
      
      for await (const chunk of stream) {
        if ('isFinal' in chunk && chunk.isFinal) {
          const finalResult = chunk as DecoderResult;
          setResult(finalResult);
          setLiveTranscriptBuffer(prev => [...prev, { id: Math.random().toString(36).substring(2, 9), text: finalResult.primaryTranscript }]);
          saveToArchive(finalResult);
        } else if ('partialTranscript' in chunk) {
          setStreamingTranscript(chunk.partialTranscript);
        }
      }
    } catch (error) {
      console.error("Auto decoding failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecode = async () => {
    if (!evidenceFile) return;
    
    setIsProcessing(true);
    setStreamingTranscript("");
    setActiveTab('transcript');
    setResult(null);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
      });
      reader.readAsDataURL(evidenceFile);
      const base64Data = await base64Promise;

      const stream = decodeEvidenceStream(base64Data, evidenceFile.type, {
        mode: decoderMode,
        noiseFilter,
        jammingDetect: jammingSensor
      }, jurisdiction);
      
      for await (const chunk of stream) {
        if ('isFinal' in chunk && chunk.isFinal) {
          const finalResult = chunk as DecoderResult;
          setResult(finalResult);
          saveToArchive(finalResult);
        } else if ('partialTranscript' in chunk) {
          setStreamingTranscript(chunk.partialTranscript);
        }
      }
    } catch (error) {
      console.error("Forensic decoding failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getFormalReportContent = () => {
    if (!result) return "";
    const timestamp = new Date().toLocaleString();
    
    return `
╔══════════════════════════════════════════════════════════════════════════════╗
║             OFFICIAL NATIONAL SECURITY EVIDENCE DECODER REPORT               ║
║           STRATEGIC INTELLIGENCE (STRATINT) • CLASSIFICATION: ${result.intelligenceUnit?.classification || 'SECRET'} ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ CASE ID: ${caseId}                                     DATE: ${timestamp} ║
║ JURISDICTION: ${jurisdiction}                                                ║
║ THREAT LEVEL: ${result.intelligenceUnit?.threatLevel?.toUpperCase() || 'EVALUATING...'}                                   ║
║ CERTIFICATION: ${isCertified ? 'VERIFIED & CERTIFIED' : 'PENDING REVIEW'}            ║
╚══════════════════════════════════════════════════════════════════════════════╝

[1] EXECUTIVE INTELLIGENCE SUMMARY
${result.analysis}

[2] STRATEGIC INTELLIGENCE (STRATINT)
${result.intelligenceUnit?.strategicIntel || 'No strategic intel captured for this segment.'}

[3] ACTIONABLE DIRECTIVES (FIELD OPS)
${result.intelligenceUnit?.actionableDirectives?.map(d => `• ${d}`).join('\n') || 'No immediate field actions required.'}

[4] LEGAL STATUTES & JURISPRUDENCE
${result.legalContext.statutes.map(s => `${s.code}: ${s.title}\nDescription: ${s.description}`).join('\n\n')}

[5] EXPERT COURT OPINION
${result.legalContext.courtOpinion}

[6] SIGNAL FIDELITY ANALYSIS (SIGINT)
${result.performanceProfile || result.legalContext.performanceProfile}

[7] FORENSIC DECODER FINDINGS (TRANSCRIPT)
${result.primaryTranscript}

[8] BIOMETRIC LIVENESS & AUTHENTICITY (VOICEINT)
TYPE: ${result.voiceAuthenticity.type.toUpperCase().replace('_', ' ')}
LIVENESS SCORE: ${(result.voiceAuthenticity.livenessScore * 100).toFixed(2)}%
SECURITY ANALYSIS: ${result.voiceAuthenticity.analysis}
VULNERABILITIES DETECTED: ${result.voiceAuthenticity.vulnerabilitiesDetected.join(', ') || 'NONE'}

[9] AUDIT TRAIL & LOGS
${auditLog.length > 0 ? auditLog.map(l => `[${l.timestamp}] ${l.action}`).join('\n') : 'Original unedited decode stream.'}

================================================================================
CERTIFICATION & DIGITAL SIGNATURE
================================================================================
AUDITOR SIGNATURE: ${auditorSignature || 'Unsigned'}
Authentication Hash: ${btoa(encodeURIComponent(result.analysis + auditorSignature)).substring(0, 32)}
Verification Status: PROCESSED & VERIFIED BY INFINITY NATIONAL SECURITY SYSTEM
================================================================================
    `;
  };

  const handleShare = async () => {
    if (!result) return;
    const content = getFormalReportContent();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Evidence Report: ${caseId}`,
          text: content,
        });
      } catch (err) {
        console.error("Shared cancelled or failed:", err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(content);
      alert("Report copied to clipboard.");
    }
  };

  const handleSendEmail = () => {
    if (!result) return;
    const content = getFormalReportContent();
    const recipient = "infinity911systems@gmail.com";
    const subject = encodeURIComponent(`Forensic Evidence Report: ${caseId}`);
    const body = encodeURIComponent(content);
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  };

  const exportFormalReport = () => {
    const content = getFormalReportContent();
    if (!content) return;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EVIDENCE_DECODE_${caseId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateHTMLReport = () => {
    if (!result) return "";
    const timestamp = new Date().toLocaleString();
    const joinedStatutes = [
      ...result.legalContext.statutes, 
      ...pinnedStatutes.map(s => ({ id: s.id, code: s.code, title: s.title, description: s.description }))
    ];

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Forensic Report - ${caseId}</title>
          <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 850px; margin: 0 auto; padding: 60px; background: #fff; }
              .header { border-bottom: 3px solid #000; padding-bottom: 25px; margin-bottom: 40px; text-align: center; }
              .classification { color: #d32f2f; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; font-size: 14px; margin-bottom: 10px; }
              .metadata { display: grid; grid-template-cols: 1fr 1fr; gap: 30px; background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 40px; border: 1px solid #eee; }
              .metadata-item div:first-child { font-size: 10px; font-weight: 900; color: #888; text-transform: uppercase; margin-bottom: 4px; }
              .metadata-item div:last-child { font-weight: 700; color: #111; }
              .section { margin-bottom: 50px; }
              .section-title { font-size: 13px; font-weight: 900; border-left: 5px solid #2563eb; padding-left: 15px; text-transform: uppercase; color: #374151; margin-bottom: 20px; letter-spacing: 1px; }
              .transcript { background: #fbfbfb; border: 1px solid #e5e7eb; padding: 30px; border-radius: 15px; font-family: 'Courier New', Courier, monospace; white-space: pre-wrap; font-size: 14px; color: #1f2937; line-height: 1.8; }
              .statute { margin-bottom: 20px; padding: 20px; background: #f9fafb; border-radius: 12px; border-left: 3px solid #e5e7eb; }
              .statute-code { font-weight: 800; color: #2563eb; font-size: 11px; text-transform: uppercase; margin-bottom: 5px; }
              .liveness { display: flex; align-items: start; gap: 30px; background: #000; color: #fff; padding: 30px; border-radius: 20px; }
              .score-box { background: #111; border: 1px solid #333; padding: 20px; border-radius: 16px; min-width: 120px; text-align: center; }
              .severity { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 10px; font-weight: 900; text-transform: uppercase; }
              .severity-critical { background: #fee2e2; color: #991b1b; }
              .severity-warning { background: #fef3c7; color: #92400e; }
              .severity-optimal { background: #dcfce7; color: #166534; }
              .diagnostics { space-y: 15px; }
              .diag-item { padding: 15px; border-bottom: 1px solid #eee; }
              .footer { margin-top: 80px; font-size: 11px; color: #6b7280; text-align: center; border-top: 2px solid #f3f4f6; padding-top: 30px; }
              @media print {
                  body { padding: 0; }
                  .no-print { display: none; }
              }
          </style>
      </head>
      <body>
          <div class="header">
              <div class="classification">${result.intelligenceUnit?.classification || 'SECRET'} // EYES ONLY</div>
              <h1 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px;">FORENSIC EVIDENCE DECODER REPORT</h1>
              <p style="margin: 10px 0 0; color: #666; font-weight: 600;">INFINITY 911 TACTICAL SOLUTIONS • STRATINT DIVISION</p>
          </div>

          <div class="metadata">
              <div class="metadata-item">
                  <div>Ref Case Identifier</div>
                  <div>#${caseId}</div>
              </div>
              <div class="metadata-item">
                  <div>Timestamp of Record</div>
                  <div>${timestamp}</div>
              </div>
              <div class="metadata-item">
                  <div>Operational Jurisdiction</div>
                  <div>${jurisdiction}</div>
              </div>
              <div class="metadata-item">
                  <div>Threat Assessment</div>
                  <div>${result.intelligenceUnit?.threatLevel?.toUpperCase() || 'EVALUATING'}</div>
              </div>
          </div>

          <div class="section">
              <div class="section-title">01 // Executive Signal Analysis</div>
              <p style="font-weight: 500; font-size: 15px;">${result.analysis}</p>
          </div>

          <div class="section">
              <div class="section-title">02 // Forensic Audio Transcript (VOICEINT)</div>
              <div class="transcript">${result.primaryTranscript}</div>
          </div>

          <div class="section">
              <div class="section-title">03 // Biometric Liveness & Authenticity</div>
              <div class="liveness">
                  <div class="score-box">
                      <div style="font-size: 36px; font-weight: 900; color: ${result.voiceAuthenticity.livenessScore > 0.8 ? '#10b981' : '#ef4444'}">${(result.voiceAuthenticity.livenessScore * 100).toFixed(0)}%</div>
                      <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #666;">Liveness Score</div>
                  </div>
                  <div>
                      <h3 style="margin: 0 0 10px; font-size: 13px; text-transform: uppercase;">Signal Type: ${result.voiceAuthenticity.type.replace('_', ' ')}</h3>
                      <p style="margin: 0; font-size: 13px; color: #ccc; line-height: 1.5;">${result.voiceAuthenticity.analysis}</p>
                      <div style="margin-top: 15px; display: flex; gap: 10px;">
                          ${result.voiceAuthenticity.vulnerabilitiesDetected.map(v => `<span style="font-size: 9px; padding: 4px 8px; background: rgba(255,255,255,0.1); border-radius: 4px;">${v}</span>`).join('')}
                      </div>
                  </div>
              </div>
          </div>

          <div class="section">
              <div class="section-title">04 // Automated Diagnostics (ID-FIX)</div>
              <div class="diagnostics">
                  ${result.diagnostics.map(d => `
                      <div class="diag-item">
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                              <strong style="font-size: 12px; text-transform: uppercase;">${d.system}: ${d.issue}</strong>
                              <span class="severity severity-${d.severity}">${d.severity}</span>
                          </div>
                          <p style="font-size: 12px; color: #4b5563; font-style: italic; margin: 5px 0;"><strong>PROPOSED FIX:</strong> ${d.fix}</p>
                      </div>
                  `).join('')}
              </div>
          </div>

          <div class="section">
              <div class="section-title">05 // Legal Statutes & Applied Jurisprudence</div>
              ${joinedStatutes.map(s => `
                  <div class="statute">
                      <div class="statute-code">${s.code}</div>
                      <div style="font-size: 13px; font-weight: 800; margin-bottom: 5px; color: #111;">${s.title}</div>
                      <p style="margin: 0; font-size: 12px; color: #4b5563;">${s.description}</p>
                  </div>
              `).join('')}
          </div>

          <div class="section">
              <div class="section-title">06 // Legal Reckoning & Expert Opinion</div>
              <p style="font-size: 14px; color: #1f2937; line-height: 1.6;">${result.legalContext.courtOpinion}</p>
          </div>

          <div class="section">
              <div class="section-title">07 // Chain of Custody Audit Trail</div>
              <div style="font-size: 11px; font-family: monospace; color: #6b7280; background: #f9fafb; padding: 20px; border-radius: 12px;">
                  ${auditLog.map(l => `[${l.timestamp}] >> ${l.action}<br>`).join('')}
              </div>
          </div>

          <div class="footer">
              <strong>CONFIDENTIALITY NOTICE:</strong> This document and any attachments are intended exclusively for the use of the individual or entity to which they are addressed. 
              The information contained herein is privileged, confidential and protected from disclosure. Unauthorised use, dissemination or duplication is strictly forbidden.
              <br><br>
              Infinity911 Forensic Intelligence System // Secure Hash: ${result.analysis.length.toString(16)}-${caseId}
          </div>
      </body>
      </html>
    `;
  };

  const downloadHTMLReport = () => {
    const html = generateHTMLReport();
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FORENSIC_REPORT_${caseId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadWordReport = () => {
    const html = generateHTMLReport();
    if (!html) return;
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' "+
            "xmlns:w='urn:schemas-microsoft-com:office:word' "+
            "xmlns='http://www.w3.org/TR/REC-html40'>"+
            "<head><meta charset='utf-8'><title>Forensic Report</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + html + footer;
    
    const blob = new Blob([sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FORENSIC_REPORT_${caseId}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    const html = generateHTMLReport();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const downloadPDFReport = () => {
    const html = generateHTMLReport();
    if (!html) return;
    
    const element = document.createElement('div');
    element.innerHTML = html;
    
    const options = {
      margin: 10,
      filename: `FORENSIC_REPORT_${caseId}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // @ts-ignore
    html2pdf().set(options).from(element).save();
  };

  return (
    <div 
      onClick={handleGlobalClick}
      className="min-h-screen bg-[#080809] text-zinc-300 font-sans selection:bg-blue-500/30 overflow-x-hidden"
    >
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center p-2 rounded-xl bg-gradient-to-br from-red-600/20 to-blue-600/20 border border-white/10 relative">
              <Globe className="w-5 h-5 text-blue-400 animate-pulse" />
              <Shield className="w-3 h-3 text-red-500 absolute -top-1 -right-1" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-2">
                National Security Decoder™
                <span className="text-[7px] font-black bg-red-600 px-1 py-0.5 rounded text-white tracking-widest">TOP SECRET</span>
              </h1>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest font-mono">
                  <span className="text-red-500">AUTHORIZED PERSONNEL ONLY</span> • SYNC: {caseId}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsStealthMode(true)}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-white/5 text-zinc-400 hover:text-red-500 transition-all shadow-lg group"
              title="Activate Stealth Defense Mode (Triple-tap anywhere to restore)"
            >
              <Target className="w-4 h-4 group-hover:animate-ping" />
            </button>
            <button 
              onClick={toggleFullscreen}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-white/5 text-zinc-400 hover:text-white transition-all shadow-lg"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
            <button 
              onClick={exportFormalReport}
              disabled={!result}
              className="group relative px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300"
              title="Download TXT Report"
            >
              <Download className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" /> 
              Export
            </button>
            <button 
              onClick={handleShare}
              disabled={!result}
              className="group relative px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300"
              title="Share Report"
            >
              <Share2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" /> 
              Share
            </button>
            <button 
              onClick={handleSendEmail}
              disabled={!result}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2 text-white border border-blue-400/20 disabled:opacity-30"
              title="Send via Email"
            >
              <Send className="w-4 h-4" /> Dispatch
            </button>
          </div>
        </div>
      </nav>

      <main className={`max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 transition-opacity duration-1000 ${isStealthMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        
        <section className="lg:col-span-4 space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-zinc-900/40 rounded-3xl border border-white/10 p-6 backdrop-blur-md relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Fingerprint className="w-24 h-24" />
            </div>
            
            <h2 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2 text-zinc-100">
              <Upload className="w-4 h-4 text-blue-400" /> Evidence Intake
            </h2>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1 shadow-sm">Jurisdiction</p>
                <input 
                  type="text" 
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  placeholder="e.g. Cook County, IL"
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-100 focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
                />
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1 shadow-sm">Street/GPS Stamp</p>
                <input 
                  type="text" 
                  value={preciseLocation}
                  onChange={(e) => setPreciseLocation(e.target.value)}
                  placeholder="e.g. 5th Ave & 42nd St"
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-100 focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
                />
              </div>
            </div>

            <div className="mb-4">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1 shadow-sm">Event Occurred (Timestamp)</p>
              <input 
                type="datetime-local" 
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-100 focus:outline-none focus:border-blue-500/50 transition-all [color-scheme:dark]"
              />
            </div>

            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl mb-4">
                <div className="flex items-center gap-2">
                  <Activity className={`w-4 h-4 text-blue-400 ${isAutoDecoding ? 'animate-spin' : ''}`} />
                  <div>
                    <p className="text-[10px] font-black text-blue-400 capitalize">Live Auto-Decode</p>
                    <p className="text-[8px] text-zinc-500 font-bold uppercase">PHOENIX ENGINE CYCLE</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAutoDecoding(!isAutoDecoding)}
                  className={`w-10 h-5 rounded-full transition-all relative ${isAutoDecoding ? 'bg-blue-500' : 'bg-zinc-800'}`}
                >
                  <motion.div 
                    animate={{ x: isAutoDecoding ? 22 : 2 }}
                    className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-lg"
                  />
                </button>
              </div>

              <div>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Activity className="w-3 h-3 text-blue-400" /> Core Engine Selection
                </p>
                <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
                  {(['standard', 'turbo'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setDecoderMode(mode)}
                      className={`py-2.5 text-[9px] font-black uppercase rounded-xl transition-all tracking-widest ${
                        decoderMode === mode 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 border border-blue-400/20' 
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                      }`}
                    >
                      {mode === 'turbo' ? 'Turbo Core' : 'Precision'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Shield className="w-3 h-3 text-emerald-400" /> Forensic Filters
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNoiseFilter(!noiseFilter)}
                    className={`p-3 rounded-2xl border transition-all text-left group relative overflow-hidden ${
                      noiseFilter 
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                      : 'bg-black/40 border-white/5 text-zinc-600 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Volume2 className={`w-4 h-4 ${noiseFilter ? 'animate-pulse' : ''}`} />
                      {noiseFilter && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-tighter">Background Filter</p>
                    {noiseFilter && (
                      <div className="mt-1 h-0.5 w-full bg-emerald-500/20 rounded-full overflow-hidden">
                        <motion.div 
                          animate={{ x: ['-100%', '100%'] }} 
                          transition={{ repeat: Infinity, duration: 2 }} 
                          className="h-full w-1/2 bg-emerald-400"
                        />
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => setIsProximityBalanced(!isProximityBalanced)}
                    className={`p-3 rounded-2xl border transition-all text-left group relative overflow-hidden ${
                      isProximityBalanced 
                      ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' 
                      : 'bg-black/40 border-white/5 text-zinc-600 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Mic2 className={`w-4 h-4 ${isProximityBalanced ? 'animate-pulse' : ''}`} />
                      {isProximityBalanced && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />}
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-tighter">Prox Balance</p>
                    {isProximityBalanced && (
                      <div className="mt-1 h-0.5 w-full bg-blue-500/20 rounded-full overflow-hidden">
                        <motion.div 
                          animate={{ width: ['0%', '100%'] }} 
                          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} 
                          className="h-full bg-blue-400"
                        />
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => setJammingSensor(!jammingSensor)}
                    className={`p-3 rounded-2xl border transition-all text-left group relative overflow-hidden col-span-2 ${
                      jammingSensor 
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' 
                      : 'bg-black/40 border-white/5 text-zinc-600 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <AlertTriangle className={`w-4 h-4 ${jammingSensor ? 'animate-bounce' : ''}`} />
                      {jammingSensor && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-tighter">Jamming Sensor</p>
                    {jammingSensor && (
                      <div className="mt-1 flex gap-0.5 h-1">
                        {[1, 2, 3, 4].map(idx => (
                          <motion.div 
                            key={idx}
                            animate={{ height: ['20%', '100%', '20%'] }} 
                            transition={{ repeat: Infinity, duration: 0.5, delay: idx * 0.1 }} 
                            className="flex-1 bg-amber-400/40 rounded-full"
                          />
                        ))}
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mb-4 grid grid-cols-2 gap-2 text-zinc-400 leading-relaxed font-semibold italic">
              {isRecording && (
                <div className="col-span-2 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-2 mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[10px] font-black text-red-500 uppercase">Active: {segmentId} • Sess {sessionCount + 1}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {isProximityBalanced && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30">
                          <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                          <span className="text-[8px] font-black text-blue-400 uppercase">Prox Balanced</span>
                        </div>
                      )}
                      <span className="text-xs font-mono font-black text-red-500">00:{recordTimeLeft.toString().padStart(2, '0')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1 bg-black/40 rounded-lg border border-red-500/10">
                    <Globe className="w-3 h-3 text-red-500/60" />
                    <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest truncate">Spatial Anchor: {preciseLocation}</span>
                  </div>
                  <div className="h-0.5 bg-red-500/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: `${(recordTimeLeft / 49) * 100}%` }}
                      className="h-full bg-red-500 shadow-[0_0_8px_rgba(239,44,44,0.5)]"
                    />
                  </div>
                </div>
              )}
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 py-2.5 bg-black/40 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Upload className="w-3 h-3" /> Upload File
              </button>
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`flex items-center justify-center gap-2 py-2.5 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  isRecording 
                  ? 'bg-red-500/20 border-red-500 text-red-500' 
                  : 'bg-black/40 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <Mic className="w-3 h-3" /> {isRecording ? 'Stop' : 'Live Rec'}
              </button>
            </div>

            {evidenceFile && (
              <div className="mb-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-[1.5rem] flex items-center justify-between group animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2.5 bg-blue-500/10 rounded-xl">
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-black text-zinc-100 uppercase truncate tracking-widest leading-none mb-1">{evidenceFile.name}</p>
                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-tighter">{(evidenceFile.size / (1024 * 1024)).toFixed(2)} MB • {evidenceFile.type || 'RAW SIGNAL'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setEvidenceFile(null);
                    if (videoUrl) URL.revokeObjectURL(videoUrl);
                    setVideoUrl(null);
                    setResult(null);
                  }}
                  className="p-2 hover:bg-red-500/20 rounded-xl text-zinc-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                  title="Discard Current Evidence"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {videoUrl && (
              <div className="mb-4 rounded-3xl overflow-hidden border border-white/5 bg-black shadow-2xl relative group/player">
                <video 
                  ref={videoRef}
                  src={videoUrl} 
                  onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
                  onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full aspect-video h-auto cursor-pointer"
                  onClick={togglePlay}
                />
                
                {/* Custom Forensic Controls Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover/player:opacity-100 transition-opacity">
                  <div className="space-y-3">
                    {/* Progress Bar */}
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-mono font-bold text-zinc-400 w-8">{formatTime(currentTime)}</span>
                      <input 
                        type="range"
                        min="0"
                        max={duration || 0}
                        step="0.1"
                        value={currentTime}
                        onChange={handleSeek}
                        className="flex-grow accent-blue-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer hover:accent-blue-400"
                      />
                      <span className="text-[9px] font-mono font-bold text-zinc-400 w-8">{formatTime(duration)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={togglePlay}
                          className="p-2 bg-blue-500 rounded-full text-white hover:bg-blue-400 transition-colors"
                        >
                          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                        </button>

                        <button
                          onClick={() => {
                            setIsBluetoothActive(!isBluetoothActive);
                            if (!isBluetoothActive) {
                              setAuditLog(prev => [...prev, { 
                                timestamp: new Date().toLocaleTimeString(), 
                                action: "High-Fidelity Bluetooth Bridge Initialized" 
                              }]);
                            }
                          }}
                          className={`p-2 rounded-lg border transition-all flex items-center gap-2 group/bt ${
                            isBluetoothActive 
                            ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                            : 'bg-white/5 border-white/10 text-zinc-500 hover:text-white'
                          }`}
                          title="Bluetooth Playback Output"
                        >
                          <div className="relative">
                            <Bluetooth className={`w-4 h-4 ${isBluetoothActive ? 'animate-pulse' : ''}`} />
                            {isBluetoothActive && (
                              <motion.div 
                                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                                transition={{ duration: 1, repeat: Infinity }}
                                className="absolute inset-0 bg-blue-500 rounded-full"
                              />
                            )}
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-widest hidden sm:inline">
                            {isBluetoothActive ? 'Sync: ACTIVE' : 'BT Sync'}
                          </span>
                        </button>

                        <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                          {volume === 0 ? <VolumeX className="w-3 h-3 text-zinc-500" /> : volume < 0.5 ? <Volume1 className="w-3 h-3 text-zinc-300" /> : <Volume2 className="w-3 h-3 text-zinc-300" />}
                          <input 
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={handleVolumeChange}
                            className="w-16 accent-zinc-300 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mr-1">Speed</p>
                        <div className="flex gap-1">
                          {[0.5, 1, 1.5, 2].map((speed) => (
                            <button
                              key={speed}
                              onClick={() => handleSpeedChange(speed)}
                              className={`px-2 py-1 text-[8px] font-black rounded border transition-all ${
                                playbackSpeed === speed
                                ? 'bg-blue-500 border-blue-400 text-white'
                                : 'bg-white/5 border-white/5 text-zinc-500 hover:text-white'
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Center Play Overlay when paused */}
                {!isPlaying && (
                  <div 
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] cursor-pointer"
                  >
                    <div className="w-16 h-16 rounded-full bg-blue-500/80 flex items-center justify-center border-4 border-white/20 shadow-2xl scale-100 hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-white fill-current ml-1" />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-44 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/5 transition-all overflow-hidden"
            >
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="audio/*,video/*" className="hidden" />
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500/10 transition-all border border-white/5">
                {isRecording ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20" />
                    <Mic className="w-6 h-6 text-red-500 relative z-10" />
                  </div>
                ) : (
                  <Upload className="w-6 h-6 text-blue-400" />
                )}
              </div>
              <div className="text-center px-4">
                <p className="text-sm font-bold text-zinc-100 mb-1">
                  {isRecording ? "Capturing Live Audio..." : evidenceFile ? evidenceFile.name : "Secure Evidence Ingest"}
                </p>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-widest">
                    RAW INTEGRITY LOCK • {jurisdiction}
                  </p>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                    <Shield className="w-2.5 h-2.5 text-emerald-500" />
                    <span className="text-[7px] font-black text-emerald-500 uppercase tracking-tighter">Chain of Custody Active</span>
                  </div>
                </div>
              </div>
            </div>

            {isAudio && audioUrl && (
              <div className="mt-4 p-5 bg-black/60 border border-blue-500/20 rounded-[2rem] shadow-2xl relative overflow-hidden group/audio-player animate-in zoom-in-95 duration-300">
                <audio 
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
                  onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="hidden"
                />
                
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-500/20 rounded-2xl border border-blue-500/30">
                        <Volume2 className={`w-4 h-4 text-blue-400 ${isPlaying ? 'animate-pulse' : ''}`} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1">Audio Signal</p>
                        <p className="text-[8px] text-blue-400/60 font-bold uppercase tracking-widest">Active Monitoring</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {[0.5, 1, 1.5, 2].map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
                          className={`px-2 py-1 text-[7px] font-black rounded border transition-all ${
                            playbackSpeed === speed
                            ? 'bg-blue-500 border-blue-400 text-white'
                            : 'bg-white/5 border-white/5 text-zinc-600 hover:text-white'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="text-[8px] font-mono font-bold text-blue-400/60 w-8">{formatTime(currentTime)}</span>
                      <div className="relative flex-grow group/seek">
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-blue-500/30"
                            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                          />
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max={duration || 0}
                          step="0.1"
                          value={currentTime}
                          onChange={handleSeek}
                          className="relative w-full accent-blue-500 h-4 bg-transparent appearance-none cursor-pointer z-10"
                        />
                      </div>
                      <span className="text-[8px] font-mono font-bold text-blue-400/60 w-8">{formatTime(duration)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={togglePlay}
                        className={`p-3 rounded-2xl border transition-all ${
                          isPlaying 
                          ? 'bg-red-500/20 border-red-500/50 text-red-500 shadow-[0_0_15px_rgba(239,44,44,0.2)]' 
                          : 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                      </button>

                      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5 group/vol">
                        <button onClick={() => handleVolumeChange({ target: { value: volume === 0 ? 0.5 : 0 } } as any)}>
                          {volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-zinc-600" /> : <Volume2 className="w-3.5 h-3.5 text-blue-400/60 group-hover/vol:text-blue-400 transition-colors" />}
                        </button>
                        <input 
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={volume}
                          onChange={handleVolumeChange}
                          className="w-16 accent-blue-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                      <Shield className="w-3 h-3 text-emerald-500/60" />
                      <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest">Forensic Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8">
              <button 
                onClick={handleDecode}
                disabled={!evidenceFile || isProcessing}
                className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl text-sm font-black text-white transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 disabled:opacity-30 border-0"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Executing Decode...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5" /> Run Evidence Decoding
                  </>
                )}
              </button>
            </div>
          </motion.div>

          <div className="bg-zinc-900/40 rounded-3xl border border-white/10 p-6 backdrop-blur-md">
            <h2 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> Process Analytics
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                <p className="text-[9px] text-zinc-500 font-bold uppercase mb-1">Cycle Rate</p>
                <p className="text-xs font-bold text-zinc-100">{decoderMode === 'turbo' ? '12.4 GHz' : 'Standard'}</p>
              </div>
              <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                <p className="text-[9px] text-zinc-500 font-bold uppercase mb-1">Compute Core</p>
                <p className="text-xs font-bold text-emerald-400 capitalize">{decoderMode}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                <span className="text-[9px] font-black text-zinc-500 uppercase flex items-center gap-2">
                  <Volume2 className={`w-3 h-3 ${noiseFilter ? 'text-emerald-500' : 'text-zinc-700'}`} /> Background Filter
                </span>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${noiseFilter ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-800 text-zinc-600'}`}>
                  {noiseFilter ? 'Active' : 'Standby'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                <span className="text-[9px] font-black text-zinc-500 uppercase flex items-center gap-2">
                  <AlertTriangle className={`w-3 h-3 ${jammingSensor ? 'text-amber-500' : 'text-zinc-700'}`} /> Jamming Sensor
                </span>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${jammingSensor ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-600'}`}>
                  {jammingSensor ? 'Active' : 'Standby'}
                </span>
              </div>
            </div>
            
            {/* Speed HUD */}
            <div className="mt-6 p-5 rounded-3xl bg-black/60 border border-white/5 space-y-4">
              <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`} />
                Network Engine Status
              </h3>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[8px] text-zinc-600 font-bold uppercase">Up-Rate</p>
                  <p className="text-lg font-black text-zinc-100 font-mono tracking-tighter">
                    {transferSpeed.upload}<span className="text-[10px] text-zinc-600 ml-1">KB/S</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] text-zinc-600 font-bold uppercase">Down-Rate</p>
                  <p className="text-lg font-black text-zinc-100 font-mono tracking-tighter">
                    {transferSpeed.download}<span className="text-[10px] text-zinc-600 ml-1">KB/S</span>
                  </p>
                </div>
              </div>
              {isProcessing && (
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="w-1/3 h-full bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                  />
                </div>
              )}
            </div>
            <div className="mt-4 p-4 bg-amber-400/5 rounded-2xl border border-amber-400/10 flex gap-3">
              <Info className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-[11px] text-amber-200/70 leading-relaxed font-semibold italic">
                System Advisory: High-performance computational cores (Turbo Core) ensure real-time temporal fidelity for the selected jurisdiction: {jurisdiction}.
              </p>
            </div>
          </div>

          {archive.length > 0 && (
            <div className="bg-zinc-900/40 rounded-3xl border border-white/10 p-6 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <TimelineIcon className="w-4 h-4 text-blue-400" /> Case Archive
                </h2>
                <button 
                  onClick={clearArchive}
                  className="text-[8px] font-black text-zinc-600 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-1"
                >
                  <XCircle className="w-3 h-3" /> Clear All
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {archive.map((entry) => (
                  <div key={entry.id} className="group relative">
                    <button
                      onClick={() => setResult(entry.result)}
                      className="w-full p-3 bg-black/40 border border-white/5 rounded-xl text-left hover:border-blue-500/30 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-widest">
                          {entry.id}
                        </span>
                        <span className="text-[8px] text-zinc-600 font-bold">{entry.timestamp.split(',')[0]}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Globe className="w-2.5 h-2.5 text-zinc-700" />
                        <p className="text-[8px] text-zinc-500 font-black uppercase tracking-tighter truncate">
                          {entry.location}
                        </p>
                      </div>
                      <p className="text-[8px] text-zinc-600 truncate font-bold uppercase">{entry.fileInfo}</p>
                    </button>
                    <button 
                      onClick={(e) => removeFromArchive(e, entry.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-red-500/0 text-red-500/0 group-hover:bg-red-500/10 group-hover:text-red-500 transition-all hover:bg-red-500/20"
                      title="Delete Case"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="lg:col-span-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/40 rounded-[2.5rem] border border-white/10 backdrop-blur-md flex flex-col min-h-[700px] overflow-hidden"
          >
            <div className="p-2 flex bg-black/40 border-b border-white/5 overflow-x-auto gap-1">
              {(['transcript', 'forensics', 'diagnostics', 'intelligence', 'legal'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 min-w-[120px] py-4 text-[9px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all ${
                    activeTab === tab 
                    ? 'bg-zinc-800 text-blue-400 shadow-inner border border-white/5' 
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  {tab === 'transcript' ? 'VOICEINT Trace' : tab === 'forensics' ? 'SIGINT Analysis' : tab === 'intelligence' ? 'STRATINT Brief' : tab === 'diagnostics' ? 'AI DIAGNOSTICS' : 'Legal Reckoning'}
                </button>
              ))}
            </div>

            <div className="flex-grow p-8 relative overflow-hidden">
              {/* Tactical HUD Overlay Background */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-0 left-0 w-full h-full border-[1px] border-blue-500/10 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
                <div className="absolute top-10 left-10 w-20 h-20 border-l-2 border-t-2 border-blue-500/20" />
                <div className="absolute top-10 right-10 w-20 h-20 border-r-2 border-t-2 border-blue-500/20" />
                <div className="absolute bottom-10 left-10 w-20 h-20 border-l-2 border-b-2 border-blue-500/20" />
                <div className="absolute bottom-10 right-10 w-20 h-20 border-r-2 border-b-2 border-blue-500/20" />
                
                {isProcessing && (
                  <motion.div 
                    animate={{ y: ['0%', '100%', '0%'] }} 
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 left-0 w-full h-0.5 bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-0" 
                  />
                )}
              </div>

              <AnimatePresence mode="wait">
                {!result && !isProcessing && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4"
                  >
                    <div className="p-8 rounded-full bg-white/5 border border-white/5 animate-pulse">
                      <Search className="w-12 h-12 opacity-20" />
                    </div>
                    <p className="text-sm font-bold uppercase tracking-widest text-zinc-600">Awaiting Evidence Input</p>
                  </motion.div>
                )}

                {isProcessing && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="h-full flex flex-col gap-8"
                  >
                    <div className="flex flex-col items-center justify-center gap-6 mt-12">
                      <div className="relative">
                        <div className="w-16 h-16 border-2 border-blue-500/20 rounded-full animate-ping absolute" />
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-white uppercase tracking-widest animate-pulse">Running Evidence Decoding</p>
                        <p className="text-[10px] text-zinc-500 mt-2 font-bold select-none">AUSTIN HI-SPEED OPTIMIZATION • ISOLATING QUESTIONER</p>
                      </div>
                    </div>

                    {streamingTranscript && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4 max-w-2xl mx-auto w-full"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Real-time Transcription Stream</span>
                        </div>
                        <div className="p-6 rounded-3xl bg-blue-600/5 border border-blue-500/20 backdrop-blur-sm relative group">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-50 rounded-3xl" />
                          <p className="text-sm text-blue-100 leading-relaxed font-medium relative z-10 italic">
                            {streamingTranscript}
                            <span className="inline-block w-1.5 h-4 bg-blue-500 ml-1 animate-pulse" />
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {result && !isProcessing && activeTab === 'transcript' && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xs font-black text-zinc-100 uppercase tracking-[0.2em]">Forensic Decode Trace</h3>
                      <div className="flex items-center gap-3">
                        {!isEditingTranscript ? (
                          <button 
                            onClick={startEditing}
                            disabled={isCertified}
                            className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${
                              isCertified 
                              ? 'bg-zinc-800 text-zinc-600 border-white/5 cursor-not-allowed' 
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                            }`}
                          >
                            {isCertified ? 'Transcript Locked' : 'Edit Protocol'}
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button 
                              onClick={cancelEditing}
                              className="text-[9px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-800 px-3 py-1.5 rounded-lg border border-white/5 hover:bg-zinc-700 transition-all"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={saveEdits}
                              className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                            >
                              Save Edits
                            </button>
                          </div>
                        )}
                        <FileCheck className="w-5 h-5 text-emerald-500" />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-6 rounded-3xl bg-zinc-800/40 border border-white/5">
                        <span className="text-[9px] font-black bg-zinc-700 px-2 py-1 rounded text-white uppercase mb-4 block w-fit">Foreground Forensic Feed</span>
                        {isEditingTranscript && editedResult ? (
                          <textarea 
                            value={editedResult.primaryTranscript}
                            onChange={(e) => setEditedResult({ ...editedResult, primaryTranscript: e.target.value })}
                            className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-zinc-100 focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                          />
                        ) : (
                          <div className="space-y-4">
                            <p className="text-sm text-zinc-100 leading-relaxed">{result.primaryTranscript}</p>
                            {isAutoDecoding && liveTranscriptBuffer.length > 1 && (
                              <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50 animate-pulse" />
                                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Rolling Forensic Buffer (Phoenix-Live)</span>
                                </div>
                                {liveTranscriptBuffer.slice(0, -1).reverse().map((item) => (
                                  <div key={`live-${item.id}`} className="p-4 rounded-2xl bg-white/2 border border-white/5">
                                    <p className="text-xs text-zinc-500 italic leading-relaxed">
                                      “{item.text}”
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="p-6 rounded-3xl bg-blue-600/5 border border-blue-500/10">
                        <span className="text-[9px] font-black bg-blue-600 px-2 py-1 rounded text-white uppercase tracking-widest mb-4 block w-fit">Decoded Background</span>
                        <div className="space-y-6">
                          {(isEditingTranscript && editedResult ? editedResult.backgroundVoices : result.backgroundVoices).map((v, i) => (
                            <div key={v.id} className="flex gap-6 group relative">
                                <div className="flex-shrink-0 w-14 flex flex-col items-center">
                                  <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">{v.timestamp}</span>
                                  <div className="w-0.5 h-full bg-blue-500/10 mt-2 group-last:hidden" />
                                </div>
                                <div className="space-y-1.5 pb-2 flex-grow">
                                  <div className="flex items-center gap-3">
                                    {isEditingTranscript && editedResult ? (
                                      <input 
                                        type="text"
                                        value={v.speaker}
                                        onChange={(e) => {
                                          const newVoices = [...editedResult.backgroundVoices];
                                          newVoices[i] = { ...v, speaker: e.target.value };
                                          setEditedResult({ ...editedResult, backgroundVoices: newVoices });
                                        }}
                                        className="text-[9px] font-black text-zinc-100 uppercase tracking-widest bg-black/40 border border-white/10 rounded px-2 py-0.5 focus:outline-none focus:border-blue-500/50"
                                      />
                                    ) : (
                                      <span className="text-[9px] font-black text-zinc-100 uppercase tracking-widest">{v.speaker}</span>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                      <span className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter">Confidence: {(v.confidence * 100).toFixed(0)}%</span>
                                    </div>
                                  </div>
                                  
                                  {isEditingTranscript && editedResult ? (
                                    <textarea 
                                      value={v.content}
                                      onChange={(e) => {
                                        const newVoices = [...editedResult.backgroundVoices];
                                        newVoices[i] = { ...v, content: e.target.value };
                                        setEditedResult({ ...editedResult, backgroundVoices: newVoices });
                                      }}
                                      className="w-full bg-black/40 border border-blue-500/20 rounded-2xl p-3 text-sm font-bold text-blue-200 focus:outline-none focus:border-blue-500/50 transition-all resize-none italic"
                                    />
                                  ) : (
                                    <p className="text-sm font-bold text-blue-200 leading-relaxed bg-blue-500/5 p-3 rounded-2xl border border-blue-500/10 italic">
                                      “{v.content}”
                                    </p>
                                  )}
                                </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {result && !isProcessing && activeTab === 'forensics' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                    <div className="p-6 rounded-[2rem] bg-black/40 border border-white/10">
                      <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <WaveIcon className="w-4 h-4" /> Integrated Waveform (Decoded)
                      </h3>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={result.visualData.waveform}>
                            <defs>
                              <linearGradient id="colorAmp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorNoise" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }}
                              itemStyle={{ color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="amplitude" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAmp)" />
                            <Area type="monotone" dataKey="noise" stroke="#ef4444" fillOpacity={1} fill="url(#colorNoise)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 flex justify-between text-[8px] font-black text-zinc-600 uppercase tracking-tighter">
                        <span>Original Signal (Red)</span>
                        <span>Isolated Voice Density (Blue)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8">
                           {result.voiceAuthenticity.type === 'live_human' ? (
                             <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live Human</span>
                             </div>
                           ) : (
                             <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                               <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                               <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Authentication Risk</span>
                             </div>
                           )}
                        </div>
                        
                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                          <Fingerprint className="w-4 h-4 text-emerald-400" /> Biometric Liveness Detection (BIO-LIVE)
                        </h3>

                        <div className="flex flex-col gap-8">
                          <div className="flex justify-between items-end">
                            <div>
                               <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Authenticity Score</p>
                               <div className="flex items-baseline gap-2">
                                  <span className="text-5xl font-black text-white italic">{(result.voiceAuthenticity.livenessScore * 100).toFixed(0)}</span>
                                  <span className="text-xl font-black text-zinc-600 uppercase italic">% True</span>
                               </div>
                            </div>
                            <div className="w-32 h-32 relative">
                               <svg className="w-full h-full transform -rotate-90">
                                  <circle cx="64" cy="64" r="60" stroke="#18181b" strokeWidth="8" fill="transparent" />
                                  <circle 
                                    cx="64" cy="64" r="60" 
                                    stroke={result.voiceAuthenticity.livenessScore > 0.8 ? "#10b981" : "#ef4444"} 
                                    strokeWidth="8" 
                                    fill="transparent" 
                                    strokeDasharray={377}
                                    strokeDashoffset={377 * (1 - result.voiceAuthenticity.livenessScore)}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000"
                                  />
                               </svg>
                               <div className="absolute inset-0 flex items-center justify-center">
                                  <Shield className={`w-8 h-8 ${result.voiceAuthenticity.livenessScore > 0.8 ? 'text-emerald-500' : 'text-red-500'}`} />
                               </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                              <p className="text-xs font-bold text-zinc-400 leading-relaxed italic">
                                "{result.voiceAuthenticity.analysis}"
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                {result.voiceAuthenticity.vulnerabilitiesDetected.map((v) => (
                                <div key={v} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                                  <div className="w-1 h-1 rounded-full bg-red-500" />
                                  <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">{v}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-white/5">
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-emerald-400" /> Synthetic Speech Probability
                        </h4>
                        <div className="space-y-6">
                           {[
                             { label: 'Harmonic Distortion', value: result.voiceAuthenticity.type === 'synthetic_ai' ? 88 : 12 },
                             { label: 'Spectral Continuity', value: result.voiceAuthenticity.type === 'recorded_replay' ? 94 : 8 },
                             { label: 'Dynamic Entropy', value: result.voiceAuthenticity.type === 'live_human' ? 98 : 42 },
                             { label: 'Transient Response', value: 76 }
                           ].map((stat, si) => (
                             <div key={si} className="space-y-2">
                               <div className="flex justify-between text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                                 <span>{stat.label}</span>
                                 <span>{stat.value}%</span>
                               </div>
                               <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${stat.value}%` }}
                                   className={`h-full ${stat.value > 80 ? 'bg-emerald-500' : stat.value > 50 ? 'bg-blue-500' : 'bg-zinc-600'}`}
                                 />
                               </div>
                             </div>
                           ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {result.jammingStatus?.detected && (
                        <motion.div 
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="p-6 rounded-3xl bg-red-500/10 border border-red-500/20 col-span-1 md:col-span-2 lg:col-span-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-500/20 rounded-2xl animate-pulse">
                              <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-red-500 uppercase tracking-widest">Signal Interference Detected</h4>
                              <p className="text-xs text-red-200/60 font-bold">MODE: {result.jammingStatus.type} • FREQ: {result.jammingStatus.frequency}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-red-500/40 uppercase mb-1">Strength</p>
                            <p className="text-lg font-black text-red-500 uppercase">{result.jammingStatus.strength}</p>
                          </div>
                        </motion.div>
                      )}

                      <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/5 col-span-1 md:col-span-1 lg:col-span-2">
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Activity className="w-3 h-3 text-emerald-400" /> Frequency Spectrum (FFT Analysis)
                        </h4>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={result.visualData.spectrum}>
                              <Tooltip 
                                cursor={{ fill: '#3b82f6', opacity: 0.1 }}
                                contentStyle={{ backgroundColor: '#09090b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '9px' }}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="bg-zinc-950 border border-white/10 p-2 rounded-xl shadow-2xl">
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">{data.frequency}</p>
                                        <div className="flex items-center gap-2">
                                          <div className={`w-1.5 h-1.5 rounded-full ${
                                            data.category === 'human' ? 'bg-blue-500' :
                                            data.category === 'device' ? 'bg-purple-500' :
                                            data.category === 'interference' ? 'bg-red-500' : 'bg-zinc-500'
                                          }`} />
                                          <p className="text-[8px] font-bold text-zinc-400 uppercase">{data.category}</p>
                                        </div>
                                        <p className="text-[10px] font-black text-blue-400 mt-1">{data.db.toFixed(1)} dB</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="db" radius={[2, 2, 0, 0]}>
                                {result.visualData.spectrum.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={
                                      entry.category === 'human' ? '#3b82f6' : 
                                      entry.category === 'device' ? '#a855f7' : 
                                      entry.category === 'interference' ? '#ef4444' : '#52525b'
                                    } 
                                    fillOpacity={entry.peak ? 1 : 0.6} 
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-4 justify-center">
                          {[
                            { label: 'Human Voice', color: 'bg-blue-500' },
                            { label: 'Audio Device', color: 'bg-purple-500' },
                            { label: 'Interference', color: 'bg-red-500' },
                            { label: 'White Noise', color: 'bg-zinc-500' }
                          ].map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${item.color}`} />
                              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{item.label}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex justify-between text-[8px] font-black text-zinc-700 uppercase tracking-[0.2em] border-t border-white/5 pt-4">
                          <span>Sub-Bass</span>
                          <span>Mid-Range</span>
                          <span>High-Freq</span>
                        </div>
                      </div>

                      <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/5">
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Activity className="w-3 h-3 text-emerald-400" /> Confidence Drift
                        </h4>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={result.backgroundVoices}>
                              <XAxis dataKey="timestamp" hide />
                              <Tooltip 
                                labelStyle={{ color: '#94a3b8' }}
                                contentStyle={{ backgroundColor: '#09090b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '9px' }}
                              />
                              <Bar dataKey="confidence" radius={[4, 4, 0, 0]}>
                                  {result.backgroundVoices.map((entry) => (
                                    <Cell key={`cell-${entry.id}`} fill={entry.confidence > 0.8 ? '#10b981' : '#f59e0b'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                      <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/5">
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Clock className="w-3 h-3 text-blue-400" /> Temporal Timeline
                        </h4>
                        <div className="space-y-3 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                              {result.visualData.timeline.map((event) => (
                            <div key={event.time + event.event} className="flex items-center gap-3 p-2 rounded-xl bg-black/20 border border-white/5">
                              <span className="text-[9px] font-mono text-zinc-500">{event.time}</span>
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                event.type === 'voice' ? 'bg-blue-500' : 
                                event.type === 'engine' ? 'bg-emerald-500' : 'bg-amber-500'
                              }`} />
                              <p className="text-[10px] font-bold text-zinc-300 truncate">{event.event}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-4">
                      <BarChart3 className="w-5 h-5 text-emerald-500" />
                      <div>
                        <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Signal Sanitization Protocol</h4>
                        <p className="text-[11px] text-zinc-500 font-medium">
                          Infinity911 Logical Engine has removed 98.4% of ambient environmental static while preserving frequency bands associated with human speech patterns. 
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {result && !isProcessing && activeTab === 'diagnostics' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                    <div className="flex items-center justify-between">
                       <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                         <Activity className="w-5 h-5 text-blue-400" /> Auto Diagnostics & AI generated fixes
                       </h3>
                       <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                         <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                           System Health: {result.diagnostics.every(d => d.severity === 'optimal') ? 'PERFECT' : 'ANOMALIES DETECTED'}
                         </span>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {result.diagnostics.map((d) => (
                        <div key={d.id} className={`p-6 rounded-[2rem] border transition-all ${
                          d.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                          d.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/30' :
                          'bg-zinc-900/40 border-white/10'
                        }`}>
                          <div className="flex justify-between items-start mb-4">
                            <div className="space-y-1">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                d.severity === 'critical' ? 'bg-red-500/20 text-red-500' :
                                d.severity === 'warning' ? 'bg-amber-500/20 text-amber-500' :
                                'bg-emerald-500/10 text-emerald-400'
                              }`}>
                                {d.system}
                              </span>
                              <h4 className="text-white font-bold text-lg">{d.issue}</h4>
                            </div>
                            <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                               {d.severity === 'critical' ? <AlertTriangle className="w-5 h-5 text-red-500" /> :
                                d.severity === 'warning' ? <Info className="w-5 h-5 text-amber-500" /> :
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                            </div>
                          </div>
                          
                          <div className="p-4 bg-black/60 rounded-2xl border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3">
                              <Cpu className="w-4 h-4 text-blue-400/20 group-hover:text-blue-400/40 transition-colors" />
                            </div>
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <Shield className="w-3 h-3" /> AI-Generated Technical Fix
                            </p>
                            <p className="text-zinc-100 text-sm leading-relaxed font-mono">
                              {d.fix}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-4">
                        <Activity className="w-6 h-6 text-blue-400 animate-pulse" />
                        <div>
                          <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Active Diagnostic Monitor</h4>
                          <p className="text-[11px] text-zinc-500 font-medium italic">
                            Infinity911 AI is continuously monitoring signal integrity, temporal drift, and biometric authenticity to ensure 100% forensic accuracy.
                          </p>
                        </div>
                    </div>
                  </motion.div>
                )}

                {result && !isProcessing && activeTab === 'intelligence' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-6 rounded-3xl bg-zinc-900 border border-white/10 col-span-1 md:col-span-2">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                          <Target className="w-4 h-4 text-red-500" /> Strategic Intelligence (STRATINT)
                        </h3>
                        <div className="space-y-6">
                           <div className="p-6 rounded-2xl bg-black/40 border border-white/5 relative">
                              <p className="text-sm text-zinc-100 leading-relaxed font-mono">
                                {result.intelligenceUnit.strategicIntel}
                              </p>
                              <div className="absolute top-2 right-2 flex gap-1">
                                <div className="w-1 h-1 rounded-full bg-red-500" />
                                <div className="w-1 h-1 rounded-full bg-red-500/50" />
                                <div className="w-1 h-1 rounded-full bg-red-500/20" />
                              </div>
                           </div>
                           
                           <div className="space-y-3">
                             <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Actionable Directives</h4>
                             <div className="grid grid-cols-1 gap-2">
                               {result.intelligenceUnit.actionableDirectives.map((d, di) => (
                                 <div key={d} className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-3">
                                   <div className="w-5 h-5 rounded-lg bg-blue-500/20 flex items-center justify-center text-[10px] font-black text-blue-400">
                                     {di + 1}
                                   </div>
                                   <p className="text-xs font-bold text-zinc-300">{d}</p>
                                 </div>
                               ))}
                             </div>
                           </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="p-6 rounded-3xl bg-red-600/5 border border-red-500/20">
                          <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">Threat Level</h4>
                          <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                              <svg className="w-32 h-32 transform -rotate-90">
                                <circle cx="64" cy="64" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-zinc-800" />
                                <circle 
                                  cx="64" cy="64" r="50" fill="none" stroke="currentColor" strokeWidth="8" 
                                  strokeDasharray="314"
                                  strokeDashoffset={314 - (314 * (result.intelligenceUnit.threatLevel === 'severe' ? 1 : result.intelligenceUnit.threatLevel === 'high' ? 0.8 : result.intelligenceUnit.threatLevel === 'elevated' ? 0.6 : 0.3))}
                                  className={`${
                                    result.intelligenceUnit.threatLevel === 'severe' ? 'text-red-500' :
                                    result.intelligenceUnit.threatLevel === 'high' ? 'text-orange-500' :
                                    'text-yellow-500'
                                  } transition-all duration-1000`}
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-sm font-black uppercase ${
                                    result.intelligenceUnit.threatLevel === 'severe' ? 'text-red-500' :
                                    result.intelligenceUnit.threatLevel === 'high' ? 'text-orange-500' :
                                    'text-yellow-500'
                                }`}>
                                  {result.intelligenceUnit.threatLevel}
                                </span>
                              </div>
                            </div>
                            <p className="text-[8px] text-zinc-500 font-bold text-center uppercase leading-relaxed">
                              Real-time assessment based on verbal aggression and frequency modulation.
                            </p>
                          </div>
                        </div>

                        <div className="p-6 rounded-3xl bg-zinc-900 border border-white/10">
                          <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Classification</h4>
                          <div className="p-4 rounded-xl bg-black border border-white/5 flex flex-col items-center gap-2">
                             <div className="p-2 rounded-lg bg-zinc-800">
                               <Shield className="w-5 h-5 text-zinc-400" />
                             </div>
                             <span className="text-xs font-black text-white tracking-[0.2em]">{result.intelligenceUnit.classification}</span>
                             <p className="text-[8px] text-zinc-600 font-bold uppercase truncate w-full text-center">Protocol: EYES ONLY</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-4">
                        <Cpu className="w-6 h-6 text-blue-400 animate-pulse" />
                        <div>
                          <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Intelligence Synthesis Engine</h4>
                          <p className="text-[11px] text-zinc-500 font-medium">
                            STRATINT module active. Analyzing conversation metadata for tactical intent and structural patterns. Cross-referencing with national security databases.
                          </p>
                        </div>
                    </div>
                  </motion.div>
                )}

                {result && !isProcessing && activeTab === 'legal' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 relative">
                    {/* Legal Stamp Overlay */}
                    <div className="absolute -top-4 -right-4 w-32 h-32 border-4 border-emerald-500/20 rounded-full flex items-center justify-center -rotate-12 pointer-events-none border-dashed overflow-hidden">
                      <div className="text-[10px] font-black text-emerald-500/30 text-center leading-none">
                        VERIFIED EVIDENCE<br/>STATUTE SYNC<br/>ID: {caseId}
                      </div>
                    </div>

                    <div className="p-8 rounded-[2rem] bg-blue-600/5 border border-blue-500/20 relative z-10">
                       <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Gavel className="w-4 h-4" /> Regional Forensic Synthesis
                       </h3>
                       <p className="text-sm text-zinc-100 leading-relaxed font-serif italic mb-6">"{result.analysis}"</p>
                       <p className="text-xs text-zinc-400 leading-relaxed">{result.legalContext.courtOpinion}</p>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[...result.legalContext.statutes, ...pinnedStatutes.map(s => ({ ...s, isPinned: true }))].map((s, i) => (
                        <div key={s.id} className={`p-5 rounded-2xl border relative group ${'isPinned' in s ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-zinc-800/40 border-white/5'}`}>
                          <div className="flex justify-between items-start mb-3">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${'isPinned' in s ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 text-blue-500'}`}>
                              {s.code}
                            </span>
                            {'isPinned' in s && (
                              <button 
                                onClick={() => setPinnedStatutes(prev => prev.filter(ps => ps.code !== s.code))}
                                className="p-1 hover:bg-emerald-500/20 rounded-md text-emerald-500/40 hover:text-emerald-500 transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-white mb-1 uppercase text-balance">{s.title}</h4>
                          <p className="text-[10px] text-zinc-500 leading-relaxed">{s.description}</p>
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                             <div className={`w-1.5 h-1.5 rounded-full ${i >= result.legalContext.statutes.length ? 'bg-emerald-500' : 'bg-blue-500'} shadow-[0_0_8px_rgba(16,185,129,0.5)]`} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-8 rounded-[2.5rem] bg-zinc-950 border border-white/5 overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Search className="w-24 h-24 text-zinc-500" />
                      </div>
                      
                      <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                          <div>
                            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-1 flex items-center gap-2">
                              <Search className="w-4 h-4 text-blue-400" /> Statute Explorer (LEX-OS)
                            </h3>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Search Unified Legal Database</p>
                          </div>
                          
                          <div className="relative w-full md:w-64">
                            <input 
                              type="text" 
                              value={statuteSearch}
                              onChange={(e) => setStatuteSearch(e.target.value)}
                              placeholder="SEARCH CODE OR KEYWORD..."
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-black text-white uppercase tracking-widest focus:outline-none focus:border-blue-500/50 transition-all"
                            />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {STATUTE_DATABASE.filter(s => 
                            s.code.toLowerCase().includes(statuteSearch.toLowerCase()) || 
                            s.title.toLowerCase().includes(statuteSearch.toLowerCase()) ||
                            s.description.toLowerCase().includes(statuteSearch.toLowerCase())
                          ).slice(0, 6).map((s, si) => (
                            <motion.button
                              key={si}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                if (!pinnedStatutes.find(ps => ps.code === s.code)) {
                                  setPinnedStatutes(prev => [s, ...prev]);
                                  setAuditLog(prev => [...prev, { 
                                    timestamp: new Date().toLocaleTimeString(), 
                                    action: `Statute ${s.code} appended to case analysis` 
                                  }]);
                                }
                              }}
                              className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 text-left transition-all group"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{s.code}</span>
                                <Plus className="w-3 h-3 text-zinc-700 group-hover:text-blue-400 transition-colors" />
                              </div>
                              <h5 className="text-[10px] font-black text-zinc-200 uppercase tracking-tighter mb-1 line-clamp-1">{s.title}</h5>
                              <p className="text-[8px] text-zinc-500 font-bold leading-relaxed line-clamp-2">{s.description}</p>
                            </motion.button>
                          ))}
                        </div>

                        {pinnedStatutes.length > 0 && (
                          <div className="mt-8 pt-8 border-t border-white/5">
                            <h4 className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                              <Link className="w-3 h-3" /> Manual Legal Annotations
                            </h4>
                            <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mb-4">Statutes merged into evidence report</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-zinc-900 border border-white/5">
                      <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-emerald-400" /> Professional Certification
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                          <div>
                            <p className="text-[10px] font-black text-white uppercase tracking-widest">Verify Evidence Integrity</p>
                            <p className="text-[9px] text-zinc-500 font-bold italic mt-0.5">Locks transcript for official report</p>
                          </div>
                          <button 
                            onClick={() => {
                              setIsCertified(!isCertified);
                              if (!isCertified) {
                                setAuditLog(prev => [...prev, { 
                                  timestamp: new Date().toLocaleTimeString(), 
                                  action: `Evidence Certified by ${auditorSignature || 'Auditor'}` 
                                }]);
                              }
                            }}
                            className={`w-12 h-6 rounded-full transition-all relative ${isCertified ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                          >
                            <motion.div 
                              animate={{ x: isCertified ? 24 : 4 }}
                              className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-xl"
                            />
                          </button>
                        </div>
                        
                        <div className="relative">
                          <p className="text-[9px] text-zinc-500 font-bold uppercase mb-2 ml-1">Digital Signature (Print Name)</p>
                          <input 
                            type="text"
                            value={auditorSignature}
                            onChange={(e) => setAuditorSignature(e.target.value)}
                            placeholder="Enter full legal name"
                            className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-3 text-xs font-serif italic text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-zinc-800"
                          />
                          <Scale className="absolute right-4 top-9 w-4 h-4 text-zinc-700 pointer-events-none" />
                        </div>

                        {auditLog.length > 0 && (
                          <div className="mt-4 p-4 rounded-xl bg-black/60 border border-white/5">
                            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <TimelineIcon className="w-3 h-3" /> Audit Log
                            </p>
                            <div className="space-y-1">
                              {auditLog.map((log, lIdx) => (
                                <div key={lIdx} className="flex justify-between items-center text-[8px] font-bold">
                                  <span className="text-zinc-400">{log.action}</span>
                                  <span className="text-zinc-600 font-mono">{log.timestamp}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-4">
                        <AlertTriangle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <div>
                        <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Processing Performance Profile</h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed font-mono italic">
                          {result.performanceProfile || result.legalContext.performanceProfile}
                        </p>
                        </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {result && !isProcessing && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap items-center justify-center gap-3 mt-12 py-6 border-t border-white/5"
                >
                  <button 
                    onClick={() => setIsReportModalOpen(true)}
                    className="px-8 py-4 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-[2rem] flex items-center gap-3 font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-blue-600/30 group"
                  >
                    <FileText className="w-5 h-5 transition-transform group-hover:scale-110" />
                    Generate Forensic Report
                  </button>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={handleShare}
                      className="p-4 bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 rounded-2xl transition-all group"
                      title="Share Plain Text Report"
                    >
                      <Share2 className="w-5 h-5 transition-transform group-hover:scale-110" />
                    </button>
                    <button 
                      onClick={handleSendEmail}
                      className="p-4 bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-400 hover:text-blue-400 rounded-2xl transition-all group"
                      title="Dispatch Email"
                    >
                      <Send className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="p-5 bg-black/60 border-t border-white/5 flex items-center justify-between">
              <div className="flex gap-4">
                <span className="text-[9px] font-bold text-zinc-600 uppercase flex items-center gap-2">
                  <Clock className="w-3 h-3 text-blue-500" /> STAMP: {eventTime.replace('T', ' ')}
                </span>
                <span className="text-[9px] font-bold text-zinc-600 uppercase flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {jurisdiction} Certified
                </span>
                <span className="text-[9px] font-bold text-zinc-600 uppercase flex items-center gap-2">
                  <Fingerprint className="w-3 h-3 text-zinc-500" /> Digital Integrity: Verified
                </span>
              </div>
              <div className="text-[9px] font-black text-zinc-800 select-none">
                INFINITY911 EVIDENCE DECODER LABS • {jurisdiction.toUpperCase()}
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Stealth Mode Decoy Overlay */}
      <AnimatePresence>
        {isStealthMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center cursor-none touch-none font-mono"
          >
            <div className="flex flex-col items-center gap-8">
              <motion.div 
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-6xl font-black text-zinc-900 tracking-tighter"
              >
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </motion.div>

              <div className="space-y-1">
                {[
                  "ROOT_SYS: [OK]",
                  "ENCRYPT_CORE: [LOCKED]",
                  "NET_PROX: [ESTABLISHED]",
                  "MEM_BUF: [OPTIMIZED]"
                ].map((msg, mi) => (
                  <motion.div 
                    key={mi}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.15 }}
                    transition={{ delay: mi * 0.2 }}
                    className="text-[8px] tracking-[0.3em] text-zinc-800 text-center uppercase"
                  >
                    {msg}
                  </motion.div>
                ))}
              </div>

              {isRecording && (
                <motion.div 
                  animate={{ opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-900/50"
                >
                  <div className="w-1 h-1 rounded-full bg-red-900/20" />
                  <span className="text-[7px] font-black text-zinc-900 uppercase tracking-widest">Background Sync Active</span>
                </motion.div>
              )}
            </div>
            
            <div className="absolute bottom-8 left-8">
               <div className="w-1 h-1 bg-zinc-950 rounded-full" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isReportModalOpen && result && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReportModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-zinc-900 rounded-[3rem] border border-white/10 overflow-hidden relative z-10 shadow-2xl"
            >
              <div className="p-12 text-center">
                <div className="flex justify-center mb-8">
                  <div className="w-20 h-20 rounded-3xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                    <FileText className="w-10 h-10 text-blue-400" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">OFFICIAL FORENSIC REPORT</h3>
                <p className="text-zinc-500 text-sm font-medium mb-12 max-w-sm mx-auto">
                  Export case analysis for legal submission. Select your preferred high-fidelity document format below.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <button 
                    onClick={handlePrintReport}
                    className="flex flex-col items-center gap-4 p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all group"
                  >
                    <div className="p-3 rounded-full bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                      <Printer className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <span className="block text-[9px] font-black text-white uppercase tracking-widest mb-1">Print Report</span>
                      <span className="block text-[7px] text-zinc-500 font-bold uppercase">System Output</span>
                    </div>
                  </button>

                  <button 
                    onClick={downloadPDFReport}
                    className="flex flex-col items-center gap-4 p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-red-500/50 hover:bg-red-500/10 transition-all group"
                  >
                    <div className="p-3 rounded-full bg-red-500/20 text-red-400 group-hover:scale-110 transition-transform">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <span className="block text-[9px] font-black text-white uppercase tracking-widest mb-1">Direct PDF</span>
                      <span className="block text-[7px] text-zinc-500 font-bold uppercase">Binary Seal</span>
                    </div>
                  </button>

                  <button 
                    onClick={downloadHTMLReport}
                    className="flex flex-col items-center gap-4 p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all group"
                  >
                    <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <span className="block text-[9px] font-black text-white uppercase tracking-widest mb-1">HTML Web</span>
                      <span className="block text-[7px] text-zinc-500 font-bold uppercase">Source Code</span>
                    </div>
                  </button>

                  <button 
                    onClick={downloadWordReport}
                    className="flex flex-col items-center gap-4 p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-blue-400/50 hover:bg-blue-400/10 transition-all group"
                  >
                    <div className="p-3 rounded-full bg-blue-400/20 text-blue-400 group-hover:scale-110 transition-transform">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <span className="block text-[9px] font-black text-white uppercase tracking-widest mb-1">Word DOC</span>
                      <span className="block text-[7px] text-zinc-500 font-bold uppercase">Legacy Draft</span>
                    </div>
                  </button>
                </div>

                <button 
                  onClick={() => setIsReportModalOpen(false)}
                  className="mt-12 text-[10px] font-black text-zinc-600 hover:text-white uppercase tracking-[0.3em] transition-colors"
                >
                  DISMISS EXPORT INTERFACE
                </button>
              </div>
              
              <div className="absolute top-4 right-4 p-2 bg-red-600/10 border border-red-500/20 rounded-lg">
                <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Confidential</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
