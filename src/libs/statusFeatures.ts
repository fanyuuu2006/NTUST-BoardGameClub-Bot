import { departments, getAllow, schoolYear, users } from "./index";
import { MessageHandler } from "../types/line";
import { User } from "../types/user";
import { dialog } from "./dialog";
import { kewordFeatures, keywordItems } from "./keywords";
import { searchFieldInSheet } from "../utils/sheets";
import { sheets } from "../configs/googleapis";
import { sendGetRequest } from "../utils/custom";

export const statusFeatures: Record<User["status"], MessageHandler> = {
  hold: (_, uuid) => [
    // 鎖定 避免重複操作
    {
      type: "text",
      text: `${users[uuid].data.nickname}\n我知道你很急 但你先別急\n✋慢慢來比較快~~`,
    },
  ],
  normal: (messageText, uuid) => {
    users[uuid].status = "hold";
    for (const {
      keyword,
      menberOnly,
      permissionStrict,
      needAllow,
    } of keywordItems) {
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
          !getAllow() &&
          !["幹部", "先人"].some((p) => p === users[uuid].data.permission)
        ) {
          return [{ type: "text", text: "❌我同事沒有許可可是不行的喔~" }];
        }
        return kewordFeatures[keyword](messageText, uuid);
      }
    }

    for (const [key, value] of Object.entries(dialog)) {
      if (messageText.toLowerCase().includes(key)) {
        users[uuid].status = "normal";
        return [{ type: "text", text: value }];
      }
    }
    users[uuid].status = "normal";
    return [
      { type: "text", text: `你今天想幹嘛呢❓\n快點喔~我可是個大忙人呢😎` },
    ];
  },

  awaiting_search: async (messageText, uuid) => {
    users[uuid].status = "hold";
    if (
      !users[uuid].Variables.searchParams ||
      !users[uuid].Variables.searchParams.field
    ) {
      const validFields = ["編號", "英文名稱", "中文名稱", "種類"] as const;
      const matchedField = validFields.find((field) =>
        messageText.includes(field)
      );

      users[uuid].status = "awaiting_search";
      if (!matchedField) {
        return [
          {
            type: "text",
            text: `❌無法查詢 ${messageText}`,
          },
        ];
      }

      users[uuid].Variables.searchParams = {
        field: matchedField,
        value: "",
      };
      return [
        {
          type: "text",
          text: `請輸入要搜尋🔍的 ${matchedField} 關鍵字：`,
        },
      ];
    }

    if (!(messageText === "下一頁" || messageText === "上一頁")) {
      users[uuid].Variables.searchParams.value = messageText;
      users[uuid].Variables.page = 0; // 搜索結果後清空頁面狀態，以便從第一頁顯示
    }
    //進行搜尋，並顯示搜尋結果
    const results = await searchFieldInSheet(
      [users[uuid].Variables.searchParams],
      uuid
    );

    const pageView = 3; // 每頁顯示的結果數量
    const totalPages = Math.ceil(results.length / pageView); // 總頁數
    // 確保頁面不會小於 0
    users[uuid].Variables.page = Math.max(
      0,
      Math.min(
        totalPages - 1,
        (users[uuid].Variables.page || 0) +
          (messageText === "下一頁" ? 1 : messageText === "上一頁" ? -1 : 0)
      )
    );
    const currentPage = users[uuid].Variables.page;
    const start = currentPage * pageView;
    const end = Math.min(start + pageView, results.length); // 保證結束頁面不超過資料長度

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
                text: `第${currentPage + 1} 頁 / 共 ${totalPages} 頁\n\n${
                  currentPage < 0 || currentPage >= totalPages
                    ? "沒資料不要再翻了啦😣"
                    : `${results.slice(start, end).join("\n\n")}`
                }`,
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

  awaiting_borrowid: async (messageText, uuid) => {
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
        rows[rowIndex][5] = users[uuid].data.name || ""; // 填入借用者姓名

        sheets.spreadsheets.values.update({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: `${schoolYear}社產清單!A${rowIndex + 1}:M${rowIndex + 1}`,
          valueInputOption: "RAW",
          requestBody: {
            values: [rows[rowIndex]],
          },
        });
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

  awaiting_returnid: async (messageText, uuid) => {
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
          requestBody: {
            values: [rows[rowIndex]],
          },
        });

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

  awaiting_position: (messageText, uuid) => {
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

  awaiting_suggest: async (messageText, uuid) => {
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
      return (
        similarGames.length > 0 // 有相似遊戲
          ? gameIndex === -1 // 沒有名稱完全相同的遊戲
            ? [
                {
                  type: "text",
                  text: `社辦也許有但我不確定🤔但還是會跟我同事建議看看((${users[uuid].data.nickname} 快感謝我🤩`,
                },
                { type: "text", text: "先給你看看相似的桌遊：" },
                ...similarGames
                  .filter((_, i) => i % 3 === 0)
                  .map((_, i) => ({
                    type: "text",
                    text: similarGames.slice(i * 3, i * 3 + 3).join("\n\n"),
                  })),
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
            ]
      ) as ReturnType<MessageHandler>;
    } catch {
      users[uuid].status = "normal";
      return [
        {
          type: "text",
          text: `建議失敗❌`,
        },
      ];
    }
  },

  awaiting_recommendID: async (messageText, uuid) => {
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
      sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID_PUB,
        range: `桌遊清單!A${rowIndex + 1}:E${rowIndex + 1}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [rows[rowIndex]],
        },
      });

      users[uuid].status = "normal";
      return [
        {
          type: "text",
          text: `${users[uuid].data.nickname} 算你有品味😉`,
        },
      ];
    } catch {
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
  awaiting_registerkey: async (messageText, uuid) => {
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

  awaiting_name: (messageText, uuid) => {
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

  awaiting_nickname: (messageText, uuid) => {
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

  awaiting_student_id: (messageText, uuid) => {
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

  awaiting_department: (messageText, uuid) => {
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

  awaiting_grade: (messageText, uuid) => {
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

  awaiting_phonenumber: async (messageText, uuid) => {
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
        requestBody: {
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
      });
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
