import { Request, Response } from "express";
import { getAssetsRows } from "../utils/sheets";
import { getBoardGamesByCondition, parseBoardGame } from "../utils/assets";
import { assetsFields } from "../libs/sheets";
import { AssetsField } from "../types/assets";

export const getAssets = async (_: Request, res: Response) => {
  const rows = await getAssetsRows();
  const boardgames = rows.map((row) => parseBoardGame(row));
  res.status(200).json({ data: boardgames });
};

export const getAssetsSearch = async (req: Request, res: Response) => {
  const { field, value } = req.query;

  if (typeof field !== "string" || typeof value !== "string") {
    res.status(400).json({ error: "無效的查詢參數", data: [] });
    return;
  }

  if (!assetsFields.includes(field as AssetsField)) {
    res.status(400).json({ error: `無效的欄位: ${field}`, data: [] });
    return;
  }

  const matchBoardGames = await getBoardGamesByCondition({
    field: field as AssetsField,
    value,
  });

  res.status(200).json({ data: matchBoardGames });
};
