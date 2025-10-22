const fs = require("fs");
const colors = require("colors");
const { DateTime } = require("luxon");
const path = require("path");
const { jwtDecode } = require("jwt-decode");
const fsPromises = require("fs").promises; // Use fs.promises
const AsyncLock = require("async-lock");
const lock = new AsyncLock();
require("dotenv").config();

function _isArray(obj) {
  if (Array.isArray(obj) && obj.length > 0) {
    return true;
  }

  try {
    const parsedObj = JSON.parse(obj);
    return Array.isArray(parsedObj) && parsedObj.length > 0;
  } catch (e) {
    return false;
  }
}

function splitIdPet(num) {
  const numStr = num.toString();
  const firstPart = numStr.slice(0, 3); // Get the first 3 characters
  const secondPart = numStr.slice(3); // Get the remaining part

  return [parseInt(firstPart), parseInt(secondPart)];
}

function sleep(seconds = null) {
  if (seconds && typeof seconds === "number") return new Promise((resolve) => setTimeout(resolve, seconds * 1000));

  let DELAY_BETWEEN_REQUESTS = process.env.DELAY_BETWEEN_REQUESTS && _isArray(process.env.DELAY_BETWEEN_REQUESTS) ? JSON.parse(process.env.DELAY_BETWEEN_REQUESTS) : [1, 5];
  if (seconds && Array.isArray(seconds)) {
    DELAY_BETWEEN_REQUESTS = seconds;
  }
  const min = DELAY_BETWEEN_REQUESTS[0];
  const max = DELAY_BETWEEN_REQUESTS[1];

  return new Promise((resolve) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    setTimeout(resolve, delay * 1000);
  });
}

function saveToken(id, token) {
  const tokens = JSON.parse(fs.readFileSync("token.json", "utf8"));
  tokens[id] = token;
  fs.writeFileSync("token.json", JSON.stringify(tokens, null, 4));
}

async function saveJson(id, value, filename) {
  await lock.acquire("fileLock", async () => {
    try {
      const data = await fsPromises.readFile(filename, "utf8");
      const jsonData = JSON.parse(data);
      jsonData[id] = value;
      await fsPromises.writeFile(filename, JSON.stringify(jsonData, null, 4));
    } catch (error) {
      console.error("Error saving JSON:", error);
    }
  });
}

function getToken(id) {
  const tokens = JSON.parse(fs.readFileSync("token.json", "utf8"));
  return tokens[id] || null;
}

function isTokenExpired(token) {
  if (!token) return true;

  try {
    const [, payload] = token.split(".");
    if (!payload) return true;

    const decodedPayload = JSON.parse(Buffer.from(payload, "base64").toString());
    const now = Math.floor(Date.now() / 1000);

    if (!decodedPayload.expiresAt) {
      // console.log("Eternal token".yellow);
      return false;
    }

    const expirationDate = new Date(decodedPayload.expiresAt * 1000);
    const isExpired = now > decodedPayload.expiresAt;

    console.log(`Token expires after: ${expirationDate.toLocaleString()}`.magenta);
    console.log(`Token status: ${isExpired ? "Expired".yellow : "Valid".green}`);

    return isExpired;
  } catch (error) {
    return true;
  }
}

function generateRandomHash() {
  const characters = "0123456789abcdef";
  let hash = "0x"; // Start with "0x"

  for (let i = 0; i < 64; i++) { // 64 characters for the hash
    const randomIndex = Math.floor(Math.random() * characters.length);
    hash += characters[randomIndex];
  }

  return hash;
}

function getRandomElement(arr) {
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function loadData(file) {
  try {
    const filePath = path.resolve(__dirname, "../data", file);

    const datas = fs.readFileSync(filePath, "utf8").replace(/\r/g, "").split("\n").filter(Boolean);
    if (datas?.length <= 0) {
      return [];
    }
    return datas;
  } catch (error) {
    return [];
  }
}

async function saveData(data, filename) {
  fs.writeFileSync(filename, data.join("\n"));
}

function log(msg, type = "info") {
  switch (type) {
    case "success":
      console.log(`[*] ${msg}`.green);
      break;
    case "custom":
      console.log(`[*] ${msg}`.magenta);
      break;
    case "error":
      console.log(`[!] ${msg}`.red);
      break;
    case "warning":
      console.log(`[*] ${msg}`.yellow);
      break;
    default:
      console.log(`[*] ${msg}`.blue);
  }
}

function getItem(id, filename) {
  const data = JSON.parse(fs.readFileSync(filename, "utf8"));
  return data[id] || null;
}

async function getOrCreateJSON(id, value, filename) {
  let item = getItem(id, filename);
  if (item) {
    return item;
  }
  item = await saveJson(id, value, filename);
  return item;
}

module.exports = {
  _isArray,
  saveJson,
  getRandomNumber,
  saveToken,
  splitIdPet,
  getToken,
  isTokenExpired,
  generateRandomHash,
  getRandomElement,
  loadData,
  saveData,
  log,
  getOrCreateJSON,
  sleep,
};