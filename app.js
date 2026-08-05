const root = document.documentElement;
const themeToggle = document.querySelector('#theme-toggle');
const themeKey = 'unity-notes-theme';
const checklistKey = 'unity-notes-checklist';
const chapterKey = 'unity-notes-open-chapters';
const appScriptUrl = new URL(document.currentScript?.src || 'app.js', window.location.href);
const siteRootUrl = new URL('./', appScriptUrl);

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

function loadSearchStyles() {
  if (document.querySelector('link[data-search-styles]')) return;

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('search.css', siteRootUrl).href;
  stylesheet.dataset.searchStyles = 'true';
  document.head.append(stylesheet);
}

function normalizeSearchText(value = '') {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('zh-Hant')
    .replace(/[_/\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSearchScore(entry, tokens) {
  const title = normalizeSearchText(entry.title);
  const description = normalizeSearchText(entry.description);
  const keywords = normalizeSearchText((entry.keywords || []).join(' '));
  const haystack = `${title} ${description} ${keywords}`;

  if (!tokens.every((token) => haystack.includes(token))) return -1;

  return tokens.reduce((score, token) => {
    if (title === token) return score + 12;
    if (title.startsWith(token)) return score + 8;
    if (title.includes(token)) return score + 5;
    if (keywords.includes(token)) return score + 3;
    return score + 1;
  }, 0);
}

function createSearchNavigation() {
  const topbar = document.querySelector('.topbar');
  const topActions = topbar?.querySelector('.top-actions');
  if (!topbar || !topActions || topbar.querySelector('.site-search')) return;

  loadSearchStyles();

  const search = document.createElement('div');
  search.className = 'site-search';
  search.innerHTML = `
    <label class="visually-hidden" for="site-search-input">搜尋課程筆記</label>
    <span class="site-search-icon" aria-hidden="true">⌕</span>
    <input
      id="site-search-input"
      class="site-search-input"
      type="search"
      inputmode="search"
      autocomplete="off"
      placeholder="搜尋筆記，例如：父子物件、Collider"
      aria-autocomplete="list"
      aria-controls="site-search-results"
      aria-expanded="false"
    >
    <span class="site-search-shortcut" aria-hidden="true">Ctrl K</span>
    <div id="site-search-results" class="site-search-results" role="listbox" hidden></div>
  `;

  topbar.insertBefore(search, topActions);

  const input = search.querySelector('.site-search-input');
  const results = search.querySelector('.site-search-results');
  let entries = [];
  let activeIndex = -1;

  function closeResults() {
    results.hidden = true;
    results.replaceChildren();
    activeIndex = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function setActiveIndex(nextIndex) {
    const options = [...results.querySelectorAll('[role="option"]')];
    if (!options.length) return;

    activeIndex = (nextIndex + options.length) % options.length;
    options.forEach((option, index) => {
      const isActive = index === activeIndex;
      option.classList.toggle('is-active', isActive);
      option.setAttribute('aria-selected', String(isActive));
    });

    const activeOption = options[activeIndex];
    input.setAttribute('aria-activedescendant', activeOption.id);
    activeOption.scrollIntoView({ block: 'nearest' });
  }

  function renderResults() {
    const query = normalizeSearchText(input.value);
    const tokens = query.split(' ').filter(Boolean);

    if (!tokens.length) {
      closeResults();
      return;
    }

    const visibleEntries = entries
      .map((entry) => ({ entry, score: getSearchScore(entry, tokens) }))
      .filter(({ score }) => score >= 0)
      .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, 'zh-Hant'))
      .slice(0, 8)
      .map(({ entry }) => entry);

    results.replaceChildren();
    activeIndex = -1;

    if (!visibleEntries.length) {
      const empty = document.createElement('p');
      empty.className = 'site-search-empty';
      empty.textContent = '找不到符合的筆記。可能是還沒寫，不是搜尋框在鬧脾氣。';
      results.append(empty);
    } else {
      visibleEntries.forEach((entry, index) => {
        const option = document.createElement('a');
        option.id = `site-search-option-${index}`;
        option.className = 'site-search-result';
        option.href = new URL(entry.url, siteRootUrl).href;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');

        const section = document.createElement('span');
        section.className = 'site-search-section';
        section.textContent = entry.section || '課程筆記';

        const title = document.createElement('strong');
        title.textContent = entry.title;

        const description = document.createElement('small');
        description.textContent = entry.description || '';

        option.append(section, title, description);
        option.addEventListener('mousemove', () => setActiveIndex(index));
        results.append(option);
      });
    }

    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  fetch(new URL('search-index.json', siteRootUrl))
    .then((response) => {
      if (!response.ok) throw new Error(`Search index request failed: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      entries = Array.isArray(data) ? data : [];
      if (input.value.trim()) renderResults();
    })
    .catch((error) => {
      console.error('無法載入搜尋索引：', error);
    });

  input.addEventListener('input', renderResults);
  input.addEventListener('focus', () => {
    if (input.value.trim()) renderResults();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.hidden) renderResults();
      setActiveIndex(activeIndex + 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.hidden) renderResults();
      setActiveIndex(activeIndex - 1);
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const target = results.querySelectorAll('[role="option"]')[activeIndex];
      target?.click();
      return;
    }

    if (event.key === 'Escape') {
      closeResults();
      input.blur();
    }
  });

  document.addEventListener('click', (event) => {
    if (!search.contains(event.target)) closeResults();
  });

  document.addEventListener('keydown', (event) => {
    const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k';
    if (!isShortcut) return;

    event.preventDefault();
    input.focus();
    input.select();
  });
}

createSearchNavigation();
