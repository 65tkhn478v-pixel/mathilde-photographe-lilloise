import * as Checkbox from '@radix-ui/react-checkbox'
import { Link } from 'react-router-dom'
import { INSTAGRAM_MAX_LENGTH, MESSAGE_MAX_LENGTH, NAME_MAX_LENGTH } from '../../../shared/booking.js'
import { Button } from '../Button'
import { FieldError } from '../ui/Notice'
import { StepHeading, linkClasses } from './shared'

// Mêmes styles de champ que le formulaire de contact.
const inputClasses =
  'mt-2 w-full border-0 border-b border-ink/25 bg-transparent px-0 py-2.5 text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none aria-[invalid=true]:border-ink'

function Field({ name, label, required, hint, error, children }) {
  const describedBy = [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div>
      <label htmlFor={`field-${name}`} className="block text-sm text-ink">
        {label} {required ? <span aria-hidden="true">*</span> : <span className="italic">(facultatif)</span>}
      </label>
      {children({ id: `field-${name}`, 'aria-describedby': describedBy, 'aria-invalid': error ? 'true' : undefined })}
      {hint && (
        <p id={`${name}-hint`} className="mt-2 text-sm text-ink italic">
          {hint}
        </p>
      )}
      <FieldError id={`${name}-error`}>{error}</FieldError>
    </div>
  )
}

export function StepDetails({ values, onChange, errors, onNext, onBack, focusOnMount }) {
  const update = (field) => (e) => onChange({ ...values, [field]: e.target.value })
  const errorCount = Object.keys(errors).length

  const submit = (e) => {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={submit} noValidate>
      <StepHeading focusOnMount={focusOnMount}>Vos coordonnées</StepHeading>
      <p className="mt-4 text-sm text-ink">
        Les champs marqués <span aria-hidden="true">*</span>
        <span className="sr-only">d’un astérisque</span> sont obligatoires.
      </p>

      <div aria-live="polite" className="sr-only">
        {errorCount > 0 && `${errorCount} champ${errorCount > 1 ? 's sont' : ' est'} à corriger.`}
      </div>

      <div className="mt-8 space-y-7">
        <div className="grid gap-7 sm:grid-cols-2">
          <Field name="first_name" label="Prénom" required error={errors.first_name}>
            {(props) => (
              <input
                {...props}
                type="text"
                autoComplete="given-name"
                maxLength={NAME_MAX_LENGTH}
                value={values.first_name}
                onChange={update('first_name')}
                className={inputClasses}
              />
            )}
          </Field>
          <Field name="last_name" label="Nom" required error={errors.last_name}>
            {(props) => (
              <input
                {...props}
                type="text"
                autoComplete="family-name"
                maxLength={NAME_MAX_LENGTH}
                value={values.last_name}
                onChange={update('last_name')}
                className={inputClasses}
              />
            )}
          </Field>
        </div>

        <Field name="email" label="Adresse mail" required error={errors.email}>
          {(props) => (
            <input
              {...props}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={values.email}
              onChange={update('email')}
              className={inputClasses}
            />
          )}
        </Field>

        <Field
          name="phone"
          label="Téléphone"
          hint="Pratique pour vous recontacter rapidement."
          error={errors.phone}
        >
          {(props) => (
            <input
              {...props}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={values.phone}
              onChange={update('phone')}
              className={inputClasses}
            />
          )}
        </Field>

        <Field
          name="instagram"
          label="Instagram"
          hint="Si vous préférez que je vous écrive sur Instagram"
          error={errors.instagram}
        >
          {(props) => (
            <div className="relative">
              <span aria-hidden="true" className="pointer-events-none absolute bottom-2.5 left-0 font-sans text-ink">
                @
              </span>
              <input
                {...props}
                type="text"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="votre.compte"
                maxLength={INSTAGRAM_MAX_LENGTH + 90}
                value={values.instagram}
                onChange={update('instagram')}
                className={inputClasses.replace('px-0', 'pr-0 pl-5')}
              />
            </div>
          )}
        </Field>

        <Field
          name="message"
          label="Message"
          hint={`${values.message.length} / ${MESSAGE_MAX_LENGTH} caractères`}
          error={errors.message}
        >
          {(props) => (
            <textarea
              {...props}
              rows={5}
              placeholder="Dites-m’en un peu plus : qui êtes-vous, ce que vous imaginez pour cette séance, vos envies, vos questions…"
              maxLength={MESSAGE_MAX_LENGTH}
              value={values.message}
              onChange={update('message')}
              className={inputClasses}
            />
          )}
        </Field>

        {/* Champ piège anti-robot : invisible et ignoré par les humains. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="field-website">Site web</label>
          <input
            id="field-website"
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={update('website')}
          />
        </div>

        <div>
          <div className="flex items-start gap-3">
            <Checkbox.Root
              id="field-consent"
              checked={values.consent}
              onCheckedChange={(checked) => onChange({ ...values, consent: checked === true })}
              aria-invalid={errors.consent ? 'true' : undefined}
              aria-describedby={errors.consent ? 'consent-error' : undefined}
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-ink bg-paper text-paper data-[state=checked]:bg-ink"
            >
              <Checkbox.Indicator>
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                  <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Checkbox.Indicator>
            </Checkbox.Root>
            <label htmlFor="field-consent" className="text-sm text-ink">
              J’accepte que mes informations soient utilisées pour traiter ma demande.{' '}
              <span aria-hidden="true">*</span>{' '}
              {/* Nouvel onglet : la saisie en cours n'est pas perdue. */}
              <Link to="/mentions-legales#donnees-personnelles" target="_blank" rel="noopener" className={linkClasses}>
                En savoir plus<span className="sr-only"> (s’ouvre dans un nouvel onglet)</span>
              </Link>
            </label>
          </div>
          <FieldError id="consent-error">{errors.consent}</FieldError>
        </div>
      </div>

      <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="secondary" onClick={onBack}>
          Retour
        </Button>
        <button
          type="submit"
          className="font-label inline-flex items-center justify-center gap-2 rounded-sm border border-ink bg-ink px-7 py-3.5 text-sm tracking-wide text-paper uppercase transition duration-200 hover:opacity-90"
        >
          Continuer
        </button>
      </div>
    </form>
  )
}
