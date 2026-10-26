// Informations vérifiées auprès de la cliente (voir brief). Ne rien inventer
// ici : tarifs, avis, adresse précise, année de création, etc. n'existent
// pas encore et ne doivent pas apparaître sur le site.

// Domaine de production (voir aussi
// index.html, public/sitemap.xml, public/robots.txt).
export const SITE_URL = 'https://mathilde-photographe-lilloise.lunaa-studio.fr'

export const SITE_NAME = 'Mathilde Lecomte — Photographe'

export const TAGLINE = 'Des instants vrais, pour des souvenirs tendres'

export const HOOK =
  "J'immortalise vos plus beaux souvenirs — Grossesse • Naissance • Famille • Mariage — Lille | Nord"

// TODO: adresse mail de contact — les messages du formulaire sont envoyés
// ici via un lien mailto (pas de backend/formulaire tiers configuré pour
// l'instant, voir src/components/ContactForm.jsx).
export const CONTACT_EMAIL = 'lecomtemathildeproo@gmail.com'

export const LOCATION = 'Lille | Nord'

export const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/math_photographelilloise',
    handle: '@math_photographelilloise',
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@math_photographelilloise',
    handle: '@math_photographelilloise',
  },
  {
    label: 'Pinterest',
    href: 'https://www.pinterest.com/mathildelecomte_photographe',
    handle: 'mathildelecomte_photographe',
  },
]

export const NAV_LINKS = [
  { label: 'Accueil', to: '/' },
  { label: 'À propos', to: '/a-propos' },
  { label: 'Portfolio', to: '/portfolio' },
  { label: 'Services', to: '/services' },
  { label: 'Contact', to: '/contact' },
]

// Lien de réservation (/reserver), mis en avant à part dans la navigation.
export const BOOKING_LINK = { label: 'Réserver', to: '/reserver' }

// Types de séance du formulaire de contact — grossesse / mariage / portrait
// / naissance repris tels quels du formulaire existant, "famille" ajouté
// explicitement comme demandé par le brief (mentionné dans le discours de
// la cliente mais absent du formulaire Pixieset d'origine).
export const SHOOTING_TYPES = [
  { value: 'grossesse', label: 'Grossesse' },
  { value: 'naissance', label: 'Naissance' },
  { value: 'famille', label: 'Famille' },
  { value: 'mariage', label: 'Mariage' },
  { value: 'portrait', label: 'Portrait individuel' },
]
