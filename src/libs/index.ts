import { User } from "../types/user";

let _allow: boolean = false; // 幹部的許可
export const getAllow = () => _allow;
export const setAllow = (allow: boolean) => {
  _allow = allow;
};

export const users: Record<User["uuid"], User> = {};

export const schoolYear: number = 114;
