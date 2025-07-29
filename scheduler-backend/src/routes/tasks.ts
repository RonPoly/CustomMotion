import { Router } from "express";
import { prisma } from "../prismaClient";

const router = Router();

// Create a new task
router.post("/", async (req, res) => {
  try {
    const { title, estimate, deadline, tags, dependsOn } = req.body;
    const task = await prisma.task.create({
      data: { title, estimate, deadline, tags: tags || {}, dependsOn: dependsOn || null }
    });
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// List all tasks
router.get("/", async (_req, res) => {
  const tasks = await prisma.task.findMany();
  res.json(tasks);
});

export default router;
