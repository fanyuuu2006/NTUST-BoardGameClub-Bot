type UserData = {
  uuid: string; // UUID
  name: string; // 姓名
  nickname: string; // 暱稱
  studentID: string; // 學號
  department: string; // 科系
  grade: string; // 年級
  phonenumber: string; // 電話
  permission: string; // 權限
};

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

export type User = {
  data: UserData;
  status: Status;
  // 佔存的資料變數
  Variables: {
    searchParams: { field: string | null; value: string | null };
    page: number;
    game: string[] | null;
    userData: Partial<Record<keyof UserData | "registerkey", string>>;
  };
};

export const users: Record<string, User> = {};
