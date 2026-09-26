const fs = require('fs');

// Ersetze diese URLs durch die echten Feed-URLs deiner Blogger-Blogs
const BLOG_FEEDS = [
  'https://tikaeimoto.blogspot.com/feeds/posts/default?alt=json&max-results=5',
  'https://tikaeimusic.blogspot.com/feeds/posts/default?alt=json&max-results=5',
  'https://tikaeiphoto.blogspot.com/feeds/posts/default?alt=json&max-results=5'
];

async function fetchAllFeeds() {
  console.log('Starte das Abrufen der Blogger-Feeds...');
  const allPosts = [];

  for (const url of BLOG_FEEDS) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      const data = await response.json();
      
      const entries = data.feed.entry || [];
      entries.forEach(entry => {
        // Findet den korrekten Link zum Blogpost
        const alternateLink = entry.link.find(l => l.rel === 'alternate');
        
        allPosts.push({
          title: entry.title.$t,
          url: alternateLink ? alternateLink.href : '#',
          published: entry.published.$t,
          snippet: entry.summary ? entry.summary.$t : '',
          // Erstes Bild extrahieren falls vorhanden
          thumbnail: entry.media$thumbnail ? entry.media$thumbnail.url : null
        });
      });
    } catch (error) {
      console.error(`Fehler beim Abrufen von ${url}:`, error.message);
    }
  }

  // Nach Datum sortieren (neueste zuerst)
  allPosts.sort((a, b) => new Date(b.published) - new Date(a.published));

  // Als statische JSON-Datei speichern
  fs.writeFileSync('./posts.json', JSON.stringify(allPosts, null, 2));
  console.log(`Erfolgreich ${allPosts.length} Beiträge in posts.json gespeichert.`);
}

fetchAllFeeds();
