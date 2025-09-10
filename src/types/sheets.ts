import { users } from "../libs";
import {
  assetsSheetFields,
  assetsPositions,
  permissions,
  departments,
  memberSheetFields,
  grades,
} from "../libs/sheets";

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

  toJSON() {
    return {
      id: this.#id,
      name: this.#name,
      type: this.#type,
      position: this.position,
      inventory: this.#inventory,
      status: this.#status,
      note: this.#note,
      borrowed: this.borrowed,
      borrower: this.borrower,
      recommendedCounts: this.#recommendedCounts,
    };
  }

  toDisplayText(uuid: string): string {
    return [
      `編號: ${this.#id}`,
      `英文名稱: ${this.#name.english}`,
      `中文名稱: ${this.#name.chinese}`,
      `種類: ${this.#type}`,
      `借用: ${this.borrowed ? "已借出" : "未借出"}`,
      users[uuid].isManager() && this.borrowed
        ? `借用人: ${this.borrower}`
        : null,
      `位置: ${this.position || "無紀錄"}`,
      `狀態(外膜): ${this.status.shrinkWrap || "無紀錄"}`,
      `狀態(外觀): ${this.status.appearance || "無紀錄"}`,
      `狀態(缺件): ${this.status.missingParts || "無紀錄"}`,
      `狀態(牌套): ${this.status.sleeves || "無紀錄"}`,
      `備註: ${this.note || "無"}`,
      `被推薦次數: ${this.recommendedCounts}`,
    ]
      .filter(Boolean) // 過濾掉 null 值（非幹部借用人）
      .join("\n");
  }
}

// A ~ J
export type MemberSheetRow = [
  string,
  string,
  string,
  string,
  Department | undefined,
  Grade | undefined,
  string,
  string,
  Permission,
  `${number}`,
  string
];
