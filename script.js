// ==========================================================================
// 1. GLOBALE FUNKTIONEN (THEMING, SICHERHEIT & LESEZEIT)
// ==========================================================================

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeUI(next);

  // Falls wir uns auf dem Hub befinden, Kacheln mit den passenden Theme-Farben neu rendern
  if (typeof window.reRenderHub === 'function') {
    window.reRenderHub();
  }
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

  // Event-Listener für Theme-Toggle Button (erhöht CSP-Sicherheit, da kein inline onclick im HTML nötig)
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }
});

function secureUrl(url) {
  if (!url) return '';
  return url.replace(/^http:\/\//i, 'https://');
}

function secureHtmlContent(html) {
  if (!html) return '';
  return html.replace(/src="http:\/\//gi, 'src="https://').replace(/href="http:\/\//gi, 'href="https://');
}

// Bildgrößen-Steuerung für Blogger (s600 = Thumbnails, s1600 = Detailansicht)
function optimizeBloggerImage(url, targetSize = 's600') {
  if (!url) return '';
  const secure = secureUrl(url);
  return secure.replace(/\/(s\d+([a-z0-9\-]+)?|w\d+-h\d+([a-z0-9\-]+)?)\//gi, `/${targetSize}/`);
}

// Performance-optimierte Lesezeitberechnung ohne DOM-Reflows
function calculateReadingTime(htmlContent) {
  if (!htmlContent) return 1;
  const plainText = htmlContent.replace(/<[^>]*>/g, ' ');
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(wordCount / 200);
  return minutes < 1 ? 1 : minutes;
}

// Hilfsfunktion zur schnellen Text-Snippeterstellung
function extractPlainText(htmlContent, maxLength = 90) {
  if (!htmlContent) return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  ['.feed-links', '.post-footer', '.blogger-post-footer', 'a[href*="blogspot.com"]'].forEach(s => {
    tempDiv.querySelectorAll(s).forEach(el => el.remove());
  });
  let text = (tempDiv.textContent || tempDiv.innerText || '')
    .replace(/Abonnieren Kommentare zum Post \(Atom\)/gi, '')
    .replace(/Post-Feed/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}


// ==========================================================================
// 2. LOGIK FÜR DEN HUB (index.html)
// ==========================================================================

function initHub() {
  const CACHE_KEY = 'tikaei_hub_cache_v2';
  const CACHE_TIME_KEY = 'tikaei_hub_cache_time_v2';
  const CACHE_TTL = 15 * 60 * 1000; // 15 Minuten Caching

  const blogs = [
    { type: 'photo', label: 'Photo', feedUrl: 'https://tikaeiphoto.blogspot.com', internalUrl: 'photography.html', defaultImg: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEg7YFm6gWkAe3q0Z895Lz-duCnSNC57BDfjyGuqmE9h1IY1-61cIIv8_oqJ4qQAO9VOh9W4UYWkWUMHKAWJ2mJBce9rmR-hoOx4PD62oEvwtcVY0ZiMm-FFwHtpuq2v1_mYXbSTbOP4pUDibVVSDJ_BUR0YBaySY0nOvGZ3FLssyFkiGg/s600/image1786059224' },
    { type: 'music', label: 'Music', feedUrl: 'https://tikaeimusic.blogspot.com', internalUrl: 'music.html', defaultImg: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgrkKhFBsgAfmbq7niitl-mGWCHmHvdbH3WDiVs8eT4C51RQRSc7oqW3uozNqxPzpVPIy_C0Nqshtjm7nOE_5u3BOV61jUtMZunh9fh3L5rodv_T578JiuCBUiqvdi0fPRgUzWQFSNHCJzAaXZRWD7h7spltZmDr7pBuCeiDSVf73GLkT8/s600/image1786059015' },
    { type: 'moto', label: 'Moto', feedUrl: 'https://tikaeimoto.blogspot.com', internalUrl: 'moto.html', defaultImg: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhMpwX-Tqpp7W1ThEJjoZHxgUKZ7101jTeV-ToefUyiENYt8BJKhjbBpPKTNJmakhrMJLqw9nmCG0AKLK4LH8TE5vg-PoSbRO6ZGU7Ab7aiOeTFSyzyKVDCYSlormvcbBOeGh3m-GTSemYGCAXTWWukpo7KvgQkl7esgFHcf7-WnuUEyg/s600/image1786059289' }
  ];

  // Farbschema für die Kacheln der einzelnen Blogs
  const blogColorMap = {
    photo: {
      light: { accent: '#1a73e8', bg: '#e8f0fe' },
      dark:  { accent: '#8ab4f8', bg: '#1f3762' }
    },
    music: {
      light: { accent: '#b51200', bg: '#fce8e6' },
      dark:  { accent: '#f28b82', bg: '#521814' }
    },
    moto: {
      light: { accent: '#0b8043', bg: '#e6f4ea' },
      dark:  { accent: '#81c995', bg: '#113822' }
    }
  };

  // 1. Sofortiges Rendern aus dem Cache
  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
  if (cachedData && cachedTime && (Date.now() - parseInt(cachedTime, 10) < CACHE_TTL)) {
    try {
      const cachedPosts = JSON.parse(cachedData);
      if (Array.isArray(cachedPosts) && cachedPosts.length > 0) {
        renderHubPosts(cachedPosts.slice(0, 8));
      }
    } catch (e) {
      console.error('Hub Cache Read Error:', e);
    }
  }

  // 2
