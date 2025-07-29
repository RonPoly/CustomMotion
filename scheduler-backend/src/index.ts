import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Start with minimal setup
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "Backend is running!" });
});

// Basic server start
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('Press Ctrl+C to stop\n');
  
  // Now try to import routes after server starts
  setTimeout(() => {
    console.log('Loading routes...');
    try {
      const { prisma } = require("./prismaClient");
      const chunkRouter = require("./routes/chunk").default;
      const tasksRouter = require("./routes/tasks").default;
      
      app.use("/chunk", chunkRouter);
      app.use("/tasks", tasksRouter);
      
      console.log('✅ Routes loaded successfully');
      
      // Test DB connection
      prisma.$connect().then(() => {
        console.log('✅ Database connected');
      }).catch((e: any) => {
        console.error('❌ Database error:', e.message);
      });
      
    } catch (e: any) {
      console.error('Error loading routes:', e.message);
    }
  }, 1000);
});

// Keep process alive
process.stdin.resume();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => {
    process.exit(0);
  });
});