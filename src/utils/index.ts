import { users } from "../libs/index";
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

  return statusFeatures[users[uuid].status](messageText, uuid);
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

export const isObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null;

export const isEqual = <T>(value1: T, value2: T): boolean => {
  if (typeof value1 !== typeof value2) return false;

  if (Array.isArray(value1) && Array.isArray(value2)) {
    if (value1.length !== value2.length) return false;
    return value1.every((v, i) => isEqual(v, value2[i]));
  }

  if (isObject(value1) && isObject(value2)) {
    const keys1 = Object.keys(value1);
    const keys2 = Object.keys(value2);
    if (keys1.length !== keys2.length) return false;
    return keys1.every((key) => isEqual((value1 as Record<string, unknown>)[key], (value2 as Record<string, unknown>)[key]));
  }

  return value1 === value2;
};
