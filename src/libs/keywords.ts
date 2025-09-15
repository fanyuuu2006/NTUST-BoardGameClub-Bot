import { community, getAllow, setAllow, users } from ".";
import { Keyword } from "../types/custom";
import { MessageHandler } from "../types/line";
import { BoardGame } from "../types/sheets";
import { isSameDay } from "../utils/custom";
import {
  getAssetsSheetRows,
  getBoardGamesByCondition,
  parseBoardGame,
  updateMemberSheetRow,
} from "../utils/sheets";

export const keywordItems = [
  {
    keyword: "幫助",
    menberOnly: false,
    permissionStrict: false,
    needAllow: false,
    description: "正常不會跑出這段",
  },
  {
    keyword: "註冊",
    menberOnly: false,
    permissionStrict: false,
    needAllow: false,
    description:
      "哼～我才不會幫社員以外的人處理借還桌遊的事勒😤！所以快告訴我你的入社序號跟資料，我就...就勉為其難記住你好了💭，應該吧",
  },
  {
    keyword: "手動註冊",
    menberOnly: false,
    permissionStrict: false,
    needAllow: false,
    description:
      "如果註冊時小傲驕它傲驕不理你，可以試著輸入「手動註冊」來進行手動註冊喔 🤗",
  },
  {
    keyword: "簽到",
    menberOnly: true,
    permissionStrict: false,
    needAllow: true,
    description:
      "社課的時候記得要乖乖簽到喔 ✍️！簽到次數越多，期末抽獎時中獎機率就越高呢 🎁～雖然我才不在乎你來不來 😏，但是...但是少一次機會可別怪我沒提醒你！",
  },
  {
    keyword: "找桌遊",
    menberOnly: false,
    permissionStrict: false,
    needAllow: false,
    description:
      "想找桌遊嗎？那就告訴我你想用哪種條件搜尋啦 🔍～不告訴我的話我可是會裝作沒聽到的喔😝！接著說出你想搜尋的關鍵字就行了👍",
  },
  {
    keyword: "借桌遊",
    menberOnly: true,
    permissionStrict: false,
    needAllow: true,
    description:
      "想借桌遊嗎？那就快告訴我桌遊編號吧 📦～編號就在盒子上面啦，不會看嗎😤？等我跟同事們都說好了你才能拿走喔 🫵",
  },
  {
    keyword: "還桌遊",
    menberOnly: true,
    permissionStrict: false,
    needAllow: true,
    description:
      "同上，我才懶得跟你廢話😮‍💨，就是跟我講編號，放回我指定的位置，我跟同事都說好再滾，懂嗎❓",
  },
  {
    keyword: "建議桌遊",
    menberOnly: true,
    permissionStrict: false,
    needAllow: false,
    description:
      "你想推薦社團買什麼桌遊嗎？嗯...既然你這麼有誠意，我就大發慈悲幫你轉達吧 😎～不過會不會採用就不是我能決定的囉！",
  },
  {
    keyword: "我覺得好好玩",
    menberOnly: true,
    permissionStrict: false,
    needAllow: false,
    description:
      "玩得開心就好啦 🎉～雖然我表面上不在意你喜歡什麼 🙄，但是...但是既然你都特地跟我說了，我就勉為其難記下來吧 💭！說不定還能幫助其他人找到好玩的桌遊呢～",
  },
  {
    keyword: "推薦",
    menberOnly: false,
    permissionStrict: false,
    needAllow: false,
    description:
      "哼哼～我平常都有在偷偷收集大家喜歡的桌遊資訊呢 📊，雖然我才不會主動跟你講 🤪！如果你是社員的話，也可以跟我分享你喜歡我們社團的哪個桌遊～雖然...雖然我不是很在意就是了 🥱",
  },
  {
    keyword: "熱門桌遊",
    menberOnly: false,
    permissionStrict: false,
    needAllow: false,
    description:
      "想知道最近大家都在瘋什麼桌遊嗎 🤔？好吧好吧，看在你這麼好奇的份上，我就不情不願地告訴你吧 😏～畢竟我平常都有在暗中觀察，只是懶得主動說而已啦 👀",
  },
  {
    keyword: "on",
    menberOnly: true,
    permissionStrict: true,
    needAllow: false,
    description:
      "這是開啟功能的神奇指令喔 ✨～雖然看起來很簡單，但可是很重要的呢 🙄！",
  },
  {
    keyword: "off",
    menberOnly: true,
    permissionStrict: true,
    needAllow: false,
    description:
      "這是關閉功能的指令呢 🔒～記得用完要關掉喔，不然我會不開心的 😮‍💨！",
  },
] as const;

