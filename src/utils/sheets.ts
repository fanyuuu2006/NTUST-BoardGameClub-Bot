import { isEqual } from "./custom";
import { sheets } from "../configs/googleapis";
import { schoolYear, users } from "../libs/index";
import {
  assetsPositions,
  assetsSheetFields,
  departments,
  grades,
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
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${schoolYear}社產清單!A:N`,
  });
  const rows = response.data.values as AssetsSheetRow[];
  if (!rows) return [];
  return rows.slice(1); // skip header row
};

export const getMemberSheetRows = async (): Promise<MemberSheetRow[]> => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID_MENBER,
    range: `${schoolYear}社員清單!A:K`,
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
  if (users[uuid]) {
    user.status = users[uuid].status;
    user.variables = users[uuid].variables;
  }

  users[uuid] = user;
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
  const recommendedCounts = parseInt(row[13]);
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

export const updateAssetsSheetRow = async (
  id: BoardGame["id"]
): Promise<{
  err?: unknown;
}> => {
  const { boardGame, sheetsIndex } = await findBoardGame("id", id);
  if (!boardGame || !sheetsIndex) return { err: `找不到對應的社產: ${id}` };

  const row: AssetsSheetRow = [
    boardGame.id.toString(),
    boardGame.name.english,
    boardGame.name.chinese,
    boardGame.type,
    boardGame.borrowed ? "V" : "",
    boardGame.borrower || "",
    boardGame.position || "",
    boardGame.inventory ? "V" : "",
    boardGame.status.shrinkWrap,
    boardGame.status.appearance,
    boardGame.status.missingParts,
    boardGame.status.sleeves,
    boardGame.note || "",
    boardGame.recommendedCounts.toString(),
  ];

  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: process?.env?.GOOGLE_SHEET_ID,
      range: `${schoolYear}社產清單!A${sheetsIndex}:M${sheetsIndex}`,
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

export const updateMemberSheetRow = async (
  uuid: User["uuid"]
): Promise<{
  err?: unknown;
}> => {
  const { user, sheetsIndex } = await findMember("uuid", uuid);
  if (!user || !sheetsIndex) return { err: `找不到對應的社員: ${uuid}` };

  const row: MemberSheetRow = [
    user.uuid,
    user.name,
    user.nickname,
    user.studentID,
    user.department || "無",
    user.grade || "無",
    user.phonenumber,
    user.registerkey,
    user.permission,
    `${user.signInCount}`,
    (() => {
      if (!user.lastSignInTime) return "";
      const date = user.lastSignInTime;
      return (
        date.getFullYear().toString() +
        String(date.getMonth() + 1).padStart(2, "0") +
        String(date.getDate()).padStart(2, "0")
      );
    })(),
  ];

  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: process?.env?.GOOGLE_SHEET_ID_MENBER,
      range: `${schoolYear}社員清單!A${sheetsIndex}:K${sheetsIndex}`,
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
    users[uuid].isManager() ? `借用人: ${boardgame.borrower}` : null,
    `位置: ${boardgame.position || "無紀錄"}`,
    `狀態(外膜): ${boardgame.status.shrinkWrap || "無紀錄"}`,
    `狀態(外觀): ${boardgame.status.appearance || "無紀錄"}`,
    `狀態(缺件): ${boardgame.status.missingParts || "無紀錄"}`,
    `狀態(牌套): ${boardgame.status.sleeves || "無紀錄"}`,
    `備註: ${boardgame.note || "無"}`,
  ]
    .filter(Boolean) // 過濾掉 null 值（非幹部借用人）
    .join("\n");
};

// // 自訂搜尋函數 可指定試算表中欄位搜尋特定資料
// export const searchFieldInSheet = async (
//   conditions: {
//     field: AssetsSheetField;
//     value: string;
//   }[],
//   uuid: string
// ): Promise<string[]> => {
//   const response = await sheets.spreadsheets.values.get({
//     spreadsheetId: process.env.GOOGLE_SHEET_ID,
//     range: `${schoolYear}社產清單!A:M`,
//   });
//   const rows = response.data.values as string[][];
//   if (!rows || rows.length === 0) return [];

//   const matchRows = rows.filter((row) =>
//     conditions.every(({ field, value }) => {
//       const index = assetsFields.indexOf(field);
//       return row[index] && row[index].includes(value);
//     })
//   );

//   const isManager = users[uuid].data.permission === "幹部";

//   return matchRows.map((row: string[]) =>
//     [
//       `編號: ${row[0]}`,
//       `英文名稱: ${row[1]}`,
//       `中文名稱: ${row[2]}`,
//       `種類: ${row[3]}`,
//       `借用: ${row[4] === "V" ? "已借出" : "未借出"}`,
//       isManager ? `借用人: ${row[5]}` : null,
//       `位置: ${row[6]}`,
//       `狀態(外膜): ${row[8]}`,
//       `狀態(外觀): ${row[9]}`,
//       `狀態(缺件): ${row[10]}`,
//       `狀態(牌套): ${row[11]}`,
//       `備註: ${row[12] || "無"}`,
//     ]
//       .filter(Boolean) // 過濾掉 null 值（非幹部借用人）
//       .Koin("\n")
//   );
// };
