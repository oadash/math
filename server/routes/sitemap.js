import express from 'express'
import { getAllTopics } from '../services/topicCache.js'

export function createSitemapRouter(pool) {
  const r = express.Router()

  r.get('/sitemap.xml', async (req, res) => {
    if (!pool) {
      res
        .status(503)
        .set('Retry-After', '300')
        .type('application/xml')
        .send('<?xml version="1.0"?><urlset/>')
      return
    }
    const topics = await getAllTopics(pool)
    const base = 'https://trainmath.fyi'

    const urls = [
      { loc: base, priority: '1.0' },
      { loc: `${base}/topics`, priority: '0.9' },
      { loc: `${base}/en/topics`, priority: '0.9' },
      ...topics.flatMap((t) => {
        const urlSlug = t.slug.replace(/_/g, '-')
        return [
          { loc: `${base}/practice/${urlSlug}`, priority: '0.8' },
          { loc: `${base}/en/practice/${urlSlug}`, priority: '0.8' },
        ]
      }),
    ]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <priority>${u.priority}</priority>
    <changefreq>monthly</changefreq>
  </url>`,
  )
  .join('\n')}
</urlset>`

    res.header('Content-Type', 'application/xml')
    res.send(xml)
  })

  r.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(
      `User-agent: *
Allow: /
Disallow: /api/
Sitemap: https://trainmath.fyi/sitemap.xml`,
    )
  })

  return r
}
