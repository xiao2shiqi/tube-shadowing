export function openInEudic(rawWord: string): void {
  if (!rawWord) return;
  const cleanWord = rawWord.trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
  if (!cleanWord) return;

  const urlScheme = `eudic://dict/${encodeURIComponent(cleanWord)}`;
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = urlScheme;
  document.body.appendChild(iframe);

  setTimeout(() => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }, 1000);
}
