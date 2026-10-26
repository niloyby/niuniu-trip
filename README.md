# 🐻🐮 說走就走的熊牛旅

京都 × 名古屋｜2026/10/30–11/02｜四天三夜手繪動畫旅行手帳。

**公開網站：** https://niloyby.github.io/niuniu-trip/

## 專案結構

```text
niuniu-trip/
├── index.html           # 網站 HTML 結構（盡量不改）
├── assets/
│   ├── style.css        # 畫面、排版與動畫樣式
│   └── app.js           # 日期切換、行程時間軸、動畫開關、清單功能
├── data/
│   └── itinerary.json   # 唯一行程資料來源（日期、36 個站點、提醒與準備清單）
└── README.md
```

## 後續修改行程

只需更改 `data/itinerary.json` 的 `days` 陣列內對應日期的 `stops`，每筆的欄位順序：

```json
["15:33", "清水寺", "02:00"]
```

代表「到達時間、地點名稱、停留時長（HH:MM）」。新增、刪除、排序站點均可直接編輯陣列。

`spots` 儲存針對特定地點的警示；`hints` 依 Day1～Day4 順序顯示當日提醒；`packing` 儲存準備清單。修改完畢，提交 GitHub `main` 分支就會觸發 GitHub Pages 發布。

## 測試方式

用 HTTP 靜態伺服器打開，例如 `python3 -m http.server 8000`，然後至 `http://localhost:8000/` 查看。請勿直接雙擊 `index.html` 以 `file://` 開啟，因為瀏覽器可能阻擋讀取 JSON。

檢查四天日期切換、全部 36 筆行程、Google 地圖按鈕、動畫開關、準備清單勾選與行動版排版。

## 發布

此專案的 GitHub Pages 使用 `main` 分支根目錄。在 **Settings → Pages** 可查看狀態。發布後網址維持不變。

*本儲存庫為 Public；切勿加入個人身份資料、訂房編號或私人連結。*
