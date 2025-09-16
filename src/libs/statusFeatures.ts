import { community, getAllow, users } from "./index";
import { MessageHandler } from "../types/line";
import { User } from "../types/user";
import { dialog } from "./dialog";
import { kewordFeatures, keywordItems } from "./keywords";
import { AssetsSheetField } from "../types/sheets";
import {
  findMember,
  getBoardGamesByCondition,
  isDepartment,
  isGrade,
  isPosition,
  updateAssetsSheetRow,
  updateMemberSheetRow,
} from "../utils/sheets";
import { assetsPositions, departments, grades } from "./sheets";
import { normalize } from "../utils/custom";

export const statusFeatures: Record<User["status"], MessageHandler> = {
  hold: (_, uuid) => [
    // 鎖定 避免重複操作
    {
      type: "text",
      text: `${users[uuid].nickname}\n我知道你很急 但你先別急\n✋慢慢來比較快~~`,
    },
  ],
  normal: async (messageText, uuid) => {
    users[uuid].status = "hold";
    const isMember = await users[uuid].isMember();
    for (const {
      keyword,
      menberOnly,
      permissionStrict,
      needAllow,
    } of keywordItems) {
      if (messageText.toLowerCase().includes(keyword)) {
        if (menberOnly && !isMember) {
          users[uuid].status = "normal";
          return [{ type: "text", text: "❌請先註冊，只有社員才能使用此功能" }];
        }
        if (permissionStrict && !users[uuid].isManager()) {
          users[uuid].status = "normal";
          return [{ type: "text", text: "❌想做什麼，只有幹部才能使用此功能" }];
        }
        if (needAllow && !getAllow() && !users[uuid].isManager()) {
          users[uuid].status = "normal";
          return [
            { type: "text", text: "❌我同事沒有許可可是不行的喔~" },
            { type: "text", text: "請聯絡一下其他幹部呦~" },
          ];
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
      { type: "text", text: `你今天想幹嘛呢❓\n快點喔~我可是個大忙人呢~` },
      { type: "text", text: `輸入「幫助」我就勉為其難告訴你能做些什麼😎` },
    ];
  },

  awaiting_search: async (messageText, uuid) => {
    users[uuid].status = "hold";
    if (
      !users[uuid].variables.searchParams ||
      !users[uuid].variables.searchParams.field
    ) {
      const validFields: AssetsSheetField[] = [
        "編號",
        "英文名稱",
        "中文名稱",
        "種類",
      ];
      const matchedField = validFields.find((field) =>
        messageText.includes(field)
      );

      users[uuid].status = "awaiting_search";
      if (!matchedField) {
        return [
          {
            type: "text",
            text: `❌ 抱歉，無法查詢「${messageText}」\n\n🔍 可查詢的欄位有：\n${validFields.map(f => `• ${f}`).join("\n")}\n\n請重新選擇要查詢的欄位~`,
          },
        ];
      }

      users[uuid].variables.searchParams = {
        field: matchedField,
      };
      return [
        {
          type: "text",
          text: `✅ 好的！請輸入要搜尋的 ${matchedField} 關鍵字：\n\n💡 小提示：關鍵字不需要完全相符，輸入部分名稱即可搜尋~`,
        },
      ];
    }

    if (!users[uuid].variables.searchParams.value) {
      users[uuid].variables.searchParams.value = messageText;
    }

    if (!(messageText === "下一頁" || messageText === "上一頁")) {
      users[uuid].variables.searchParams.value = messageText;
      users[uuid].variables.page = 0; // 搜索結果後清空頁面狀態，以便從第一頁顯示
    }

    const { field, value } = users[uuid].variables.searchParams;

    //進行搜尋，並顯示搜尋結果
    const boardgames = await getBoardGamesByCondition({ field, value });

    // 如果沒有找到任何結果
    if (boardgames.length === 0) {
      users[uuid].status = "normal";
      users[uuid].variables.searchParams = undefined;
      users[uuid].variables.page = 0;
      return [
        {
          type: "text",
          text: `😅 很遺憾！在「${field}」中找不到包含「${value}」的桌遊\n\n💡 建議：\n• 檢查關鍵字是否正確\n• 嘗試使用更簡短的關鍵字\n• 或者換個搜尋欄位試試看~`,
        },
        {
          type: "text",
          text: `如果想退出搜尋，請輸入「重置」ㄛ~`,
        }
      ];
    }

    const pageView = 3; // 每頁顯示的結果數量
    const totalPages = Math.ceil(boardgames.length / pageView); // 總頁數 ex. 5/6 => 2
    // 確保頁面不會小於 0
    users[uuid].variables.page = Math.max(
      0,
      Math.min(
        totalPages - 1,
        (users[uuid].variables.page || 0) +
          (messageText === "下一頁" ? 1 : messageText === "上一頁" ? -1 : 0)
      )
    );
    const currentPage = users[uuid].variables.page;
    const start = currentPage * pageView;
    const end = Math.min(start + pageView, boardgames.length); // 保證結束頁面不超過資料長度

    // 動態設定按鈕顏色和可用性
    const isFirstPage = currentPage === 0;
    const isLastPage = currentPage === totalPages - 1;

    users[uuid].status = "awaiting_search";
    return [
      {
        type: "flex",
        altText: `搜尋結果 第${currentPage + 1}頁`,
        contents: {
          type: "bubble",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "🎲 桌遊搜尋結果",
                weight: "bold",
                size: "lg",
                color: "#1DB446",
              },
              {
                type: "text",
                text: `搜尋「${field}」包含「${value}」`,
                size: "sm",
                color: "#666666",
                margin: "sm",
              },
            ],
            backgroundColor: "#F0F8FF",
            paddingAll: "md",
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: `📊 第 ${currentPage + 1} 頁 / 共 ${totalPages} 頁  共找到 ${boardgames.length} 個結果`,
                size: "sm",
                color: "#666666",
                margin: "none",
                weight: "bold",
              },
              {
                type: "separator",
                margin: "md",
              },
              {
                type: "text",
                text: `${boardgames
                  .slice(start, end)
                  .map((game) => game.toDisplayText(uuid))
                  .join("\n\n")}`,
                wrap: true,
                size: "sm",
                margin: "md",
              },
            ],
            paddingAll: "md",
          },
          footer: {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "button",
                action: {
                  type: "message",
                  label: "◀ 上一頁",
                  text: "上一頁",
                },
                color: isFirstPage ? "#CCCCCC" : "#1DB446",
                style: "primary",
                height: "sm",
                flex: 1,
              },
              {
                type: "separator",
                margin: "sm",
              },
              {
                type: "button",
                action: {
                  type: "message",
                  label: "下一頁 ▶",
                  text: "下一頁",
                },
                color: isLastPage ? "#CCCCCC" : "#1DB446",
                style: "primary",
                height: "sm",
                flex: 1,
              },
            ],
            spacing: "sm",
            paddingAll: "md",
          },
        },
      },
    ];
  },

  awaiting_borrowid: async (messageText, uuid) => {
    users[uuid].status = "hold";
    try {
      const matchBoardgames = await getBoardGamesByCondition({
        field: "編號",
        value: messageText,
      });

      if (matchBoardgames.length === 0) {
        users[uuid].status = "awaiting_borrowid";
        return [
          {
            type: "text",
            text: `❌ 找不到編號為 ${messageText} 的桌遊`,
          },
        ];
      }

      const matchBoardgame = matchBoardgames[0];

      // 如果未被借用
      if (matchBoardgame.borrowed) {
        users[uuid].status = "normal";
        return [
          {
            type: "text",
            text: `${users[uuid].nickname} 真可惜\n ${matchBoardgame.name.chinese} 被人搶先一步借走了🥲。`,
          },
        ];
      }

      matchBoardgame.borrowed = true;
      matchBoardgame.borrower = users[uuid].name;
      users[uuid].status = "normal";
      matchBoardgame.recommendedCountsIncrement();
      const { err } = await updateAssetsSheetRow(
        { field: "id", value: matchBoardgame.id },
        matchBoardgame
      );
      if (err) {
        throw err;
      }

      return [
        {
          type: "text",
          text: `${users[uuid].nickname} 你借了 ${matchBoardgame.id} ${matchBoardgame.name.chinese} 記得還哈❗`,
        },
      ];
    } catch (err) {
      console.error(err);
      users[uuid].status = "awaiting_borrowid";
      return [{ type: "text", text: `出現意外狀況 借用失敗❌` }];
    }
  },

  awaiting_returnid: async (messageText, uuid) => {
    users[uuid].status = "hold";
    try {
      const matchBoardgames = await getBoardGamesByCondition({
        field: "編號",
        value: messageText,
        strict: true,
      });

      if (matchBoardgames.length === 0) {
        users[uuid].status = "awaiting_borrowid";
        return [
          {
            type: "text",
            text: `❌ 找不到編號為 ${messageText} 的桌遊`,
          },
        ];
      }

      const matchBoardgame = matchBoardgames[0];

      if (matchBoardgame.borrower !== users[uuid].name) {
        users[uuid].status = "normal";
        return [
          {
            type: "text",
            text: `🤡${users[uuid].nickname} 你才沒借這個好嗎？`,
          },
        ];
      }

      // 如果同意還桌遊的幹部沒有先記錄位置
      if (!matchBoardgame.position) {
        users[uuid].status = "awaiting_position";
        users[uuid].variables.game = matchBoardgame;
        return [
          {
            type: "text",
            text: `不好意思🙏，我們的幹部怠忽職守🤡，沒有記錄到他放在哪，\n${users[uuid].nickname} 你幫我放在任意櫃子上，\n然後告訴我你放在哪一櫃：`,
          },
          {
            type: "template",
            altText: "選擇櫃子",
            template: {
              type: "buttons",
              text: "請選擇櫃子",
              actions: assetsPositions.map((p) => ({
                label: p,
                type: "message",
                text: p,
              })),
            },
          },
        ];
      }

      matchBoardgame.borrowed = false;
      matchBoardgame.borrower = undefined;

      const { err } = await updateAssetsSheetRow(
        { field: "id", value: matchBoardgame.id },
        matchBoardgame
      );

      if (err) {
        throw err;
      }

      users[uuid].status = "normal";

      return [
        {
          type: "text",
          text: `${users[uuid].nickname}你很棒👍有記得還:${matchBoardgame.id} ${matchBoardgame.name.chinese}\n請幫我把它放回 ${matchBoardgame.position} 櫃，拜托囉~~😘`,
        },
      ];
    } catch (err) {
      console.error(err);
      users[uuid].status = "awaiting_returnid";
      return [{ type: "text", text: `出現意外狀況 歸還失敗❌` }];
    }
  },

  awaiting_position: async (messageText, uuid) => {
    users[uuid].status = "hold";
    if (!isPosition(messageText)) {
      users[uuid].status = "awaiting_position";
      return [
        {
          type: "text",
          text: "❌這裡不收自訂義櫃子，\n再給你一次重新選擇的機會：",
        },
      ];
    }
    try {
      if (!users[uuid].variables.game) {
        throw new Error("!users[uuid].variables.game");
      }
      users[uuid].variables.game.position = messageText;
      users[uuid].variables.game.borrowed = false;
      users[uuid].variables.game.borrower = undefined;

      const { err } = await updateAssetsSheetRow(
        { field: "id", value: users[uuid].variables.game.id },
        users[uuid].variables.game
      );
      if (err) {
        throw err;
      }

      users[uuid].status = "normal";
      users[uuid].variables.game = undefined;
      return [
        {
          type: "text",
          text: `${users[uuid].nickname}你很棒👍有記得還桌遊\n幫我把它放回 ${messageText} 櫃，拜托囉~~😘`,
        },
      ];
    } catch (err) {
      users[uuid].status = "normal";
      console.error(err);
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
      const similarBoardGames = await getBoardGamesByCondition({
        field: isEnglish ? "英文名稱" : "中文名稱",
        value: messageText,
      });
      const matchBoardGame = similarBoardGames.find((game) => {
        const name = isEnglish ? game.name.english : game.name.chinese;
        return normalize(name) === normalize(messageText);
      });

      const params = new URLSearchParams({
        "entry.1522855814": messageText,
        "entry.903077000": "小傲驕轉達",
      });

      await fetch(
        `https://docs.google.com/forms/d/e/1FAIpQLScSItJnRntYtrPJm6cYTFs02mFNOJBh_6pUVKKvaUwlSnhoZg/formResponse?${params.toString()}`
      );

      users[uuid].status = "normal";
      return (
        similarBoardGames.length > 0 // 有相似遊戲
          ? !matchBoardGame // 沒有名稱完全相同的遊戲
            ? [
                {
                  type: "text",
                  text: `社辦也許有但我不確定🤔但還是會跟我同事建議看看((${users[uuid].nickname} 快感謝我🤩`,
                },
                { type: "text", text: "先給你看看相似的桌遊：" },
                ...similarBoardGames
                  .filter((_, i) => i % 3 === 0)
                  .map((_, i) => ({
                    type: "text",
                    text: similarBoardGames
                      .slice(i * 3, i * 3 + 3)
                      .map((game) => game.toDisplayText(uuid))
                      .join("\n\n"),
                  })),
              ]
            : [
                {
                  type: "text",
                  text: matchBoardGame.toDisplayText(uuid),
                },
                { type: "text", text: "你過時了😜 這我們早就有了🤣" },
              ]
          : [
              {
                type: "text",
                text: `${users[uuid].nickname} 我絕對沒有覺得聽起來很不錯😖\n但我會轉達給我同事的🙃`,
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
      const matchBoardGames = await getBoardGamesByCondition({
        field: "編號",
        value: messageText,
      });
      if (matchBoardGames.length === 0) {
        return [
          {
            type: "text",
            text: `${users[uuid].nickname}再騙我要生氣囉😡\n社辦明明就沒有這桌遊😤`,
          },
        ];
      }

      const matchBoardGame = matchBoardGames[0];
      matchBoardGame.recommendedCountsIncrement();
      const { err } = await updateAssetsSheetRow(
        { field: "id", value: matchBoardGame.id },
        matchBoardGame
      );

      if (err) {
        throw err;
      }

      users[uuid].status = "normal";
      return [
        {
          type: "text",
          text: `${users[uuid].nickname} 算你有品味😉`,
        },
      ];
    } catch (err) {
      users[uuid].status = "normal";
      console.error(err);
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

    const { user } = await findMember("registerkey", messageText);

    if (!user) {
      // 找不到對應的序號資料
      users[uuid].status = "awaiting_registerkey";
      return [
        {
          type: "text",
          text: "❌查無此序號",
        },
      ];
    }
    if (user.uuid) {
      // 已有註冊 (有uuid)
      users[uuid].status = "awaiting_registerkey";
      return [
        {
          type: "text",
          text: "⚠️此序號已註冊",
        },
      ];
    }
    users[uuid].status = "awaiting_name";
    users[uuid].registerkey = messageText;
    return [
      {
        type: "text",
        text: "✅序號合法\n請輸入姓名：",
      },
    ];
  },

  awaiting_name: (messageText, uuid) => {
    users[uuid].status = "hold";
    users[uuid].name = messageText;
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
    users[uuid].nickname = messageText;
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
    users[uuid].studentID = messageText;
    users[uuid].status = "awaiting_department";
    return departments
      .reduce<string[][]>((res, dept, i) => {
        /* 每 n 個 一個區塊
          i 
          0 [[d1]]
          1 [[d1, d2]]
          2 [[d1, d2, d3]]
          3 [[d1, d2, d3, d4], ]
          4 [[d1, d2, d3, d4], [d5]]
           */

        const n: number = Math.ceil(departments.length / 5);

        if (i % n === 0) {
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
    if (!isDepartment(messageText)) {
      users[uuid].status = "awaiting_department";
      return [
        {
          type: "text",
          text: "❌這裡不收自訂義科系，\n再給你一次重新選擇的機會：",
        },
      ];
    }

    users[uuid].department = messageText;
    users[uuid].status = "awaiting_grade";
    return [
      {
        type: "template",
        altText: "選擇年級",
        template: {
          type: "buttons",
          text: "請選擇年級",
          actions: grades.slice(0, 4).map((g) => ({
            label: g,
            type: "message",
            text: g,
          })),
        },
      },
      {
        type: "template",
        altText: "選擇年級",
        template: {
          type: "buttons",
          text: "請選擇年級",
          actions: grades.slice(4, 6).map((g) => ({
            label: g,
            type: "message",
            text: g,
          })),
        },
      },
    ];
  },

  awaiting_grade: (messageText, uuid) => {
    users[uuid].status = "hold";
    if (!isGrade(messageText)) {
      users[uuid].status = "awaiting_grade";
      return [
        {
          type: "text",
          text: "你連你自己幾年級都不知道嗎❓😮‍💨",
        },
      ];
    }
    users[uuid].grade = messageText;
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
          text: "你是哪裡人，應該沒有哪個國家電話不是數字吧❓❓\n再給你一次機會：",
        },
      ];
    }
    users[uuid].phonenumber = messageText;
    try {
      const { user } = await findMember("registerkey", users[uuid].registerkey);
      if (!user) {
        users[uuid].status = "normal";
        return [
          {
            type: "text",
            text: `❌錯誤 我壞掉了😵\n請重新註冊一次\n${users[uuid].registerkey}`,
          },
        ];
      }
      // 將註冊資料上傳
      users[uuid].permission = "社員";
      const { err } = await updateMemberSheetRow(
        { field: "registerkey", value: users[uuid].registerkey },
        uuid
      );
      if (err) {
        throw err;
      }
      users[uuid].status = "normal";
      return [
        {
          type: "text",
          text: "🎉註冊成功！",
        },
        {
          type: "text",
          text: `這是你的註冊資料呢 📋～\n👤 姓名：${users[uuid].name}\n🏷️ 暱稱：${users[uuid].nickname}\n🎓 學號：${users[uuid].studentID}\n🏫 科系：${users[uuid].department}\n📚 年級：${users[uuid].grade}\n📞 電話：${users[uuid].phonenumber}\n📜 身份：${users[uuid].permission}`,
        },
        {
          type: "text",
          text: `喔還有如果你還沒加入社群這裡有連結喔😊\n${community
            .map((c) => `${c.label}：${c.url}`)
            .join("\n")}`,
        },
      ];
    } catch (err) {
      console.error(err);
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
