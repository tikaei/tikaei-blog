function loadGTM() {
  if (window.gtmLoaded) return;
  window.gtmLoaded = true;

  const script = document.createElement('script');
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-GNER6HTD1X';
  script.async = true;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-GNER6HTD1X');
}

// Erst bei Interaktion oder nach 3 Sekunden laden
['touchstart', 'scroll', 'mousemove', 'keydown'].forEach(evt => {
  window.addEventListener(evt, loadGTM, { once: true, passive: true });
});
setTimeout(loadGTM, 3000);
