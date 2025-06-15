import { Position } from "./sheets";

export type BoardGame = {
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
  borrowed: boolean;
  borrower?: string;
};
