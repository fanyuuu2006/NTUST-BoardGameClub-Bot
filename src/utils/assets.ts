import { assetsFields } from "../libs/sheets";
import {
  AssetsField,
  AssetsSheetRow,
  BoardGame,
  Position,
} from "../types/assets";
import { getAssetsRows } from "./sheets";

export const parseBoardGame = (row: AssetsSheetRow): BoardGame => {
  const id = parseInt(row[0]);
  const name = {
    english: row[1],
    chinese: row[2],
  };
  const type = row[3];
  const borrowed = row[4] === "V";
  const position = row[6] as Position;
  const inventory = row[7] === "V";
  const status: BoardGame["status"] = {
    shrinkWrap: row[8],
    appearance: row[9],
    missingParts: row[10],
    sleeves: row[11],
  };
  const note = row[12];
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
  };
};

export const getBoardGames = (rows: AssetsSheetRow[]): BoardGame[] => {
  return rows.map(parseBoardGame);
};

export const getBoardGamesByCondition = async ({
  field,
  value,
}: {
  field: AssetsField;
  value: string;
}): Promise<BoardGame[]> => {
  const rows = await getAssetsRows();
  const matchRows = rows.filter((row) => {
    const index = assetsFields.indexOf(field);
    return row[index] && row[index].toLowerCase().includes(value.toLowerCase());
  });
  return getBoardGames(matchRows);
};

export const findBoardGameById = async (
  id: BoardGame["id"]
): Promise<{
  boardGame?: BoardGame;
  sheetsIndex?: number;
}> => {
  const rows = await getAssetsRows();
  const boardgames = getBoardGames(rows);
  const index = boardgames.findIndex((game) => game.id === id);
  if (index === -1) return {};

  return {
    boardGame: boardgames[index],
    sheetsIndex: index + 2,
  };
};
