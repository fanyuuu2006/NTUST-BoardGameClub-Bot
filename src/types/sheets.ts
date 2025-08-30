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
/**
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
*/

export class BoardGame {
  #id: number;
  #name: {
    english: string;
    chinese: string;
  };
  #type: string;
  position?: Position;
  #inventory: boolean;
  #status: {
    shrinkWrap: string;
    appearance: string;
    missingParts: string;
    sleeves: string;
  };
  #note?: string;
  borrowed: boolean;
  borrower?: string;
  #recommendedCounts: number;

  constructor(
    id: number,
    name: { english: string; chinese: string },
    type: string,
    position: Position | undefined,
    inventory: boolean,
    status: {
      shrinkWrap: string;
      appearance: string;
      missingParts: string;
      sleeves: string;
    },
    note: string | undefined,
    borrowed: boolean,
    borrower: string | undefined,
    recommendedCounts: number
  ) {
    this.#id = id;
    this.#name = name;
    this.#type = type;
    this.position = position;
    this.#inventory = inventory;
    this.#status = status;
    this.#note = note;
    this.borrowed = borrowed;
    this.borrower = borrower;
    this.#recommendedCounts = recommendedCounts;
  }

  get id() {
    return this.#id;
  }

  get name() {
    return this.#name;
  }

  get type() {
    return this.#type;
  }
  get inventory() {
    return this.#inventory;
  }

  get status() {
    return this.#status;
  }

  get note() {
    return this.#note;
  }

  get recommendedCounts() {
    return this.#recommendedCounts;
  }

  recommendedCountsIncrement() {
    this.#recommendedCounts++;
  }
}

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
