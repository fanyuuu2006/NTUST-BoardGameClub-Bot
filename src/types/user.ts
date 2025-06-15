import { isDepartment, isGrade } from "../utils/sheets";
import {
  AssetsSheetField,
  BoardGame,
  Department,
  Grade,
  MemberSheetRow,
  Permission,
} from "./sheets";

// 狀態
type Status =
  | "normal" // 一般
  | "hold" // 鎖定狀態 避免重複操作
  | "awaiting_search" // 等待搜尋類別或關鍵字
  | "awaiting_borrowid" // 等待輸入借用桌遊編號
  | "awaiting_returnid" // 等待輸入歸還桌遊編號
  | "awaiting_position" // 等待輸入歸還桌遊位置
  | "awaiting_suggest" // 等待輸入建議社團購買的桌遊
  | "awaiting_recommendID" // 等待輸入推薦桌遊 ID

  // vvv以下為註冊流程中依序等待各項資料輸入的狀態vvv
  | "awaiting_registerkey"
  | "awaiting_name" // 等待輸入姓名
  | "awaiting_nickname" // 等待輸入暱稱
  | "awaiting_student_id" // 等待輸入學號
  | "awaiting_department" // 等待輸入科系
  | "awaiting_grade" // 等待輸入年級
  | "awaiting_phonenumber"; // 等待輸入電話

export class User {
  #uuid: string; // UUID
  name: string; // 姓名
  nickname: string; // 暱稱
  studentID: string; // 學號
  department?: Department; // 科系
  grade?: Grade; // 年級
  phonenumber: string; // 電話
  registerkey: string; // 註冊序號
  #signInCount: number = 0; // 簽到次數
  // 最近簽到時間
  #lastSignInTime?: Date;
  permission: Permission = "社員"; // 權限(角色)
  status: Status = "normal";

  variables: {
    searchParams?: {
      field?: AssetsSheetField;
      value?: string;
    };
    game?: BoardGame;
    page: number;
  } = {
    page: 0,
  };

  constructor(row: MemberSheetRow) {
    this.#uuid = row[0];
    this.name = row[1];
    this.nickname = row[2];
    this.studentID = row[3];
    this.department = isDepartment(row[4]) ? row[4] : undefined;
    this.grade = isGrade(row[5]) ? row[5] : undefined;
    this.phonenumber = row[6];
    this.registerkey = row[7];
    this.permission = row[8];
    this.#signInCount = parseInt(row[9]);
    this.#lastSignInTime = row[10] ? new Date(row[10]) : undefined;
  }

  get uuid() {
    return this.#uuid;
  }

  signIn(): void {
    this.#signInCount += 1;
    this.#lastSignInTime = new Date();
  }

  get lastSignInTime(): Date | undefined {
    return this.#lastSignInTime;
  }

  get signInCount(): number {
    return this.#signInCount;
  }

  isManager(): boolean {
    return this.permission === "幹部" || this.permission === "先人";
  }
}
