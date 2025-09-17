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
    keyword: "手動註冊",
    menberOnly: false,
    permissionStrict: false,
    needAllow: false,
    description:
      "如果我...我一時大意沒理你的話，可以使用「手動註冊」功能啦 😤（才不是我故意的呢！）",
  },
  {
    keyword: "註冊",
    menberOnly: false,
    permissionStrict: false,
    needAllow: false,
    description:
      "哼～我才不會幫陌生人處理借還桌遊的事勒😤！快告訴我你的入社序號，我就...就勉為其難記住你好了💭（雖然記住也不代表什麼啦～）",
  },
  {
    keyword: "簽到",
    menberOnly: true,
    permissionStrict: false,
    needAllow: false, // 其實是 true 但為了不同的回覆所以設成 false
    description:
      "社課時記得要乖乖簽到喔 ✍️！簽到次數越多，期末抽獎中獎機率就越高呢 🎁～雖然...雖然我才不在乎你來不來 😏，但是少一次機會可別怪我沒提醒你！",
  },
  {
    keyword: "找桌遊",
    menberOnly: false,
    permissionStrict: false,
    needAllow: false,
    description:
      "想找桌遊嗎？那就告訴我搜尋條件啦 🔍～不說清楚的話我可是會裝作沒聽到的喔😝！（雖然我會很貼心地提供選項給你選啦...才不是為了你呢！）",
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
      "要還桌遊嗎？告訴我編號就好啦 😮‍💨～然後記得放回指定位置喔！我確認完畢你就自由了，很簡單吧 ✨",
  },
  {
    keyword: "建議桌遊",
    menberOnly: true,
    permissionStrict: false,
    needAllow: false,
    description:
      "想推薦社團買新桌遊嗎？嗯...看在你這麼認真的份上，我就勉為其難幫你轉達給幹部們吧 😎～不過會不會採用就不是我說了算囉",
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
      "哼哼～我平常都有在暗中收集大家的喜好資訊呢 📊，雖然我才不會主動告訴你🤪！如果你是社員的話，也可以跟我分享你喜歡我們社團的哪個桌遊～雖然...雖然我不是很在意就是了 🥱",
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
    description: "這是開啟功能的指令喔 ✨～用於允許借還桌遊和社課簽到！",
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
        text: `👩‍💻 作者小提醒:\n如果你覺得小奧教壞掉或卡住的話，記得輸入「重置」然後從頭操作一遍喔～\n或者可以聯繫我們親切的幹部們呢 💪！`,
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
        {
          type: "text",
          text: `唉呀...簽到失敗了 ❌ 系統好像在鬧脾氣呢～\n等一下再試試看吧（才不是我的問題喔！我也很困擾的...）`,
        },
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
        text: `💡 小提醒：如果我反應有點遲鈍，可以試試「手動註冊」功能喔 🤗`,
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
        text: "快告訴我桌遊編號吧～不然我怎麼知道你要借什麼呢 😘（編號在盒子上啦）",
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
          text: `${users[uuid].nickname}～你目前沒有借任何桌遊耶 🤔 是想來確認一下嗎？真乖真乖 😊`,
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
      { type: "text", text: "告訴我要還哪個編號的桌遊吧～我來幫你處理 😘" },
    ] as ReturnType<MessageHandler>;
  },

  // 社員建議社團要買什麼桌遊
  建議桌遊: (_, uuid: string) => {
    users[uuid].status = "awaiting_suggest";
    return [
      {
        type: "text",
        text: `${users[uuid].nickname}～說說看你想推薦什麼桌遊吧 💭\n我會認真考慮的...大概啦 😎`,
      },
    ];
  },

  // 社員給予桌遊好評的功能(影響推薦)
  我覺得好好玩: (_, uuid: string) => {
    users[uuid].status = "awaiting_recommendID";
    return [
      {
        type: "text",
        text: `${users[uuid].nickname}～哦？你玩到什麼好玩的桌遊了嗎 🤔？\n快告訴我編號吧，我來幫你記錄一下～（才不是我好奇呢！）😃`,
      },
    ];
  },

  推薦: (_, uuid: string) => {
    users[uuid].status = "normal";
    return [
      {
        type: "text",
        text: `${users[uuid].nickname}～想看看大家都推薦什麼，還是要分享你的心得呢 😎？\n我可是很認真在收集這些資料的喔`,
      },
      {
        type: "template",
        altText: "推薦功能選單",
        template: {
          type: "buttons",
          text: "選擇你要的功能吧～",
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
        text: `✨ 熱門桌遊排行榜 ✨\n（根據大家的推薦次數排序喔～）\n————————————\n${top10
          .slice(0, 5)
          .join("\n\n")}`,
      },
      {
        type: "text",
        text: `${top10
          .slice(5, 10)
          .join(
            "\n\n"
          )}\n————————————\n🎉 怎麼樣？有你玩過的嗎？\n雖然我才不在意你的品味...但如果有喜歡的記得告訴我喔 😏`,
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
