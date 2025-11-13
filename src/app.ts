// vercel 啟動時 只執行一次頂部的全局代碼
import express from "express";
import { router as webhookRouter } from "./routers/webhook";
import { router as assetsRouter } from "./routers/assets";
import path from "path";

const app = express();
app.use("/webhook", webhookRouter);
app.use("/assets", assetsRouter);

app.use(express.static(path.join(__dirname, "../public")));
app.use("/", (_, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});

export default app;
