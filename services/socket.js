const { io } = require("socket.io-client");
const settings = require("../config/config");
const { sleep } = require("../utils/utils");

class SocketClient {
  constructor({ log, makeRequest, token }) {
    this.token = token;
    this.socket = null;
    this.log = log;
    this.makeRequest = makeRequest;
    this.userData = null;
    this.pendingTasks = []; // Danh sách các tác vụ đang chờ
  }

  async ping() {
    return this.makeRequest(`${settings.BASE_URL}/auth/ping`, "get");
  }

  async updatePoints() {
    setInterval(() => {
      this.socket?.emit("updateEnergy", points);
    }, 60);
  }

  async completeMiss(id, type) {
    try {
      const res = await this.makeRequest(`https://galva.elderglade.com/${type.replace("_", "-")}/attempt/${id}`, "post", {});
      return res;
    } catch (error) {
      this.log(`Error completing task ${id}: ${error.message}`, "error");
      return { success: false, error };
    }
  }

  async ClaimMiss(id, type) {
    try {
      const res = await this.makeRequest(`https://galva.elderglade.com/${type.replace("_", "-")}/claim/${id}`, "post", {});
      return res;
    } catch (error) {
      this.log(`Error claiming task ${id}: ${error.message}`, "error");
      return { success: false, error };
    }
  }

  async buyCard(id, type = "farming-cards") {
    try {
      const res = await this.makeRequest(`https://galva.elderglade.com/${type}/purchase/${id}`, "post", {});
      return res;
    } catch (error) {
      this.log(`Error buying card ${id}: ${error.message}`, "error");
      return { success: false, error };
    }
  }

  async upgradeCard(id, type = "farming-cards") {
    try {
      const res = await this.makeRequest(`https://galva.elderglade.com/${type}/upgrade/${id}`, "post", {});
      return res;
    } catch (error) {
      this.log(`Error upgrading card ${id}: ${error.message}`, "error");
      return { success: false, error };
    }
  }

  async handleBuy() {
    const userCards = this.userData?.farmingCards || [];
    let cardsAvailableToUpgrade = [];
    this.log(`Checking card to upgrade...`);
    this.socket.on("farmingCards", async (data) => {
      if (Object.values(data).length > 0) {
        const arr = Object.values(data).flat();
        let cardsAvailable = arr;
        if (settings.MODE !== "PRIVATE_KEY") {
          cardsAvailable = arr.filter((t) => !t.walletRequired);
        }

        for (const card of cardsAvailable) {
          const { _id, maxLevel, requiredCard, requiredCardLevel } = card;
          const foundCard = userCards.find((c) => c.card == _id);
          if (!foundCard) {
            cardsAvailableToUpgrade.push({
              ...card,
              isNew: true,
              level: 0,
            });
          } else {
            const { level, cooldownUntilNextUpgrade } = foundCard;
            if (level >= maxLevel || level >= settings.MAX_LEVEL_UPGRADE || (cooldownUntilNextUpgrade && new Date(cooldownUntilNextUpgrade) > new Date())) continue;
            if (requiredCard) {
              const foundCardRq = userCards.find((c) => c.card == _id);
              if (!foundCardRq || foundCardRq.level < requiredCardLevel) continue;
            }
            cardsAvailableToUpgrade.push({
              ...card,
              isNew: false,
              level,
            });
          }
        }

        if (cardsAvailableToUpgrade.length == 0) {
          return this.log(`No cards available to upgrade`, "warning");
        }

        this.log(`Starting upgrade card...`);
        const taskPromises = cardsAvailableToUpgrade.map(async (task) => {
          if (!task._id) return null;
          const { _id, isNew } = task;
          let result = null;
          if (isNew) {
            await sleep(1);
            result = await this.buyCard(_id);
          } else {
            await sleep(1);
            this.log(`Upgradeing card ${_id}`);
            result = await this.upgradeCard(_id);
          }
          if (result.success) {
            this.log(`Upgrade card ${_id} success`, "success");
          }
        });
        this.pendingTasks.push(...taskPromises);
        await Promise.all(taskPromises); // Chờ tất cả tác vụ hoàn tất
      }
    });
  }

