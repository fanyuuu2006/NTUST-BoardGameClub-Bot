import { assetsFields } from "../libs/sheets";

export type AssetsSheetRow = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

export type AssetsField = (typeof assetsFields)[number];

export type Position = "A" | "B" | "C" | "D";

type _BaseBoardGame = {
  id: number;
  name: {
    english: string;
    chinese: string;
  };
  type: string;
  position?: Position;
  inventory: boolean;
  status: {
    shrinkWrap: string;
    appearance: string;
    missingParts: string;
    sleeves: string;
  };
  note?: string;
};

type BorrowedGame = _BaseBoardGame & {
  borrowed: true;
  borrower: string;
};

type AvailableGame = _BaseBoardGame & {
  borrowed: false;
  borrower?: never;
};

export type BoardGame = BorrowedGame | AvailableGame;
