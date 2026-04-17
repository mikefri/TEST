export default async function handler(req, res) {
  // Autoriser uniquement GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing ?url= parameter' });
  }

  // Sécurité minimale : n'accepter que des URLs http/https
  let targetUrl;
  try {
    targetUrl = new URL(url);
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IPTVPlayer/1.0)',
      },
      // Timeout de 15 secondes
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Upstream server returned ${response.status}`,
      });
    }

    const text = await response.text();

    // Vérification basique que c'est bien un fichier M3U
    if (!text.includes('#EXTM3U')) {
      return res.status(422).json({ error: 'Not a valid M3U file' });
    }

    // Headers CORS + cache court (5 min)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

    return res.status(200).send(text);
  } catch (err) {
    const msg = err.name === 'TimeoutError'
      ? 'Request timed out (15s)'
      : err.message;
    return res.status(502).json({ error: msg });
  }
}
