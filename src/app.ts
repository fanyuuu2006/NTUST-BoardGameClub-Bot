// vercel 啟動時 只執行一次頂部的全局代碼
import express from "express";
import { router as webhookRouter } from "./routers/webhook";

const app = express();
app.use("/webhook", webhookRouter);
app.use("/", (_, res) => {
  res.send(`Server is running`);
});


export default app;