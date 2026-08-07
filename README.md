# Unity Course Notes

TANA 的 Unity 3D 遊戲課程重修筆記網站。

網站：https://tananis.github.io/unity-course-notes/

## 內容原則

- 不保存逐字稿，只留下可複習、可再次使用的理解。
- 優先整理核心概念、操作流程與程式碼意義。
- 自動字幕錯字直接修正。
- 舊版 Unity 或不精確說法會另外標示校正。
- 每堂課保留簡短完成檢查。

## 維護結構

- `data/course.json`：課程章節、課名、時長、完成狀態與 URL 的唯一資料來源。
- `notes/`：每堂實際筆記內容。
- `templates/lesson.html`：新增筆記頁的固定骨架。
- `search-index.json`：只維護頁面內的深層搜尋入口。
- `app.js`：從課程資料推導目錄、進度、搜尋與上一堂／下一堂。
- `MAINTENANCE.md`：給後續 AI／維護者的快速修改地圖。

## 新增一堂筆記

正常情況只需要：

1. 新增 `notes/chX-Y.html`。
2. 在 `data/course.json` 對應 lesson 加上 `url`，必要時補 `keywords` / `description`。

首頁進度、課程目錄與導覽會自動同步，不要手動維護同一份資料。
