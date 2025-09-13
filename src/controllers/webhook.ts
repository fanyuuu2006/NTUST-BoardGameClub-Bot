import { Response } from "express";
import { LineRequest, MessageEvent, MessageHandler } from "../types/line";
import line, { lineClient } from "../configs/line";
import { users } from "../libs";
import { statusFeatures } from "../libs/statusFeatures";
import { getUserData } from "../utils/sheets";

export const main = async (req: LineRequest, res: Response) => {
  const events = req.body.events;
  await Promise.all(events.map(_handleEvent)) // 迭代每一個事件 並傳遞給 _handleEvent 函數處理
    .then((result) => res.json(result)) // 當所有事件都處理完成後 使用 res.json(result) 回應 LINE 平台
    .catch((err) => {
      console.error(err);
      res.status(500).end(); // .end() 結束 HTTP 請求的處理
    });
};

// 處理事件函式
const _handleEvent = async (
  event: MessageEvent
): Promise<line.MessageAPIResponseBase | null | undefined> => {
  console.log(JSON.stringify(event, null, 4)); // 輸出事件內容到控制台

  // 只處理訊息事件
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

  const messages = await _messageHandler(messageText, uuid);

  return await lineClient.replyMessage(event.replyToken, messages);
};

export const _messageHandler: MessageHandler = async (
  messageText: string,
  uuid: string
) => {
  if (messageText === "重置") {
    delete users[uuid];
    return [{ type: "text", text: "🔄重置成功" }];
  }

  // Debug 用
  if (messageText === "狀態") {
    return [{ type: "text", text: users[uuid].status }];
  }

  return statusFeatures[users[uuid].status || "normal"](messageText, uuid);
};