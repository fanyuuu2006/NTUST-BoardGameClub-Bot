export const sheetsColumnRanges = {
  "assets":{
    start: "A",
    end: "N",
  },
  "member":{
    start: "A",
    end: "K",
  }
} as const;

export const assetsPositions = ["A", "B", "C", "D"] as const;

export const permissions = ["先人", "幹部", "社員"] as const;

export const assetsSheetFields = [
  "編號", // A
  "英文名稱", // B
  "中文名稱", // C
  "種類", // D
  "借用", // E
  "借用人", // F
  "位置", // G
  "清點", // H
  "狀態(外膜)", // I
  "狀態(外觀)", // J
  "狀態(缺件)", // K
  "狀態(牌套)", // L
  "清點備註", // M
  "被推薦次數", // N
] as const;

export const departments = [
  "資訊工程系",
  "電機工程系",
  "資訊管理系",
  "機械工程系",
  "材料科學與工程系",
  "化學工程系",
  "工程學士班",
  "電子工程系",
  "工業管理系",
  "企業管理系",
  "管理學士班",
  "設計系",
  "應用外語系",
  "不分系學士班",
  "電資學士班",
  
  "其他",
] as const;

export const grades = ["一", "二", "三", "四", "碩一", "碩二"] as const;

export const memberSheetFields = [
  "UUID", // A
  "姓名", // B
  "暱稱", // C
  "學號", // D
  "科系", // E
  "年級", // F
  "電話", // G
  "序號", // H
  "權限", // I
  "簽到次數", // J
  "最近簽到時間", // K
] as const;
