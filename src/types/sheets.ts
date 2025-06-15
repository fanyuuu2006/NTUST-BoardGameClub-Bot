import {
  assetsSheetFields,
  assetsPositions,
  permissions,
  departments,
  memberSheetFields,
  grades,
} from "../libs/sheets";
import { Nullable } from "./custom";

export type Permission = (typeof permissions)[number];

export type Department = (typeof departments)[number];
export type Grade = (typeof grades)[number];

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
  string
];

export type AssetsSheetField = (typeof assetsSheetFields)[number];
export type MemberSheetField = (typeof memberSheetFields)[number];

export type Position = (typeof assetsPositions)[number];

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
  recommendedCounts: number;
};

// A ~ J
export type MemberSheetRow = [
  string,
  string,
  string,
  string,
  Department | Nullable,
  Grade | Nullable,
  string,
  string,
  Permission,
  `${number}`,
  string
];
