import { sheets } from "../configs/googleapis";
import { schoolYear, users } from "../libs";
import { User } from "../types/user";

// 從試算表根據 uuid 取得相關資料
export const getUserData = async (uuid: string): Promise<void> => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID_MENBER,
    range: `${schoolYear}社員清單!A:I`,
  });
  const row = response?.data?.values?.find((row) => row[0] === uuid);
  if (!row) {
    return;
  }
  const user: User = {
    data: {
      uuid: row[0], // UUID
      name: row[1], // 姓名
      nickname: row[2], // 暱稱
      studentID: row[3], // 學號
      department: row[4], // 科系
      grade: row[5], // 年級
      phonenumber: row[6], // 電話
      permission: row[8], // 權限
    },
    status: users[uuid]?.status ?? "normal",
    Variables: users[uuid]?.Variables ?? {
      searchParams: null,
      game: null,
      page: 0,
      userData: {},
    },
  };
  users[uuid] = user;
};

export const initUser = (uuid: string): void => {
  users[uuid] = {
    data: {
      uuid: uuid,
      name: null,
      nickname: null,
      studentID: null,
      department: null,
      grade: null,
      phonenumber: null,
      permission: null,
    },
    status: "normal",
    Variables: {
      searchParams: null,
      game: null,
      page: 0,
      userData: {},
    },
  };
};
