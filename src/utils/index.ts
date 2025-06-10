import {  users } from "../libs/index";
import { statusFeatures } from "../libs/statusFeatures";
import { MessageHandler } from "../types/line";
import https from "https";

export const messageHandler: MessageHandler = async (
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

  return statusFeatures[users[uuid].status](uuid, messageText);
};

export const sendGetRequest = (url: string): void => {
  https
    .get(url, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => {
        responseBody += chunk;
      });
      res.on("end", () => {
        console.log("Response:", responseBody);
      });
    })
    .on("error", (error) => {
      console.error("Error:", error);
    });
};

// 預想調整 vvv
// export const sendGetRequest = (url: string): Promise<string> => {
//   return new Promise((resolve, reject) => {
//     https.get(url, (res) => {
//       let data = "";

//       res.on("data", (chunk) => {
//         data += chunk;
//       });

//       res.on("end", () => {
//         resolve(data);
//       });

//     }).on("error", (err) => {
//       reject(err);
//     });
//   });
// };