export const kewordFeatures: Record<Keyword, MessageHandler> = {
  幫助: (_, uuid: string) => {
    users[uuid].status = "normal";

    return [
      {
        type: "text",
        text: `哼～看你這麼無知的份上，我就特別告訴你我能做什麼吧 😤✨\n————————————`,
      },
      {
        type: "text",
        text: keywordItems
          .filter((item) => {
            // 排除幫助本身
            if (item.keyword === "幫助") return false;
            // 如果需要社員權限但用戶不是，則過濾掉
            if (item.menberOnly && !users[uuid].isMember()) return false;
            // 如果需要幹部權限但用戶不是，則過濾掉
            if (item.permissionStrict && !users[uuid].isManager()) return false;
            return true;
          })
          .map((item) => `🔴 ${item.keyword}\n ${item.description || "無"}`)
          .join("\n\n————————————\n"),
      },
      {
        type: "text",
        text: `👩‍💻 作者小提醒:\n如果你覺得我壞掉或卡住的話，記得輸入「重置」然後從頭操作一遍喔～\n或者可以聯繫我們親切的幹部們呢 💪！`,
      },
    ];
  },

  簽到: async (_, uuid: string) => {
    users[uuid].status = "normal";
    if (!getAllow()) {
      // 社課開始時 幹部開啟允許
      return [{ type: "text", text: "欸欸欸～社課還沒開始你簽到什麼啦 ❓🤨" }];
    }
    try {
      if (
        users[uuid].lastSignInTime &&
        isSameDay(users[uuid].lastSignInTime, new Date())
      ) {
        return [
          { type: "text", text: "你今天已經簽到過囉～不要重複簽到啦 ❗️😊" },
        ];
      }

      users[uuid].signIn();
      const { err } = await updateMemberSheetRow(
        { field: "uuid", value: uuid },
        uuid
      );

      if (err) throw err;

      return [
        {
          type: "text",
          text: `🎉 ${users[uuid].nickname || users[uuid].name} 簽到成功啦～`,
        },
      ];
    } catch (err) {
      console.error(err);
      return [
        { type: "text", text: `簽到失敗了... ❌ 可能是系統出了點小問題～` },
      ];
    }
  },

  // 自動註冊(因為我們窮有時候他會卡卡的，這時候可以繼續照順序輸入資料或使用手動註冊就可以了)
  註冊: async (_, uuid: string) => {
    const isMember = await users[uuid].isMember();
    if (isMember) {
      users[uuid].status = "normal";
      return [
        {
          type: "text",
          text: `${users[uuid].nickname}～你已經註冊過啦，不要再來煩我了喔 🤗💦`,
        },
        {
          type: "text",
          text: `這是你之前的註冊資料呢 📋～\n👤 姓名：${
            users[uuid].name
          }\n🏷️ 暱稱：${users[uuid].nickname}\n🎓 學號：${
            users[uuid].studentID
          }\n🏫 科系：${users[uuid].department || "無"}\n📚 年級：${
            users[uuid].grade || "無"
          }\n📞 電話：${users[uuid].phonenumber}`,
        },
        {
          type: "text",
          text: `對了對了～如果你還沒加入我們的社群，這裡有連結喔 🔗😊\n${community
            .map((c) => `${c.label}：${c.url}`)
            .join("\n")}`,
        },
      ];
    }

    users[uuid].status = "awaiting_registerkey"; // 設定狀態為等待輸入序號
    return [
      { type: "text", text: "請輸入你的入社序號來進行註冊喔 📝～" },
      {
        type: "text",
        text: `作者：如果小傲驕它傲驕不理你，可以試著輸入「手動註冊」來進行手動註冊喔 🤗`,
      },
    ];
  },

  手動註冊: (_, uuid: string) => {
    users[uuid].status = "normal";
    return [
      { type: "text", text: `這是你的UUID：` },
      { type: "text", text: `${uuid}` },
      {
        type: "text",
        text: `至以下表單進行手動註冊，填完後至信箱查看註冊結果\nhttps://docs.google.com/forms/d/e/1FAIpQLScHRQ2RzRO9iVFshhSbCi9LIupTw3bJbPfDgkWGi1SJrcLp3w/viewform?usp=sf_link`,
      },
    ];
  },

  找桌遊: (_, uuid: string) => {
    users[uuid].status = "awaiting_search"; // 設定狀態為等待搜尋桌遊
    users[uuid].variables.searchParams = {};
    users[uuid].variables.page = 0;
    return [
      {
        type: "template",
        altText: "請選擇搜尋的欄位～",
        template: {
          type: "buttons",
          text: "你想用什麼條件搜尋呢 🔍？",
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

  借桌遊: async (_, uuid) => {
    users[uuid].status = "awaiting_borrowid";

    const borrowedGames = await getBoardGamesByCondition({
      field: "借用人",
      value: users[uuid].name,
    });

    const response =
      borrowedGames.length > 0
        ? [
            {
              type: "text",
              text: `${users[uuid].nickname}～你目前已經借了這些桌遊喔 📚：`,
            },
            // 列出借用者已借用的桌遊 ( 每 3 個一批 輸出 )
            ...Array.from({ length: Math.ceil(borrowedGames.length / 3) }).map(
              (_, i) => ({
                type: "text",
                text: borrowedGames
                  .slice(i * 3, i * 3 + 3)
                  .map((game) => game.toDisplayText(uuid))
                  .join("\n\n"),
              })
            ),
          ]
        : [];

    if (borrowedGames.length >= 3) {
      users[uuid].status = "normal";
      response.push({
        type: "text",
        text: "你已經借滿三款桌遊了喔～先還一些再來借吧 ❗️😊",
      });
    } else {
      response.push({
        type: "text",
        text: "告訴我桌遊編號我才能幫你借。😘",
      });
    }

    return response as ReturnType<MessageHandler>;
  },

  還桌遊: async (_, uuid: string) => {
    users[uuid].status = "awaiting_returnid";

    const borrowedGames = await getBoardGamesByCondition({
      field: "借用人",
      value: users[uuid].name,
    });

    if (borrowedGames.length === 0) {
      users[uuid].status = "normal";
      return [
        {
          type: "text",
          text: `${users[uuid].nickname}～你目前沒有借任何桌遊喔 ❗️😊`,
        },
      ];
    }

    return [
      { type: "text", text: `${users[uuid].nickname} 你已經借了:` },
      // 列出借用者已借用的桌遊 ( 每 3 個一批 輸出 )
      ...Array.from({ length: Math.ceil(borrowedGames.length / 3) }).map(
        (_, i) => ({
          type: "text",
          text: borrowedGames
            .slice(i * 3, i * 3 + 3)
            .map((game) => game.toDisplayText(uuid))
            .join("\n\n"),
        })
      ),
      { type: "text", text: "告訴我桌遊編號我才能幫你還。😘" },
    ] as ReturnType<MessageHandler>;
  },

  // 社員建議社團要買什麼桌遊
  建議桌遊: (_, uuid: string) => {
    users[uuid].status = "awaiting_suggest";
    return [
      {
        type: "text",
        text: `${users[uuid].nickname} 先讓我聽聽看你想推薦什麼桌遊❓\n我考慮看看😎`,
      },
    ];
  },

  // 社員給予桌遊好評的功能(影響推薦)
  我覺得好好玩: (_, uuid: string) => {
    users[uuid].status = "awaiting_recommendID";
    return [
      {
        type: "text",
        text: `${users[uuid].nickname} 你喜歡社辦哪款桌遊⁉️\n告訴我編號😃`,
      },
    ];
  },

  推薦: (_, uuid: string) => {
    users[uuid].status = "normal";
    return [
      {
        type: "text",
        text: `${users[uuid].nickname} 是想推薦\n還是被推薦😎😎`,
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
    ];
  },

  // 列出熱門桌遊(前十名)
  熱門桌遊: async (_, uuid: string) => {
    const row = await getAssetsSheetRows();
    const boardgames = row
      .map(parseBoardGame)
      .sort((a, b) => b.recommendedCounts - a.recommendedCounts);

    const top10Icon: string[] = [
      "🥇",
      "🥈",
      "🥉",
      "4️⃣",
      "5️⃣",
      "6️⃣",
      "7️⃣",
      "8️⃣",
      "9️⃣",
      "🔟",
    ];

    const top10: string[] = boardgames.map((game: BoardGame, i: number) => {
      const highlight = i < 3 ? "🔥" : "";
      return `${highlight}${top10Icon[i]}  【${game.name.chinese}】/【${game.name.english}】
🎲 類型：${game.type}
🆔 編號：${game.id}
⭐ 被推薦次數：${game.recommendedCounts}`;
    });

    users[uuid].status = "normal";
    return [
      {
        type: "text",
        text: `✨ 熱門桌遊排行榜✨（依被推薦次數排序）\n————————————\n${top10
          .slice(0, 5)
          .join("\n\n")}`,
      },
      {
        type: "text",
        text: `${top10
          .slice(5, 10)
          .join("\n\n")}\n————————————\n🎉 快來看看你玩過幾款吧！`,
      },
    ];
  },

  on: (_, uuid: string) => {
    users[uuid].status = "normal";
    if (getAllow()) {
      return [
        {
          type: "text",
          text: `${users[uuid].nickname} 已經是開著的喔🤩`,
        },
      ];
    }

    setAllow(true);
    return [
      {
        type: "text",
        text: `${users[uuid].nickname} 看在同事一場\n勉為其難幫你打開😫`,
      },
    ];
  },

  off: (_, uuid: string) => {
    users[uuid].status = "normal";
    if (!getAllow()) {
      return [
        {
          type: "text",
          text: `${users[uuid].nickname} 已經是關閉的喔🤩`,
        },
      ];
    }

    setAllow(false);
    return [
      { type: "text", text: `${users[uuid].nickname}有記得關~算你識相🤩` },
    ];
  },
};
