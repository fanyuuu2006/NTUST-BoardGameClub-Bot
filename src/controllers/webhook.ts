import { Response } from "express";
import { LineRequest, MessageEvent } from "../types/line";
import line, { lineClient } from "../configs/line";
import { getUserData } from "../utils/user";
import { messageHandler } from "../utils/index";

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

  const messages = await messageHandler(messageText, uuid);

  return await lineClient.replyMessage(event.replyToken, messages);
};