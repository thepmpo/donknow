// Preserve literal $ sequences in compiled code: String.replace replacement
// strings interpret $&, $`, and $'. A callback keeps the bundle byte-correct.
export async function inlineBuild(html, readAsset) {
  for (const match of [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g)]) {
    const script = await readAsset(match[1]);
    html = html.replace(match[0], () => `<script type="module">${script.replace(/<\/script/gi, '<\\/script')}</script>`);
  }
  for (const match of [...html.matchAll(/<link[^>]*href="([^"]+\.css)"[^>]*>/g)]) {
    const css = await readAsset(match[1]);
    html = html.replace(match[0], () => `<style>${css}</style>`);
  }
  return html.replaceAll('/assets/', './assets/');
}
