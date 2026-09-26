/**
 * SafeHtmlFrame — shows an email body without letting it do anything.
 *
 * The guarantee is the browser's, not ours:
 *   - sandbox WITHOUT allow-scripts   → no JavaScript can run, at all
 *   - sandbox WITHOUT allow-same-origin → the email gets an opaque origin, so
 *     it can never read the HMS page, its token or its cookies
 *   - a CSP inside the frame           → nothing is fetched from the network
 *     (tracking pixels, remote fonts, CSS) unless the user presses
 *     "Load images"; images the email carries itself arrive as data: URIs
 *   - <base target="_blank"> + allow-popups(-to-escape-sandbox) → links open
 *     in a normal new tab instead of inside the frame
 * The backend also strips scripts/handlers (utils/mailRender.sanitizeHtml) as
 * a second layer.
 */
const SafeHtmlFrame = ({ html, allowRemote = false, title = 'Email message' }) => {
  const remote = allowRemote ? ' https: http:' : '';
  const csp = `default-src 'none'; img-src data:${remote}; style-src 'unsafe-inline'${remote}; font-src data:${remote}; media-src data:${remote}`;
  const doc = `<!doctype html><html><head><meta charset="utf-8">`
    + `<meta http-equiv="Content-Security-Policy" content="${csp}">`
    + `<base target="_blank">`
    + `<style>html,body{margin:0}body{padding:14px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.55;color:#1f2937;word-wrap:break-word;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%}pre{white-space:pre-wrap}a{color:#1d4ed8}blockquote{margin:0 0 0 8px;padding-left:10px;border-left:3px solid #e5e7eb;color:#4b5563}</style>`
    + `</head><body>${html || ''}</body></html>`;
  return (
    <iframe
      title={title}
      srcDoc={doc}
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      className="h-full w-full border-0 bg-white"
    />
  );
};

export default SafeHtmlFrame;
