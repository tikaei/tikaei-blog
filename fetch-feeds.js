const fs = require('fs');

const BLOGS = [
  { 
    type: 'photo', 
    label: 'Photo', 
    feedUrl: 'https://tikaeiphoto.blogspot.com', 
    internalUrl: 'photography.html', 
    defaultImg: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEg7YFm6gWkAe3q0Z895Lz-duCnSNC57BDfjyGuqmE9h1IY1-61cIIv8_oqJ4qQAO9VOh9W4UYWkWUMHKAWJ2mJBce9rmR-hoOx4PD62oEvwtcVY0ZiMm-FFwHtpuq2v1_mYXbSTbOP4pUDibVVSDJ_BUR0YBaySY0nOvGZ3FLssyFkiGg/s600/image1786059224' 
  },
  { 
    type: 'music', 
    label: 'Music', 
    feedUrl: 'https://tikaeimusic.blogspot.com', 
    internalUrl: 'music.html', 
    defaultImg: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgrkKhFBsgAfmbq7niitl-mGWCHmHvdbH3WDiVs8eT4C51RQRSc7oqW3uozNqxPzpVPIy_C0Nqshtjm7nOE_5u3BOV61jUtMZunh9fh3L5rodv_T578JiuCBUiqvdi0fPRgUzWQFSNHCJzAaXZRWD7h7spltZmDr7pBuCeiDSVf73GLkT8/s600/image1786059015' 
  },
  { 
    type: 'moto', 
    label: 'Moto', 
    feedUrl: 'https://tikaeimoto.blogspot.com', 
    internalUrl: 'moto.html', 
    defaultImg: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhMpwX-Tqpp7W1ThEJjoZHxgUKZ7101jTeV-ToefUyiENYt8BJKhjbBpPKTNJmakhrMJLqw9nmCG0AKLK4LH8TE5vg-PoSbRO6ZGU7Ab7aiOeTFSyzyKVDCYSlormvcbBOeGh3m-GTSemYGCAXTWWukpo7KvgQkl7esgFHcf7-WnuUEyg/s600/image1786059289' 
  }
];

function secureUrl(url) {
  if (!url) return '';
  return url.replace(/^http:\/\//i, 'https://');
}

function secureHtmlContent(html) {
  if (!html) return '';
  return html.replace(/src="http:\/\//gi, 'src="https://').replace(/href="http:\/\//gi, 'href="https://');
}

function optimizeBloggerImage(url, targetSize = 's600') {
  if (!url) return '';
  const secure = secureUrl(url);
  return secure.replace(/\/(s\d+([a-z0-9\-]+)?|w\d+-h\d+([a-z0-9\-]+)?)\//gi, `/${targetSize}/`);
}

function extractPlainText(htmlContent, maxLength = 90) {
  if (!htmlContent) return '';
  let text = htmlContent
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/Abonnieren Kommentare zum Post \(Atom\)/gi, '')
    .replace(/Post-Feed/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

async function fetchAllFeeds() {
  console.log('Starte das Abrufen der Blogger-Feeds für GitHub Pages...');
  const allPosts = [];

  for (const blog of BLOGS) {
    try {
      const feedUrl = `${blog.feedUrl}/feeds/posts/default?alt=json&max-results=20`;
      const response = await fetch(feedUrl);
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      const data = await response.json();

      const entries = data.feed?.entry || [];
      entries.forEach(entry => {
        const rawId = entry.id ? entry.id.$t : '';
        const postIdMatch = rawId.match(/post-(\d+)/);
        const postId = postIdMatch ? postIdMatch : '';

        let postUrl = '';
        if (entry.link) {
          const alt = entry.link.find(l => l.rel === 'alternate');
          if (alt) postUrl = secureUrl(alt.href);
        }

        let title = entry.title ? entry.title.$t : 'Beitrag';
        let pubDate = entry.published ? entry.published.$t : (entry.updated ? entry.updated.$t : '');
        let content = secureHtmlContent(entry.content ? entry.content.$t : (entry.summary ? entry.summary.$t : ''));

        let imageUrl = '';
        if (content) {
          const matchImg = content.match(/<img[^>]+src="([^">]+)"/i);
          if (matchImg) imageUrl = matchImg[1];
        }
        if (!imageUrl && entry.media$thumbnail?.url) imageUrl = entry.media$thumbnail.url;
        imageUrl = optimizeBloggerImage(imageUrl || blog.defaultImg, 's600');

        const plainSnippet = extractPlainText(content, 90);
        const searchableText = (title + ' ' + plainSnippet).toLowerCase();

        allPosts.push({
          postId,
          postUrl,
          title,
          pubDate,
          content,
          imageUrl,
          plainSnippet,
          searchableText,
          defaultImg: blog.defaultImg,
          blogType: blog.type,
          blogLabel: blog.label,
          targetUrl: blog.internalUrl
        });
      });
    } catch (error) {
      console.error(`Fehler beim Abrufen von ${blog.feedUrl}:`, error.message);
    }
  }

  // Deduplizieren & Nach Datum sortieren (neueste zuerst)
  const map = new Map();
  allPosts.forEach(p => {
    const key = (p.title + '_' + (p.postUrl || p.postId)).toLowerCase().trim();
    if (!map.has(key)) map.set(key, p);
  });
  const uniquePosts = Array.from(map.values());
  uniquePosts.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  fs.writeFileSync('./posts.json', JSON.stringify(uniquePosts, null, 2));
  console.log(`Erfolgreich ${uniquePosts.length} Beiträge in posts.json gespeichert.`);
}

fetchAllFeeds();
