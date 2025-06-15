import { isEqual } from "./custom";
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

export const isPosition = (value: string): value is Position => {
  return assetsPositions.includes(value as Position);
};

export const isDepartment = (value: string): value is Department => {
  return departments.includes(value as Department);
};

export const isGrade = (value: string): value is Grade => {
  return grades.includes(value as Grade);
};

export const isAssetsSheetField = (
  value: string
): value is AssetsSheetField => {
  return assetsSheetFields.includes(value as AssetsSheetField);
};

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

export const getUserData = async (uuid: string) => {
  const rows = await getMemberSheetRows();
  const row = rows.find((row) => row[0] === uuid);
  const user: User = new User(
    row ?? [uuid, "", "", "", "無", "無", "", "", "社員", "0", ""]
  );

  users[uuid] = users[uuid] ?? user;
};

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
  return {
    id,
    name,
    type,
    position,
    inventory,
    status,
    note,
    ...(borrowed
      ? {
          borrowed,
          borrower: row[5],
        }
      : {
          borrowed,
        }),
    recommendedCounts,
  };
};

export const getBoardGamesByCondition = async ({
  field,
  value,
}: {
  field: AssetsSheetField;
  value: string;
}): Promise<BoardGame[]> => {
  const rows = await getAssetsSheetRows();
  const matchRows = rows.filter((row) => {
    const index = assetsSheetFields.indexOf(field.trim() as AssetsSheetField);
    return (
      row[index] &&
      row[index].toLowerCase().includes(value.trim().toLowerCase())
    );
  });
  return matchRows.map(parseBoardGame).sort((a, b) => a.id - b.id);
};

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

export const boardgameToString = (
  boardgame: BoardGame,
  uuid: string
): string => {
  return [
    `編號: ${boardgame.id}`,
    `英文名稱: ${boardgame.name.english}`,
    `中文名稱: ${boardgame.name.chinese}`,
    `種類: ${boardgame.type}`,
    `借用: ${boardgame.borrowed ? "已借出" : "未借出"}`,
    users[uuid].isManager() && boardgame.borrowed
      ? `借用人: ${boardgame.borrower}`
      : null,
    `位置: ${boardgame.position || "無紀錄"}`,
    `狀態(外膜): ${boardgame.status.shrinkWrap || "無紀錄"}`,
    `狀態(外觀): ${boardgame.status.appearance || "無紀錄"}`,
    `狀態(缺件): ${boardgame.status.missingParts || "無紀錄"}`,
    `狀態(牌套): ${boardgame.status.sleeves || "無紀錄"}`,
    `備註: ${boardgame.note || "無"}`,
    `被推薦次數: ${boardgame.recommendedCounts}`,
  ]
    .filter(Boolean) // 過濾掉 null 值（非幹部借用人）
    .join("\n");
};
