import { topicIntroRu, topicIntroEn } from '../data/topicIntros.js'
import { useLang } from '../i18n/useT.js'
import { useT } from '../i18n/useT.js'

export default function IntroCard({ slug, titleRu, titleEn, onContinue }) {
  const { lang } = useLang()
  const t = useT()
  const table = lang === 'en' ? topicIntroEn : topicIntroRu
  const title = lang === 'en' ? (titleEn || titleRu) : titleRu
  const meta = table[slug] || { emoji: '📚', text: `${t('game_new_topic')}: ${title}` }

  return (
    <div className="intro-card">
      <div className="intro-card__inner">
        <div className="intro-card__emoji" aria-hidden>
          {meta.emoji}
        </div>
        <h2 className="intro-card__title">{t('intro_title')}</h2>
        <p className="intro-card__topic">{title}</p>
        <p className="intro-card__text">{meta.text}</p>
        <button type="button" className="btn btn--primary btn--xl" onClick={onContinue}>
          {t('game_intro_btn')}
        </button>
      </div>
    </div>
  )
}
