// src/index.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { prisma } from "./prismaClient";
import chunkRouter from "./routes/chunk";
import tasksRouter from "./routes/tasks";

dotenv.config();
const app = express();

// ◾️ GLOBAL REQUEST LOGGER
app.use((req, _res, next) => {
  console.log(`➡️ Incoming request: ${req.method} ${req.url}`);
  next();
});

app.use(cors(), express.json());
app.use("/chunk", chunkRouter);
app.use("/tasks", tasksRouter);

app.get("/", (_req, res) => res.send("Backend up and running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
  // ...testDb...
});


// A simple test route
app.get("/", (_req, res) => res.send("Backend up and running"));

// After server starts, test the database
async function testDb() {
  try {
    const t = await prisma.task.create({
      data: {
        title: "Hello Prisma",
        estimate: 30,
        tags: {}
      }
    });
    console.log("Created test task:", t);
  } catch (e) {
    console.error("DB test failed:", e);
  }
}

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
  testDb();  // <<< call it here
});
