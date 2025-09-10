import { isEqual, normalize } from "./custom";
import { sheets } from "../configs/googleapis";
import { schoolYear, users } from "../libs/index";
import {
  assetsPositions,
  assetsSheetFields,
  departments,
  grades,
  sheetsColumnRanges,
} from "../libs/sheets";
import {
  AssetsSheetField,
  AssetsSheetRow,
  BoardGame,
  Department,
  Grade,
  MemberSheetRow,
  Position,
} from "../types/sheets";
import { User } from "../types/user";

/**
 * 檢查給定的字串是否為有效的 Position 類型
 * @param value - 要檢查的字串值
 * @returns 如果是有效的 Position 則回傳 true，否則回傳 false
 */
export const isPosition = (value: string): value is Position => {
  return assetsPositions.includes(value as Position);
};

/**
 * 檢查給定的字串是否為有效的 Department 類型
 * @param value - 要檢查的字串值
 * @returns 如果是有效的 Department 則回傳 true，否則回傳 false
 */
export const isDepartment = (value: string): value is Department => {
  return departments.includes(value as Department);
};

/**
 * 檢查給定的字串是否為有效的 Grade 類型
 * @param value - 要檢查的字串值
 * @returns 如果是有效的 Grade 則回傳 true，否則回傳 false
 */
export const isGrade = (value: string): value is Grade => {
  return grades.includes(value as Grade);
};

/**
 * 檢查給定的字串是否為有效的 AssetsSheetField 類型
 * @param value - 要檢查的字串值
 * @returns 如果是有效的 AssetsSheetField 則回傳 true，否則回傳 false
 */
export const isAssetsSheetField = (
  value: string
): value is AssetsSheetField => {
  return assetsSheetFields.includes(value as AssetsSheetField);
};

/**
 * 從 Google Sheets 取得社產清單的所有資料列
 * @returns Promise<AssetsSheetRow[]> - 包含社產清單所有資料的陣列（不含標題列）
 */
