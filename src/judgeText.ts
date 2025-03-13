import * as line from "@line/bot-sdk";
import { google, sheets_v4 } from "googleapis";
import https from "https";
import { User, users } from "./types";

import dialog from "./json/dialog.json";
import keywords from "./json/keywords.json";

const schoolYear = 113; //學年度
const departments: string[] = [
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
  "其他",
];
let ALLOW: boolean = false; // 幹部的許可

// Google Sheets API 認證
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"), // 使用 .replace(/\\n/g, "\n") 替換 \n 這是因為環境變數通常會將換行符 (\n) 轉成 \\n 必須轉回來以確保私鑰格式正確
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"], // 指定允許存取 Google 試算表（Google Sheets）。
});

const sheets = google.sheets({ version: "v4", auth });

// 從試算表根據 uuid 取得相關資料
export const getUserData = async (uuid: string): Promise<void> => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID_MENBER,
    range: `${schoolYear}社員清單!A:I`,
  });
  const row = response?.data?.values?.find((row) => row[0] === uuid);
  if (!row) {
    return;
  }
  const user: User = {
    data: {
      uuid: row[0], // UUID
      name: row[1], // 姓名
      nickname: row[2], // 暱稱
      studentID: row[3], // 學號
      department: row[4], // 科系
      grade: row[5], // 年級
      phonenumber: row[6], // 電話
      permission: row[8], // 權限
    },
    status: users[uuid]?.status ?? "normal",
    Variables: users[uuid]?.Variables ?? {
      searchField: null,
      game: null,
      page: 0,
      userData: {},
    },
  };
  users[uuid] = user;
};

