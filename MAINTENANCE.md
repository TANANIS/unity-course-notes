# Unity Course Notes 維護地圖

這份文件是給之後負責更新此 repo 的 AI／維護者看的。目標不是解釋網站怎麼做，而是讓下一次修改能快速定位。

## 先讀這兩個檔案

1. `data/course.json`：課程結構與進度的唯一真相來源。
2. `templates/lesson.html`：新增筆記頁時的固定骨架。

除非要改網站行為或樣式，**不要先讀 `app.js` 或 CSS**。

## 一堂新課的正常更新流程

假設要完成 `ch2_2`：

1. 從 `templates/lesson.html` 建立 `notes/ch2-2.html`。
2. 把整理後的課程內容寫進頁面。
3. 在 `data/course.json` 找到 `id: ch2-2`。
4. 加上：
   - `url`: `notes/ch2-2.html`
   - 必要時加入 `keywords`、`description`
5. 完成。

首頁筆記數、總進度、課程目錄的完成狀態、搜尋基本入口、上一堂／下一堂，都由 `app.js` 根據 `data/course.json` 自動推導。

## 資料責任分工

### `data/course.json`
放：
- 課程與章節名稱
- lesson id
- 全課程 lesson 編號
- 時長
- 是否已有筆記（有 `url` 即視為完成）
- 搜尋用 keywords

不要放：
- 長篇筆記正文
- HTML
- UI 狀態

### `data/practice.json`
放自主練習清單。自主練習與 Udemy 課程進度分離，不要混入 `course.json`。

### `notes/*.html`
放：
- 真正需要複習的內容
- 概念校正
- 程式碼例子
- Unity 版本差異
- 完成檢查

不要在正文頁手動維護：
- 全站總進度
- 全章完成數
- 下一堂的真正目標頁（`app.js` 會在載入後校正）

### `search-index.json`
只放「頁面內的深層搜尋入口」，例如：
- 某堂筆記中的特定概念段落
- `#anchor` 級別的內容

每堂筆記本身不必重複加入；`data/course.json` 已會自動產生基本搜尋項目。

### `app.js`
只負責共用行為：
- 課程資料讀取
- 課程目錄渲染
- 首頁／目錄進度
- 搜尋 UI
- 上一堂／下一堂
- Theme、Checklist、圖片 fallback

如果只是新增課程內容，原則上不應修改它。

## CSS 維護地圖

`styles.css` 現在只是一個 CSS 入口檔，不在裡面堆實際樣式。

- `css/core.css`：tokens、reset、body、topbar、breadcrumb、共用 badge／按鈕／footer
- `css/home.css`：首頁 hero、目前課程卡、自主練習入口卡
- `css/course.css`：課程 header、進度摘要、章節 accordion、lesson rows
- `css/note.css`：一般筆記頁、程式碼、callout、checklist、pagination
- `css/practice.css`：自主練習列表頁
- `css/responsive.css`：共用 RWD 覆寫
- `lesson-layout.css`：筆記頁的進階／特殊版型，例如多欄導覽、note group、figure grid
- `search.css`：搜尋 UI
- `screenshots.css`：截圖與圖片展示

修改外觀時先找對應模組，不要再把規則丟回 `styles.css`。

## 命名規則

- 檔名：`notes/chX-Y.html`
- lesson id：`chX-Y`
- 顯示名稱：`chX_Y 標題`
- `courseLessonNumber`：Udemy 全課程中的堂數編號

目前對應：
- `ch1-*` = 第 2 節
- `ch2-*` = 第 3 節 C# 語法基礎

## 修改前快速判斷

- 新增／完成一堂：改 `notes/` + `data/course.json`
- 新增自主練習：改練習頁 + `data/practice.json`
- 補深層搜尋：改 `search-index.json`
- 改首頁外觀：`css/home.css`
- 改課程目錄外觀：`css/course.css`
- 改筆記正文外觀：`css/note.css`；特殊筆記版型才看 `lesson-layout.css`
- 改全站共用外觀：`css/core.css`
- 改手機／平板布局：`css/responsive.css` 或特殊版型自己的 media query
- 改全站行為：才看 `app.js`
- 改首頁文案：`index.html`
- 改課程目錄外框：`course.html`

## 內容原則

- 不保存字幕逐字稿。
- 優先留下可再次使用的理解。
- 字幕辨識錯誤直接修正，不照抄。
- 老師說法若過時或不精確，正文保留課程脈絡，再明確標示校正。
- 簡單語法不要為了篇幅硬寫成教科書。
