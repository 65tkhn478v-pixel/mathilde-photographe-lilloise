import { Link } from 'react-router-dom'
import { BOOKING_LINK, LOCATION, NAV_LINKS, SOCIALS } from '../data/site'
import { InstagramIcon, PinterestIcon, TikTokIcon } from './SocialIcons'

const SOCIAL_ICONS = {
  Instagram: InstagramIcon,
  TikTok: TikTokIcon,
  Pinterest: PinterestIcon,
}

export function Footer() {
  return (
    // bg-paper plutôt que bg-mist : le footer porte des liens de
    // navigation réels (texte courant, pas juste décoratif) — voir note de
    // contraste #7C644C/#EADCC8 dans index.css.
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-10">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <p className="font-display text-2xl text-ink">Mathilde Lecomte</p>
            <p className="mt-2 text-sm text-ink-soft">Photographe indépendante — {LOCATION}</p>
          </div>

          <nav aria-label="Plan du site">
            <p className="font-label text-xs tracking-[0.2em] text-ink-faint uppercase">Navigation</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link to={BOOKING_LINK.to} className="text-ink-soft hover:text-accent">
                  Réserver une séance
                </Link>
              </li>
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-ink-soft hover:text-accent">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/mentions-legales" className="text-ink-soft hover:text-accent">
                  Mentions légales
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <p className="font-label text-xs tracking-[0.2em] text-ink-faint uppercase">Suivre</p>
            <ul className="mt-4 flex items-center gap-4">
              {SOCIALS.map((social) => {
                const Icon = SOCIAL_ICONS[social.label]
                return (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${social.label} de Mathilde Lecomte`}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-ink hover:text-ink"
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <p className="mt-16 text-sm text-ink-faint">
          © {new Date().getFullYear()} Mathilde Lecomte. Tous droits réservés.
        </p>
      </div>
    </footer>
  )
}
