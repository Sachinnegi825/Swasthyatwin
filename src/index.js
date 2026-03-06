import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import syncRoutes from "./routes/syncRoutes.js";
import shareRoutes from "./routes/shareRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import abhaRoutes from "./routes/abhaRoutes.js";

dotenv.config();

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());

connectDB();

app.use("/health", (req, res) => res.send("Healthy!"));

app.use("/api/auth", authRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/share", shareRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/abha", abhaRoutes);

app.listen(5000, () => console.log("Server running on port 5000"));
