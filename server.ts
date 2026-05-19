import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/decode", async (req, res) => {
  try {
    const { fileData, mimeType, options, jurisdiction } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    }

    const { mode, noiseFilter, jammingDetect } = options || {};

    const prompt = `
      Analyze this digital media using the 'INFINITY NATIONAL SECURITY DECODER™'.
      JURISDICTION: ${jurisdiction}.
      ENGINE: ${mode === 'turbo' ? 'TURBO STRATINT CORE' : 'STANDARD PRECISION CORE'}.
      
      SIGNAL PROCESSING (ACTIVE):
      - PROXIMITY GAIN BALANCE: Normalizing near-field audio (within 1') to prevent clipping.
      
      INTEL DIRECTIVES (ACTIVE):
      1. VOICE SEPARATION (VOICEINT): Isolate and profile every distinct speaker.
      ${noiseFilter ? '2. NOISE SUPPRESSION (SIGINT): ACTIVE. Remove environmental masking frequencies.' : ''}
      ${jammingDetect ? '3. JAMMING DETECTION (ELINT): ACTIVE. Identify frequency hopping or signal disruption patterns.' : ''}
      4. THREAT ASSESSMENT: Evaluate for aggression, tactical planning, or danger.
      5. STRATEGIC INTELLIGENCE: Provide a summary suitable for an Intelligence Briefing.
      6. ACTIONABLE DIRECTIVES: List 3-5 immediate field actions based on findings.
      7. CLASSIFIED DECODING: Identify the 'Auditor' and their relationship to the scene.
      8. BIOMETRIC LIVENESS (AUTHENTICITY): Identify if voices are LIVE HUMANS or REPLAYED from a device (false voices).
      9. LEGAL SYNC: Cross-reference findings with applicable statutes for ${jurisdiction}.
      10. AUTO-DIAGNOSTICS: Analyze signal health and system performance (jamming, noise, authenticity). Provide AI-generated fixes.
      
      CRITICAL: Assign a unique lowercase string for 'id' to every item in arrays (backgroundVoices, statutes, diagnostics).
      
      GENERATE MOCK DATA FOR "visualData". Waveform and Spectrum (40-50 points).
      Spectrum data points MUST be categorized as 'human', 'device', 'noise', or 'interference'.
      If jamming is detected, include "jammingStatus".
      Assign a Classification Level and Threat Level.
      Evaluate VOICE AUTHENTICITY (Liveness).
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: fileData,
              mimeType: mimeType
            }
          }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryTranscript: { type: Type.STRING },
            backgroundVoices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  speaker: { type: Type.STRING },
                  content: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  timestamp: { type: Type.STRING }
                },
                required: ["id", "speaker", "content", "confidence", "timestamp"]
              }
            },
            analysis: { type: Type.STRING },
            jammingStatus: {
              type: Type.OBJECT,
              properties: {
                detected: { type: Type.BOOLEAN },
                frequency: { type: Type.STRING },
                strength: { type: Type.STRING, enum: ['low', 'high', 'critical'] },
                type: { type: Type.STRING }
              },
              required: ["detected", "frequency", "strength", "type"]
            },
            intelligenceUnit: {
              type: Type.OBJECT,
              properties: {
                threatLevel: { type: Type.STRING, enum: ['low', 'moderate', 'elevated', 'high', 'severe'] },
                strategicIntel: { type: Type.STRING },
                actionableDirectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                classification: { type: Type.STRING, enum: ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP SECRET'] }
              },
              required: ["threatLevel", "strategicIntel", "actionableDirectives", "classification"]
            },
            voiceAuthenticity: {
              type: Type.OBJECT,
              properties: {
                livenessScore: { type: Type.NUMBER },
                type: { type: Type.STRING, enum: ['live_human', 'synthetic_ai', 'recorded_replay', 'distorted'] },
                analysis: { type: Type.STRING },
                vulnerabilitiesDetected: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["livenessScore", "type", "analysis", "vulnerabilitiesDetected"]
            },
            legalContext: {
              type: Type.OBJECT,
              properties: {
                statutes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      code: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING }
                    },
                    required: ["id", "code", "title", "description"]
                  }
                },
                courtOpinion: { type: Type.STRING },
                performanceProfile: { type: Type.STRING }
              },
              required: ["statutes", "courtOpinion", "performanceProfile"]
            },
            visualData: {
              type: Type.OBJECT,
              properties: {
                waveform: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      time: { type: Type.NUMBER },
                      amplitude: { type: Type.NUMBER },
                      noise: { type: Type.NUMBER }
                    },
                    required: ["time", "amplitude", "noise"]
                  }
                },
                timeline: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      time: { type: Type.STRING },
                      event: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ['voice', 'noise', 'mechanical', 'interference'] }
                    },
                    required: ["time", "event", "type"]
                  }
                },
                spectrum: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      frequency: { type: Type.STRING },
                      db: { type: Type.NUMBER },
                      category: { type: Type.STRING, enum: ['human', 'device', 'noise', 'interference'] },
                      peak: { type: Type.BOOLEAN }
                    },
                    required: ["frequency", "db", "category", "peak"]
                  }
                }
              },
              required: ["waveform", "timeline", "spectrum"]
            },
            diagnostics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  system: { type: Type.STRING },
                  issue: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ['optimal', 'warning', 'critical'] },
                  fix: { type: Type.STRING }
                },
                required: ["id", "system", "issue", "severity", "fix"]
              }
            }
          },
          required: ["primaryTranscript", "backgroundVoices", "analysis", "legalContext", "visualData", "intelligenceUnit", "voiceAuthenticity", "diagnostics"]
        }
      }
    });

    const responseText = result.text;
    if (!responseText) throw new Error("No response from AI");
    res.json(JSON.parse(responseText));
  } catch (error) {
    console.error("API Decode Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Decoding failed" });
  }
});

app.post("/api/decode-stream", async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { fileData, mimeType, options, jurisdiction } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      res.write(`data: ${JSON.stringify({ error: "GEMINI_API_KEY is not configured" })}\n\n`);
      return res.end();
    }

    const { mode, noiseFilter, jammingDetect } = options || {};

    const prompt = `
      Analyze this digital media using the 'INFINITY NATIONAL SECURITY DECODER™'.
      JURISDICTION: ${jurisdiction}.
      ENGINE: ${mode === 'turbo' ? 'TURBO STRATINT CORE' : 'STANDARD PRECISION CORE'}.
      
      SIGNAL PROCESSING (ACTIVE):
      - PROXIMITY GAIN BALANCE: Normalizing near-field audio (within 1') to prevent clipping.
      
      INTEL DIRECTIVES (ACTIVE):
      1. VOICE SEPARATION (VOICEINT): Isolate and profile every distinct speaker.
      ${noiseFilter ? '2. NOISE SUPPRESSION (SIGINT): ACTIVE. Remove environmental masking frequencies.' : ''}
      ${jammingDetect ? '3. JAMMING DETECTION (ELINT): ACTIVE. Identify frequency hopping or signal disruption patterns.' : ''}
      4. THREAT ASSESSMENT: Evaluate for aggression, tactical planning, or danger.
      5. STRATEGIC INTELLIGENCE: Provide a summary suitable for an Intelligence Briefing.
      6. ACTIONABLE DIRECTIVES: List 3-5 immediate field actions based on findings.
      7. CLASSIFIED DECODING: Identify the 'Auditor' and their relationship to the scene.
      8. BIOMETRIC LIVENESS (AUTHENTICITY): Identify if voices are LIVE HUMANS or REPLAYED from a device (false voices).
      9. AUTO-DIAGNOSTICS: Analyze signal health and system performance (jamming, noise, authenticity). Provide AI-generated fixes.
      
      CRITICAL: Assign a unique lowercase string for 'id' to every item in arrays (backgroundVoices, statutes, diagnostics).
      
      GENERATE MOCK DATA FOR "visualData". Waveform and Spectrum (40-50 points).
      Spectrum data points MUST be categorized as 'human', 'device', 'noise', or 'interference'.
      If jamming is detected, include "jammingStatus".
      Assign a Classification Level and Threat Level.
      Evaluate VOICE AUTHENTICITY (Liveness).
    `;

    const stream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: fileData,
              mimeType: mimeType
            }
          }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        // Re-using the same schema
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryTranscript: { type: Type.STRING },
            backgroundVoices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  speaker: { type: Type.STRING },
                  content: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  timestamp: { type: Type.STRING }
                },
                required: ["id", "speaker", "content", "confidence", "timestamp"]
              }
            },
            analysis: { type: Type.STRING },
            jammingStatus: {
              type: Type.OBJECT,
              properties: {
                detected: { type: Type.BOOLEAN },
                frequency: { type: Type.STRING },
                strength: { type: Type.STRING, enum: ['low', 'high', 'critical'] },
                type: { type: Type.STRING }
              },
              required: ["detected", "frequency", "strength", "type"]
            },
            intelligenceUnit: {
              type: Type.OBJECT,
              properties: {
                threatLevel: { type: Type.STRING, enum: ['low', 'moderate', 'elevated', 'high', 'severe'] },
                strategicIntel: { type: Type.STRING },
                actionableDirectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                classification: { type: Type.STRING, enum: ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP SECRET'] }
              },
              required: ["threatLevel", "strategicIntel", "actionableDirectives", "classification"]
            },
            voiceAuthenticity: {
              type: Type.OBJECT,
              properties: {
                livenessScore: { type: Type.NUMBER },
                type: { type: Type.STRING, enum: ['live_human', 'synthetic_ai', 'recorded_replay', 'distorted'] },
                analysis: { type: Type.STRING },
                vulnerabilitiesDetected: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["livenessScore", "type", "analysis", "vulnerabilitiesDetected"]
            },
            legalContext: {
              type: Type.OBJECT,
              properties: {
                statutes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      code: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING }
                    },
                    required: ["id", "code", "title", "description"]
                  }
                },
                courtOpinion: { type: Type.STRING },
                performanceProfile: { type: Type.STRING }
              },
              required: ["statutes", "courtOpinion", "performanceProfile"]
            },
            visualData: {
              type: Type.OBJECT,
              properties: {
                waveform: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      time: { type: Type.NUMBER },
                      amplitude: { type: Type.NUMBER },
                      noise: { type: Type.NUMBER }
                    },
                    required: ["time", "amplitude", "noise"]
                  }
                },
                timeline: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      time: { type: Type.STRING },
                      event: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ['voice', 'noise', 'mechanical', 'interference'] }
                    },
                    required: ["time", "event", "type"]
                  }
                },
                spectrum: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      frequency: { type: Type.STRING },
                      db: { type: Type.NUMBER },
                      category: { type: Type.STRING, enum: ['human', 'device', 'noise', 'interference'] },
                      peak: { type: Type.BOOLEAN }
                    },
                    required: ["frequency", "db", "category", "peak"]
                  }
                }
              },
              required: ["waveform", "timeline", "spectrum"]
            },
            diagnostics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  system: { type: Type.STRING },
                  issue: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ['optimal', 'warning', 'critical'] },
                  fix: { type: Type.STRING }
                },
                required: ["id", "system", "issue", "severity", "fix"]
              }
            }
          },
          required: ["primaryTranscript", "backgroundVoices", "analysis", "legalContext", "visualData", "intelligenceUnit", "voiceAuthenticity", "diagnostics"]
        }
      }
    });

    let fullText = "";
    for await (const chunk of stream) {
      if (chunk.text) {
        fullText += chunk.text;
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true, fullResult: JSON.parse(fullText) })}\n\n`);
    res.end();
  } catch (error) {
    console.error("API Stream Decode Error:", error);
    res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : "Streaming failed" })}\n\n`);
    res.end();
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
