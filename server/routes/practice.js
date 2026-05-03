import express from 'express'
import { getAllTopics } from '../services/topicCache.js'
import { generateProblem } from '../services/problemGenerator.js'
import { generateProblemEn } from '../services/problemGeneratorEn.js'
import { renderLandingPage, renderPracticePage, renderTopicsPage } from '../services/seoMeta.js'

export function createPracticeRouter(pool) {
  const r = express.Router()

  function urlSlugToSlug(urlSlug) {
    return urlSlug.replace(/-/g, '_')
  }

  r.get('/', (_req, res) => {
    res.type('html').send(renderLandingPage('ru'))
  })

  r.get('/en', (_req, res) => {
    res.redirect(308, '/en/')
  })

  r.get('/en/', (_req, res) => {
    res.type('html').send(renderLandingPage('en'))
  })

  r.get('/topics', async (_req, res) => {
    const topics = await getAllTopics(pool)
    res.type('html').send(renderTopicsPage(topics, 'ru'))
  })

  r.get('/en/topics', async (_req, res) => {
    const topics = await getAllTopics(pool)
    res.type('html').send(renderTopicsPage(topics, 'en'))
  })

  r.get('/practice/:urlSlug', async (req, res) => {
    const slug = urlSlugToSlug(req.params.urlSlug)
    const topics = await getAllTopics(pool)
    const topic = topics.find((t) => t.slug === slug)
    if (!topic) return res.status(404).send('Not found')
    res.type('html').send(renderPracticePage(topic, 'ru', generateProblem, generateProblemEn))
  })

  r.get('/en/practice/:urlSlug', async (req, res) => {
    const slug = urlSlugToSlug(req.params.urlSlug)
    const topics = await getAllTopics(pool)
    const topic = topics.find((t) => t.slug === slug)
    if (!topic) return res.status(404).send('Not found')
    res.type('html').send(renderPracticePage(topic, 'en', generateProblem, generateProblemEn))
  })

  return r
}