// 自訂搜尋函數 可指定試算表中欄位搜尋特定資料
const customSearchInSheet = async (
  conditions: {
    field: string;
    value: string;
  }[],
  uuid: string
): Promise<string[]> => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${schoolYear}社產清單!A:M`,
  });
  const rows = response.data.values as string[][];

  const columnMap: Record<string, number> = {
    編號: 0,
    英文名稱: 1,
    中文名稱: 2,
    種類: 3,
    借用: 4,
    借用人: 5,
    位置: 6,
    "狀態(外膜)": 8,
    "狀態(外觀)": 9,
    "狀態(缺件)": 10,
    "狀態(牌套)": 11,
    清點備註: 12,
  };

  return rows
    ?.filter((row: string[]) =>
      conditions.every(({ field, value }: { field: string; value: string }) => {
        const idx: number = columnMap[field];
        return row[idx] && row[idx].includes(value); // 先過濾出 每一列 中包含對應值的 欄位
      })
    )
    .map((row: string[]) => {
      return (
        `編號: ${row[0]}\n` +
        `英文名稱: ${row[1]}\n` +
        `中文名稱: ${row[2]}\n` +
        `種類: ${row[3]}\n` +
        `借用: ${row[4] == "V" ? "已借出" : "未借出"}\n` +
        (users[uuid].data.permission === "幹部" // 幹部才看得到借用人
          ? `借用人: ${row[5]}\n`
          : "") +
        `位置: ${row[6]}\n` +
        `狀態(外膜): ${row[8]}\n` +
        `狀態(外觀): ${row[9]}\n` +
        `狀態(缺件): ${row[10]}\n` +
        `狀態(牌套): ${row[11]}\n` +
        `備註: ${row[12] ? row[12] : "無"}`
      );
    });
};

export const sendGetRequest = (url: string): void => {
  https
    .get(url, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => {
        responseBody += chunk;
      });
      res.on("end", () => {
        console.log("Response:", responseBody);
      });
    })
    .on("error", (error) => {
      console.error("Error:", error);
    });
};

// 一般的功能
const normalFeatures: Record<
  string,
  (uuid: string) => line.Message[] | Promise<line.Message[]>
> = {
  // 自動註冊(因為我們窮有時候他會卡卡的，這時候可以繼續照順序輸入資料或使用手動註冊就可以了)
  註冊: (uuid: string) => {
    if (uuid in users) {
      return [
        {
          type: "text",
          text: `${users[uuid].data.nickname}你已經註冊過了，不要再來了喔🤗~`,
        },
        {
          type: "text",
          text: `這是你之前的註冊資料\n姓名：${users[uuid].data.name}\n暱稱：${users[uuid].data.nickname}\n學號：${users[uuid].data.studentID}\n科系：${users[uuid].data.department}\n年級：${users[uuid].data.grade}\n電話📞：${users[uuid].data.phonenumber}`,
        },
        {
          type: "text",
          text: `喔還有如果你還沒加入社群這裡有連結喔😊\nLine：https://line.me/R/ti/g/TfjiECrWwG\nDiscord：https://discord.gg/XQDVMe5HBR`,
        },
      ];
    }

    users[uuid] = {
      data: {
        uuid: uuid,
        name: "",
        nickname: "",
        studentID: "",
        department: "",
        grade: "",
        phonenumber: "",
        permission: "",
      },
      status: "normal",
      Variables: {
        searchField: null,
        game: null,
        page: 0,
        userData: {},
      },
    };
    users[uuid].status = "awaiting_registerkey"; // 設定狀態為等待輸入序號
    return [
      {
        type: "text",
        text: `作者：如果小傲驕它傲驕不理你，請使用以下方法註冊🔽`,
      },
      { type: "text", text: `這是你的UUID：` },
      { type: "text", text: `${uuid}` },
      {
        type: "text",
        text: `至以下表單進行手動註冊，填完後至信箱查看註冊結果\nhttps://docs.google.com/forms/d/e/1FAIpQLScHRQ2RzRO9iVFshhSbCi9LIupTw3bJbPfDgkWGi1SJrcLp3w/viewform?usp=sf_link`,
      },
      { type: "text", text: "請輸入序號進行註冊：" },
    ];
  },

  手動註冊: (uuid: string) => [
    { type: "text", text: `這是你的UUID：` },
    { type: "text", text: `${uuid}` },
    {
      type: "text",
      text: `至以下表單進行手動註冊，填完後至信箱查看註冊結果\nhttps://docs.google.com/forms/d/e/1FAIpQLScHRQ2RzRO9iVFshhSbCi9LIupTw3bJbPfDgkWGi1SJrcLp3w/viewform?usp=sf_link`,
    },
  ],

  測試: (uuid: string) => [
    {
      type: "text",
      text: `${users[uuid].data.nickname}測啥呢`,
    },
  ],

  簽到: (uuid: string) => {
    if (!ALLOW) {
      // 社課開始時 幹部開啟允許
      return [{ type: "text", text: "社課還沒開始你簽到啥阿❓" }];
    }
    try {
      //自動寄送簽到表單
      sendGetRequest(
        `https://docs.google.com/forms/d/e/1FAIpQLScJlktEcwTuOWDFe_XPCtUIm0Ju1x0VH4KO3WU0vvPGRkdaRw/formResponse?usp=pp_url&entry.1777123803=${users[uuid].data.name}&entry.980466456=${users[uuid].data.department}&entry.1684060118=${users[uuid].data.studentID}`
      );
      return [{ type: "text", text: `${users[uuid].data.nickname}簽到成功🎉` }];
    } catch (err) {
      console.error(err);
      return [{ type: "text", text: `簽到失敗❌` }];
    }
  },

  找遊戲: (uuid: string) => {
    users[uuid].status = "awaiting_search"; // 設定狀態為等待搜尋桌遊
    users[uuid].Variables.searchField = null;
    users[uuid].Variables.page = 0;
    return [
      {
        type: "template",
        altText: "請選擇搜尋的欄位",
        template: {
          type: "buttons",
          text: "搜尋條件",
          actions: [
            { label: "編號", type: "message", text: "編號" },
            { label: "英文名稱", type: "message", text: "英文名稱" },
            { label: "中文名稱", type: "message", text: "中文名稱" },
            { label: "種類", type: "message", text: "種類" },
            // 可加入更多欄位選項
          ],
        },
      },
    ];
  },

  借遊戲: async (uuid: string): Promise<line.Message[]> => {
    users[uuid].status = "awaiting_borrowid";

    const borrowedGames = await customSearchInSheet(
      [{ field: "借用人", value: users[uuid].data.name }],
      uuid
    );

    return [
      { type: "text", text: `${users[uuid].data.nickname} 你已經借了:` },
      // 列出借用者已借用的桌遊 ( 每 3 個一批 輸出 )
      ...Array.from({ length: Math.ceil(borrowedGames.length / 3) }).map(
        (_, i) =>
          ({
            type: "text",
            text: borrowedGames.slice(i * 3, i * 3 + 3).join("\n\n"),
          } as line.TextMessage)
      ),
      { type: "text", text: "告訴我桌遊編號我才能幫你借。😘" },
    ];
  },

  還遊戲: async (uuid: string): Promise<line.Message[]> => {
    users[uuid].status = "awaiting_returnid";

    const borrowedGames = await customSearchInSheet(
      [{ field: "借用人", value: users[uuid].data.name }],
      uuid
    );
    return [
      { type: "text", text: `${users[uuid].data.nickname} 你已經借了:` },
      // 列出借用者已借用的桌遊 ( 每 3 個一批 輸出 )
      ...Array.from({ length: Math.ceil(borrowedGames.length / 3) }).map(
        (_, i) =>
          ({
            type: "text",
            text: borrowedGames.slice(i * 3, i * 3 + 3).join("\n\n"),
          } as line.TextMessage)
      ),
      { type: "text", text: "告訴我桌遊編號我才能幫你還。😘" },
    ];
  },

  // 社員建議社團要買什麼桌遊
  建議遊戲: (uuid: string) => {
    users[uuid].status = "awaiting_suggest";
    return [
      {
        type: "text",
        text: `${users[uuid].data.nickname} 先讓我聽聽看你想推薦什麼遊戲❓\n我考慮看看😎`,
      },
    ];
  },

  // 社員給予桌遊好評的功能(影響推薦)
  我覺得好好玩: (uuid: string) => {
    users[uuid].status = "awaiting_recommendID";
    return [
      {
        type: "text",
        text: `${users[uuid].data.nickname} 你喜歡社辦哪款桌遊⁉️\n告訴我編號😃`,
      },
    ];
  },

  推薦: (uuid: string) => [
    {
      type: "text",
      text: `${users[uuid].data.nickname} 是想推薦\n還是被推薦😎😎`,
    },
    {
      type: "template",
      altText: "recommend menu",
      template: {
        type: "buttons",
        text: " ",
        actions: [
          { label: "熱門桌遊", type: "message", text: "熱門桌遊" },
          { label: "我覺得好好玩", type: "message", text: "我覺得好好玩" },
        ],
      },
    },
  ],

  // 列出熱門桌遊(前十名)
  熱門桌遊: async (_): Promise<line.Message[]> => {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID_PUB,
      range: "桌遊清單!A:E",
    });
    const rows = response?.data?.values?.slice(1) as string[][];
    const top10Icon: string[] = [
      "1️⃣",
      "2️⃣",
      "3️⃣",
      "4️⃣",
      "5️⃣",
      "6️⃣",
      "7️⃣",
      "8️⃣",
      "9️⃣",
      "🔟",
    ];
    const top10: string[] = rows.map(
      (row: string[], i: number) =>
        `${i < 3 ? "🔥" : ""}${top10Icon[i]}\n 編號: ${row[0]}\n 英文名稱: ${
          row[1]
        }\n 中文名稱: ${row[2]}\n 種類: ${row[3]}\n`
    );
    return [
      {
        type: "text",
        text: `✨熱門桌遊✨\n\n${top10.slice(0, 5).join("\n\n")}`,
      },
      { type: "text", text: `${top10.slice(5, 10).join("\n\n")}` },
    ];
  },

  on: (uuid: string) => {
    ALLOW = true;
    return [
      {
        type: "text",
        text: `${users[uuid].data.nickname} 看在同事一場\n勉為其難幫你打開😫`,
      },
    ];
  },

  off: (uuid: string) => {
    ALLOW = true;
    return [
      { type: "text", text: `${users[uuid].data.nickname}有記得關~算你識相🤩` },
    ];
  },
};

