// --- 1. GLOBALE FUNKTIONEN (THEMING, SICHERHEIT & LESEZEIT) ---

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeUI(next);
}

function updateThemeUI(theme) {
  const icon = document.getElementById('theme-icon');
  const text = document.getElementById('theme-text');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  if (text) text.textContent = theme === 'dark' ? 'Light' : 'Dark';
}

window.addEventListener('DOMContentLoaded', () => {
  const activeTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'light';
  updateThemeUI(activeTheme);
});

function secureUrl(url) {
  if (!url) return '';
  return url.replace(/^http:\/\//i, 'https://');
}

function secureHtmlContent(html) {
  if (!html) return '';
  return html.replace(/src="http:\/\//gi, 'src="https://').replace(/href="http:\/\//gi, 'href="https://');
}

function calculateReadingTime(htmlContent) {
  if (!htmlContent) return 1;
  const temp = document.createElement('div');
  temp.innerHTML = htmlContent;
  const text = temp.textContent || temp.innerText || '';
  const wordCount = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(wordCount / 200);
  return minutes < 1 ? 1 : minutes;
}


// --- 2. LOGIK FÜR DEN HUB (index.html) ---

function initHub() {
  const blogs = [
    { type: 'photo', label: 'Photo', feedUrl: 'https://tikaeiphoto.blogspot.com', internalUrl: 'photography.html', defaultImg: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEg7YFm6gWkAe3q0Z895Lz-duCnSNC57BDfjyGuqmE9h1IY1-61cIIv8_oqJ4qQAO9VOh9W4UYWkWUMHKAWJ2mJBce9rmR-hoOx4PD62oEvwtcVY0ZiMm-FFwHtpuq2v1_mYXbSTbOP4pUDibVVSDJ_BUR0YBaySY0nOvGZ3FLssyFkiGg/s600/image1786059224' },
    { type: 'music', label: 'Music', feedUrl: 'https://tikaeimusic.blogspot.com', internalUrl: 'music.html', defaultImg: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgrkKhFBsgAfmbq7niitl-mGWCHmHvdbH3WDiVs8eT4C51RQRSc7oqW3uozNqxPzpVPIy_C0Nqshtjm7nOE_5u3BOV61jUtMZunh9fh3L5rodv_T578JiuCBUiqvdi0fPRgUzWQFSNHCJzAaXZRWD7h7spltZmDr7pBuCeiDSVf73GLkT8/s600/image1786059015' },
    { type: 'moto', label: 'Moto', feedUrl: 'https://tikaeimoto.blogspot.com', internalUrl: 'moto.html', defaultImg: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhMpwX-Tqpp7W1ThEJjoZHxgUKZ7101jTeV-ToefUyiENYt8BJKhjbBpPKTNJmakhrMJLqw9nmCG0AKLK4LH8TE5vg-PoSbRO6ZGU7Ab7aiOeTFSyzyKVDCYSlormvcbBOeGh3m-GTSemYGCAXTWWukpo7KvgQkl7esgFHcf7-WnuUEyg/s600/image1786059289' }
  ];

  let allPosts = [];
  let loadedCount = 0;

  blogs.forEach(blog => {
    const callbackName = 'blogger_cb_' + blog.type + '_' + Math.floor(Math.random() * 1000000);
    window[callbackName] = function(data) {
      if (data?.feed?.entry) {
        data.feed.entry.forEach(entry => {
          const rawId = entry.id.$t;
          const postIdMatch = rawId.match(/post-(\d+)/);
          const postId = postIdMatch ? postIdMatch : '';
          let postUrl = '';
          if (entry.link) {
            const alt = entry.link.find(l => l.rel === 'alternate');
            if (alt) postUrl = secureUrl(alt.href);
          }
          let title = entry.title ? entry.title.$t : 'Beitrag';
          let pubDate = entry.published ? entry.published.$t : (entry.updated ? entry.updated.$t : '');
          let content = entry.content ? entry.content.$t : (entry.summary ? entry.summary.$t : '');
          let imageUrl = '';
          if (content) {
            const tempEl = document.createElement('div');
            tempEl.innerHTML = content;
            const imgEl = tempEl.querySelector('img');
            if (imgEl && imgEl.src) imageUrl = imgEl.src;
          }
          if (!imageUrl && entry.media$thumbnail?.url) imageUrl = entry.media$thumbnail.url;
          imageUrl = secureUrl(imageUrl ? imageUrl.replace(/\/(s\d+([a-z0-9\-]+)?|w\d+-h\d+([a-z0-9\-]+)?)\//gi, '/s600/') : blog.defaultImg);

          allPosts.push({
            postId, postUrl, title, pubDate, content, imageUrl,
            defaultImg: blog.defaultImg,
            blogType: blog.type,
            blogLabel: blog.label,
            targetUrl: blog.internalUrl
          });
        });
      }
      loadedCount++;
      if (loadedCount === blogs.length) {
        allPosts.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        renderHubPosts(allPosts.slice(0, 8));
      }
      delete window[callbackName];
    };

    const script = document.createElement('script');
    script.src = `${blog.feedUrl}/feeds/posts/default?alt=json-in-script&callback=${callbackName}&max-results=15`;
    script.onerror = () => {
      loadedCount++;
      if (loadedCount === blogs.length) {
        allPosts.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        renderHubPosts(allPosts.slice(0, 8));
      }
    };
    document.body.appendChild(script);
  });

  function renderHubPosts(postsToDisplay) {
    const container = document.getElementById('tikaei-posts');
    if (!container) return;
    if (postsToDisplay.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted)">Keine Beiträge gefunden.</div>';
      return;
    }
    container.innerHTML = postsToDisplay.map(item => {
      let dateStr = '';
      if (item.pubDate) {
        const dateObj = new Date(item.pubDate);
        if (!isNaN(dateObj)) dateStr = dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
      const readingTime = calculateReadingTime(item.content);

      let tempDiv = document.createElement('div');
      tempDiv.innerHTML = item.content;
      ['.feed-links', '.post-footer', '.blogger-post-footer', 'a[href*="blogspot.com"]'].forEach(s => {
        tempDiv.querySelectorAll(s).forEach(el => el.remove());
      });
      let plainText = (tempDiv.textContent || tempDiv.innerText || '')
        .replace(/Abonnieren Kommentare zum Post \(Atom\)/gi, '')
        .replace(/Post-Feed/gi, '')
        .trim();
      if (plainText.length > 90) plainText = plainText.substring(0, 90) + '...';

      const finalLink = item.postUrl ? `${item.targetUrl}?postUrl=${encodeURIComponent(item.postUrl)}` : item.targetUrl;

      return `
        <a href="${finalLink}" class="card blog-${item.blogType}">
          <div class="card-img-wrapper">
            <img class="card-img" src="${item.imageUrl}" alt="${item.title}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.src='${item.defaultImg}'; this.classList.add('loaded');">
          </div>
          <div class="card-body">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span class="card-date">${dateStr} &bull; ⏱️ ${readingTime} Min.</span>
                <span class="tikaei-tag">${item.blogLabel}</span>
              </div>
              <h3 class="card-title">${item.title}</h3>
              <div class="card-snippet">${plainText}</div>
            </div>
            <div>
              <span class="card-btn">Beitrag lesen &rarr;</span>
            </div>
          </div>
        </a>
      `;
    }).join('');
  }

  const searchInput = document.getElementById('global-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase().trim();
      if (query === '') {
        renderHubPosts(allPosts.slice(0, 8));
        return;
      }
      const filtered = allPosts.filter(post => {
        const titleMatch = post.title.toLowerCase().includes(query);
        const temp = document.createElement('div');
        temp.innerHTML = post.content;
        const text = (temp.textContent || temp.innerText || '').toLowerCase();
        return titleMatch || text.includes(query);
      });
      renderHubPosts(filtered);
    });
  }
}


// --- 3. LOGIK FÜR DIE EINZELNEN BLOG-SEITEN (photography, music, moto) ---

function initBlogReader(feedUrl, defaultThumb) {
  let loadedPosts = [];
  let currentActivePost = null;

  const callbackName = 'reader_cb_' + Math.floor(Math.random() * 1000000);
  window[callbackName] = function(data) {
    const gridView = document.getElementById('grid-view');
    if (!gridView) return;
    if (!data?.feed?.entry) { gridView.innerHTML = '<div>Keine Beiträge gefunden.</div>'; return; }

    loadedPosts = data.feed.entry.map(entry => {
      const rawId = entry.id.$t;
      const postIdMatch = rawId.match(/post-(\d+)/);
      const postId = postIdMatch ? postIdMatch : '';
      let postUrl = '';
      if (entry.link) {
        const alt = entry.link.find(l => l.rel === 'alternate');
        if (alt) postUrl = secureUrl(alt.href);
      }
      let title = entry.title ? entry.title.$t : 'Ohne Titel';
      let pubDate = entry.published ? entry.published.$t : '';
      let content = secureHtmlContent(entry.content ? entry.content.$t : (entry.summary ? entry.summary.$t : ''));
      let imageUrl = '';
      if (content) {
        const temp = document.createElement('div');
        temp.innerHTML = content;
        const img = temp.querySelector('img');
        if (img) imageUrl = img.src;
      }
      if (!imageUrl && entry.media$thumbnail) imageUrl = entry.media$thumbnail.url;
      imageUrl = secureUrl(imageUrl ? imageUrl.replace(/\/(s\d+([a-z0-9\-]+)?|w\d+-h\d+([a-z0-9\-]+)?)\//gi, '/s600/') : defaultThumb);
      return { postId, postUrl, title, pubDate, content, imageUrl };
    });

    renderGrid(loadedPosts);

    const urlParams = new URLSearchParams(window.location.search);
    const autoOpenUrl = urlParams.get('postUrl');
    if (autoOpenUrl) {
      const postIndex = loadedPosts.findIndex(p => p.postUrl === decodeURIComponent(autoOpenUrl));
      if (postIndex !== -1) openPost(postIndex);
    }
    delete window[callbackName];
  };

  const script = document.createElement('script');
  script.src = `${feedUrl}/feeds/posts/default?alt=json-in-script&callback=${callbackName}&max-results=20`;
  document.body.appendChild(script);

  window.filterPosts = function() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    const filtered = loadedPosts.filter(post => {
      const titleMatch = post.title.toLowerCase().includes(query);
      const temp = document.createElement('div');
      temp.innerHTML = post.content;
      const text = (temp.textContent || temp.innerText || '').toLowerCase();
      return titleMatch || text.includes(query);
    });
    renderGrid(filtered);
  };

  function renderGrid(postsToRender) {
    const gridView = document.getElementById('grid-view');
    if (!gridView) return;
    gridView.innerHTML = '';
    if (postsToRender.length === 0) { gridView.innerHTML = '<div>Keine passenden Beiträge gefunden.</div>'; return; }

    postsToRender.forEach(post => {
      const originalIndex = loadedPosts.findIndex(p => p.postId === post.postId);
      let dateStr = '';
      if (post.pubDate) {
        const d = new Date(post.pubDate);
        if (!isNaN(d)) dateStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }

      const readingTime = calculateReadingTime(post.content);

      const temp = document.createElement('div');
      temp.innerHTML = post.content;
      let text = temp.textContent || temp.innerText || '';
      if (text.length > 90) text = text.substring(0, 90) + '...';

      const card = document.createElement('div');
      card.className = 'card';
      card.onclick = () => openPost(originalIndex);
      card.innerHTML = `
        <div class="card-img-wrapper"><img class="card-img" src="${post.imageUrl}" alt="${post.title}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.src='${defaultThumb}'; this.classList.add('loaded');"></div>
        <div class="card-body">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span class="card-date">${dateStr}</span>
              <span class="card-date">⏱️ ${readingTime} Min.</span>
            </div>
            <h3 class="card-title">${post.title}</h3>
            <div class="card-snippet">${text}</div>
          </div>
          <div class="card-btn">Beitrag lesen &rarr;</div>
        </div>
      `;
      gridView.appendChild(card);
    });
  }

  window.openPost = function(index) {
    const post = loadedPosts[index];
    if (!post) return;
    currentActivePost = post;

    document.getElementById('search-wrapper').style.display = 'none';
    document.getElementById('grid-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';

    // Adressleiste sofort säubern (entfernt ?postUrl=... vollkommen unsichtbar)
    window.history.replaceState({}, '', window.location.pathname);

    const readingTime = calculateReadingTime(post.content);

    document.getElementById('article-title').textContent = post.title;
    if (post.pubDate) {
      const d = new Date(post.pubDate);
      document.getElementById('article-date').textContent = d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }) + ' \u2022 ⏱️ ' + readingTime + ' Min. Lesezeit';
    }
    document.getElementById('article-body').innerHTML = post.content;
    loadComments(feedUrl, post.postId);
    if (post.postUrl) {
      document.getElementById('blogger-comment-link').href = secureUrl(post.postUrl) + '#comment-form';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.showGrid = function() {
    currentActivePost = null;
    document.getElementById('search-wrapper').style.display = 'block';
    document.getElementById('detail-view').style.display = 'none';
    const gridView = document.getElementById('grid-view');
    if (gridView) gridView.style.display = 'grid';
    window.history.replaceState({}, '', window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.copyPostLink = function() {
    const linkToCopy = currentActivePost && currentActivePost.postUrl ? currentActivePost.postUrl : window.location.href;

    navigator.clipboard.writeText(linkToCopy).then(() => {
      const btn = document.getElementById('copy-link-btn');
      if (btn) {
        btn.textContent = '✓ Link kopiert!';
        setTimeout(() => {
          btn.textContent = '🔗 Link kopieren';
        }, 2000);
      }
    }).catch(err => {
      console.error('Fehler beim Kopieren: ', err);
    });
  };

  function loadComments(blogFeedUrl, postId) {
    const commentsList = document.getElementById('comments-list');
    const commentCount = document.getElementById('comment-count');
    if (!commentsList) return;
    commentsList.innerHTML = '<div>Lade Kommentare...</div>';
    const callbackName = 'comment_cb_' + Math.floor(Math.random() * 1000000);

    window[callbackName] = function(data) {
      commentsList.innerHTML = '';
      if (data?.feed?.entry) {
        const comments = data.feed.entry;
        commentCount.textContent = comments.length;
        comments.forEach(c => {
          const author = c.author ? c.author[0].name.$t : 'Anonym';
          let dateStr = '';
          if (c.published) {
            const d = new Date(c.published.$t);
            dateStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
          }
          const text = secureHtmlContent(c.content ? c.content.$t : (c.summary ? c.summary.$t : ''));
          const item = document.createElement('div');
          item.style.cssText = 'background: var(--input-bg); border-radius: 8px; padding: 12px 16px; margin-bottom: 10px; border-left: 3px solid var(--accent-color);';
          item.innerHTML = `<div><strong style="font-size: 14px; color: var(--text-main);">${author}</strong> <span style="font-size: 11px; color: var(--text-muted); margin-left: 8px;">${dateStr}</span></div><div style="font-size: 14px; margin-top: 6px; color: var(--text-muted);">${text}</div>`;
          commentsList.appendChild(item);
        });
      } else {
        commentCount.textContent = '0';
        commentsList.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">Noch keine Kommentare vorhanden.</p>';
      }
      delete window[callbackName];
    };
    const script = document.createElement('script');
    script.src = `${blogFeedUrl}/feeds/${postId}/comments/default?alt=json-in-script&callback=${callbackName}`;
    script.onerror = () => { commentCount.textContent = '0'; commentsList.innerHTML = '<p style="color: var(--text-muted);">Kommentare konnten nicht geladen werden.</p>'; };
    document.body.appendChild(script);
  }
}
