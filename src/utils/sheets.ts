import { sheets } from "../configs/googleapis";
import { schoolYear, users } from "../libs/index";
import { assetsFields } from "../libs/sheets";
import { AssetsField, AssetsSheetRow } from "../types/assets";

export const getAssetsRows = async (): Promise<AssetsSheetRow[]> => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${schoolYear}社產清單!A:M`,
  });
  const rows = response.data.values as AssetsSheetRow[];
  return rows.slice(1); // skip header row
};

export const updateAssetsRow = async (
  row: AssetsSheetRow,
  sheetsIndex: number
): Promise<{
  err?: unknown;
}> => {
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
      throw new Error(`更新社產清單失敗，狀態碼: ${response.status}`);
    }

    return {};
  } catch (err) {
    console.error(err);
    return {
      err,
    };
  }
};

// 自訂搜尋函數 可指定試算表中欄位搜尋特定資料
export const searchFieldInSheet = async (
  conditions: {
    field: AssetsField;
    value: string;
  }[],
  uuid: string
): Promise<string[]> => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${schoolYear}社產清單!A:M`,
  });
  const rows = response.data.values as string[][];
  if (!rows || rows.length === 0) return [];

  const matchRows = rows.filter((row) =>
    conditions.every(({ field, value }) => {
      const index = assetsFields.indexOf(field);
      return row[index] && row[index].includes(value);
    })
  );

  const isManager = users[uuid].data.permission === "幹部";

  return matchRows.map((row: string[]) =>
    [
      `編號: ${row[0]}`,
      `英文名稱: ${row[1]}`,
      `中文名稱: ${row[2]}`,
      `種類: ${row[3]}`,
      `借用: ${row[4] === "V" ? "已借出" : "未借出"}`,
      isManager ? `借用人: ${row[5]}` : null,
      `位置: ${row[6]}`,
      `狀態(外膜): ${row[8]}`,
      `狀態(外觀): ${row[9]}`,
      `狀態(缺件): ${row[10]}`,
      `狀態(牌套): ${row[11]}`,
      `備註: ${row[12] || "無"}`,
    ]
      .filter(Boolean) // 過濾掉 null 值（非幹部借用人）
      .join("\n")
  );
};
