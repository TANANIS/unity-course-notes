const root = document.documentElement;
const themeToggle = document.querySelector('#theme-toggle');
const themeKey = 'unity-notes-theme';
const checklistKey = 'unity-notes-checklist';
const chapterKey = 'unity-notes-open-chapters';
const appScriptUrl = new URL(document.currentScript?.src || 'app.js', window.location.href);
const siteRootUrl = new URL('./', appScriptUrl);

// 新增 notes/ch1-N.html 後，只要把這個數字改成最新的 N。
// 課程目錄、首頁進度、搜尋入口與下一堂按鈕都會自動同步。
const LATEST_NOTE = 8;
const FIRST_COURSE_LESSON_NUMBER = 4;
const TOTAL_COURSE_LESSONS = 200;

let lessonMetadataPromise;

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

function getLessonMetadata() {
  if (lessonMetadataPromise) return lessonMetadataPromise;

  const noteNumbers = Array.from({ length: LATEST_NOTE }, (_, index) => index + 1);
  lessonMetadataPromise = Promise.all(noteNumbers.map(async (noteNumber) => {
    const url = new URL(`notes/ch1-${noteNumber}.html`, siteRootUrl);

    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const documentFragment = new DOMParser().parseFromString(html, 'text/html');
      const title = documentFragment.querySelector('h1')?.textContent?.trim() || `ch1_${noteNumber}`;
      const description = documentFragment.querySelector('meta[name="description"]')?.content?.trim() || '';
      const lessonLabel = documentFragment.querySelector('.lesson-kicker span')?.textContent?.trim()
        || `LESSON ${FIRST_COURSE_LESSON_NUMBER + noteNumber - 1}`;

      return {
        noteNumber,
        courseLessonNumber: FIRST_COURSE_LESSON_NUMBER + noteNumber - 1,
        title,
        description,
        lessonLabel,
        url: `notes/ch1-${noteNumber}.html`
      };
    } catch (error) {
      console.error(`無法讀取 ch1_${noteNumber}：`, error);
      return null;
    }
  })).then((items) => items.filter(Boolean));

  return lessonMetadataPromise;
}

function syncStaticCourseStats() {
  const progressPercent = Math.min(100, (LATEST_NOTE / TOTAL_COURSE_LESSONS) * 100);
  const latestCourseLesson = FIRST_COURSE_LESSON_NUMBER + LATEST_NOTE - 1;

  document.querySelectorAll('[data-note-count]').forEach((element) => {
    element.textContent = String(LATEST_NOTE);
  });

  document.querySelectorAll('[data-note-count-label]').forEach((element) => {
    element.textContent = `${LATEST_NOTE} 堂筆記`;
  });

  document.querySelectorAll('[data-note-progress-text]').forEach((element) => {
    element.textContent = `${LATEST_NOTE} / ${TOTAL_COURSE_LESSONS}`;
  });

  document.querySelectorAll('[data-note-progress-track]').forEach((element) => {
    element.style.width = `${progressPercent}%`;
  });

  document.querySelectorAll('[data-note-progress]').forEach((element) => {
    element.setAttribute('aria-label', `課程筆記進度 ${LATEST_NOTE} 之 ${TOTAL_COURSE_LESSONS}`);
  });

  document.querySelectorAll('[data-note-section-progress]').forEach((element) => {
    element.textContent = `已整理 ${LATEST_NOTE} 堂｜至第 ${latestCourseLesson} 堂`;
  });

  document.querySelectorAll('[data-latest-note]').forEach((element) => {
    element.textContent = `目前整理至：第 2 節，第 ${latestCourseLesson} 堂。`;
  });
}

function createLessonRow(lesson) {
  const link = document.createElement('a');
  link.className = 'lesson-row available';
  link.href = new URL(lesson.url, siteRootUrl).href;

  const state = document.createElement('span');
  state.className = 'lesson-state';
  state.textContent = '✓';

  const copy = document.createElement('span');
  const title = document.createElement('strong');
  title.textContent = `${lesson.courseLessonNumber}. ${lesson.title}`;
  const meta = document.createElement('small');
  meta.textContent = '已有筆記';
  copy.append(title, meta);

  const enter = document.createElement('span');
  enter.className = 'lesson-enter';
  enter.textContent = '閱讀 →';

  link.append(state, copy, enter);
  return link;
}

