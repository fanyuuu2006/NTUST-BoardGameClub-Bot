import { community, getAllow, setAllow, users } from ".";
import { Keyword } from "../types/custom";
import { MessageHandler } from "../types/line";
import { BoardGame } from "../types/sheets";
import { isSameDay } from "../utils/custom";
import {
  boardgameToString,
  getAssetsSheetRows,
  getBoardGamesByCondition,
  parseBoardGame,
  updateMemberSheetRow,
} from "../utils/sheets";

export const keywordItems = [
  // {
  //   keyword: "手動註冊",
  //   menberOnly: false,
  //   permissionStrict: false,
  //   needAllow: false,
  // },
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
      "我不會幫社員以外的人處理借還桌遊的事，所以告訴我你的入社序號跟你的資料，我會勉為其難記住你的，應該啦😀",
  },

  {
    keyword: "簽到",
    menberOnly: true,
    permissionStrict: true,
    needAllow: true,
    description:
      "社課的時候給我乖乖簽到 ✍️。簽到次數越多，期末抽獎時中獎機率就越高 🎁。不過要是你懶得來，我也才不在乎呢 😏，少一次機會而已，關我屁事～",
  },
  {
    keyword: "找桌遊",
    menberOnly: false,
    permissionStrict: false,
    needAllow: false,
    description:
      "告訴我你想用哪種條件搜尋，不告訴我可是不會理你的😝，接著告訴我你想搜尋的關鍵字就行了👍",
  },
  {
    keyword: "借桌遊",
    menberOnly: true,
    permissionStrict: false,
    needAllow: true,
    description:
      "告訴我你想借的桌遊編號，不知道編號在哪我才懶得跟你說他在盒子上😤，等我跟我同事說好才能拿走🫵",
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
    description: "你可以建議我們社團要買什麼桌遊，我會大發善心幫你轉達😎",
  },
  {
    keyword: "我覺得好好玩",
    menberOnly: true,
    permissionStrict: false,
    needAllow: false,
    description:
      "玩得開心就好啦，反正我也不是很在意你喜歡什麼🙄\n不過既然你都說了，我就勉為其難記下來吧～",
  },
  {
    keyword: "推薦",
    menberOnly: false,
    permissionStrict: false,
    needAllow: false,
    description:
      "我在無聊時會收集最近大家喜歡的桌遊資訊，但我才不會主動跟你講勒🤪\n然後如果你是社員，你也可以跟我分享你喜歡我們社團的哪個桌遊，雖然我不是很在意就是🥱",
  },
  {
    keyword: "熱門桌遊",
    menberOnly: false,
    permissionStrict: false,
    needAllow: false,
    description:
      "想知道最近大家都在玩什麼嗎？我就不情不願地告訴你吧😏\n畢竟我平常都有在觀察，只是懶得主動說而已～",
  },
  {
    keyword: "on",
    menberOnly: true,
    permissionStrict: true,
    needAllow: false,
    description:
      "這是開啟功能的指令啦～🙄 不過有些功能還是要我同事同意才行，別以為你輸入 on 我就會乖乖聽話😏",
  },
  {
    keyword: "off",
    menberOnly: true,
    permissionStrict: true,
    needAllow: false,
    description:
      "這是關閉功能的指令。😮‍💨 但我說了算嗎？才怪～ 有些功能還得經過我同事點頭才會真的關掉，別太天真啊😏",
  },
] as const;

