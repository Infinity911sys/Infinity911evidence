
export interface DecoderResult {
  primaryTranscript: string;
  backgroundVoices: {
    id: string;
    speaker: string;
    content: string;
    confidence: number;
    timestamp: string;
  }[];
  analysis: string;
  jammingStatus?: {
    detected: boolean;
    frequency: string;
    strength: 'low' | 'high' | 'critical';
    type: string;
  };
  intelligenceUnit: {
    threatLevel: 'low' | 'moderate' | 'elevated' | 'high' | 'severe';
    strategicIntel: string;
    actionableDirectives: string[];
    classification: 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP SECRET';
  };
  voiceAuthenticity: {
    livenessScore: number; // 0 to 1
    type: 'live_human' | 'synthetic_ai' | 'recorded_replay' | 'distorted';
    analysis: string;
    vulnerabilitiesDetected: string[];
  };
  legalContext: {
    statutes: { id: string; code: string; title: string; description: string }[];
    courtOpinion: string;
    performanceProfile: string;
  };
  visualData: {
    waveform: { time: number; amplitude: number; noise: number }[];
    spectrum: { frequency: string; db: number; category: 'human' | 'device' | 'noise' | 'interference'; peak: boolean }[];
    timeline: { time: string; event: string; type: 'voice' | 'noise' | 'mechanical' | 'interference' }[];
  };
  diagnostics: {
    id: string;
    system: string;
    issue: string;
    severity: 'optimal' | 'warning' | 'critical';
    fix: string;
  }[];
}

export type DecoderMode = 'standard' | 'turbo';

export interface DecoderOptions {
  mode?: DecoderMode;
  noiseFilter?: boolean;
  jammingDetect?: boolean;
}

function extractPartialTranscript(json: string): string {
  const marker = '"primaryTranscript": "';
  const start = json.indexOf(marker);
  if (start === -1) return "";
  
  const transcriptStart = start + marker.length;
  let transcript = "";
  let escaped = false;
  
  for (let i = transcriptStart; i < json.length; i++) {
    const char = json[i];
    if (escaped) {
      transcript += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      break;
    }
    transcript += char;
  }
  
  return transcript;
}

export async function* decodeEvidenceStream(fileData: string, mimeType: string, options: DecoderOptions = {}, jurisdiction: string = 'Universal Jurisdiction') {
  const response = await fetch('/api/decode-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileData, mimeType, options, jurisdiction })
  });

  if (!response.body) throw new Error('ReadableStream not supported');
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const json = JSON.parse(line.substring(6));
        if (json.text) {
          // In the server stream I'm just sending text chunks
          // But I need to extract transcript like before if I want partials
          // Actually let's just use the fullText approach on the client side too
          // Or extract specifically for partials if needed.
          // For simplicity, I'll just send the text and let extractPartialTranscript work.
          // Wait, extractPartialTranscript needs the full json string accumulated so far.
          // I'll keep track of it.
        }
        if (json.done) {
          yield { ...json.fullResult, isFinal: true };
          return;
        }
        if (json.error) throw new Error(json.error);
        
        // If we want partial transcript updates during streaming:
        // We need to pass the cumulative json string to extractPartialTranscript
        // but the server is sending chunks. 
        // Let's assume the server sends the full accumulated text in each data line if we wanted.
        // But the server currently sends just {text: chunk}.
      }
    }
  }
}

export async function decodeEvidence(fileData: string, mimeType: string, options: DecoderOptions = {}, jurisdiction: string = 'Universal Jurisdiction'): Promise<DecoderResult> {
  const response = await fetch('/api/decode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileData, mimeType, options, jurisdiction })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Server error');
  }
  
  return await response.json();
}
