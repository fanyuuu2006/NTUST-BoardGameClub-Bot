require("dotenv").config();
const fs = require("fs");
const line = require("@line/bot-sdk");
const { google } = require("googleapis");
const express = require("express");
const e = require("express");
const https = require("https");
const path = require("path");

const app = express();

const schoolYear = "113"; //學年度

// Line Bot 客戶端配置
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

// Google Sheets API 認證
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

let searchField = null; // 儲存用戶選擇的欄位
let userState = {}; // 儲存用戶狀態，包括分頁資訊
let userData = {}; // 儲存用戶資料

let borrowflag = false;

let learnedmsg = {};

// 處理 Line Bot 的訊息事件路徑
app.post("/webhook", line.middleware(config), async (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

//測試路徑
app.get("/test", (req, res) => {
  res.send("The server is up aand running!");
});

async function handleEvent(event) {
  if (
    event.type !== "message" ||
    event.message.type !== "text" ||
    !event.message.text
  ) {
    return Promise.resolve(null);
  }

  //-----------------------------------
  // 讀取小傲嬌的對話庫
  const filePath = path.join(process.cwd(), "learnedmsg.json");
  fs.readFile(filePath, "utf8", (err, data) => {
    learnedmsg = JSON.parse(data);
  });
  //-----------------------------------

  const messageText = event.message.text;
  const userId = event.source.userId;

  if (messageText == "test") {
    return client.replyMessage(event.replyToken, { type: "text", text: flag });
  }

  userData[userId] = await getuserData(userId); // 取得用戶資料

  //判斷是不是社員
  if (
    messageText.includes("借遊戲") ||
    messageText.includes("還遊戲") ||
    messageText.includes("建議遊戲") ||
    messageText.includes("我覺得好好玩") ||
    messageText.includes("簽到")
  ) {
    if (!userData[userId]) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "❌請先註冊，只有社員才能使用此功能",
      });
    }
  }

  //確保社員借還桌遊時有幹部許可(on/off)
  if (
    (messageText.includes("借遊戲") || messageText.includes("還遊戲")) &&
    userData[userId].permission == "社員" &&
    borrowflag == false
  ) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "❌我同事沒有許可可是不行的喔~",
    });
  }

  // 根據訊息內容進行操作
  if (messageText === "重置") {
    // 重置機器人狀態(出問題時可先用)
    userState[userId] = null;
    userData[userId] = null;
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "🔄重置成功",
    });
  } else if (messageText.includes("找遊戲")) {
    // 搜尋桌遊
    userState[userId] = null;
    userState[userId] = {
      // 設定狀態為等待搜尋
      state: "awaiting_search",
      searchField: null,
      page: 0,
    };
    return sendSearchMenu(event.replyToken);
  } else if (messageText.includes("借遊戲")) {
    // 借桌遊
    userState[userId] = null;
    const borrowerName = userData[userId].name;

    userState[userId] = {
      // 設定狀態為等待輸入桌遊編號
      state: "awaiting_borrowid",
      borrowerName: borrowerName,
    };

    // 列出借用者借用的桌遊
    const searchParams = [{ field: "借用人", value: borrowerName }];
    userState[userId].searchParams = searchParams;
    const borrowedGames = await customSearchInSheet(searchParams, userId);
    let text = [
      {
        type: "text",
        text: `${userData[userId].nickname}你借了:\n${borrowedGames
          .slice(0, 3)
          .join("\n\n")}`,
      },
    ];
    for (let i = 3; i < borrowedGames.length; i += 3) {
      text.push({
        type: "text",
        text: `${borrowedGames.slice(i, i + 3).join("\n\n")}`,
      });
    }

    text.push({ type: "text", text: "告訴我桌遊編號我才能幫你借。😘" });
    return client.replyMessage(event.replyToken, text);
  } else if (messageText.includes("還遊戲")) {
    // 還桌遊
    userState[userId] = null;
    const borrowerName = userData[userId].name;

    userState[userId] = {
      // 設定狀態為等待輸入桌遊編號
      state: "awaiting_returnid",
      borrowerName: borrowerName,
    };

    // 列出借用者借用的桌遊
    const searchParams = [{ field: "借用人", value: borrowerName }];
    userState[userId].searchParams = searchParams;
    const borrowedGames = await customSearchInSheet(searchParams, userId);
    let text = [
      {
        type: "text",
        text: `${userData[userId].nickname}你借了:\n${borrowedGames
          .slice(0, 3)
          .join("\n\n")}`,
      },
    ];
    for (let i = 3; i < borrowedGames.length; i += 3) {
      text.push({
        type: "text",
        text: `${borrowedGames.slice(i, i + 3).join("\n\n")}`,
      });
    }

    text.push({ type: "text", text: "告訴我桌遊編號我才能幫你還。😘" });
    return client.replyMessage(event.replyToken, text);
  } else if (messageText === "手動註冊") {
    // 如果自動註冊無法使用時使用：跑出google表單讓社員自己填表單註冊(記得叫社員先複製自己的uuid)
    return client.replyMessage(event.replyToken, [
      { type: "text", text: `這是你的UUID：` },
      { type: "text", text: `${userId}` },
      {
        type: "text",
        text: `至以下表單進行手動註冊，填完後至信箱查看註冊結果\nhttps://docs.google.com/forms/d/e/1FAIpQLScHRQ2RzRO9iVFshhSbCi9LIupTw3bJbPfDgkWGi1SJrcLp3w/viewform?usp=sf_link`,
      },
    ]);
  } else if (messageText.includes("註冊")) {
    // 自動註冊(因為我們窮有時候他會卡卡的，這時候可以繼續照順序輸入資料或使用手動註冊就可以了)
    userState[userId] = null;
    if (userData[userId]) {
      return client.replyMessage(event.replyToken, [
        {
          type: "text",
          text: `${userData[userId].nickname}你已經註冊過了，不要再來了喔🤗~`,
        },
        {
          type: "text",
          text: `這是你之前的註冊資料\n姓名：${userData[userId].name}\n暱稱：${userData[userId].nickname}\n學號：${userData[userId].studentID}\n科系：${userData[userId].department}\n年級：${userData[userId].grade}\n電話📞：${userData[userId].phonenumber}`,
        },
        {
          type: "text",
          text: `喔還有如果你還沒加入社群這裡有連結喔😊\nLine：https://line.me/R/ti/g/TfjiECrWwG\nDiscord：https://discord.gg/XQDVMe5HBR`,
        },
      ]);
    } else {
      userState[userId] = {
        // 設定狀態為等待輸入序號
        state: "awaiting_registerkey",
        registerkey: null,
        name: null,
        nickname: null,
        studentID: null,
        department: null,
        grade: null,
        phonenumber: null,
        permission: "社員",
      };

      return client.replyMessage(event.replyToken, [
        {
          type: "text",
          text: `作者：如果小傲驕它傲驕不理你，請使用以下方法註冊🔽`,
        },
        { type: "text", text: `這是你的UUID：` },
        { type: "text", text: `${userId}` },
        {
          type: "text",
          text: `至以下表單進行手動註冊，填完後至信箱查看註冊結果\nhttps://docs.google.com/forms/d/e/1FAIpQLScHRQ2RzRO9iVFshhSbCi9LIupTw3bJbPfDgkWGi1SJrcLp3w/viewform?usp=sf_link`,
        },
        { type: "text", text: "請輸入序號進行註冊：" },
      ]);
    }
  } else if (messageText.includes("推薦") || messageText.includes("熱門桌遊")) {
    // 因為有子選單所以判斷兩個詞
    userState[userId] = null;
    if (userData[userId] && !messageText.includes("熱門桌遊")) {
      // 輸入推薦時會先跳出子選單
      const menu = {
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
      };
      return client.replyMessage(event.replyToken, menu); //跳完子選單就退出
    }

    // 如果輸入的是熱門桌遊，則列出熱門桌遊(前十名)

    // 取得 Google Sheet所記錄前十名的資料
    const request = {
      spreadsheetId: process.env.GOOGLE_SHEET_ID_PUB,
      range: "桌遊清單!A:E",
    };
    try {
      //取得資料並照名次排序
      const response = await sheets.spreadsheets.values.get(request);
      const rows = response.data.values.slice(1);
      rows.sort((a, b) => b[4] - a[4]);

      //渲染輸出訊息
      top10 = [];
      top10Icon = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
      for (let i = 0; i < 10; i++) {
        top10.push(
          `${i < 3 ? "🔥" : ""}${top10Icon[i]}\n 編號: ${
            rows[i][0]
          }\n 英文名稱: ${rows[i][1]}\n 中文名稱: ${rows[i][2]}\n 種類: ${
            rows[i][3]
          }\n`
        );
      }

      return client.replyMessage(event.replyToken, [
        {
          type: "text",
          text: `✨熱門桌遊✨\n\n${top10.slice(0, 5).join("\n\n")}`,
        },
        { type: "text", text: `${top10.slice(5, 10).join("\n\n")}` },
      ]);
    } catch (err) {
      console.error(err);
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: `我壞掉了🥺`,
      });
    }
  } else if (messageText.includes("我覺得好好玩")) {
    // 社員給予桌遊好評的功能(影響推薦)
    userState[userId] = {
      // 設定狀態為等待輸入推薦桌遊ID
      state: "awaiting_recommendID",
      ID: null,
    };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `${userData[userId].nickname}你喜歡社辦哪款桌遊⁉️告訴我編號😃`,
    });
  } else if (messageText.includes("建議遊戲")) {
    // 社員建議社團要買什麼桌遊
    userState[userId] = null;
    // return client.replyMessage(event.replyToken, { type: 'text', text: '不要吵我❗我現在不想聽😤' });
    userState[userId] = {
      // 設定狀態為等待輸入建議的桌遊
      state: "awaiting_suggest",
      suggest: null,
    };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `${userData[userId].nickname}先讓我聽聽看你想推薦什麼遊戲❓\n我考慮看看😎`,
    });
  } else if (messageText.includes("簽到")) {
    // 社課簽到(僅在社課時使用on/off，一般時間請保持off)
    if (!borrowflag) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "社課還沒開始你簽到啥阿❓",
      });
    }
    if (!userData[userId]) {
      userData[userId] = await getuserData(userId);
    }
    try {
      //自動寄送簽到表單
      sendGetRequest(
        `https://docs.google.com/forms/d/e/1FAIpQLScJlktEcwTuOWDFe_XPCtUIm0Ju1x0VH4KO3WU0vvPGRkdaRw/formResponse?usp=pp_url&entry.1777123803=${userData[userId].name}&entry.980466456=${userData[userId].department}&entry.1684060118=${userData[userId].studentID}`
      );

      return client.replyMessage(event.replyToken, {
        type: "text",
        text: `${userData[userId].nickname}簽到成功🎉`,
      });
    } catch (err) {
      console.error(err);
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: `簽到失敗❌`,
      });
    }
  }

  if (
    userData[userId] &&
    (userData[userId].permission === "幹部" ||
      userData[userId].permission === "先人")
  ) {
    //管理員功能/off(on)
    //超暴力大小寫判斷(我知道我沒有列出所有可能，因為我懶)
    if (
      messageText == "on" ||
      messageText == "On" ||
      messageText == "ON" ||
      messageText == "oN"
    ) {
      borrowflag = true;
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: `${userData[userId].nickname}看在同事一場\n勉為其難幫你打開😫`,
      });
    } else if (
      messageText == "off" ||
      messageText == "Off" ||
      messageText == "OFF" ||
      messageText == "oFF"
    ) {
      borrowflag = false;
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: `${userData[userId].nickname}有記得關~算你識相🤩`,
      });
    }
  }

  //根據不同的使用者狀態進行操作
  if (userState[userId] && userState[userId].state !== null) {
    switch (userState[userId].state) {
      case "hold": // 鎖定狀態，避免重複操作
        return client.replyMessage(event.replyToken, {
          type: "text",
          text: "✋慢慢來比較快~~",
        });
      case "awaiting_search": // 在等待搜尋類別或關鍵字的情況下，使用者輸入類別或關鍵字
        userState[userId].state = "hold"; // 鎖定狀態，避免重複操作

        //如果用戶還沒設定搜尋欄位，將用戶輸入的欄位設定為搜尋欄位
        if (userState[userId].searchField == null) {
          const validFields = ["編號", "英文名稱", "中文名稱", "種類", "位置"]; // 定義有效的欄位
          if (validFields.includes(messageText)) {
            searchField = messageText;
            userState[userId].searchField = searchField;
            client.replyMessage(event.replyToken, {
              type: "text",
              text: `請輸入要搜尋🔍的 ${searchField} 關鍵字：`,
            });
            userState[userId].state = "awaiting_search";
            return;
          }
        } //如果已經有搜尋欄位的情況下且有非指令關鍵字，直接進行搜尋
        else {
          if (messageText === "上一頁" || messageText === "下一頁") {
            //判斷是否點選翻頁
            const pageChange = messageText === "下一頁" ? 1 : -1;
            const newPage = Math.max(0, userState[userId].page + pageChange);
            userState[userId].page = newPage;
          } else {
            const searchParams = [
              { field: userState[userId].searchField, value: messageText },
            ];
            userState[userId].searchParams = searchParams;
          }

          //進行搜尋，並顯示搜尋結果
          const results = await customSearchInSheet(
            userState[userId].searchParams,
            userId
          );
          searchField = null;
          if (results.length > 0) {
            const pageSize = 3; // 每頁顯示的結果數量
            const totalPages = Math.ceil(results.length / pageSize);
            const currentPage = userState[userId].page || 0;
            const start = currentPage * pageSize;
            const end = Math.min(start + pageSize, results.length);

            let messageText;
            if (currentPage < 0 || currentPage >= totalPages) {
              messageText = "沒資料不要再翻了啦😣";
            } else {
              const pageResults = results.slice(start, end).join("\n\n");
              messageText = `第 ${
                currentPage + 1
              } 頁 / 共 ${totalPages} 頁\n\n${pageResults}`;
            }

            // 定義 Flex Message
            const message = {
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
                      text: messageText,
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
            };

            await client.replyMessage(event.replyToken, message);
          } else {
            await client.replyMessage(event.replyToken, {
              type: "text",
              text: "❌未找到相符的資料",
            });
          }
          userState[userId].state = "awaiting_search";
          return;
        }
      case "awaiting_borrowid": // 在等待輸入借用桌遊編號的情況下使用者輸入編號
        userState[userId].state = "hold"; // 鎖定狀態，避免重複操作
        await borrowGame(messageText, userId, event.replyToken);
        userState[userId].state = "awaiting_borrowid";
        return;
      case "awaiting_returnid": // 在等待輸入歸還桌遊編號的情況下使用者輸入編號
        userState[userId].state = "hold"; // 鎖定狀態，避免重複操作
        await returnGame(userId, messageText, event.replyToken);
        return;
      case "awaiting_position": // 在等待輸入歸還桌遊位置的情況下使用者輸入位置
        userState[userId].state = "hold"; // 鎖定狀態，避免重複操作
        if (
          !messageText.includes("A") &&
          !messageText.includes("B") &&
          !messageText.includes("C") &&
          !messageText.includes("D")
        ) {
          //位置防呆輸入
          client.replyMessage(event.replyToken, {
            type: "text",
            text: "我再給你一次機會，不要欺騙我的感情🥲🥲🥲。",
          });
          userState[userId].state = "awaiting_position";
          return;
        }
        if (userState[userId]) {
          userState[userId].gamedata[6] = messageText;
        } else {
          userState[userId] = null;
          return client.replyMessage(event.replyToken, {
            type: "text",
            text: "我壞掉了😵請重還一次。",
          });
        }
        await returnGame(userId, userState[userId].gameId, event.replyToken);
        userState[userId].state = "awaiting_returnid";
        return;
      // vvv以下為註冊流程中依序等待各項資料輸入的狀態vvv
      case "awaiting_registerkey":
        userState[userId].state = "hold";
        const result = await checkSerialNumber(messageText);
        if (!result) {
          client.replyMessage(event.replyToken, {
            type: "text",
            text: "❌查無此序號",
          });
          userState[userId].state = "awaiting_registerkey";
          return;
        } else if (result[0]) {
          client.replyMessage(event.replyToken, {
            type: "text",
            text: "⚠️此序號已註冊",
          });
          userState[userId].state = "awaiting_registerkey";
          return;
        } else {
          userState[userId].registerkey = messageText;
          client.replyMessage(event.replyToken, {
            type: "text",
            text: "✅序號合法\n請輸入姓名：",
          });
          userState[userId].state = "awaiting_name";
          return;
        }
      case "awaiting_name":
        userState[userId].state = "hold";
        userState[userId].name = messageText;
        client.replyMessage(event.replyToken, {
          type: "text",
          text: "請輸入暱稱：",
        });
        userState[userId].state = "awaiting_nickname";
        return;
      case "awaiting_nickname":
        userState[userId].state = "hold";
        userState[userId].nickname = messageText;
        client.replyMessage(event.replyToken, {
          type: "text",
          text: "請輸入學號：",
        });
        userState[userId].state = "awaiting_student_id";
        return;
      case "awaiting_student_id":
        userState[userId].state = "hold";
        userState[userId].studentID = messageText;
        const departmentMenu = [
          {
            type: "template",
            altText: "選擇科系",
            template: {
              type: "buttons",
              text: "請選擇科系",
              actions: [
                { label: "資訊工程系", type: "message", text: "資訊工程系" },
                { label: "電機工程系", type: "message", text: "電機工程系" },
                { label: "資訊管理系", type: "message", text: "資訊管理系" },
                // 可加入更多欄位選項
              ],
            },
          },
          {
            type: "template",
            altText: "選擇科系",
            template: {
              type: "buttons",
              text: "請選擇科系",
              actions: [
                { label: "機械工程系", type: "message", text: "機械工程系" },
                {
                  label: "材料科學與工程系",
                  type: "message",
                  text: "材料科學與工程系",
                },
                { label: "化學工程系", type: "message", text: "化學工程系" },
                // 可加入更多欄位選項
              ],
            },
          },
          {
            type: "template",
            altText: "選擇科系",
            template: {
              type: "buttons",
              text: "請選擇科系",
              actions: [
                { label: "工程學士班", type: "message", text: "工程學士班" },
                { label: "電子工程系", type: "message", text: "電子工程系" },
                { label: "工業管理系", type: "message", text: "工業管理系" },
                // 可加入更多欄位選項
              ],
            },
          },
          {
            type: "template",
            altText: "選擇科系",
            template: {
              type: "buttons",
              text: "請選擇科系",
              actions: [
                { label: "企業管理系", type: "message", text: "企業管理系" },
                { label: "管理學士班", type: "message", text: "管理學士班" },
                { label: "設計系", type: "message", text: "設計系" },
                // 可加入更多欄位選項
              ],
            },
          },
          {
            type: "template",
            altText: "選擇科系",
            template: {
              type: "buttons",
              text: "請選擇科系",
              actions: [
                { label: "應用外語系", type: "message", text: "應用外語系" },
                {
                  label: "不分系學士班",
                  type: "message",
                  text: "不分系學士班",
                },
                {
                  label: "對不起我們忽略了你QAQ",
                  type: "message",
                  text: "其他",
                },
                // 可加入更多欄位選項
              ],
            },
          },
        ];
        client.replyMessage(event.replyToken, departmentMenu);
        userState[userId].state = "awaiting_department";
        return;
      case "awaiting_department":
        userState[userId].state = "hold";
        if (
          !messageText.includes("資訊工程系") &&
          !messageText.includes("電機工程系") &&
          !messageText.includes("資訊管理系") &&
          !messageText.includes("機械工程系") &&
          !messageText.includes("材料科學與工程系") &&
          !messageText.includes("化學工程系") &&
          !messageText.includes("工程學士班") &&
          !messageText.includes("電子工程系") &&
          !messageText.includes("工業管理系") &&
          !messageText.includes("企業管理系") &&
          !messageText.includes("管理學士班") &&
          !messageText.includes("設計系") &&
          !messageText.includes("應用外語系") &&
          !messageText.includes("不分系學士班") &&
          !messageText.includes("其他")
        ) {
          client.replyMessage(event.replyToken, {
            type: "text",
            text: "❌這裡不收自訂義科系，\n再給你一次重新選擇的機會：",
          });
          userState[userId].state = "awaiting_department";
          return;
        }
        userState[userId].department = messageText;
        const gradeMenu = [
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

        client.replyMessage(event.replyToken, gradeMenu);
        userState[userId].state = "awaiting_grade";
        return;
      case "awaiting_grade":
        userState[userId].state = "hold";
        if (
          !messageText.includes("一") &&
          !messageText.includes("二") &&
          !messageText.includes("三") &&
          !messageText.includes("四") &&
          !messageText.includes("碩一") &&
          !messageText.includes("碩二")
        ) {
          client.replyMessage(event.replyToken, {
            type: "text",
            text: "你連你自己幾年級都不知道嗎❓😮‍💨",
          });
          userState[userId].state = "awaiting_grade";
          return;
        }
        userState[userId].grade = messageText;
        client.replyMessage(event.replyToken, {
          type: "text",
          text: "請輸入電話📞：",
        });
        userState[userId].state = "awaiting_phonenumber";
        return;
      case "awaiting_phonenumber":
        userState[userId].state = "hold";
        if (isNaN(messageText)) {
          client.replyMessage(event.replyToken, {
            type: "text",
            text: "你是哪裡人，應該沒有哪個國家🇹🇼電話不是數字吧❓❓\n再給你一次機會：",
          });
          userState[userId].state = "awaiting_phonenumber";
          return;
        }
        userState[userId].phonenumber = messageText;
        await finalizeRegistration(userId, event.replyToken);
        return;
      // ^^^以上為註冊流程中依序等待各項資料輸入的狀態^^^
      case "awaiting_suggest":
        userState[userId].state = "hold";
        userState[userId].suggest = messageText;
        await checkGameSuggestion(userId, event.replyToken);
        userState[userId] = null;
        return;
      case "awaiting_recommendID":
        userState[userId].state = "hold";
        userState[userId].ID = messageText;
        await recommendGame(userId, event.replyToken);
        userState[userId].state = "awaiting_recommendID";
        return;
      default:
        break;
    }
  }

  if (!learnedmsg) {
    //-----------------------------------
    const filePath = path.join(process.cwd(), "learnedmsg.json");
    fs.readFile(filePath, "utf8", (err, data) => {
      learnedmsg = JSON.parse(data);
    });
    //-----------------------------------
  }
  if (learnedmsg[messageText]) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `${learnedmsg[messageText]}`,
    });
  }

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: `你今天想幹嘛呢❓\n快點喔~我可是個大忙人呢😎`,
  });
}

