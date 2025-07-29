// src/services/geminiClient.ts
import axios from "axios";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("WARNING: Missing GEMINI_API_KEY in .env");
}

// Core helper function
async function callGemini(
  model: string,
  promptText: string,
  maxOutputTokens = 2048,
  temperature = 0.7
): Promise<string> {
  if (!API_KEY) {
    throw new Error("Missing GEMINI_API_KEY - please add it to your .env file");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

  // CORRECT FORMAT - This is what Gemini expects!
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: promptText
          }
        ]
      }
    ],
    generationConfig: {
      temperature,
      maxOutputTokens,
      topK: 1,
      topP: 1
    }
  };

  try {
    console.log(`Calling Gemini ${model}...`);
    const response = await axios.post(url, requestBody, {
      headers: { 
        'Content-Type': 'application/json'
      }
    });

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("No text in Gemini response:", JSON.stringify(response.data, null, 2));
      throw new Error("Gemini returned empty response");
    }

    return text;
  } catch (error: any) {
    if (error.response) {
      console.error("Gemini API Error:", error.response.status, error.response.data);
      throw new Error(`Gemini API Error: ${error.response.data?.error?.message || error.message}`);
    }
    throw error;
  }
}

// Export functions with simpler prompts
export async function chunkTasksPrompt(tasks: any[]) {
  // Prepare tasks with parsed tags
  const taskList = tasks.map(t => ({
    id: t.id,
    title: t.title,
    estimate: t.estimate,
    chunkRule: 60  // default to 60 minute chunks
  }));

  const prompt = `Break these tasks into chunks of maximum 60 minutes each.

Tasks:
${JSON.stringify(taskList, null, 2)}

Return ONLY a JSON array (no markdown, no explanation) in this format:
[
  {"taskId": "original_task_id", "title": "chunk title", "duration": 60, "tags": {}}
]

For a 120-minute task, create 2 chunks of 60 minutes each.
Name them like "Original Task - Part 1", "Original Task - Part 2", etc.`;

  try {
    const response = await callGemini("gemini-1.5-flash", prompt);
    
    // Try to parse the response
    const trimmed = response.trim();
    
    // Remove markdown code blocks if present
    const cleaned = trimmed
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim();
    
    return JSON.parse(cleaned);
  } catch (error: any) {
    console.error("Failed to parse Gemini response:", error.message);
    console.error("Raw response was:", response);
    
    // Return a simple fallback
    return tasks.map(task => ({
      taskId: task.id,
      title: `${task.title} - Full`,
      duration: task.estimate,
      tags: {}
    }));
  }
}

export async function scoreSlotsPrompt(
  slots: { start: string; end: string }[],
  chunks: any[]
) {
  const prompt = `Score each time slot for each task chunk (1-10).
Slots: ${JSON.stringify(slots)}
Chunks: ${JSON.stringify(chunks)}
Return JSON array: [{"slotIndex": 0, "chunkIndex": 0, "score": 8}]`;
  
  const response = await callGemini("gemini-1.5-flash", prompt);
  return JSON.parse(response.trim());
}

export async function rebalancePrompt(
  slots: any[],
  chunks: any[],
  scores: any[]
) {
  const prompt = `Assign chunks to slots to maximize score.
Slots: ${JSON.stringify(slots)}
Chunks: ${JSON.stringify(chunks)}
Scores: ${JSON.stringify(scores)}
Return JSON: [{"chunkIndex": 0, "slotIndex": 1}]`;
  
  const response = await callGemini("gemini-1.5-flash", prompt);
  return JSON.parse(response.trim());
}

export async function simulatePrompt(
  currentSlots: any[],
  chunks: any[],
  scores: any[],
  hypotheticalEvent: { start: string; end: string }
) {
  const prompt = `Simulate adding event ${hypotheticalEvent.start}-${hypotheticalEvent.end}.
Current: ${JSON.stringify({ slots: currentSlots, chunks, scores })}
Return JSON: {"moved": [], "unassigned": []}`;
  
  const response = await callGemini("gemini-1.5-flash", prompt);
  return JSON.parse(response.trim());
}

export async function notifyPrompt(tomorrowSchedule: any[]) {
  const prompt = `Summarize tomorrow's schedule in 2-3 sentences:
${JSON.stringify(tomorrowSchedule)}`;
  
  return await callGemini("gemini-1.5-flash", prompt);
}

export async function analyticsPrompt(stats: Record<string, any>) {
  const prompt = `Give 3 productivity insights based on:
${JSON.stringify(stats)}`;
  
  return await callGemini("gemini-1.5-flash", prompt);
}