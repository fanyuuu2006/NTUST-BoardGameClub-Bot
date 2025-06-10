import { google } from "googleapis";

// Google Sheets API 認證
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"), // 使用 .replace(/\\n/g, "\n") 替換 \n 這是因為環境變數通常會將換行符 (\n) 轉成 \\n 必須轉回來以確保私鑰格式正確
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"], // 指定允許存取 Google 試算表（Google Sheets）。
});

export const sheets = google.sheets({ version: "v4", auth });
