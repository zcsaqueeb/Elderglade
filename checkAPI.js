const axios = require("axios");
const { log } = require("./utils/utils"); // Adjust the path as necessary
const settings = require("./config/config");

const urlChecking = "https://raw.githubusercontent.com/Hunga9k50doker/APIs-checking/refs/heads/main/endpoints.json";

async function checkBaseUrl() {
  console.log("Checking api...".blue);
  if (settings.ADVANCED_ANTI_DETECTION) {
    const result = await getBaseApi(urlChecking);
    if (result.endpoint) {
      log("No change in api!", "success");
      return result;
    }
  } else {
    return {
      endpoint: settings.BASE_URL,
      message:
        "If the API changes, please contact the Telegram group Airdrop Hunter Siêu Tốc (https://t.me/airdrophuntersieutoc) for more information and updates! | Have any issues, please contact: https://t.me/airdrophuntersieutoc",
    };
  }
}

async function getBaseApi(url) {
  try {
    const response = await axios.get(url);
    const content = response.data;
    if (content?.sleep) {
      return { endpoint: content.sleep, message: content.copyright };
    } else {
      return {
        endpoint: null,
        message:
          "If the API changes, please contact the Telegram group Airdrop Hunter Siêu Tốc (https://t.me/airdrophuntersieutoc) for more information and updates! | Have any issues, please contact: https://t.me/airdrophuntersieutoc",
      };
    }
  } catch (e) {
    return {
      endpoint: null,
      message:
        "If the API changes, please contact the Telegram group Airdrop Hunter Siêu Tốc (https://t.me/airdrophuntersieutoc) for more information and updates! | Have any issues, please contact: https://t.me/airdrophuntersieutoc",
    };
  }
}

module.exports = { checkBaseUrl };