const statusFeatures: Record<
  User["status"],
  (
    uuid: string,
    messageText: string
  ) => line.Message[] | Promise<line.Message[]>
> = {
  normal: (uuid: string, messageText: string) => {
    users[uuid].status = "hold";
    for (const {
      keyword,
      menberOnly,
      permissionStrict,
      needAllow,
    } of keywords) {
      // 轉成小寫判斷英文字
      if (messageText.toLowerCase().includes(keyword)) {
        if (menberOnly && !(uuid in users)) {
          return [{ type: "text", text: "❌請先註冊，只有社員才能使用此功能" }];
        }
        if (
          permissionStrict &&
          !["幹部", "先人"].some((p) => p === users[uuid].data.permission)
        ) {
          return [{ type: "text", text: "❌想做什麼，只有幹部才能使用此功能" }];
        }
        if (
          needAllow &&
          !ALLOW &&
          !["幹部", "先人"].some((p) => p === users[uuid].data.permission)
        ) {
          return [{ type: "text", text: "❌我同事沒有許可可是不行的喔~" }];
        }
        return normalFeatures[keyword](uuid) as line.Message[];
      }
    }

    for (const [key, value] of Object.entries(dialog)) {
      if (messageText.toLowerCase().includes(key)) {
        return [{ type: "text", text: value }];
      }
    }

    return [
      { type: "text", text: `你今天想幹嘛呢❓\n快點喔~我可是個大忙人呢😎` },
    ];
  },
  hold: (uuid: string, _: string) => [
    // 鎖定 避免重複操作
    {
      type: "text",
      text: `${users[uuid].data.nickname}\n我知道你很急 但你先別急\n✋慢慢來比較快~~`,
    },
  ],

  awaiting_search: async (
    uuid: string,
    messageText: string
  ): Promise<line.Message[]> => {
    users[uuid].status = "hold";

    // 先指定要搜尋的欄位
    if (users[uuid].Variables.searchField === null) {
      const validFields = ["編號", "英文名稱", "中文名稱", "種類"];
      const matchedField = validFields.find((field) =>
        messageText.includes(field)
      );

      if (matchedField) {
        users[uuid].Variables.searchField = matchedField;
        users[uuid].status = "awaiting_search";
        return [
          {
            type: "text",
            text: `請輸入要搜尋🔍的 ${matchedField} 關鍵字：`,
          },
        ];
      }

      users[uuid].status = "awaiting_search";
      return [
        {
          type: "text",
          text: `❌無法查詢${messageText}`,
        },
      ];
    }

    // 如果有要搜尋的欄位之後搜尋
    let results: string[] = [];
    if (!(messageText === "下一頁" || messageText === "上一頁")) {
      results = await customSearchInSheet(
        [{ field: users[uuid].Variables.searchField, value: messageText }],
        uuid
      );
      if (results.length <= 0) {
        users[uuid].status = "awaiting_search";
        return [
          {
            type: "text",
            text: `❌未找到與 ${messageText} 相符的資料`,
          },
          {
            type: "text",
            text: `若想退出狀態請輸入【 重置 】`,
          }
        ];
      }
    }

    const pageView = 3; // 每頁顯示的結果數量
    const totalPages = Math.ceil(results.length / pageView); // 總頁數
    users[uuid].Variables.page = Math.min(
      totalPages - 1,
      (users[uuid].Variables.page || 0) +
        (messageText === "下一頁" ? 1 : messageText === "上一頁" ? -1 : 0)
    );
    const currentPage = Math.max(0, users[uuid].Variables.page);
    const start = currentPage * pageView;
    const end = Math.min(start + pageView, results.length);

    users[uuid].status = "awaiting_search";
    return [
      {
        type: "flex",
        altText: "分頁結果",
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text:
                  currentPage < 0 || currentPage > totalPages
                    ? "沒資料不要再翻了啦😣"
                    : `第 ${
                        currentPage + 1
                      } 頁 / 共 ${totalPages} 頁\n\n${results
                        .slice(start, end)
                        .join("\n\n")}`,
                wrap: true,
                size: "md",
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "button",
                    action: {
                      type: "message",
                      label: "上一頁",
                      text: "上一頁",
                    },
                    color: "#AAAAAA",
                    style: "primary",
                    height: "sm",
                  },
                  {
                    type: "button",
                    action: {
                      type: "message",
                      label: "下一頁",
                      text: "下一頁",
                    },
                    color: "#AAAAAA",
                    style: "primary",
                    height: "sm",
                  },
                ],
                spacing: "md",
              },
            ],
          },
        },
      },
    ];
  },

  awaiting_borrowid: async (
    uuid: string,
    messageText: string
  ): Promise<line.Message[]> => {
    users[uuid].status = "hold";
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `${schoolYear}社產清單!A:M`,
      });
      const rows = response.data.values as string[][];
      // 搜尋符合桌遊編號的 索引值 找不到為 -1
      const rowIndex = rows.findIndex((row) => row[0] === messageText);

      if (rowIndex === -1) {
        users[uuid].status = "awaiting_borrowid";
        return [
          {
            type: "text",
            text: `❌ 找不到編號為 ${messageText} 的桌遊`,
          },
        ];
      }

      // 如果未被借用
      if (rows[rowIndex][4] === "") {
        rows[rowIndex][4] = "V"; // 借用狀態 V
        rows[rowIndex][5] = users[uuid].data.name; // 填入借用者姓名

        await sheets.spreadsheets.values.update({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: `${schoolYear}社產清單!A${rowIndex + 1}:M${rowIndex + 1}`,
          valueInputOption: "RAW",
          resource: {
            values: [rows[rowIndex]],
          },
        } as sheets_v4.Params$Resource$Spreadsheets$Values$Update);
        users[uuid].status = "normal";
        return [
          {
            type: "text",
            text: `${users[uuid].data.nickname} 你借了 ${messageText} ${rows[rowIndex][2]} 記得還哈❗`,
          },
        ];
      } else {
        users[uuid].status = "normal";
        return [
          {
            type: "text",
            text: `${users[uuid].data.nickname} 真可惜\n ${rows[rowIndex][2]} 被人搶先一步借走了🥲。`,
          },
        ];
      }
    } catch (err) {
      console.error(err);
      users[uuid].status = "awaiting_borrowid";
      return [{ type: "text", text: `出現意外狀況 借用失敗❌` }];
    }
  },

  awaiting_returnid: async (
    uuid: string,
    messageText: string
  ): Promise<line.Message[]> => {
    users[uuid].status = "hold";
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `${schoolYear}社產清單!A:M`,
      });
      const rows = response.data.values as string[][];
      // 搜尋桌遊編號相符的 索引值 找不到為 -1
      const rowIndex = rows.findIndex((row) => row[0] === messageText);

      if (rowIndex === -1) {
        users[uuid].status = "awaiting_returnid";
        return [
          {
            type: "text",
            text: `❌ 找不到編號為 ${messageText} 的桌遊`,
          },
        ];
      }
      // 如果同意還桌遊的幹部沒有先記錄位置
      if (rows[rowIndex][6] === "") {
        users[uuid].status = "awaiting_position";
        users[uuid].Variables.game = rows[rowIndex];
        return [
          {
            type: "text",
            text: `不好意思🙏，我們的幹部怠忽職守🤡，沒有記錄到他放在哪，\n${users[uuid].data.nickname} 你幫我放在任意櫃子上，\n然後告訴我你放在哪一櫃：`,
          },
          {
            type: "template",
            altText: "選擇櫃子",
            template: {
              type: "buttons",
              text: "請選擇櫃子",
              actions: [
                { label: "A", type: "message", text: "A" },
                { label: "B", type: "message", text: "B" },
                { label: "C", type: "message", text: "C" },
                { label: "D", type: "message", text: "D" },
              ],
            },
          },
        ];
      }
      if (users[uuid].Variables.game) {
        rows[rowIndex] = users[uuid].Variables.game;
      }

      // 借用者姓名符合
      if (rows[rowIndex][5] === users[uuid].data.name) {
        rows[rowIndex][4] = ""; // 借用狀態
        rows[rowIndex][5] = ""; // 清除借用者姓名

        await sheets.spreadsheets.values.update({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: `${schoolYear}社產清單!A${rowIndex + 1}:M${rowIndex + 1}`,
          valueInputOption: "RAW",
          resource: {
            values: [rows[rowIndex]],
          },
        } as sheets_v4.Params$Resource$Spreadsheets$Values$Update);

        users[uuid].status = "normal";
        users[uuid].Variables.game = null;

        return [
          {
            type: "text",
            text: `${users[uuid].data.nickname}你很棒👍有記得還:${messageText} ${rows[rowIndex][2]}\n請幫我把它放回"${rows[rowIndex][6]}"櫃，拜托~~😘`,
          },
        ];
      } else {
        users[uuid].status = "normal";
        return [
          {
            type: "text",
            text: `🤡${users[uuid].data.nickname} 你才沒借這個好嗎？`,
          },
        ];
      }
    } catch (err) {
      console.error(err);
      users[uuid].status = "awaiting_returnid";
      return [{ type: "text", text: `出現意外狀況 歸還失敗❌` }];
    }
  },

  awaiting_position: (uuid: string, messageText: string) => {
    users[uuid].status = "hold";
    if (!["A", "B", "C", "D"].some((value) => value === messageText)) {
      users[uuid].status = "awaiting_position";
      return [
        {
          type: "text",
          text: "我再給你一次機會\n不要欺騙我的感情🥲🥲🥲",
        },
      ];
    }

    if (users[uuid].Variables.game) {
      users[uuid].status = "awaiting_returnid";
      return [
        {
          type: "text",
          text: "Ok~~~\n收到你放的櫃子位置了！\n繼續進行換遊戲的流程吧😎😎😎",
        },
        {
          type: "text",
          text: "再次告訴我桌遊編號：",
        },
      ];
    } else {
      users[uuid].status = "normal";
      return [
        {
          type: "text",
          text: "我壞掉了😵\n請重還一次",
        },
      ];
    }
  },

  awaiting_suggest: async (
    uuid: string,
    messageText: string
  ): Promise<line.Message[]> => {
    users[uuid].status = "hold";
    const isEnglish = /^[A-Za-z\s_]+$/.test(messageText);
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `${schoolYear}社產清單!A:M`,
      });
      const rows = response.data.values as string[][];

      // 找出完全符合（忽略大小寫）的索引
      const gameIndex = rows.findIndex(
        (row) =>
          row[isEnglish ? 1 : 2]?.toLowerCase() === messageText.toLowerCase()
      );

      // 過濾出類似遊戲
      const similarGames = rows
        .filter((row) => row[isEnglish ? 1 : 2]?.includes(messageText))
        .map((row) =>
          [
            `編號: ${row[0]}`,
            `英文名稱: ${row[1]}`,
            `中文名稱: ${row[2]}`,
            `種類: ${row[3]}`,
            `借用: ${row[4] == "V" ? "已借出" : "未借出"}`,
            `位置: ${row[6]}`,
            `備註: ${row[12] || "無"}`,
          ].join("\n\n")
        );
      // 推薦表單
      sendGetRequest(
        `https://docs.google.com/forms/d/e/1FAIpQLScSItJnRntYtrPJm6cYTFs02mFNOJBh_6pUVKKvaUwlSnhoZg/formResponse?usp=pp_url&entry.1522855814=${messageText}&entry.903077000=%E5%B0%8F%E5%82%B2%E9%A9%95%E8%BD%89%E9%81%94`
      );

      users[uuid].status = "normal";
      return similarGames.length > 0 // 有相似遊戲
        ? gameIndex === -1 // 沒有名稱完全相同的遊戲
          ? [
              {
                type: "text",
                text: `社辦也許有但我不確定🤔但還是會跟我同事建議看看((${users[uuid].data.nickname} 快感謝我🤩`,
              },
              { type: "text", text: "先給你看看相似的桌遊：" },
              ...(similarGames
                .filter((_, i) => i % 3 === 0)
                .map((_, i) => ({
                  type: "text",
                  text: similarGames.slice(i * 3, i * 3 + 3).join("\n\n"),
                })) as line.Message[]),
            ]
          : [
              {
                type: "text",
                text: ` 編號: ${rows[gameIndex][0]}\n
          英文名稱: ${rows[gameIndex][1]}\n
          中文名稱: ${rows[gameIndex][2]}\n
          種類: ${rows[gameIndex][3]}\n
          借用: ${rows[gameIndex][4] == "V" ? "已借出" : "未借出"}\n
          位置: ${rows[gameIndex][6]}\n
          狀態(外膜): ${rows[gameIndex][8]}\n
          狀態(外觀): ${rows[gameIndex][9]}\n
          狀態(缺件): ${rows[gameIndex][10]}\n
          狀態(牌套): ${rows[gameIndex][11]}\n
          備註: ${rows[gameIndex][12] ? rows[gameIndex][12] : "無"}`,
              },
              { type: "text", text: "你過時了😜 這我們早就有了🤣" },
            ]
        : [
            {
              type: "text",
              text: `${users[uuid].data.nickname} 我絕對沒有覺得聽起來很不錯😖\n但我會轉達給我同事的🙃`,
            },
          ];
    } catch (error) {
      users[uuid].status = "normal";
      return [
        {
          type: "text",
          text: `建議失敗❌`,
        },
      ];
    }
  },

  awaiting_recommendID: async (
    uuid: string,
    messageText: string
  ): Promise<line.Message[]> => {
    users[uuid].status = "hold";
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID_PUB,
        range: "桌遊清單!A:E",
      });
      const rows = response?.data?.values as string[][];
      const rowIndex = rows.findIndex((row) => row[0] === messageText);
      if (rowIndex === -1) {
        return [
          {
            type: "text",
            text: `${users[uuid].data.nickname}再騙我要生氣囉😡\n社辦明明就沒有這桌遊😤`,
          },
        ];
      }

      rows[rowIndex][4] = (parseInt(rows[rowIndex][4]) + 1).toString();
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID_PUB,
        range: `桌遊清單!A${rowIndex + 1}:E${rowIndex + 1}`,
        valueInputOption: "RAW",
        resource: {
          values: [rows[rowIndex]],
        },
      } as sheets_v4.Params$Resource$Spreadsheets$Values$Update);

      users[uuid].status = "normal";
      return [
        {
          type: "text",
          text: `${users[uuid].data.nickname} 算你有品味😉`,
        },
      ];
    } catch (error) {
      users[uuid].status = "normal";
      return [
        {
          type: "text",
          text: `推薦失敗❌`,
        },
      ];
    }
  },

  // vvv以下為註冊流程中依序等待各項資料輸入的狀態vvv
  awaiting_registerkey: async (
    uuid: string,
    messageText: string
  ): Promise<line.Message[]> => {
    users[uuid].status = "hold";
    // 獲取試算表中序號資料
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID_MENBER,
      range: `${schoolYear}社員清單!G:H`,
    });
    // 找符合序號的列
    const row = response.data?.values?.find((row) => row[1] === messageText);

    if (!row) {
      // 找不到
      users[uuid].status = "awaiting_registerkey";
      return [
        {
          type: "text",
          text: "❌查無此序號",
        },
      ];
    }
    if (row[0]) {
      // 已有註冊 (有電話號碼)
      users[uuid].status = "awaiting_registerkey";
      return [
        {
          type: "text",
          text: "⚠️此序號已註冊",
        },
      ];
    }
    users[uuid].status = "awaiting_name";
    users[uuid].Variables.userData.registerkey = messageText;
    return [
      {
        type: "text",
        text: "✅序號合法\n請輸入姓名：",
      },
    ];
  },

  awaiting_name: (uuid: string, messageText: string) => {
    users[uuid].status = "hold";
    users[uuid].Variables.userData.name = messageText;
    users[uuid].status = "awaiting_nickname";
    return [
      {
        type: "text",
        text: "請輸入暱稱：",
      },
    ];
  },

  awaiting_nickname: (uuid: string, messageText: string) => {
    users[uuid].status = "hold";
    users[uuid].Variables.userData.nickname = messageText;
    users[uuid].status = "awaiting_student_id";
    return [
      {
        type: "text",
        text: "請輸入學號：",
      },
    ];
  },

  awaiting_student_id: (uuid: string, messageText: string) => {
    users[uuid].status = "hold";
    users[uuid].Variables.userData.studentID = messageText;
    users[uuid].status = "awaiting_department";
    return departments
      .reduce<string[][]>((res, dept, gameIndex) => {
        /* 每 3 個 一個區塊
        gameIndex 
        0 [[d1]]
        1 [[d1, d2]]
        2 [[d1, d2, d3]]
        3 [[d1, d2, d3], [d4]]
        4 [[d1, d2, d3], [d4, d5]]
         */
        if (gameIndex % 3 === 0) {
          res.push([]);
        }
        res[res.length - 1].push(dept);
        return res;
      }, [])
      .map((chunk) => ({
        type: "template",
        altText: "選擇科系",
        template: {
          type: "buttons",
          text: "請選擇科系",
          actions: chunk.map((dept) => ({
            label: dept,
            type: "message",
            text: dept,
          })),
        },
      }));
  },

  awaiting_department: (uuid: string, messageText: string) => {
    users[uuid].status = "hold";
    if (!departments.some((dept) => messageText === dept)) {
      users[uuid].status = "awaiting_department";
      return [
        {
          type: "text",
          text: "❌這裡不收自訂義科系，\n再給你一次重新選擇的機會：",
        },
      ];
    }

    users[uuid].Variables.userData.department = messageText;
    users[uuid].status = "awaiting_grade";
    return [
      {
        type: "template",
        altText: "選擇年級",
        template: {
          type: "buttons",
          text: "請選擇年級",
          actions: [
            { label: "一", type: "message", text: "一" },
            { label: "二", type: "message", text: "二" },
            { label: "三", type: "message", text: "三" },
            { label: "四", type: "message", text: "四" },
            // 可加入更多欄位選項
          ],
        },
      },
      {
        type: "template",
        altText: "選擇年級",
        template: {
          type: "buttons",
          text: "請選擇年級",
          actions: [
            { label: "碩一", type: "message", text: "碩一" },
            { label: "碩二", type: "message", text: "碩二" },
            // 可加入更多欄位選項
          ],
        },
      },
    ];
  },

  awaiting_grade: (uuid: string, messageText: string) => {
    users[uuid].status = "hold";
    if (
      !["一", "二", "三", "四", "碩一", "碩二"].some((g) => messageText === g)
    ) {
      users[uuid].status = "awaiting_grade";
      return [
        {
          type: "text",
          text: "你連你自己幾年級都不知道嗎❓😮‍💨",
        },
      ];
    }
    users[uuid].Variables.userData.grade = messageText;
    users[uuid].status = "awaiting_phonenumber";
    return [
      {
        type: "text",
        text: "請輸入電話📞：",
      },
    ];
  },

  awaiting_phonenumber: async (
    uuid: string,
    messageText: string
  ): Promise<line.Message[]> => {
    users[uuid].status = "hold";
    if (isNaN(Number(messageText))) {
      users[uuid].status = "awaiting_phonenumber";
      return [
        {
          type: "text",
          text: "你是哪裡人，應該沒有哪個國家🇹🇼電話不是數字吧❓❓\n再給你一次機會：",
        },
      ];
    }
    users[uuid].Variables.userData.phonenumber = messageText;
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID_MENBER,
        range: `${schoolYear}社員清單!H:H`,
      });
      const rows = response.data.values as string[][];
      const rowIndex = rows.findIndex(
        (row) => row[0] === users[uuid].Variables.userData.registerkey
      );
      if (rowIndex === -1) {
        users[uuid].Variables.userData = {};
        users[uuid].status = "normal";
        return [
          {
            type: "text",
            text: "❌錯誤 我壞掉了😵\n請重新註冊一次",
          },
        ];
      }
      // 將註冊資料上傳
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID_MENBER,
        range: `${schoolYear}社員清單!A${rowIndex + 1}:I${rowIndex + 1}`,
        valueInputOption: "RAW",
        resource: {
          values: [
            [
              uuid,
              users[uuid].Variables.userData.name,
              users[uuid].Variables.userData.nickname,
              users[uuid].Variables.userData.studentID,
              users[uuid].Variables.userData.department,
              users[uuid].Variables.userData.grade,
              users[uuid].Variables.userData.phonenumber,
              users[uuid].Variables.userData.registerkey,
              "社員",
            ],
          ],
        },
      } as sheets_v4.Params$Resource$Spreadsheets$Values$Update);
      users[uuid].status = "normal";
      return [
        {
          type: "text",
          text: "請輸入學號：",
        },
      ];
    } catch (err) {
      console.error(err);
      users[uuid].Variables.userData = {};
      users[uuid].status = "normal";
      return [
        {
          type: "text",
          text: `出現意外情況 註冊失敗❌`,
        },
      ];
    }
  },
};

export const judgeText = async (
  messageText: string,
  uuid: string
): Promise<line.Message[]> => {
  if (messageText === "重置") {
    delete users[uuid];
    return [{ type: "text", text: "🔄重置成功" }];
  }

  // Debug 用
  if (messageText === "狀態") {
    return [{ type: "text", text: users[uuid].status }];
  }

  return (await statusFeatures[users[uuid].status](
    uuid,
    messageText
  )) as line.Message[];
};
