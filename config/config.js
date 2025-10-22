require("dotenv").config();
const { _isArray } = require("../utils/utils.js");

const settings = {
  TIME_SLEEP: process.env.TIME_SLEEP ? parseInt(process.env.TIME_SLEEP) : 1,
  MAX_THEADS: process.env.MAX_THEADS ? parseInt(process.env.MAX_THEADS) : 20,
  MAX_LEVEL_UGRADE_HERO: process.env.MAX_LEVEL_UGRADE_HERO ? parseInt(process.env.MAX_LEVEL_UGRADE_HERO) : 999,
  MAX_THEADS_NO_PROXY: process.env.MAX_THEADS_NO_PROXY ? parseInt(process.env.MAX_THEADS_NO_PROXY) : 20,
  MAX_STAGE: process.env.MAX_AMOUNT_GACHA ? parseInt(process.env.MAX_AMOUNT_GACHA) : 9999,
  MAX_LEVEL_UPGRADE: process.env.MAX_LEVEL_UPGRADE ? parseInt(process.env.MAX_LEVEL_UPGRADE) : 999,
  LOOP_STAGE: process.env.LOOP_STAGE ? parseInt(process.env.LOOP_STAGE) : 999,
  TIME_CLAIM_SPARK: process.env.TIME_CLAIM_SPARK ? parseInt(process.env.TIME_CLAIM_SPARK) : 1,

  START_MAP_CHALLENGE_INDEX: process.env.START_MAP_CHALLENGE_INDEX ? parseInt(process.env.START_MAP_CHALLENGE_INDEX) : 1,

  SKIP_TASKS: process.env.SKIP_TASKS ? JSON.parse(process.env.SKIP_TASKS.replace(/'/g, '"')) : [],
  TYPE_HERO_UPGRADE: process.env.TYPE_HERO_UPGRADE ? JSON.parse(process.env.TYPE_HERO_UPGRADE.replace(/'/g, '"')) : [],
  TYPE_HERO_RESET: process.env.TYPE_HERO_RESET ? JSON.parse(process.env.TYPE_HERO_RESET.replace(/'/g, '"')) : [],
  CODE_GATEWAY: process.env.CODE_GATEWAY ? JSON.parse(process.env.CODE_GATEWAY.replace(/'/g, '"')) : [],

  AUTO_TASK: process.env.AUTO_TASK ? process.env.AUTO_TASK.toLowerCase() === "true" : true,
  AUTO_CHALLENGE: process.env.AUTO_CHALLENGE ? process.env.AUTO_CHALLENGE.toLowerCase() === "true" : true,
  AUTO_LOOP: process.env.AUTO_LOOP ? process.env.AUTO_LOOP.toLowerCase() === "true" : true,

  ENABLE_MAP_INDEX_CHALLENGE: process.env.ENABLE_MAP_INDEX_CHALLENGE ? process.env.ENABLE_MAP_INDEX_CHALLENGE.toLowerCase() === "true" : true,

  AUTO_SHOW_COUNT_DOWN_TIME_SLEEP: process.env.AUTO_SHOW_COUNT_DOWN_TIME_SLEEP ? process.env.AUTO_SHOW_COUNT_DOWN_TIME_SLEEP.toLowerCase() === "true" : false,
  AUTO_CLAIM_BONUS: process.env.AUTO_CLAIM_BONUS ? process.env.AUTO_CLAIM_BONUS.toLowerCase() === "true" : true,
  ENABLE_ADVANCED_MERGE: process.env.ENABLE_ADVANCED_MERGE ? process.env.ENABLE_ADVANCED_MERGE.toLowerCase() === "true" : true,
  ENABLE_DEBUG: process.env.ENABLE_DEBUG ? process.env.ENABLE_DEBUG.toLowerCase() === "true" : false,

  AUTO_UGRADE_HERO: process.env.AUTO_UGRADE_HERO ? process.env.AUTO_UGRADE_HERO.toLowerCase() === "true" : true,
  AUTO_RESET_HERO: process.env.AUTO_RESET_HERO ? process.env.AUTO_RESET_HERO.toLowerCase() === "true" : true,
  CONNECT_WALLET: process.env.CONNECT_WALLET ? process.env.CONNECT_WALLET.toLowerCase() === "true" : true,
  USE_PROXY: process.env.USE_PROXY ? process.env.USE_PROXY.toLowerCase() === "true" : false,

  ADVANCED_ANTI_DETECTION: process.env.ADVANCED_ANTI_DETECTION ? process.env.ADVANCED_ANTI_DETECTION.toLowerCase() === "true" : true,
  AUTO_UPGRADE: process.env.AUTO_UPGRADE ? process.env.AUTO_UPGRADE.toLowerCase() === "true" : true,

  TYPE_CAPTCHA: process.env.TYPE_CAPTCHA ? process.env.TYPE_CAPTCHA : null,
  API_KEY_2CAPTCHA: process.env.API_KEY_2CAPTCHA ? process.env.API_KEY_2CAPTCHA : null,
  API_KEY_ANTI_CAPTCHA: process.env.API_KEY_ANTI_CAPTCHA ? process.env.API_KEY_ANTI_CAPTCHA : null,
  API_KEY_CAPMONSTER: process.env.API_KEY_CAPMONSTER ? process.env.API_KEY_CAPMONSTER : null,
  CAPTCHA_URL: process.env.CAPTCHA_URL ? process.env.CAPTCHA_URL : null,
  WEBSITE_KEY: process.env.WEBSITE_KEY ? process.env.WEBSITE_KEY : null,

  API_ID: process.env.API_ID ? process.env.API_ID : null,
  BASE_URL: process.env.BASE_URL ? process.env.BASE_URL : null,
  REF_ID: process.env.REF_ID ? process.env.REF_ID : "",
  MODE: process.env.MODE ? process.env.MODE : "",

  DELAY_BETWEEN_REQUESTS: process.env.DELAY_BETWEEN_REQUESTS && _isArray(process.env.DELAY_BETWEEN_REQUESTS) ? JSON.parse(process.env.DELAY_BETWEEN_REQUESTS) : [0, 1],
  DELAY_START_BOT: process.env.DELAY_START_BOT && _isArray(process.env.DELAY_START_BOT) ? JSON.parse(process.env.DELAY_START_BOT) : [0, 1],
  MAP_RANGE_CHALLENGE: process.env.MAP_RANGE_CHALLENGE && _isArray(process.env.MAP_RANGE_CHALLENGE) ? JSON.parse(process.env.MAP_RANGE_CHALLENGE) : [1, 999],
};

module.exports = settings;