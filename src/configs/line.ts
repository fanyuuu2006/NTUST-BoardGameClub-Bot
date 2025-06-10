import * as line from "@line/bot-sdk";

// Line Bot 客戶端配置
export const lineConfig: line.ClientConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
export const lineClient: line.Client = new line.Client(lineConfig);

export default line ;
