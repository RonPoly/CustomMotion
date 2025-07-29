// src/routes/chunk.ts

import { Router } from "express";
import { prisma } from "../prismaClient";
import { chunkTasksPrompt } from "../services/geminiClient";

const router = Router();

router.post("/", async (_req, res) => {
  console.log("➡️  POST /chunk invoked");  // entry log

  try {
    // 1. Fetch tasks that have no chunks yet
    const tasks = await prisma.task.findMany({
      where: { chunks: { none: {} } },
    });
    console.log(`   • Found ${tasks.length} tasks to chunk`);

    if (tasks.length === 0) {
      return res.json({ chunks: [] });
    }

    // 2. Call Gemini to chunk them
    const rawChunks = await chunkTasksPrompt(tasks);
    console.log(`   • Gemini returned ${rawChunks.length} chunks`);

    // 3. Persist each chunk
    const createdChunks = await Promise.all(
      rawChunks.map((c: any) =>
        prisma.chunk.create({
          data: {
            taskId: c.taskId ?? tasks.find(t => t.title === c.title)!.id,
            title: c.title,
            duration: c.duration,
            scheduledAt: null,
            calendarEventId: null,
          },
        })
      )
    );
    console.log(`   • Persisted ${createdChunks.length} chunks`);

    // 4. Return the created chunks
    return res.json({ chunks: createdChunks });
  } catch (err: any) {
    // Log the full error for debugging
    console.error("⛔️ CHUNK ERROR:", err.response?.data ?? err.message ?? err);

    // Return error + details to client
    return res.status(500).json({
      error: "Failed to chunk tasks",
      details: err.response?.data ?? err.message,
    });
  }
});

export default router;
