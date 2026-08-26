import { Link } from 'react-router-dom'
import { LOCATION, NAV_LINKS, SOCIALS } from '../data/site'

export function Footer() {
  return (
    <footer className="border-t border-border bg-ivory-deep">
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-10">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <p className="font-display text-2xl text-ink">Mathilde Lecomte</p>
            <p className="mt-2 text-sm text-ink-soft">Photographe indépendante — {LOCATION}</p>
          </div>

          <nav aria-label="Plan du site">
            <p className="text-xs tracking-[0.2em] text-ink-faint uppercase">Navigation</p>
            <ul className="mt-4 space-y-2 text-sm">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-ink-soft hover:text-terracotta">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/mentions-legales" className="text-ink-soft hover:text-terracotta">
                  Mentions légales
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <p className="text-xs tracking-[0.2em] text-ink-faint uppercase">Suivre</p>
            <ul className="mt-4 space-y-2 text-sm">
              {SOCIALS.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ink-soft hover:text-terracotta"
                  >
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-16 text-xs text-ink-faint">
          © {new Date().getFullYear()} Mathilde Lecomte. Tous droits réservés.
        </p>
      </div>
    </footer>
  )
}
