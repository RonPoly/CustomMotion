// src/routes/chunk.ts

import { Router } from "express";
import { prisma } from "../prismaClient";
import { chunkTasksPrompt } from "../services/geminiClient";

const router = Router();

router.post("/", async (_req, res) => {
  console.log("➡️ POST /chunk invoked");

  try {
    // 1. Fetch tasks that have no chunks yet
    const tasks = await prisma.task.findMany({
      where: { chunks: { none: {} } },
    });
    console.log(`Found ${tasks.length} tasks to chunk`);

    if (tasks.length === 0) {
      return res.json({ chunks: [], message: "No tasks to chunk" });
    }

    // 2. Call Gemini to chunk them
    const aiChunks = await chunkTasksPrompt(tasks);
    console.log(`Gemini returned ${aiChunks.length} chunks`);

    // 3. Create chunks in database
    const createdChunks = [];
    for (const chunk of aiChunks) {
      const created = await prisma.chunk.create({
        data: {
          taskId: chunk.taskId,
          title: chunk.title,
          duration: chunk.duration,
        },
      });
      createdChunks.push(created);
    }

    console.log(`Created ${createdChunks.length} chunks in database`);

    // 4. Return the created chunks
    return res.json({ 
      chunks: createdChunks,
      message: `Successfully created ${createdChunks.length} chunks`
    });
    
  } catch (err: any) {
    console.error("⛔ CHUNK ERROR:", err);
    return res.status(500).json({
      error: "Failed to chunk tasks",
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

export default router;