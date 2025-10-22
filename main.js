const fs = require("fs");
const path = require("path");
const axios = require("axios");
const colors = require("colors");
const { HttpsProxyAgent } = require("https-proxy-agent");
const readline = require("readline");
const user_agents = require("./config/userAgents");
const settings = require("./config/config");
const { sleep, loadData, getRandomNumber, saveToken, isTokenExpired, saveJson } = require("./utils/utils");
const { checkBaseUrl } = require("./checkAPI");
const querystring = require("querystring");
const { io } = require("socket.io-client");
const { PromisePool } = require("@supercharge/promise-pool");
const { SocketClient } = require("./services/socket");
const { solveCaptcha } = require("./utils/captcha");
const ethers = require("ethers");
const tokens = require("./tokens.json");
class ClientAPI {
  constructor(itemData, accountIndex, proxy) {
    this.headers = {
      origin: "https://mobile.elderglade.com",
      referer: "https://mobile.elderglade.com/",
    };
    this.itemData = itemData;
    this.accountIndex = accountIndex;
    this.proxy = proxy;
    this.proxyIP = null;
    this.session_name = null;
    this.session_user_agents = this.#load_session_data();
    this.tokens = tokens;
    this.token = null;
    this.localItem = null;
    this.socket = null;
  }

  #load_session_data() {
    try {
      const filePath = path.join(process.cwd(), "session_user_agents.json");
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      if (error.code === "ENOENT") {
        return {};
      } else {
        throw error;
      }
    }
  }

  #get_random_user_agent() {
    const randomIndex = Math.floor(Math.random() * user_agents.length);
    return user_agents[randomIndex];
  }

  #get_user_agent() {
    if (this.session_user_agents[this.session_name]) {
      return this.session_user_agents[this.session_name];
    }

    const newUserAgent = this.#get_random_user_agent();
    this.session_user_agents[this.session_name] = newUserAgent;
    this.#save_session_data(this.session_user_agents);
    return newUserAgent;
  }

  #save_session_data(session_user_agents) {
    const filePath = path.join(process.cwd(), "session_user_agents.json");
    fs.writeFileSync(filePath, JSON.stringify(session_user_agents, null, 2));
  }

  #get_platform(userAgent) {
    const platformPatterns = [
      { pattern: /iPhone/i, platform: "ios" },
      { pattern: /Android/i, platform: "android" },
      { pattern: /iPad/i, platform: "ios" },
    ];

    for (const { pattern, platform } of platformPatterns) {
      if (pattern.test(userAgent)) {
        return platform;
      }
    }

    return "Unknown";
  }

  #set_headers() {
    const platform = this.#get_platform(this.#get_user_agent());
    this.headers["sec-ch-ua"] = `Not)A;Brand";v="99", "${platform} WebView";v="127", "Chromium";v="127`;
    this.headers["sec-ch-ua-platform"] = platform;
    this.headers["User-Agent"] = this.#get_user_agent();
  }

  createUserAgent() {
    try {
      this.session_name = this.itemData.key;
      this.#get_user_agent();
    } catch (error) {
      this.log(`Can't create user agent, try get new query_id: ${error.message}`, "error");
      return;
    }
  }

  async log(msg, type = "info") {
    const accountPrefix = `[Tài khoản ${this.accountIndex + 1}]`;
    let ipPrefix = this.proxyIP ? `[${this.proxyIP}]` : "[Local IP]";
    let logMessage = "";
    if (settings.USE_PROXY) {
      ipPrefix = this.proxyIP ? `[${this.proxyIP}]` : "[Unknown IP]";
    }
    switch (type) {
      case "success":
        logMessage = `${accountPrefix}${ipPrefix} ${msg}`.green;
        break;
      case "error":
        logMessage = `${accountPrefix}${ipPrefix} ${msg}`.red;
        break;
      case "warning":
        logMessage = `${accountPrefix}${ipPrefix} ${msg}`.yellow;
        break;
      case "custom":
        logMessage = `${accountPrefix}${ipPrefix} ${msg}`.magenta;
        break;
      default:
        logMessage = `${accountPrefix}${ipPrefix} ${msg}`.blue;
    }
    console.log(logMessage);
  }

  async checkProxyIP() {
    try {
      const proxyAgent = new HttpsProxyAgent(this.proxy);
      const response = await axios.get("https://api.ipify.org?format=json", { httpsAgent: proxyAgent });
      if (response.status === 200) {
        this.proxyIP = response.data.ip;
        return response.data.ip;
      } else {
        throw new Error(`Cannot check proxy IP. Status code: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Error checking proxy IP: ${error.message}`);
    }
  }

  async makeRequest(
    url,
    method,
    data = {},
    options = {
      retries: 1,
      isAuth: false,
      extraHeaders: {},
    }
  ) {
    const initOptions = {
      retries: 2,
      isAuth: false,
      extraHeaders: {},
      ...options,
    };
    const { retries, isAuth, extraHeaders } = initOptions;

    const headers = {
      ...this.headers,
      "x-app-context": "telegram",
      ...extraHeaders,
    };

    if (!isAuth) {
      headers["authorization"] = `Bearer ${this.token}`;
    }

    let proxyAgent = null;
    if (settings.USE_PROXY) {
      proxyAgent = new HttpsProxyAgent(this.proxy);
    }
    let currRetries = 0,
      success = false;
    do {
      try {
        const response = await axios({
          method,
          url: `${url}`,
          data,
          headers,
          timeout: 30000,

          ...(proxyAgent ? { httpsAgent: proxyAgent, httpAgent: proxyAgent } : {}),
        });
        success = true;
        return { status: response.status, success: true, data: response.data?.data || response.data };
      } catch (error) {
        if (error.status == 401) {
          let token = null;
          if (url.includes("refresh-token") && this.localItem?.refreshToken) {
            token = await this.getValidToken(url.includes("refresh-token") ? false : true);
          } else {
            process.exit(0);
          }
          if (!token) {
            process.exit(0);
          }
          this.token = token;
          if (retries > 0)
            return await this.makeRequest(url, method, data, {
              ...options,
              retries: 0,
            });
          else return { success: false, status: error.status, error: error.response.data.error || error.response.data.message || error.message };
        }
        if (error.status == 400) {
          return { success: false, status: error.status, error: error.response.data.error || error.response.data.message || error.message };
        }
        success = false;
        await sleep(settings.DELAY_BETWEEN_REQUESTS);
        if (currRetries == retries) return { status: error.status, success: false, error: error.message };
      }
      currRetries++;
    } while (currRetries <= retries && !success);
  }

  async auth() {
    return this.makeRequest(
      `${settings.BASE_URL}/auth/telegram`,
      "post",
      {
        authData: querystring.parse(this.itemData.data),
        stringAuthData: this.itemData.data,
        referralCode: settings.REF_ID,
      },
      { isAuth: true }
    );
  }

  async authWeb3() {
    const resNonce = await this.getNonce();
    console.log(resNonce);
    // const message = `Login to Elderglade Mobile ${Date.now()}`;
    const message = resNonce?.data?.message;

    if (!message) {
      process.exit(1);
    }
    const signature = await this.itemData.wallet.signMessage(message);
    const payload = {
      message,
      wallet: this.itemData.wallet.address,
      signature,
    };
    console.log(payload);
    return await this.makeRequest(`https://galva.elderglade.com/auth/kaia`, "post", payload, { isAuth: true });
  }

  async reFreshToken() {
    return this.makeRequest(`${settings.BASE_URL}/auth/refresh-token`, "post", {
      refreshToken: this.localItem.refreshToken,
    });
  }

  async getNonce() {
    this.log(`Solving captcha ...`);
    const captcha = await solveCaptcha();
    if (!captcha) {
      process.exit(1);
    }
    const payload = {
      wallet: this.itemData.wallet.address,
      captchaToken: captcha,
    };
    return this.makeRequest(`https://galva.elderglade.com/auth/init-kaia`, "post", payload);
  }

  async syncData() {
    return this.makeRequest(`https://galva.elderglade.com/auth/sync`, "get");
  }

  async getUserInfo() {
    return this.makeRequest(`${settings.BASE_URL}/me`, "get");
  }

  async welcomeReward() {
    // this.makeRequest(`${settings.BASE_URL}/tasks/welcome-reward`, "get");
    return await this.completeTasks("welcome-reward");
  }

  async getTasks() {
    return this.makeRequest(`${settings.BASE_URL}/tasks`, "get");
  }

  async completeTasks(taskId) {
    return this.makeRequest(`${settings.BASE_URL}/me/tasks/verify`, "post", { taskId });
  }

  async startMining() {
    return this.makeRequest(`${settings.BASE_URL}/me/feed`, "post", null);
  }

  async getValidToken(isNew = false) {
    const existingToken = this.token;
    let refreshToken = this.localItem?.refreshToken;
    const isExp = isTokenExpired(existingToken);
    if (existingToken && !isNew && !isExp) {
      this.log("Using valid token", "success");
      return existingToken;
    } else if (!isNew && refreshToken) {
      this.log(`Refreshing token...`, "warning");
      const newToken = await this.reFreshToken();
      if (newToken.success && newToken.data?.accessToken) {
        await saveJson(this.session_name, JSON.stringify(newToken.data), "tokens.json");
        return newToken.data.accessToken;
      }
    } else {
      this.log("No found token or experied, trying get new token...", "warning");
      let newToken = null;
      switch (settings.MODE) {
        case "TELEGRAM":
          newToken = await this.auth();
          break;
        case "PRIVATE_KEY":
          newToken = await this.authWeb3();
          console.log(newToken);
          break;
        default:
          throw new Error(`Invalid MODE, settings again MODE in .env`);
      }

      if (newToken?.success && newToken?.data?.accessToken) {
        await saveJson(this.session_name, JSON.stringify(newToken.data), "tokens.json");
        return newToken.data.accessToken;
      }
    }
    this.log("Can't get new token...", "warning");
    return null;
  }

  async handleTasks() {
    this.log(`Checking tasks...`);
    const tasks = await this.getTasks();
    if (!tasks.success) return this.log(`Can't get tasks`, "warning");
    const tasksAvaliable = tasks.data.filter((task) => task.active && !settings.SKIP_TASKS.includes(task.id));
    if (tasksAvaliable.length == 0) return this.log(`No task available`, "warning");
    for (const task of tasksAvaliable) {
      await sleep(3);
      const { id, active, recurrence, levelRecord } = task;
      if (recurrence == "once" && levelRecord) {
        continue;
      }
      if (recurrence == "daily" && levelRecord) {
        const isCompleted = this.isToday(levelRecord.attemptedAt);
        if (isCompleted) continue;
      }
      if (active) {
        this.log(`Completing task ${id}`, "info");
        const result = await this.completeTasks(id);
        if (result.success) {
          this.log(`Completed task ${id} success!`, "success");
        } else {
          this.log(`Completed task ${id} failed! | ${JSON.stringify(result)}`, "warning");
        }
      }
    }
  }

  isToday(time) {
    const date = new Date(time);
    const today = new Date();
    if (date.getDay() == today.getDay() && date.getMonth() == today.getMonth()) {
      return true;
    }
    return false;
  }

  calculateTimeRemining(finishTime) {
    const finishesAt = new Date(finishTime);
    const now = new Date();

    const timeRemaining = finishesAt - now;
    if (!finishTime || now > finishesAt) return true;

    const seconds = Math.floor((timeRemaining / 1000) % 60);
    const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
    const hours = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));

    this.log(`Waiting ${hours} hours, ${minutes} minutes, ${seconds} seconds to next claim mining`, "warning");
    return false;
  }

  async handleMining(userData) {
    const { passiveCoins, passiveCoinsSettings } = userData;
    if (!passiveCoins) return await this.startMining();
    const { finishesAt, lastPassiveCoins } = passiveCoins;
    const canClaim = this.calculateTimeRemining(finishesAt);
    if (canClaim) {
      this.log(`Claim mining success!`, "success");
      const res = await this.startMining();
    } else {
      this.log(`Coins pending ${lastPassiveCoins}`, "custom");
    }
  }

  async connectWebSocket() {
    const token = this.token; // Thay bằng token thực tế
    const socketClient = new SocketClient({
      token,
      makeRequest: (url, method, data, options) => this.makeRequest(url, method, data, options),
      log: (ms, type) => this.log(ms, type),
    });

    try {
      await socketClient.connectWebSocket();
      await socketClient.connectWebSocket();
      return socketClient;
    } catch (error) {
      throw error;
    }
  }

  async runAccount() {
    const accountIndex = this.accountIndex;
    this.session_name = this.itemData.key;
    this.localItem = JSON.parse(this.tokens[this.session_name] || "{}");
    this.token = this.localItem?.accessToken;
    this.#set_headers();

    if (settings.USE_PROXY) {
      try {
        this.proxyIP = await this.checkProxyIP();
      } catch (error) {
        this.log(`Cannot check proxy IP: ${error.message}`, "warning");
        return;
      }
      const timesleep = getRandomNumber(settings.DELAY_START_BOT[0], settings.DELAY_START_BOT[1]);
      console.log(`=========Tài khoản ${accountIndex + 1} | ${this.proxyIP} | Bắt đầu sau ${timesleep} giây...`.green);
      await sleep(timesleep);
    }

    let token = await this.getValidToken();
    if (!token) return;
    this.token = token;
    let socketClient;
    socketClient = await this.connectWebSocket();
    const syncInterval = setInterval(() => this.syncData(), 3 * 60 * 1000);
    await sleep(5);
    await socketClient.disconnectWebSocket();
    clearInterval(syncInterval);
  }
}

