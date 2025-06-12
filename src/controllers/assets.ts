import { Request, Response } from "express";
import { getAssetsRows } from "../utils/sheets";
import { parseBoardGame } from "../utils/assets";

export const getBoardGames = async (_: Request, res: Response) => {
  const rows = await getAssetsRows();
  const boardgames = rows.map((row) => parseBoardGame(row));
  res.status(200).json(boardgames);
};
