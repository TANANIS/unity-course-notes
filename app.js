const root = document.documentElement;
const themeToggle = document.querySelector('#theme-toggle');
const themeKey = 'unity-notes-theme';
const checklistKey = 'unity-notes-checklist';
const chapterKey = 'unity-notes-open-chapters-v2';
const appScriptUrl = new URL(document.currentScript?.src || 'app.js', window.location.href);
const siteRootUrl = new URL('./', appScriptUrl);
const courseDataUrl = new URL('data/course.json', siteRootUrl);

let courseDataPromise;

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

function getCourseData() {
  if (courseDataPromise) return courseDataPromise;

  courseDataPromise = fetch(courseDataUrl, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`Course data request failed: ${response.status}`);
      return response.json();
    })
    .catch((error) => {
      console.error('無法載入課程資料：', error);
      throw error;
    });

  return courseDataPromise;
}

function getAllLessons(data) {
  return (data.sections || []).flatMap((section) =>
    (section.lessons || []).map((lesson) => ({ ...lesson, section }))
  );
}

function getCompletedLessons(data) {
  return getAllLessons(data)
    .filter((lesson) => Boolean(lesson.url))
    .sort((a, b) => a.courseLessonNumber - b.courseLessonNumber);
}

function getSectionProgress(section) {
  const lessons = section.lessons || [];
  const completed = lessons.filter((lesson) => lesson.url).length;

  if (section.notePolicy === 'none') return section.summary || `${section.lessonCount} 堂`;
  if (!lessons.length) return `0 / ${section.lessonCount}｜${section.duration || '尚未開始'}`;
  if (completed >= section.lessonCount) return `已整理 ${completed} / ${section.lessonCount}｜本節完成`;
  if (completed > 0) {
    const latest = [...lessons].filter((lesson) => lesson.url).sort((a, b) => b.courseLessonNumber - a.courseLessonNumber)[0];
    return `已整理 ${completed} / ${section.lessonCount}｜至第 ${latest.courseLessonNumber} 堂`;
  }
  return `0 / ${section.lessonCount}｜尚未開始`;
}

function createLessonRow(lesson) {
  if (!lesson.url) {
    const row = document.createElement('div');
    row.className = 'lesson-row disabled';
    row.innerHTML = '<span class="lesson-state">○</span><span><strong></strong><small></small></span>';
    row.querySelector('strong').textContent = `${lesson.id.replace('-', '_')} ${lesson.title}`;
    row.querySelector('small').textContent = lesson.duration || '待整理';
    return row;
  }

  const link = document.createElement('a');
  link.className = 'lesson-row available';
  link.href = new URL(lesson.url, siteRootUrl).href;
  link.innerHTML = '<span class="lesson-state">✓</span><span><strong></strong><small>已有筆記</small></span><span class="lesson-enter">閱讀 →</span>';
  link.querySelector('strong').textContent = `${lesson.courseLessonNumber}. ${lesson.id.replace('-', '_')} ${lesson.title}`;
  return link;
}

function createChapter(section, latestSectionId) {
  const details = document.createElement('details');
  details.className = 'chapter';
  details.dataset.sectionKey = section.id;
  details.open = section.id === latestSectionId;

  const summary = document.createElement('summary');
  summary.innerHTML = '<span class="chapter-index"></span><span class="chapter-title"><strong></strong><small></small></span><span class="chapter-arrow" aria-hidden="true">⌄</span>';
  summary.querySelector('.chapter-index').textContent = String(section.number).padStart(2, '0');
  summary.querySelector('strong').textContent = `第 ${section.number} 節：${section.title}`;
  summary.querySelector('small').textContent = getSectionProgress(section);
  details.append(summary);

  const list = document.createElement('div');
  list.className = 'lesson-list';

  if (section.notePolicy === 'none') {
    list.classList.add('muted-lessons');
    const row = document.createElement('div');
    row.className = 'lesson-row disabled';
    row.innerHTML = '<span class="lesson-state">–</span><span><strong>本節不建立筆記</strong><small></small></span>';
    row.querySelector('small').textContent = section.noteMessage || '保留課程位置即可。';
    list.append(row);
  } else if (section.lessons?.length) {
    section.lessons.forEach((lesson) => list.append(createLessonRow(lesson)));
  } else {
    list.classList.add('muted-lessons');
    const row = document.createElement('div');
    row.className = 'lesson-row disabled';
    row.innerHTML = '<span class="lesson-state">○</span><span><strong>本章尚未開始</strong><small></small></span>';
    row.querySelector('small').textContent = `${section.lessonCount} 堂課${section.duration ? `｜${section.duration}` : ''}`;
    list.append(row);
  }

  details.append(list);
  return details;
}

function configureChapterState() {
  const chapters = [...document.querySelectorAll('details.chapter')];
  if (!chapters.length) return;

  const savedChapters = readJson(chapterKey, []);
  if (savedChapters.length) {
    chapters.forEach((chapter) => {
      chapter.open = savedChapters.includes(chapter.dataset.sectionKey);
    });
  }

  chapters.forEach((chapter) => {
    chapter.addEventListener('toggle', () => {
      const openKeys = chapters.filter((item) => item.open).map((item) => item.dataset.sectionKey);
      localStorage.setItem(chapterKey, JSON.stringify(openKeys));
    });
  });
}