  async handleDailyMiss() {
    this.socket.on("dailyMissions", async (data) => {
      if (data?.length > 0) {
        const tasksAvailable = data.filter((t) => t.active && !settings.SKIP_TASKS.includes(t._id));
        if (tasksAvailable.length === 0) {
          return this.log(`No daily tasks available`, "warning");
        }

        const taskPromises = tasksAvailable.map(async (task) => {
          await sleep(1);
          const { _id, type } = task;
          this.log(`Completing daily task ${type} (${_id})`);
          const res = await this.completeMiss(_id, type);
          if (res.success) {
            this.log(`Completed daily task ${_id}`, "success");
          } else {
            this.log(`Failed to complete daily task ${_id}`, "error");
          }
        });

        this.pendingTasks.push(...taskPromises);
        await Promise.all(taskPromises); // Chờ tất cả tác vụ hoàn tất
      }
    });
  }

  async handleSocialMiss() {
    if (this.userData?.socialMissions?.length > 0) {
      const tasksAvailable = this.userData.socialMissions.filter((t) => !t.completed && t.claimAfter < Math.floor(Date.now() / 1000) && !settings.SKIP_TASKS.includes(t._id));
      if (tasksAvailable.length === 0) {
        return this.log(`No social tasks available to claim`, "warning");
      }

      const taskPromises = tasksAvailable.map(async (task) => {
        await sleep(1);
        const { missionId: _id } = task;
        this.log(`Claiming social task (${_id})`);
        const res = await this.ClaimMiss(_id, "social-missions");
        if (res.success) {
          this.log(`Claimed social task ${_id}`, "success");
        } else {
          this.log(`Failed to claim social task ${_id}`, "error");
        }
      });

      this.pendingTasks.push(...taskPromises);
      await Promise.all(taskPromises);
    }

    this.socket.on("socialMissions", async (data) => {
      if (data?.length > 0) {
        const tasksAvailable = data.filter((t) => t.enabled && !settings.SKIP_TASKS.includes(t._id));
        if (tasksAvailable.length === 0) {
          return this.log(`No social tasks available`, "warning");
        }

        const taskPromises = tasksAvailable.map(async (task) => {
          await sleep(1);
          const { _id, type } = task;
          this.log(`Completing social task ${type} (${_id})`);
          const res = await this.completeMiss(_id, "social-missions");
          if (res.success) {
            this.log(`Completed social task ${_id}`, "success");
          } else {
            this.log(`Failed to complete social task ${_id}`, "error");
          }
        });

        this.pendingTasks.push(...taskPromises);
        await Promise.all(taskPromises); // Chờ tất cả tác vụ hoàn tất
      }
    });
  }

  connectWebSocket() {
    return new Promise(async (resolve, reject) => {
      try {
        this.socket = io("wss://galva.elderglade.com/socket", {
          auth: { token: this.token },
          transports: ["websocket"],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        this.socket.on("connect", () => {
          this.log("Connected to WebSocket", "success");
        });

        this.socket.on("userProfile", async (data) => {
          const { pointsBalance, tierInfo, tier } = data;
          this.userData = data;
          this.log(`Points: ${pointsBalance} | Tier: ${tier}`, "custom");

          // Khởi chạy các tác vụ
          await Promise.all([
            this.handleSocialMiss(),
            // this.handleDailyMiss(),
            ...(settings.AUTO_UPGRADE ? [this.handleBuy()] : []),
          ]);

          resolve(this.socket);
        });

        this.socket.on("disconnect", async (reason) => {
          this.log(`Disconnected from WebSocket: ${reason}`, "warning");
          await Promise.all(this.pendingTasks);
        });

        this.socket.on("connect_error", (error) => {
          this.log(`WebSocket connection error: ${error.message}`, "error");
          reject(error);
        });

        this.socket.on("reconnect_failed", () => {
          this.log("WebSocket reconnection failed", "error");
          reject(new Error("Reconnection failed"));
        });
      } catch (error) {
        this.log(`WebSocket error: ${error.message}`, "error");
        reject(error);
      }
    });
  }

  async disconnectWebSocket() {
    if (this.socket) {
      await Promise.all(this.pendingTasks);
      this.socket.disconnect();
      this.log("Manually disconnected from WebSocket", "info");
      this.pendingTasks = [];
    }
  }
}

module.exports = { SocketClient };
