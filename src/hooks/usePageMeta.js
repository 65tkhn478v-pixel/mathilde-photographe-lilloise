import { useEffect } from 'react'
import { SITE_NAME, SITE_URL } from '../data/site'

function setMeta(name, content, attr = 'name') {
  if (!content) return
  let el = document.head.querySelector(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Met à jour le <title>, la meta description, le canonical et les balises
 * Open Graph pour la page courante (le site est une SPA React + Vite, sans
 * rendu serveur — voir README pour les limites SEO que ça implique).
 */
export function usePageMeta({ title, fullTitle: exactTitle, description, path = '/', image }) {
  useEffect(() => {
    // `fullTitle` : titre exact, sans le suffixe du nom du site.
    const fullTitle = exactTitle ?? (title ? `${title} — ${SITE_NAME}` : SITE_NAME)
    document.title = fullTitle

    setMeta('description', description)
    setMeta('og:title', fullTitle, 'property')
    setMeta('og:description', description, 'property')
    setMeta('og:url', `${SITE_URL}${path}`, 'property')
    if (image) setMeta('og:image', `${SITE_URL}${image}`, 'property')

    setCanonical(`${SITE_URL}${path}`)
  }, [title, exactTitle, description, path, image])
}
