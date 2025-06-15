import { Request } from "express";
import line from "../configs/line";
import { User } from "./user";


export type EventType = "message";
export type MessageType = "text";
export type SourceType = "user";
export type EventMode = "active";

export type MessageEvent = {
  type: EventType;
  message: {
    type: MessageType;
    id: string;
    quoteToken: string;
    text: string;
  };
  webhookEventId: string;
  deliveryContext: { isRedelivery: boolean };
  timestamp: number;
  source: {
    type: SourceType;
    userId: string;
  };
  replyToken: string; // replyToken 是由 LINE 訊息平台生成並包含在 event 物件中的一個唯一標識符 用於識別當前的訊息事件 只能使用一次。
  mode: EventMode;
};

export interface LineRequest extends Request {
  body: {
    destination: string;
    events: MessageEvent[];
  };
}

export type MessageHandler = (
  messageText: string,
  uuid: User["uuid"]
) => line.Message[] | Promise<line.Message[]>;
