import { assetsFields, assetsPositions } from "../libs/sheets";

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
  string
];

export type AssetsField = (typeof assetsFields)[number];

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
};

// export class _BoardGame {
//   id: number = 0;
//   name: {
//     english: string;
//     chinese: string;
//   } = {
//     chinese: "",
//     english: "",
//   };
//   type: string = "";
//   position?: Position;
//   inventory: boolean = false;
//   status?: {
//     shrinkWrap?: string;
//     appearance?: string;
//     missingParts?: string;
//     sleeves?: string;
//   };
//   note?: string;
//   borrowed: boolean = false;
//   borrower?: string;

//   constructor(row: AssetsSheetRow) {
//     this.id = parseInt(row[0]);
//     this.name = {
//       english: row[1],
//       chinese: row[2],
//     };
//     this.type = row[3];
//     this.borrowed = row[4] === "V";
//     this.position = isPosition(row[6]) ? row[6] : undefined;
//     this.inventory = row[7] === "V";
//     this.status = {
//       shrinkWrap: row[8],
//       appearance: row[9],
//       missingParts: row[10],
//       sleeves: row[11],
//     };
//     this.note = row[12];
//   }
// }
