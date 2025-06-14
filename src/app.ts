// vercel 啟動時 只執行一次頂部的全局代碼
import express from "express";
import { router as webhookRouter } from "./routers/webhook";
import { router as assetsRouter } from "./routers/assets";

const app = express();
app.use(express.json()); 
app.use("/webhook", webhookRouter);
app.use("/assets", assetsRouter);
app.use("/", (_, res) => {
  res.send(`Server is running`);
});

export default app;
