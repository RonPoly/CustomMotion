import { Router } from "express";
import { prisma } from "../prismaClient";

const router = Router();

// Create a new task
router.post("/", async (req, res) => {
  try {
    const { title, estimate, deadline, tags, dependsOn } = req.body;
    
    const task = await prisma.task.create({
      data: { 
        title, 
        estimate, 
        deadline: deadline ? new Date(deadline) : null,
        tags: JSON.stringify(tags || {}), // Convert to string for SQLite
        dependsOn: dependsOn || null 
      }
    });
    
    res.json({
      ...task,
      tags: JSON.parse(task.tags) // Parse back to object for response
    });
  } catch (err: any) {
    console.error("Task creation error:", err);
    res.status(500).json({ error: "Failed to create task", details: err.message });
  }
});

// List all tasks
router.get("/", async (_req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      include: { chunks: true }
    });
    
    // Parse tags back to objects
    const tasksWithParsedTags = tasks.map(t => ({
      ...t,
      tags: JSON.parse(t.tags)
    }));
    
    res.json(tasksWithParsedTags);
  } catch (err: any) {
    console.error("Task fetch error:", err);
    res.status(500).json({ error: "Failed to fetch tasks", details: err.message });
  }
});

export default router;