//借
async function borrowGame(gameId, userId, replyToken) {
  const request = {
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${schoolYear}社產清單!A:M`,
  };
  try {
    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values;
    const rowIndex = rows.findIndex(
      (row) => row[0] === gameId && row[5] === ""
    );
    if (rowIndex !== -1) {
      if (rows[rowIndex][0] === gameId && rows[rowIndex][4] === "") {
        rows[rowIndex][4] = "V"; // Mark as borrowed
        rows[rowIndex][5] = userData[userId].name; // Add borrower's name

        const updateRequest = {
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: `${schoolYear}社產清單!A${rowIndex + 1}:M${rowIndex + 1}`,
          valueInputOption: "RAW",
          resource: {
            values: [rows[rowIndex]],
          },
        };

        client.replyMessage(replyToken, {
          type: "text",
          text: `${userData[userId].nickname}你借了 ${gameId} ${rows[rowIndex][2]} 記得還哈❗`,
        });
        await sheets.spreadsheets.values.update(updateRequest);
        return;
      }
    } else {
      client.replyMessage(replyToken, {
        type: "text",
        text: `${userData[userId].nickname}真可惜，被人搶先一步了🥲。`,
      });
      return;
    }
  } catch (err) {
    console.error(err);
    client.replyMessage(replyToken, { type: "text", text: `借用失敗❌` });
    return;
  }
}

//還
async function returnGame(userId, gameId, replyToken) {
  const request = {
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${schoolYear}社產清單!A:M`,
  };

  try {
    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values;

    const rowIndex = rows.findIndex(
      (row) => row[0] === gameId && row[5] === userData[userId].name
    );
    if (rowIndex !== -1) {
      if (rows[rowIndex][6] === "" && !userState[userId].gamedata) {
        userState[userId] = {
          state: "awaiting_position",
          gamedata: rows[rowIndex],
          gameId: gameId,
        };
        return client.replyMessage(replyToken, [
          {
            type: "text",
            text: `不好意思🙏，我們的幹部怠忽職守🤡，沒有記錄到他放在哪，\n${userData[userId].nickname}你幫我放在任意櫃子上，\n然後告訴我你放在哪一櫃：`,
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
        ]);
      }
      if (userState[userId] && userState[userId].gamedata) {
        rows[rowIndex] = userState[userId].gamedata;
      }
      rows[rowIndex][4] = ""; // Clear the '借用' column
      rows[rowIndex][5] = ""; // Clear the '借用備註(借用人)' column

      const updateRequest = {
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `${schoolYear}社產清單!A${rowIndex + 1}:M${rowIndex + 1}`,
        valueInputOption: "RAW",
        resource: { values: [rows[rowIndex]] },
      };
      client.replyMessage(replyToken, {
        type: "text",
        text: `${userData[userId].nickname}你很棒👍有記得還:${gameId} ${rows[rowIndex][2]}\n請幫我把它放回"${rows[rowIndex][6]}"櫃，拜托~~😘`,
      });
      await sheets.spreadsheets.values.update(updateRequest);
      userState[userId].state = "awaiting_returnid";
      return;
    } else {
      client.replyMessage(replyToken, {
        type: "text",
        text: `🤡${userData[userId].nickname}你才沒借這個好嗎？`,
      });
      userState[userId].state = "awaiting_returnid";
      return;
    }
  } catch (err) {
    console.error(err);
    return client.replyMessage(replyToken, {
      type: "text",
      text: `歸還失敗❌`,
    });
  }
}

//搜尋
function sendSearchMenu(replyToken) {
  const menu = {
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
  };

  return client.replyMessage(replyToken, menu);
}

async function customSearchInSheet(conditions, userId) {
  // 自訂搜尋函數，可以在指定欄位中搜尋資料
  const request = {
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${schoolYear}社產清單!A:M`,
  };
  const response = await sheets.spreadsheets.values.get(request);
  const rows = response.data.values;

  const columnMapping = {
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

  const results = [];
  if (rows.length > 0) {
    for (const row of rows) {
      const isMatch = conditions.every(({ field, value }) => {
        const columnIndex = columnMapping[field];
        return row[columnIndex] && row[columnIndex].includes(value);
      });

      if (isMatch) {
        let resultMessage;
        if (userData[userId] && userData[userId].permission == "幹部") {
          resultMessage = ` 編號: ${row[0]}\n 英文名稱: ${row[1]}\n 中文名稱: ${
            row[2]
          }\n 種類: ${row[3]}\n 借用: ${
            row[4] == "V" ? "已借出" : "未借出"
          }\n 借用人: ${row[5]}\n 位置: ${row[6]}\n 狀態(外膜): ${
            row[8]
          }\n 狀態(外觀): ${row[9]}\n 狀態(缺件): ${row[10]}\n 狀態(牌套): ${
            row[11]
          }\n 備註: ${row[12] ? row[12] : "無"}`;
        } else {
          resultMessage = ` 編號: ${row[0]}\n 英文名稱: ${row[1]}\n 中文名稱: ${
            row[2]
          }\n 種類: ${row[3]}\n 借用: ${
            row[4] == "V" ? "已借出" : "未借出"
          }\n 位置: ${row[6]}\n 狀態(外膜): ${row[8]}\n 狀態(外觀): ${
            row[9]
          }\n 狀態(缺件): ${row[10]}\n 狀態(牌套): ${row[11]}\n 備註: ${
            row[12] ? row[12] : "無"
          }`;
        }
        results.push(resultMessage);
      }
    }
  }
  return results;
}

//註冊
async function checkSerialNumber(serialNumber) {
  const request = {
    spreadsheetId: process.env.GOOGLE_SHEET_ID_MENBER,
    range: `${schoolYear}社員清單!G:H`,
  };

  const response = await sheets.spreadsheets.values.get(request);
  //  console.log(response.data.values.length);
  const row = response.data.values.find((row) => row[1] === serialNumber); // 假設序號在第 7 欄

  return row;
}

async function finalizeRegistration(userId, replyToken) {
  const request = {
    spreadsheetId: process.env.GOOGLE_SHEET_ID_MENBER,
    range: `${schoolYear}社員清單!H:H`,
  };

  try {
    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values;
    let rowIndex = rows.findIndex(
      (row) => row[0] === userState[userId].registerkey
    );

    if (rowIndex !== -1) {
      let userrow = [
        userId,
        userState[userId].name,
        userState[userId].nickname,
        userState[userId].studentID,
        userState[userId].department,
        userState[userId].grade,
        userState[userId].phonenumber,
        userState[userId].registerkey,
        "社員",
      ];
      const updateRequest = {
        spreadsheetId: process.env.GOOGLE_SHEET_ID_MENBER,
        range: `${schoolYear}社員清單!A${rowIndex + 1}:I${rowIndex + 1}`,
        valueInputOption: "RAW",
        resource: {
          values: [userrow],
        },
      };
      await sheets.spreadsheets.values.update(updateRequest);
      return client.replyMessage(replyToken, {
        type: "text",
        text: `✅${userState[userId].nickname}歡迎你加入台科大桌遊社！\n你的註冊資料\n姓名：${userState[userId].name}\n暱稱：${userState[userId].nickname}\n學號：${userState[userId].studentID}\n科系：${userState[userId].department}\n年級：${userState[userId].grade}\n電話📞：${userState[userId].phonenumber}`,
      });
    }
  } catch (err) {
    console.error(err);
    userState[userId] = null;
    return client.replyMessage(replyToken, {
      type: "text",
      text: `註冊失敗❌`,
    });
  }
  // 清除使用者的資料與階段
  userState[userId] = null;
  return;
}

//身份驗證
async function getuserData(userId) {
  const request = {
    spreadsheetId: process.env.GOOGLE_SHEET_ID_MENBER,
    range: `${schoolYear}社員清單!A:I`,
  };

  const response = await sheets.spreadsheets.values.get(request);
  const row = response.data.values.find((row) => row[0] === userId); // 假設序號在第 7 欄
  if (row == null) {
    return null;
  }
  return {
    userId: row[0],
    name: row[1],
    nickname: row[2],
    studentID: row[3],
    department: row[4],
    grade: row[5],
    phonenumber: row[6],
    permission: row[8],
  };
}

//建議遊戲
async function checkGameSuggestion(userId, replyToken) {
  const request = {
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${schoolYear}社產清單!A:M`,
  };

  let isEnglish = /^[A-Za-z\s_]+$/.test(userState[userId].suggest);
  let findgames = [];
  try {
    let conditions = [{ field: isEnglish, value: userState[userId].suggest }];
    const response = await sheets.spreadsheets.values.get(request);
    let index = -1;
    let rows = response.data.values;
    if (rows.length > 0) {
      for (const row of rows) {
        const isMatch = conditions.every(({ field, value }) => {
          const columnIndex = field ? 1 : 2;
          if (row[columnIndex] == value) index = rows.indexOf(row);
          return row[columnIndex] && row[columnIndex].includes(value);
        });
        if (isMatch) {
          findgames.push(
            ` 編號: ${row[0]}\n 英文名稱: ${row[1]}\n 中文名稱: ${
              row[2]
            }\n 種類: ${row[3]}\n 借用: ${
              row[4] == "V" ? "已借出" : "未借出"
            }\n 位置: ${row[6]}\n 狀態(外膜): ${row[8]}\n 狀態(外觀): ${
              row[9]
            }\n 狀態(缺件): ${row[10]}\n 狀態(牌套): ${row[11]}\n 備註: ${
              row[12] ? row[12] : "無"
            }`
          );
        }
      }
    }

    if (findgames.length > 0) {
      if (index !== -1) {
        return client.replyMessage(replyToken, [
          {
            type: "text",
            text: ` 編號: ${rows[index][0]}\n 英文名稱: ${
              rows[index][1]
            }\n 中文名稱: ${rows[index][2]}\n 種類: ${rows[index][3]}\n 借用: ${
              rows[index][4] == "V" ? "已借出" : "未借出"
            }\n 位置: ${rows[index][6]}\n 狀態(外膜): ${
              rows[index][8]
            }\n 狀態(外觀): ${rows[index][9]}\n 狀態(缺件): ${
              rows[index][10]
            }\n 狀態(牌套): ${rows[index][11]}\n 備註: ${
              rows[index][12] ? rows[index][12] : "無"
            }`,
          },
          { type: "text", text: "你過時了😜 這我們早就有了🤣" },
        ]);
      } else {
        let text = [
          {
            type: "text",
            text: `社辦也許有但我不確定🤔但還是會跟我同事建議看看((${userData[userId].nickname}快感謝我🤩`,
          },
          {
            type: "text",
            text: `先給你看看相似的桌遊：\n${findgames
              .slice(0, 3)
              .join("\n\n")}`,
          },
        ];
        for (let i = 3; i < findgames.length; i += 3) {
          text.push({
            type: "text",
            text: `${findgames.slice(i, i + 3).join("\n\n")}`,
          });
        }
        client.replyMessage(replyToken, text);
      }
    } else {
      client.replyMessage(replyToken, {
        type: "text",
        text: `${userData[userId].nickname}我絕對沒有覺得聽起來很不錯😖，但我會轉達給我同事的🙃`,
      });
    }
    sendGetRequest(
      `https://docs.google.com/forms/d/e/1FAIpQLScSItJnRntYtrPJm6cYTFs02mFNOJBh_6pUVKKvaUwlSnhoZg/formResponse?usp=pp_url&entry.1522855814=${userState[userId].suggest}&entry.903077000=%E5%B0%8F%E5%82%B2%E9%A9%95%E8%BD%89%E9%81%94`
    );
  } catch (err) {
    console.error(err);
    return client.replyMessage(replyToken, {
      type: "text",
      text: `建議失敗❌`,
    });
  }
}

//推薦遊戲
async function recommendGame(userId, replyToken) {
  const request = {
    spreadsheetId: process.env.GOOGLE_SHEET_ID_PUB,
    range: "桌遊清單!A:E",
  };
  try {
    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values;
    const rowIndex = rows.findIndex((row) => row[0] === userState[userId].ID);
    if (rowIndex == -1) {
      return client.replyMessage(replyToken, {
        type: "text",
        text: `${userData[userId].nickname}再騙我要生氣囉😡社辦明明就沒有這桌遊😤`,
      });
    } else {
      rows[rowIndex][4] = parseInt(rows[rowIndex][4]) + 1;
      const updateRequest = {
        spreadsheetId: process.env.GOOGLE_SHEET_ID_PUB,
        range: `桌遊清單!A${rowIndex + 1}:E${rowIndex + 1}`,
        valueInputOption: "RAW",
        resource: {
          values: [rows[rowIndex]],
        },
      };
      client.replyMessage(replyToken, {
        type: "text",
        text: `${userData[userId].nickname}算你有品味😉`,
      });
      await sheets.spreadsheets.values.update(updateRequest);
      return;
    }
  } catch (err) {
    console.error(err);
    return client.replyMessage(replyToken, {
      type: "text",
      text: `推薦失敗❌`,
    });
  }
}

function sendGetRequest(url) {
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
}
// 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
