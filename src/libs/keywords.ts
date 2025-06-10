import { getAllow, setAllow, users } from ".";
import { sheets } from "../configs/googleapis";
import { Keyword, KeywordItem } from "../types";
import { MessageHandler } from "../types/line";
import { sendGetRequest } from "../utils";
import { searchFieldInSheet } from "../utils/sheets";
import { initUser } from "../utils/user";

export const keywords = [
  "手動註冊",
  "註冊",
  "簽到",
  "測試",
  "找遊戲",
  "借遊戲",
  "還遊戲",
  "建議遊戲",
  "我覺得好好玩",
  "推薦",
  "熱門桌遊",
  "on",
  "off",
] as const;

export const keywordItems: KeywordItem[] = [
  {
    keyword: "手動註冊",
    menberOnly: false,
    permissionStrict: false,
    needAllow: false,
  },
  {
    keyword: "註冊",
    menberOnly: false,
    permissionStrict: false,
    needAllow: false,
  },

  {
    keyword: "簽到",
    menberOnly: true,
    permissionStrict: false,
    needAllow: true,
  },
  {
    keyword: "測試",
    menberOnly: false,
    permissionStrict: false,
    needAllow: false,
  },
  {
    keyword: "找遊戲",
    menberOnly: false,
    permissionStrict: false,
    needAllow: false,
  },
  {
    keyword: "借遊戲",
    menberOnly: true,
    permissionStrict: false,
    needAllow: true,
  },
  {
    keyword: "還遊戲",
    menberOnly: true,
    permissionStrict: false,
    needAllow: true,
  },
  {
    keyword: "建議遊戲",
    menberOnly: true,
    permissionStrict: false,
    needAllow: false,
  },
  {
    keyword: "我覺得好好玩",
    menberOnly: true,
    permissionStrict: false,
    needAllow: false,
  },
  {
    keyword: "推薦",
    menberOnly: false,
    permissionStrict: false,
    needAllow: false,
  },
  {
    keyword: "熱門桌遊",
    menberOnly: false,
    permissionStrict: false,
    needAllow: false,
  },
  {
    keyword: "on",
    menberOnly: true,
    permissionStrict: true,
    needAllow: false,
  },
  {
    keyword: "off",
    menberOnly: true,
    permissionStrict: true,
    needAllow: false,
  },
];

export const kewordFeatures: Record<Keyword, MessageHandler> = {
  簽到: (_, uuid: string) => {
    users[uuid].status = "normal";
    if (!getAllow()) {
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

  // 自動註冊(因為我們窮有時候他會卡卡的，這時候可以繼續照順序輸入資料或使用手動註冊就可以了)
  註冊: (_, uuid: string) => {
    if (uuid in users) {
      users[uuid].status = "normal";
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

    initUser(uuid);
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

  測試: (_, uuid: string) => {
    users[uuid].status = "normal";
    return [
      {
        type: "text",
        text: `${users[uuid].data.nickname}測啥呢`,
      },
    ];
  },

  找遊戲: (_, uuid: string) => {
    users[uuid].status = "awaiting_search"; // 設定狀態為等待搜尋桌遊
    users[uuid].Variables.searchParams = null;
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

  借遊戲: async (_, uuid) => {
    users[uuid].status = "awaiting_borrowid";

    const borrowedGames = await searchFieldInSheet(
      [{ field: "借用人", value: users[uuid].data.name || "" }],
      uuid
    );

    return [
      { type: "text", text: `${users[uuid].data.nickname} 你已經借了:` },
      // 列出借用者已借用的桌遊 ( 每 3 個一批 輸出 )
      ...Array.from({ length: Math.ceil(borrowedGames.length / 3) }).map(
        (_, i) => ({
          type: "text",
          text: borrowedGames.slice(i * 3, i * 3 + 3).join("\n\n"),
        })
      ),
      { type: "text", text: "告訴我桌遊編號我才能幫你借。😘" },
    ] as ReturnType<MessageHandler>;
  },

  還遊戲: async (uuid: string) => {
    users[uuid].status = "awaiting_returnid";

    const borrowedGames = await searchFieldInSheet(
      [{ field: "借用人", value: users[uuid].data.name || "" }],
      uuid
    );
    return [
      { type: "text", text: `${users[uuid].data.nickname} 你已經借了:` },
      // 列出借用者已借用的桌遊 ( 每 3 個一批 輸出 )
      ...Array.from({ length: Math.ceil(borrowedGames.length / 3) }).map(
        (_, i) => ({
          type: "text",
          text: borrowedGames.slice(i * 3, i * 3 + 3).join("\n\n"),
        })
      ),
      { type: "text", text: "告訴我桌遊編號我才能幫你還。😘" },
    ] as ReturnType<MessageHandler>;
  },

  // 社員建議社團要買什麼桌遊
  建議遊戲: (_, uuid: string) => {
    users[uuid].status = "awaiting_suggest";
    return [
      {
        type: "text",
        text: `${users[uuid].data.nickname} 先讓我聽聽看你想推薦什麼遊戲❓\n我考慮看看😎`,
      },
    ];
  },

  // 社員給予桌遊好評的功能(影響推薦)
  我覺得好好玩: (_, uuid: string) => {
    users[uuid].status = "awaiting_recommendID";
    return [
      {
        type: "text",
        text: `${users[uuid].data.nickname} 你喜歡社辦哪款桌遊⁉️\n告訴我編號😃`,
      },
    ];
  },

  推薦: (_, uuid: string) => [
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
  熱門桌遊: async (_, uuid: string) => {
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
    users[uuid].status = "normal";
    return [
      {
        type: "text",
        text: `✨熱門桌遊✨\n\n${top10.slice(0, 5).join("\n\n")}`,
      },
      { type: "text", text: `${top10.slice(5, 10).join("\n\n")}` },
    ];
  },

  on: (uuid: string) => {
    setAllow(true);
    users[uuid].status = "normal";
    return [
      {
        type: "text",
        text: `${users[uuid].data.nickname} 看在同事一場\n勉為其難幫你打開😫`,
      },
    ];
  },

  off: (uuid: string) => {
    setAllow(false);
    users[uuid].status = "normal";
    return [
      { type: "text", text: `${users[uuid].data.nickname}有記得關~算你識相🤩` },
    ];
  },
};
