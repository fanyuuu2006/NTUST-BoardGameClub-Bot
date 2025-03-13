// vercel 啟動時 只執行一次頂部的全局代碼
import * as line from "@line/bot-sdk";
import express from "express";
import { getUserData } from "./judgeText";
import { judgeText } from "./judgeText";

// Line Bot 客戶端配置
const config: line.ClientConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client: line.Client = new line.Client(config);

const app = express();

// 處理 Line Bot 的訊息事件路徑
// 每次請求時（每個 HTTP 請求都會執行）
app.post(
  "/webhook",
  line.middleware(config as line.MiddlewareConfig),
  async (req, res) => {
    // req.body 包含從 LINE 發來的事件數據 而 events 是一個事件陣列 這些事件通常會包含使用者發送的訊息
    await Promise.all(req.body.events.map(handleEvent)) // 迭代每一個事件 並傳遞給 handleEvent 函數處理
      .then((result) => res.json(result)) // 當所有事件都處理完成後 使用 res.json(result) 回應 LINE 平台
      .catch((err) => {
        console.error(err);
        res.status(500).end(); // .end() 結束 HTTP 請求的處理
      });
  }
);

// 測試用路徑
app.get("/test", (_, res) => {
  res.send("The server is up and running!");
});

// 處理事件函式
const handleEvent = async (event: {
  type: string;
  message: { type: string; text: any };
  source: {
    userId: any;
  };
  replyToken: string; // replyToken 是由 LINE 訊息平台生成並包含在 event 物件中的一個唯一標識符 用於識別當前的訊息事件 只能使用一次。
}): Promise<line.MessageAPIResponseBase | null | undefined> => {
  // 只能使用傳訊息的方式
  if (
    event.type !== "message" ||
    event.message.type !== "text" ||
    !event.message.text
  ) {
    return Promise.resolve(null);
  }

  const messageText: string = event.message.text; // 訊息文字
  const uuid: string = event.source.userId; // 用戶 ID
  await getUserData(uuid); // 取得用戶資料

  await client.replyMessage(
    event.replyToken,
    await judgeText(messageText, uuid)
  );
};

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