async function main() {
  console.log("Tool được phát triển bởi nhóm tele Airdrop Hunter Siêu Tốc (https://t.me/airdrophuntersieutoc)".yellow);
  let initData = [];
  console.log(`You are runing MODE: ${settings.MODE}`);
  switch (settings.MODE) {
    case "TELEGRAM":
      initData = loadData("data.txt");

      break;
    case "PRIVATE_KEY":
      initData = loadData("privateKey.txt");
      break;

    default:
      throw new Error(`Invalid MODE, settings again MODE in .env`);
  }

  const proxies = loadData("proxy.txt");

  if (initData.length == 0 || (initData.length > proxies.length && settings.USE_PROXY)) {
    console.log("Số lượng proxy và data phải bằng nhau.".red);
    console.log(`Data: ${initData.length}`);
    console.log(`Proxy: ${proxies.length}`);
    process.exit(1);
  }
  if (!settings.USE_PROXY) {
    console.log(`You are running bot without proxies!!!`.yellow);
  }
  let maxThreads = settings.USE_PROXY ? settings.MAX_THEADS : settings.MAX_THEADS_NO_PROXY;

  const { endpoint: hasIDAPI, message } = await checkBaseUrl();
  if (!hasIDAPI) return console.log(`Không thể tìm thấy ID API, thử lại sau!`.red);
  console.log(`${message}`.yellow);
  console.log(`Initing data...`.blue);

  const data = initData.map((val, index) => {
    const item = {
      data: val,
    };
    if (settings.MODE == "PRIVATE_KEY") {
      const prvk = val.startsWith("0x") ? val : `0x${val}`;
      const wallet = new ethers.Wallet(prvk);
      item.wallet = wallet;
      item.key = wallet.address;
    } else if (settings.MODE == "TELEGRAM") {
      const userData = JSON.parse(decodeURIComponent(val.split("user=")[1].split("&")[0]));
      item.key = userData.id;
    }

    new ClientAPI(item, index, proxies[index]).createUserAgent();
    return item;
  });

  await sleep(1);
  while (true) {
    const { results, errors } = await PromisePool.withConcurrency(maxThreads)
      .for(data)
      .process(async (itemData, index, pool) => {
        const to = new ClientAPI(itemData, index, proxies[index % proxies.length]);
        try {
          await Promise.race([to.runAccount(), new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 24 * 60 * 60 * 1000))]);
        } catch (error) {
          console.log("err", error.message);
        } finally {
        }
      });

    if (errors.length > 0) {
      console.log(errors);
    }
    await sleep(5);
    console.log(`[${new Date().toLocaleString()}] Completed all account | Waiting ${settings.TIME_SLEEP} minutes to new circle`);
    await sleep(settings.TIME_SLEEP * 60);
  }
}

main().catch((error) => {
  console.log("Lỗi rồi:", error);
  process.exit(1);
});
