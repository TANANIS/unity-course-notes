const root = document.documentElement;
const themeToggle = document.querySelector('#theme-toggle');
const themeKey = 'unity-notes-theme';
const checklistKey = 'unity-notes-checklist';
const chapterKey = 'unity-notes-open-chapters';

function applyTheme(theme) {
  root.dataset.theme = theme;
  const isDark = theme === 'dark';
  themeToggle?.setAttribute('aria-pressed', String(isDark));
  themeToggle?.setAttribute('aria-label', isDark ? '切換淺色模式' : '切換深色模式');
}

const savedTheme = localStorage.getItem(themeKey);
const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
applyTheme(savedTheme || preferredTheme);

themeToggle?.addEventListener('click', () => {
  const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(themeKey, nextTheme);
  applyTheme(nextTheme);
});

function readJson(key, fallback = {}) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function enhanceCh12MainWindows() {
  if (!document.title.includes('ch1_2 Unity3D 環境介紹')) return;

  const heading = [...document.querySelectorAll('.note-section h2')]
    .find((item) => item.textContent.trim() === '五個主要區塊');
  const section = heading?.closest('.note-section');
  if (!section) return;

  section.innerHTML = `
    <span class="section-index">11</span>
    <div>
      <h2>五個主要視窗</h2>
      <dl class="term-list">
        <div>
          <dt>Scene<br><small>場景編輯視窗</small></dt>
          <dd>開發者編輯遊戲世界的工作區。可選取、擺放、移動、旋轉與縮放 GameObject，並從任意角度觀察場景。Scene 顯示的是編輯視角，不等於玩家最後看到的畫面。</dd>
        </div>
        <div>
          <dt>Hierarchy<br><small>階層視窗</small></dt>
          <dd>列出目前 Scene 裡的所有 GameObject，並顯示父子階層。它負責整理「這個場景中有哪些物件，以及它們如何組織」，不是整個專案的檔案總管。</dd>
        </div>
        <div>
          <dt>Inspector<br><small>檢查器視窗</small></dt>
          <dd>顯示目前選取項目的詳細資料。選取 GameObject 時會看到 Transform、Collider、腳本等 Component；選取 Project 裡的 Asset 時，則會顯示該資產的匯入與設定內容。</dd>
        </div>
        <div>
          <dt>Game<br><small>遊戲預覽視窗</small></dt>
          <dd>顯示 Camera 實際輸出的畫面，接近玩家執行遊戲時看到的結果。Scene 裡存在的物件若沒有被 Camera 拍到，仍可能完全不出現在 Game 視窗。</dd>
        </div>
        <div>
          <dt>Project<br><small>專案資產視窗</small></dt>
          <dd>管理整個專案中的 Asset，例如 Scene、C# Script、Material、Texture、Model、Audio、Animation 與 Prefab。Project 裡是專案檔案；Hierarchy 裡則是目前場景中的 GameObject 實例。</dd>
        </div>
      </dl>

      <aside class="callout danger">
        <span class="callout-label">最常見的混淆</span>
        <p><strong>Scene 不等於 Game，Hierarchy 不等於 Project。</strong>Scene 是開發者的施工現場，Game 是 Camera 給玩家看的成果；Hierarchy 管目前場景物件，Project 管整個專案資產。</p>
      </aside>

      <div class="memory-line">
        <span>一句話記憶</span>
        <strong>Project 管素材，Hierarchy 管物件，Scene 管擺放，Inspector 管屬性，Game 看結果。</strong>
      </div>

      <dl class="term-list compact">
        <div><dt>Project → Scene</dt><dd>把模型、圖片或 Prefab 等 Asset 拖進 Scene，Unity 會建立或放置對應的 GameObject。</dd></div>
        <div><dt>Scene ↔ Hierarchy</dt><dd>兩者呈現同一份場景資料：Scene 顯示空間位置，Hierarchy 顯示清單與父子結構。</dd></div>
        <div><dt>選取 → Inspector</dt><dd>在 Scene、Hierarchy 或 Project 選取項目後，Inspector 會顯示它可調整的資料。</dd></div>
        <div><dt>Camera → Game</dt><dd>Camera 拍攝 Scene，Game 視窗顯示其輸出與 UI。</dd></div>
      </dl>
    </div>`;

  const checklist = document.querySelector('.checklist');
  const playModeLabel = checklist
    ?.querySelector('input[data-check="lesson-5-playmode"]')
    ?.closest('label');

  if (checklist && !checklist.querySelector('input[data-check="lesson-5-main-windows"]')) {
    const label = document.createElement('label');
    label.innerHTML = '<input type="checkbox" data-check="lesson-5-main-windows"> 能說明 Scene、Hierarchy、Inspector、Game 與 Project 的用途與彼此關係';
    checklist.insertBefore(label, playModeLabel || null);
  }
}

enhanceCh12MainWindows();

const checklistState = readJson(checklistKey);
document.querySelectorAll('input[data-check]').forEach((checkbox) => {
  const key = checkbox.dataset.check;
  checkbox.checked = Boolean(checklistState[key]);

  checkbox.addEventListener('change', () => {
    checklistState[key] = checkbox.checked;
    localStorage.setItem(checklistKey, JSON.stringify(checklistState));
  });
});

const chapters = [...document.querySelectorAll('details.chapter')];
if (chapters.length) {
  const savedChapters = readJson(chapterKey, []);

  if (savedChapters.length) {
    chapters.forEach((chapter, index) => {
      chapter.open = savedChapters.includes(index);
    });
  }

  chapters.forEach((chapter) => {
    chapter.addEventListener('toggle', () => {
      const openIndexes = chapters
        .map((item, index) => item.open ? index : null)
        .filter((index) => index !== null);
      localStorage.setItem(chapterKey, JSON.stringify(openIndexes));
    });
  });
}
