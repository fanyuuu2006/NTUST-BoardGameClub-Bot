import { Request, Response } from "express";
import { assetsSheetFields } from "../libs/sheets";
import { parseBoardGame, getBoardGamesByCondition, findBoardGame, getAssetsSheetRows } from "../utils/sheets";
import { AssetsSheetField } from "../types/sheets";

export const getAssets = async (_: Request, res: Response) => {
  const rows = await getAssetsSheetRows();
  const boardgames = rows.map((row) => parseBoardGame(row));
  res.status(200).json({ data: boardgames });
};

export const getAssetsSearch = async (req: Request, res: Response) => {
  const { field, value } = req.query;

  if (typeof field !== "string" || typeof value !== "string") {
    res.status(400).json({ error: "無效的查詢參數", data: [] });
    return;
  }

  if (!assetsSheetFields.includes(field as AssetsSheetField)) {
    res.status(400).json({ error: `無效的欄位: ${field}`, data: [] });
    return;
  }

  const matchBoardGames = await getBoardGamesByCondition({
    field: field as AssetsSheetField,
    value: value,
  });

  if (matchBoardGames.length === 0) {
    res.status(404).json({ error: `找不到符合查詢條件的社產`, data: [] });
  }

  res.status(200).json({ data: matchBoardGames });
};

export const getAssetById = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: `無效的 ID: ${id}`, data: [] });
    return;
  }

  const { boardGame } = await findBoardGame("id", id);

  if (!boardGame) {
    res.status(404).json({ error: "找不到對應的社產", data: [] });
    return;
  }

  res.status(200).json({ data: [boardGame] });
};

//express.json() 會解析 req.body，而這樣會影響 LINE SDK 驗證。

// export const patchAssetById = async (req: Request, res: Response) => {
//   const id = parseInt(req.params.id);
//   const { field, value } = req.body;

//   if (isNaN(id)) {
//     res.status(400).json({ error: `無效的 ID: ${id}`, data: [] });
//     return;
//   }

//   if (!isAssetsField(field)) {
//     res.status(400).json({ error: `無效的欄位: ${field}`, data: [] });
//     return;
//   }

//   const { ok, boardGame } = await updateBoardGame(id, (prev) =>
//     updaters[field](prev, value)
//   );

//   if (!ok) {
//     res.status(400).json({ error: "修改社產失敗", data: [] });
//   }

//   res.status(200).json({ data: [boardGame] });
// };