function renderCourseCurriculum(data) {
  const curriculum = document.querySelector('[data-course-curriculum]');
  if (!curriculum) return;

  const completed = getCompletedLessons(data);
  const latestSectionId = completed.at(-1)?.section.id || data.sections?.[0]?.id;
  curriculum.replaceChildren(...(data.sections || []).map((section) => createChapter(section, latestSectionId)));
  configureChapterState();
}

function syncStaticCourseStats(data) {
  const completed = getCompletedLessons(data);
  const totalCourseLessons = data.course?.lessonCount || 0;
  const totalNoteCount = completed.length;
  const progressPercent = totalCourseLessons ? Math.min(100, (totalNoteCount / totalCourseLessons) * 100) : 0;
  const latest = completed.at(-1);

  document.querySelectorAll('[data-note-count]').forEach((element) => {
    element.textContent = String(totalNoteCount);
  });
  document.querySelectorAll('[data-note-count-label]').forEach((element) => {
    element.textContent = `${totalNoteCount} 堂筆記`;
  });
  document.querySelectorAll('[data-note-progress-text]').forEach((element) => {
    element.textContent = `${totalNoteCount} / ${totalCourseLessons}`;
  });
  document.querySelectorAll('[data-note-progress-track]').forEach((element) => {
    element.style.width = `${progressPercent}%`;
  });
  document.querySelectorAll('[data-note-progress]').forEach((element) => {
    element.setAttribute('aria-label', `課程筆記進度 ${totalNoteCount} 之 ${totalCourseLessons}`);
  });
  document.querySelectorAll('[data-course-section-count]').forEach((element) => {
    element.textContent = String(data.sections?.length || 0);
  });
  document.querySelectorAll('[data-course-lesson-count]').forEach((element) => {
    element.textContent = String(totalCourseLessons);
  });
  document.querySelectorAll('[data-latest-note]').forEach((element) => {
    element.textContent = latest
      ? `目前整理至：第 ${latest.section.number} 節，第 ${latest.courseLessonNumber} 堂。`
      : '目前尚未建立課程筆記。';
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

async function loadSearchEntries(data) {
  const response = await fetch(new URL('search-index.json', siteRootUrl), { cache: 'no-store' });
  if (!response.ok) throw new Error(`Search index request failed: ${response.status}`);

  const manualEntries = await response.json();
  const entries = Array.isArray(manualEntries) ? [...manualEntries] : [];
  const knownUrls = new Set(entries.map((entry) => entry.url));

  getCompletedLessons(data).forEach((lesson) => {
    if (knownUrls.has(lesson.url)) return;
    entries.push({
      title: `${lesson.id.replace('-', '_')} ${lesson.title}`,
      section: `LESSON ${lesson.courseLessonNumber}`,
      description: lesson.description || '',
      url: lesson.url,
      keywords: [lesson.id, lesson.id.replace('-', '_'), ...(lesson.keywords || []), 'Unity 課程筆記', 'C#']
    });
  });

  return entries;
}

function createSearchNavigation(data) {
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
      placeholder="搜尋筆記，例如：變數、Collider" aria-autocomplete="list"
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
        option.innerHTML = '<span class="site-search-section"></span><strong></strong><small></small>';
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

  loadSearchEntries(data)
    .then((loadedEntries) => {
      entries = loadedEntries;
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

function configureLessonPagination(data) {
  const pagination = document.querySelector('.note-pagination');
  if (!pagination) return;

  const match = location.pathname.match(/\/notes\/(ch\d+)-(\d+)\.html$/);
  if (!match) return;

  const currentId = `${match[1]}-${Number(match[2])}`;
  const completed = getCompletedLessons(data);
  const currentIndex = completed.findIndex((lesson) => lesson.id === currentId);
  if (currentIndex < 0) return;

  const previousButton = pagination.querySelector('a:not(.next)');
  const nextButton = pagination.querySelector('.next');
  const previousLesson = completed[currentIndex - 1];
  const nextLesson = completed[currentIndex + 1];

  if (previousButton) {
    previousButton.href = previousLesson
      ? new URL(previousLesson.url, siteRootUrl).href
      : new URL('course.html', siteRootUrl).href;
    previousButton.querySelector('small').textContent = previousLesson ? '上一堂' : '返回';
    previousButton.querySelector('strong').textContent = previousLesson
      ? `← ${previousLesson.id.replace('-', '_')} ${previousLesson.title}`
      : '← 課程目錄';
  }

  if (nextButton) {
    nextButton.href = nextLesson
      ? new URL(nextLesson.url, siteRootUrl).href
      : new URL('course.html', siteRootUrl).href;
    nextButton.querySelector('small').textContent = nextLesson ? '下一堂' : '完成';
    nextButton.querySelector('strong').textContent = nextLesson
      ? `${nextLesson.id.replace('-', '_')} ${nextLesson.title} →`
      : '返回課程目錄';
  }
}

async function bootstrapCourseDataFeatures() {
  try {
    const data = await getCourseData();
    syncStaticCourseStats(data);
    renderCourseCurriculum(data);
    createSearchNavigation(data);
    configureLessonPagination(data);
  } catch {
    const curriculum = document.querySelector('[data-course-curriculum]');
    if (curriculum) {
      curriculum.innerHTML = '<div class="lesson-row disabled">課程資料載入失敗。頁面內容仍可直接閱讀。</div>';
    }
  }
}

repairKnownImageSources();
bootstrapCourseDataFeatures();
