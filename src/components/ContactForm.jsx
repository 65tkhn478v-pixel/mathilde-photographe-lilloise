import { useState } from 'react'
import { CONTACT_EMAIL, SHOOTING_TYPES } from '../data/site'

const inputClasses =
  'mt-2 w-full border-0 border-b border-ink/25 bg-transparent px-0 py-2.5 text-ink placeholder:text-ink-faint focus:border-terracotta focus:outline-none'

const initialState = {
  nom: '',
  prenom: '',
  email: '',
  date: '',
  type: '',
  message: '',
}

/**
 * Formulaire de contact — champs identiques au formulaire Pixieset actuel
 * (Nom, Prénom, Email, Date souhaitée, Type de shooting, Message).
 *
 * TODO backend : aucun service d'envoi n'est configuré pour l'instant (pas
 * de domaine, pas d'hébergement choisi — voir INFORMATIONS MANQUANTES du
 * brief). En l'état, la soumission ouvre le client mail du visiteur via un
 * lien mailto pré-rempli vers CONTACT_EMAIL (src/data/site.js). À
 * remplacer par un vrai envoi serveur (ex. Cloudflare Worker + Email
 * Routing, ou Formspree) une fois l'hébergement définitif choisi.
 */
export function ContactForm() {
  const [values, setValues] = useState(initialState)
  const [sent, setSent] = useState(false)

  const update = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()

    const typeLabel = SHOOTING_TYPES.find((t) => t.value === values.type)?.label ?? values.type

    const subject = `Demande de devis — ${typeLabel || 'séance photo'}`
    const body = [
      `Nom : ${values.nom}`,
      `Prénom : ${values.prenom}`,
      `Email : ${values.email}`,
      `Date souhaitée : ${values.date || 'non précisée'}`,
      `Type de shooting : ${typeLabel}`,
      '',
      values.message,
    ].join('\n')

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`

    setSent(true)
  }

  if (sent) {
    return (
      <div className="border border-sauge/50 bg-sauge-pale/40 px-6 py-8 text-center">
        <p className="font-display text-xl text-ink">Merci pour votre message !</p>
        <p className="mt-2 text-sm text-ink-soft">
          Votre client mail devrait s'être ouvert avec votre demande pré-remplie. S'il ne
          s'est pas ouvert, vous pouvez m'écrire directement à{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-terracotta">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-7">
      <div className="grid gap-7 sm:grid-cols-2">
        <label className="block text-sm text-ink-soft">
          Nom <span aria-hidden="true">*</span>
          <input
            type="text"
            name="nom"
            required
            value={values.nom}
            onChange={update('nom')}
            className={inputClasses}
          />
        </label>
        <label className="block text-sm text-ink-soft">
          Prénom <span aria-hidden="true">*</span>
          <input
            type="text"
            name="prenom"
            required
            value={values.prenom}
            onChange={update('prenom')}
            className={inputClasses}
          />
        </label>
      </div>

      <label className="block text-sm text-ink-soft">
        Adresse mail <span aria-hidden="true">*</span>
        <input
          type="email"
          name="email"
          required
          value={values.email}
          onChange={update('email')}
          className={inputClasses}
        />
      </label>

      <div className="grid gap-7 sm:grid-cols-2">
        <label className="block text-sm text-ink-soft">
          Date souhaitée
          <input
            type="date"
            name="date"
            value={values.date}
            onChange={update('date')}
            className={inputClasses}
          />
        </label>

        <label className="block text-sm text-ink-soft">
          Type de shooting <span aria-hidden="true">*</span>
          <select
            name="type"
            required
            value={values.type}
            onChange={update('type')}
            className={inputClasses}
          >
            <option value="" disabled>
              Choisir…
            </option>
            {SHOOTING_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm text-ink-soft">
        Votre message <span aria-hidden="true">*</span>
        <textarea
          name="message"
          required
          rows={5}
          placeholder="Donnez-moi un maximum de détails (date, lieu, ambiance souhaitée…)"
          value={values.message}
          onChange={update('message')}
          className={inputClasses}
        />
      </label>

      <p className="text-xs text-ink-faint">
        Les tarifs et disponibilités sont communiqués sur devis, en réponse à votre message.
      </p>

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-sm bg-ink px-8 py-3.5 text-sm tracking-wide text-ivory uppercase transition-colors hover:bg-terracotta"
      >
        Envoyer
      </button>
    </form>
  )
}
