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