export const getAssetsSheetRows = async (): Promise<AssetsSheetRow[]> => {
  const { start, end } = sheetsColumnRanges.assets;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${schoolYear}社產清單!${start}:${end}`,
  });
  const rows = response.data.values as AssetsSheetRow[];
  if (!rows) return [];
  return rows.slice(1); // skip header row
};

/**
 * 從 Google Sheets 取得社員清單的所有資料列
 * @returns Promise<MemberSheetRow[]> - 包含社員清單所有資料的陣列（不含標題列）
 */
export const getMemberSheetRows = async (): Promise<MemberSheetRow[]> => {
  const { start, end } = sheetsColumnRanges.member;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID_MENBER,
    range: `${schoolYear}社員清單!${start}:${end}`,
  });
  const rows = response.data.values as MemberSheetRow[];
  if (!rows) return [];
  return rows.slice(1); // skip header row
};

/**
 * 根據 UUID 從社員清單中取得使用者資料，並將其存入 users 物件中
 * @param uuid - 使用者的 UUID
 */
export const getUserData = async (uuid: string) => {
  const rows = await getMemberSheetRows();
  const row = rows.find((row) => row[0] === uuid);
  const user: User = new User(
    row ?? [uuid, "", "", "", "無", "無", "", "", "社員", "0", ""]
  );

  users[uuid] = users[uuid] ?? user;
};

/**
 * 將 AssetsSheetRow 資料解析成 BoardGame 物件
 * @param row - 社產清單的資料列
 * @returns BoardGame - 解析後的桌遊物件
 */
export const parseBoardGame = (row: AssetsSheetRow): BoardGame => {
  const id = parseInt(row[0]);
  const name = {
    english: row[1],
    chinese: row[2],
  };
  const type = row[3];
  const borrowed = row[4] === "V";
  const position = isPosition(row[6]) ? row[6] : undefined;
  const inventory = row[7] === "V";
  const status: BoardGame["status"] = {
    shrinkWrap: row[8],
    appearance: row[9],
    missingParts: row[10],
    sleeves: row[11],
  };
  const note = row[12];
  const recommendedCounts = parseInt(row[13]) || 0;

  return new BoardGame(
    id,
    name,
    type,
    position,
    inventory,
    status,
    note,
    borrowed,
    row[5] || undefined,
    recommendedCounts
  );
};

/**
 * 根據指定的條件從社產清單中搜尋桌遊
 * @param field - 要搜尋的欄位名稱
 * @param value - 要搜尋的值
 * @param strict - 是否使用嚴格模式搜尋（預設為 false，使用包含模式）
 * @returns Promise<BoardGame[]> - 符合條件的桌遊陣列，依 ID 排序
 */
export const getBoardGamesByCondition = async ({
  field,
  value,
  strict = false,
}: {
  field: AssetsSheetField;
  value: string;
  strict?: boolean;
}): Promise<BoardGame[]> => {
  const rows = await getAssetsSheetRows();
  const index = assetsSheetFields.indexOf(field.trim() as AssetsSheetField);
  if (index === -1) return []; // 避免 field 不存在

  const normalizedValue = normalize(value);

  const matchRows = rows.filter((row) => {
    const cellValue = row[index];
    return (
      cellValue &&
      (strict
        ? cellValue === normalizedValue
        : cellValue.includes(normalizedValue))
    );
  });
  return matchRows.map(parseBoardGame).sort((a, b) => a.id - b.id);
};

/**
 * 根據指定的欄位和值在社產清單中尋找桌遊
 * @param field - 要搜尋的桌遊物件欄位
 * @param value - 要搜尋的值
 * @returns Promise 包含找到的桌遊物件和其在試算表中的索引
 */
export const findBoardGame = async <T extends keyof BoardGame>(
  field: T,
  value: BoardGame[T]
): Promise<{
  boardGame?: BoardGame;
  sheetsIndex?: number;
}> => {
  const rows = await getAssetsSheetRows();
  const boardgames = rows.map(parseBoardGame);

  const index = boardgames.findIndex((game) => {
    const targetValue = game[field];
    return isEqual(targetValue, value);
  });

  if (index === -1) return {};
  return {
    boardGame: boardgames[index],
    sheetsIndex: index + 2,
  };
};

/**
 * 根據指定的欄位和值在社員清單中尋找使用者
 * @param field - 要搜尋的使用者物件欄位
 * @param value - 要搜尋的值
 * @returns Promise 包含找到的使用者物件和其在試算表中的索引
 */
export const findMember = async <T extends keyof User>(
  field: T,
  value: User[T]
): Promise<{
  user?: User;
  sheetsIndex?: number;
}> => {
  const rows = await getMemberSheetRows();
  const userArray = rows.map((row) => new User(row));

  const index = userArray.findIndex((game) => {
    const targetValue = game[field];
    return isEqual(targetValue, value);
  });

  if (index === -1) return {};
  return {
    user: userArray[index],
    sheetsIndex: index + 2,
  };
};

/**
 * 更新社產清單中指定桌遊的資料
 * @param findOption - 包含搜尋欄位和值的物件
 * @param boardgame - 要更新的桌遊物件
 * @returns Promise 包含錯誤資訊（如果有的話）
 */
export const updateAssetsSheetRow = async <T extends keyof BoardGame>(
  findOption: {
    field: T;
    value: BoardGame[T];
  },
  boardgame: BoardGame
): Promise<{
  err?: unknown;
}> => {
  const { field, value } = findOption;
  const { sheetsIndex } = await findBoardGame(field, value);
  if (!sheetsIndex) return { err: `找不到對應的社產 ${field}: ${value}` };

  const row: AssetsSheetRow = [
    boardgame.id.toString(),
    boardgame.name.english,
    boardgame.name.chinese,
    boardgame.type,
    boardgame.borrowed ? "V" : "",
    boardgame.borrower || "",
    boardgame.position || "",
    boardgame.inventory ? "V" : "",
    boardgame.status.shrinkWrap,
    boardgame.status.appearance,
    boardgame.status.missingParts,
    boardgame.status.sleeves,
    boardgame.note || "",
    boardgame.recommendedCounts.toString(),
  ];

  const { start, end } = sheetsColumnRanges.assets;
  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: process?.env?.GOOGLE_SHEET_ID,
      range: `${schoolYear}社產清單!${start}${sheetsIndex}:${end}${sheetsIndex}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [row],
      },
    });

    if (response.status !== 200) {
      throw new Error(
        `更新${schoolYear}社產清單失敗，狀態碼: ${response.status}`
      );
    }

    return {};
  } catch (err) {
    console.error(err);
    return {
      err,
    };
  }
};

/**
 * 更新社員清單中指定使用者的資料
 * @param findOption - 包含搜尋欄位和值的物件
 * @param uuid - 要更新的使用者 UUID
 * @returns Promise 包含錯誤資訊（如果有的話）
 */
export const updateMemberSheetRow = async <T extends keyof User>(
  findOption: {
    field: T;
    value: User[T];
  },
  uuid: string
): Promise<{
  err?: unknown;
}> => {
  const { field, value } = findOption;
  const { sheetsIndex } = await findMember(field, value);
  if (!sheetsIndex) return { err: `找不到對應的社員 ${field}: ${value}` };

  const row: MemberSheetRow = [
    users[uuid].uuid,
    users[uuid].name,
    users[uuid].nickname,
    users[uuid].studentID,
    users[uuid].department || "無",
    users[uuid].grade || "無",
    users[uuid].phonenumber,
    users[uuid].registerkey,
    users[uuid].permission,
    `${users[uuid].signInCount}`,
    (() => {
      if (!users[uuid].lastSignInTime) return "";
      const date = users[uuid].lastSignInTime;
      return (
        date.getFullYear().toString() +
        String(date.getMonth() + 1).padStart(2, "0") +
        String(date.getDate()).padStart(2, "0")
      );
    })(),
  ];

  try {
    const { start, end } = sheetsColumnRanges.member;
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: process?.env?.GOOGLE_SHEET_ID_MENBER,
      range: `${schoolYear}社員清單!${start}${sheetsIndex}:${end}${sheetsIndex}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [row],
      },
    });

    if (response.status !== 200) {
      throw new Error(
        `更新${schoolYear}社員清單失敗，狀態碼: ${response.status}`
      );
    }

    return {};
  } catch (err) {
    console.error(err);
    return {
      err,
    };
  }
};
