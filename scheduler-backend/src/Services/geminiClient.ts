// src/services/geminiClient.ts

import axios from "axios";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error("Missing GEMINI_API_KEY in .env");
}

// ---- Types ----
interface GeminiCandidate {
  content: string;
}
interface GeminiResponse {
  candidates: GeminiCandidate[];
}

/**
 * Core helper – calls the generateContent endpoint with the correct body shape.
 */
async function callGemini(
  model: string,
  promptText: string,
  maxOutputTokens = 1024,
  temperature = 0.2
): Promise<string> {
  // API key in query string
  const url = 
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${model}:generateContent?key=${API_KEY}`;

  const body = {
    contents: [
      { text: promptText }
    ],
    generationConfig: {
      temperature,
      maxOutputTokens
    }
  };

  const res = await axios.post<GeminiResponse>(
    url,
    body,
    { headers: { "Content-Type": "application/json" } }
  );

  const candidate = res.data.candidates?.[0];
  if (!candidate?.content) {
    console.error("Gemini returned no content:", res.data);
    throw new Error("No content returned from Gemini");
  }

  return candidate.content;
}

// ---- Exported functions ----

export async function chunkTasksPrompt(tasks: any[]) {
  const prompt = `
Break these tasks into sub‑tasks no longer than each task’s chunkRule minutes.
Input JSON: ${JSON.stringify(tasks, null, 2)}
Output a JSON array of { title, duration, tags }.
`;
  const raw = await callGemini("gemini-2.5-pro", prompt);
  return JSON.parse(raw);
}

export async function scoreSlotsPrompt(
  slots: { start: string; end: string }[],
  chunks: any[]
) {
  const prompt = `
We have these free time slots and these task chunks with tags:
Slots: ${JSON.stringify(slots, null, 2)}
Chunks: ${JSON.stringify(chunks, null, 2)}
For each slot–chunk pair, assign a suitability score 1–10.
Output JSON array of { slotIndex, chunkIndex, score }.
`;
  const raw = await callGemini("gemini-1.5-pro", prompt);
  return JSON.parse(raw);
}

export async function rebalancePrompt(
  slots: any[],
  chunks: any[],
  scores: any[]
) {
  const prompt = `
Optimize the upcoming week: assign each task chunk to a free slot to maximize total score.
Constraints: no overlaps, deadlines must be met, dependencies respected.
Input:
  Slots: ${JSON.stringify(slots, null, 2)}
  Chunks: ${JSON.stringify(chunks, null, 2)}
  Scores: ${JSON.stringify(scores, null, 2)}
Output JSON array of { chunkIndex, slotIndex }.
`;
  const raw = await callGemini("gemini-1.5-pro", prompt);
  return JSON.parse(raw);
}

export async function simulatePrompt(
  currentSlots: any[],
  chunks: any[],
  scores: any[],
  hypotheticalEvent: { start: string; end: string }
) {
  const prompt = `
Simulate adding a hypothetical event (${hypotheticalEvent.start} to ${hypotheticalEvent.end}).
Given:
  Current Slots: ${JSON.stringify(currentSlots, null, 2)}
  Chunks: ${JSON.stringify(chunks, null, 2)}
  Scores: ${JSON.stringify(scores, null, 2)}
Recompute the schedule and output the diff: JSON { moved: [{ chunkIndex, fromSlot, toSlot }], unassigned: [chunkIndex] }.
`;
  const raw = await callGemini("gemini-1.5-pro", prompt);
  return JSON.parse(raw);
}

export async function notifyPrompt(tomorrowSchedule: any[]) {
  const prompt = `
Summarize the schedule for tomorrow:
${JSON.stringify(tomorrowSchedule, null, 2)}
Draft a brief, actionable summary.
`;
  return (await callGemini("gemini-1.5-flash", prompt)).trim();
}

export async function analyticsPrompt(stats: Record<string, any>) {
  const prompt = `
Here are your productivity stats:
${JSON.stringify(stats, null, 2)}
Provide 3 insights or tips based on these metrics.
`;
  return (await callGemini("gemini-1.5-flash", prompt)).trim();
}
