import { AssetsSheetRow, BoardGame, Position } from "../types/assets";

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
