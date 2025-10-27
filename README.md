# 🌿 Elderglade Automation Tool

link : - https://t.me/Elderglade_bot/start?startapp=08626984-5d6e-44b6

Automate social tasks, card upgrades, and point claims for Telegram-based campaigns and EVM wallets. Built with Node.js, Elderglade supports both proxy and no-proxy modes, and handles multiple accounts with ease.

---

## ⚙️ Features

- ✅ Auto-complete social tasks  
- ✅ Auto-purchase and upgrade cards  
- ✅ Auto-claim points every 3 hours  
- ✅ Dual mode: Telegram or Private Key  
- ✅ Proxy support (optional)  
- ✅ Multi-threading & multi-account support  

---

## 🖥 Requirements

- Node.js installed  
- Basic setup of `.env` file  
- Input files prepared in the `data/` folder  

---

## 📦 Installation & Setup

### 1️⃣ Install dependencies

```bash
npm install
```

Then configure your `.env` file to match your preferred mode and settings.

---

### 2️⃣ Prepare input files

Place the following files inside the `data/` folder:

| File              | Purpose |
|-------------------|---------|
| `data.txt`        | Stores query IDs for Telegram mode. Format: `query_id=user=...` or `query_id=xxx`. Use GPM script to extract query & iframe. |
| `proxy.txt`       | Stores proxy list. Format: `http://user:pass@ip:port` |
| `privatekey.txt`  | Stores EVM wallet private keys for Private Key mode. *(Note: Captcha token retrieval may currently have issues.)* |

---

### 3️⃣ Run the tool

```bash
node main
```

---

## 📌 Notes

- Telegram mode uses query IDs to interact with campaigns.  
- Private Key mode interacts directly with EVM wallets.  
- Captcha handling may be unstable in Private Key mode.  
- Proxy support is optional but recommended for large-scale operations.

---

## 📁 Folder Structure

```
elderglade/
├── data/
│   ├── data.txt
│   ├── proxy.txt
│   └── privatekey.txt
├── .env
├── main.js
└── package.json
```

---

## 💬 Community & Support

Feel free to open issues or contribute improvements. For campaign scripts and query extraction, refer to the Automarket Telegram tools.
```
