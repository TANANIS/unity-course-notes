const practiceRoot = document.querySelector('[data-practice-list]');

async function loadPracticeData() {
  const response = await fetch('data/practice.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Practice data request failed: ${response.status}`);
  return response.json();
}

function createPracticeCard(item) {
  const card = document.createElement(item.url ? 'a' : 'article');
  card.className = 'practice-card';
  if (item.url) card.href = item.url;

  const meta = document.createElement('div');
  meta.className = 'practice-card-meta';
  meta.textContent = item.category || '自主練習';

  const title = document.createElement('h2');
  title.textContent = item.title || '未命名練習';

  const description = document.createElement('p');
  description.textContent = item.description || '';

  const footer = document.createElement('div');
  footer.className = 'practice-card-footer';
  footer.innerHTML = `<span>${item.status || '規劃中'}</span>${item.url ? '<strong>查看 →</strong>' : ''}`;

  card.append(meta, title, description, footer);
  return card;
}

async function renderPracticeList() {
  if (!practiceRoot) return;

  try {
    const data = await loadPracticeData();
    const items = Array.isArray(data.items) ? data.items : [];
    document.querySelector('[data-practice-title]')?.replaceChildren(document.createTextNode(data.title || '自主練習'));
    const description = document.querySelector('[data-practice-description]');
    if (description) description.textContent = data.description || '';

    if (!items.length) {
      practiceRoot.innerHTML = `
        <div class="practice-empty">
          <span class="eyebrow">EMPTY FOR NOW</span>
          <h2>這裡還沒有練習。</h2>
          <p>之後 C# 小題、Unity API 實驗、迷你功能或自己的測試專案都放這裡。沒有內容時就老實空著，不用拿 placeholder 假裝很充實。</p>
        </div>`;
      return;
    }

    practiceRoot.replaceChildren(...items.map(createPracticeCard));
  } catch (error) {
    console.error('無法載入自主練習資料：', error);
    practiceRoot.innerHTML = '<div class="practice-empty"><h2>自主練習資料載入失敗。</h2></div>';
  }
}

renderPracticeList();
