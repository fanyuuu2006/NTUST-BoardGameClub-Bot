import { User } from "../types/user";

let _allow: boolean = false; // 幹部的許可
export const getAllow = () => _allow;
export const setAllow = (allow: boolean) => {
  _allow = allow;
};

export const users: Record<User["uuid"], User> = {};

export const schoolYear: number = 114;

// 社群
export const community = [
  { label: "Line", url: "https://line.me/R/ti/g/dmSeyKc3fR" },
  { label: "Discord", url: "https://discord.gg/XQDVMe5HBR" },
];
