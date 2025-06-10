import { User } from "../types/user";

let _allow: boolean = false; // 幹部的許可
export const getAllow = () => _allow;
export const setAllow = (allow: boolean) => {
  _allow = allow;
};

export const users: Record<User["data"]["uuid"], User> = {};

export const schoolYear: number = 113;

export const departments = [
  "資訊工程系",
  "電機工程系",
  "資訊管理系",
  "機械工程系",
  "材料科學與工程系",
  "化學工程系",
  "工程學士班",
  "電子工程系",
  "工業管理系",
  "企業管理系",
  "管理學士班",
  "設計系",
  "應用外語系",
  "不分系學士班",
  "其他",
] as const;