function syncCourseLessonList() {
  const lessonList = document.querySelector('[data-auto-lesson-list]');
  if (!lessonList) return;

  getLessonMetadata().then((lessons) => {
    lessonList.replaceChildren(...lessons.map(createLessonRow));

    if (!lessons.length) {
      const empty = document.createElement('div');
      empty.className = 'lesson-row disabled';
      empty.textContent = '目前讀不到任何筆記頁面。這次不是你漏看，是網站真的沒抓到。';
      lessonList.append(empty);
    }
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

async function loadSearchEntries() {
  const [indexResponse, lessons] = await Promise.all([
    fetch(new URL('search-index.json', siteRootUrl)),
    getLessonMetadata()
  ]);

  if (!indexResponse.ok) throw new Error(`Search index request failed: ${indexResponse.status}`);
  const manualEntries = await indexResponse.json();
  const entries = Array.isArray(manualEntries) ? manualEntries : [];
  const knownUrls = new Set(entries.map((entry) => entry.url));

  lessons.forEach((lesson) => {
    if (knownUrls.has(lesson.url)) return;
    entries.push({
      title: lesson.title,
      section: lesson.lessonLabel,
      description: lesson.description,
      url: lesson.url,
      keywords: [`ch1_${lesson.noteNumber}`, `ch1-${lesson.noteNumber}`, 'Unity 課程筆記']
    });
  });

  return entries;
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
    <input id="site-search-input" class="site-search-input" type="search" inputmode="search" autocomplete="off"
      placeholder="搜尋筆記，例如：父子物件、Collider" aria-autocomplete="list"
      aria-controls="site-search-results" aria-expanded="false">
    <span class="site-search-shortcut" aria-hidden="true">Ctrl K</span>
    <div id="site-search-results" class="site-search-results" role="listbox" hidden></div>`;
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
    if (!tokens.length) return closeResults();

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
        option.innerHTML = `<span class="site-search-section"></span><strong></strong><small></small>`;
        option.querySelector('.site-search-section').textContent = entry.section || '課程筆記';
        option.querySelector('strong').textContent = entry.title;
        option.querySelector('small').textContent = entry.description || '';
        option.addEventListener('mousemove', () => setActiveIndex(index));
        results.append(option);
      });
    }
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  loadSearchEntries()
    .then((data) => {
      entries = data;
      if (input.value.trim()) renderResults();
    })
    .catch((error) => console.error('無法載入搜尋索引：', error));

  input.addEventListener('input', renderResults);
  input.addEventListener('focus', () => input.value.trim() && renderResults());
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.hidden) renderResults();
      setActiveIndex(activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.hidden) renderResults();
      setActiveIndex(activeIndex - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      results.querySelectorAll('[role="option"]')[activeIndex]?.click();
    } else if (event.key === 'Escape') {
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

function repairKnownImageSources() {
  const replacements = new Map([
    ['scene-tools-overlay.png', 'scene-tools-overlay.svg'],
    ['transform-inspector.png', 'transform-inspector.svg']
  ]);

  document.querySelectorAll('.lesson-figure img').forEach((image) => {
    const fileName = image.src.split('/').pop();
    const replacement = replacements.get(fileName);
    if (replacement) image.src = image.src.replace(fileName, replacement);

    image.addEventListener('error', () => {
      const fallback = document.createElement('div');
      fallback.className = 'image-fallback';
      fallback.setAttribute('role', 'img');
      fallback.setAttribute('aria-label', image.alt || '圖片載入失敗');
      fallback.textContent = image.alt ? `圖片暫時無法載入：${image.alt}` : '圖片暫時無法載入';
      image.replaceWith(fallback);
    }, { once: true });
  });
}

function configureLessonPagination() {
  const pagination = document.querySelector('.note-pagination');
  const nextButton = pagination?.querySelector('.next');
  if (!pagination || !nextButton) return;

  const match = location.pathname.match(/\/notes\/ch1-(\d+)\.html$/);
  if (!match) return;

  const currentNumber = Number(match[1]);
  const nextNumber = currentNumber + 1;

  if (nextNumber > LATEST_NOTE) {
    nextButton.href = new URL('course.html', siteRootUrl).href;
    nextButton.querySelector('small').textContent = '完成';
    nextButton.querySelector('strong').textContent = '返回課程目錄';
    return;
  }

  getLessonMetadata().then((lessons) => {
    const nextLesson = lessons.find((lesson) => lesson.noteNumber === nextNumber);
    nextButton.href = new URL(`notes/ch1-${nextNumber}.html`, siteRootUrl).href;
    nextButton.querySelector('small').textContent = '下一堂';
    nextButton.querySelector('strong').textContent = `${nextLesson?.title || `ch1_${nextNumber}`} →`;
  });
}

syncStaticCourseStats();
syncCourseLessonList();
createSearchNavigation();
repairKnownImageSources();
configureLessonPagination();
