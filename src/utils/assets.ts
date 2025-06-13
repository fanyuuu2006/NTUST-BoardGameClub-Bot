import { isEqual } from "./index";
import { assetsFields, assetsPositions } from "../libs/sheets";
import {
  AssetsField,
  AssetsSheetRow,
  BoardGame,
  Position,
} from "../types/assets";
import { getAssetsRows, updateAssetsRow } from "./sheets";

export const isPosition = (value: string): value is Position => {
  return assetsPositions.includes(value as Position);
};
export const isAssetsField = (value: string): value is AssetsField => {
  return assetsFields.includes(value as AssetsField);
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

export const findBoardGame = async <T extends keyof BoardGame>(
  field: T,
  value: BoardGame[T]
): Promise<{
  boardGame?: BoardGame;
  sheetsIndex?: number;
}> => {
  const rows = await getAssetsRows();
  const boardgames = getBoardGames(rows);

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

export const updateBoardGame = async (
  id: BoardGame["id"],
  updater: (prev: BoardGame) => BoardGame
): Promise<{
  ok: boolean;
  boardGame?: BoardGame;
}> => {
  const { boardGame, sheetsIndex } = await findBoardGame("id", id);

  if (!boardGame || !sheetsIndex) return { ok: false };

  const updatedGame = updater(boardGame);

  // 將 updatedGame 轉回 AssetsSheetRow 格式
  const updatedRow: AssetsSheetRow = [
    String(updatedGame.id),
    updatedGame.name.english,
    updatedGame.name.chinese,
    updatedGame.type,
    updatedGame.borrowed ? "V" : "",
    updatedGame.borrower || "",
    updatedGame.position || "",
    updatedGame.inventory ? "V" : "",
    updatedGame.status.shrinkWrap,
    updatedGame.status.appearance,
    updatedGame.status.missingParts,
    updatedGame.status.sleeves,
    updatedGame.note || "",
  ];

  const { err } = await updateAssetsRow(updatedRow, sheetsIndex);

  if (err) return { ok: false };

  return {
    ok: true,
    boardGame: updatedGame,
  };
};