export const kewordFeatures: Record<Keyword, MessageHandler> = {
  幫助: (_, uuid: string) => {
    users[uuid].status = "normal";

    return [
      {
        type: "text",
        text: `哼～看你這麼無知的份上，我就告訴你我能做什麼吧😤`,
      },
      {
        type: "text",
        text: `${keywordItems
          .filter(
            (item) => {
              // 排除幫助本身
              if (item.keyword === "幫助") return false;
              
              // 如果需要會員權限但用戶不是會員，則過濾掉
              if (item.menberOnly && !users[uuid].isMember()) return false;
              
              // 如果 permissionStrict == true，則需要 users[uuid].isManager() == true
              if (item.permissionStrict && !users[uuid].isManager()) return false;
              
              return true;
            }
          )
          .map((item) => `🟢${item.keyword}\n${item.description}`)
          .join("\n\n")}`,
      },
      {
        "type": "text",
        "text": `作者:\n如果你覺得它壞掉或卡住的話輸入「重置」並從頭操作一遍。\n或是聯繫我們的幹部們~`,
      }
    ];
  },

  簽到: async (_, uuid: string) => {
    users[uuid].status = "normal";
    if (!getAllow()) {
      // 社課開始時 幹部開啟允許
      return [{ type: "text", text: "社課還沒開始你簽到啥阿❓" }];
    }
    try {
      if (
        users[uuid].lastSignInTime &&
        isSameDay(users[uuid].lastSignInTime, new Date())
      ) {
        return [{ type: "text", text: "你今天已經簽到過囉❗️" }];
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
          text: `${users[uuid].nickname || users[uuid].name}簽到成功🎉`,
        },
      ];
    } catch (err) {
      console.error(err);
      return [{ type: "text", text: `簽到失敗❌` }];
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
          text: `${users[uuid].nickname}你已經註冊過了，不要再來了喔🤗~`,
        },
        {
          type: "text",
          text: `這是你之前的註冊資料\n姓名：${users[uuid].name}\n暱稱：${users[uuid].nickname}\n學號：${users[uuid].studentID}\n科系：${users[uuid].department}\n年級：${users[uuid].grade}\n電話📞：${users[uuid].phonenumber}`,
        },
        {
          type: "text",
          text: `喔還有如果你還沒加入社群這裡有連結喔😊\n${community
            .map((c) => `${c.label}：${c.url}`)
            .join("\n")}`,
        },
      ];
    }

    users[uuid].status = "awaiting_registerkey"; // 設定狀態為等待輸入序號
    return [
      // {
      //   type: "text",
      //   text: `作者：如果小傲驕它傲驕不理你，請使用以下方法註冊🔽`,
      // },
      // { type: "text", text: `這是你的UUID：` },
      // { type: "text", text: `${uuid}` },
      // {
      //   type: "text",
      //   text: `至以下表單進行手動註冊，填完後至信箱查看註冊結果\nhttps://docs.google.com/forms/d/e/1FAIpQLScHRQ2RzRO9iVFshhSbCi9LIupTw3bJbPfDgkWGi1SJrcLp3w/viewform?usp=sf_link`,
      // },
      { type: "text", text: "請輸入序號進行註冊：" },
    ];
  },

  // 手動註冊: (_, uuid: string) => {
  //   users[uuid].status = "normal";
  //   return [
  //     { type: "text", text: `這是你的UUID：` },
  //     { type: "text", text: `${uuid}` },
  //     {
  //       type: "text",
  //       text: `至以下表單進行手動註冊，填完後至信箱查看註冊結果\nhttps://docs.google.com/forms/d/e/1FAIpQLScHRQ2RzRO9iVFshhSbCi9LIupTw3bJbPfDgkWGi1SJrcLp3w/viewform?usp=sf_link`,
  //     },
  //   ];
  // },

  找桌遊: (_, uuid: string) => {
    users[uuid].status = "awaiting_search"; // 設定狀態為等待搜尋桌遊
    users[uuid].variables.searchParams = {};
    users[uuid].variables.page = 0;
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

  借桌遊: async (_, uuid) => {
    users[uuid].status = "awaiting_borrowid";

    const borrowedGames = await getBoardGamesByCondition({
      field: "借用人",
      value: users[uuid].name,
    });

    return [
      ...(borrowedGames.length > 0
        ? [
            {
              type: "text",
              text: `${users[uuid].nickname} 你已經借了:`,
            },
            // 列出借用者已借用的桌遊 ( 每 3 個一批 輸出 )
            ...Array.from({ length: Math.ceil(borrowedGames.length / 3) }).map(
              (_, i) => ({
                type: "text",
                text: borrowedGames
                  .slice(i * 3, i * 3 + 3)
                  .map((game) => boardgameToString(game, uuid))
                  .join("\n\n"),
              })
            ),
          ]
        : []),
      { type: "text", text: "告訴我桌遊編號我才能幫你借。😘" },
    ] as ReturnType<MessageHandler>;
  },

  還桌遊: async (_, uuid: string) => {
    users[uuid].status = "awaiting_returnid";

    const borrowedGames = await getBoardGamesByCondition({
      field: "借用人",
      value: users[uuid].name,
    });

    return [
      { type: "text", text: `${users[uuid].nickname} 你已經借了:` },
      // 列出借用者已借用的桌遊 ( 每 3 個一批 輸出 )
      ...Array.from({ length: Math.ceil(borrowedGames.length / 3) }).map(
        (_, i) => ({
          type: "text",
          text: borrowedGames
            .slice(i * 3, i * 3 + 3)
            .map((game) => boardgameToString(game, uuid))
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
    const top10: string[] = boardgames.map(
      (game: BoardGame, i: number) =>
        `${i < 3 ? "🔥" : ""}${top10Icon[i]}\n 編號: ${game.id}\n 英文名稱: ${
          game.name.english
        }\n 中文名稱: ${game.name.chinese}\n 種類: ${game.type}\n`
    );
    users[uuid].status = "normal";
    return [
      {
        type: "text",
        text: `✨熱門桌遊✨\n\n${top10.slice(0, 5).join("\n\n")}`,
      },
      { type: "text", text: `${top10.slice(5, 10).join("\n\n")}` },
    ];
  },

  on: (_, uuid: string) => {
    if (getAllow()) {
      return [
        {
          type: "text",
          text: `${users[uuid].nickname} 已經是開著的喔🤩`,
        },
      ];
    }

    setAllow(true);
    users[uuid].status = "normal";
    return [
      {
        type: "text",
        text: `${users[uuid].nickname} 看在同事一場\n勉為其難幫你打開😫`,
      },
    ];
  },

  off: (_, uuid: string) => {
    if (!getAllow()) {
      return [
        {
          type: "text",
          text: `${users[uuid].nickname} 已經是關閉的喔🤩`,
        },
      ];
    }

    setAllow(false);
    users[uuid].status = "normal";
    return [
      { type: "text", text: `${users[uuid].nickname}有記得關~算你識相🤩` },
    ];
  },
};
