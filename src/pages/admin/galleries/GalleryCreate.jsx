import { useState } from 'react'
import clsx from 'clsx'
import { api } from '../../../lib/api'
import { useApiData } from '../../../lib/useApiData'
import { GALLERY_RETENTION, GALLERY_SESSION_TYPES, INCLUDED_CHOICES, INCLUDED_MAX, INCLUDED_MIN } from '../../../../shared/galleries.js'
import { addDays, dateKey, formatDayFull } from '../../../../shared/time.js'
import { sessionLabel } from '../../../../shared/booking.js'
import { FieldError, Notice } from '../../../components/ui/Notice'
import { adminButton, apiErrorMessage, inputClasses, labelClasses } from '../adminUi'

const today = () => dateKey(new Date())

export function GalleryCreate({ onCreated, onCancel, onExpired }) {
  const [values, setValues] = useState({
    client_name: '',
    client_email: '',
    session_type: 'grossesse',
    shoot_date: today(),
    included_count: 30,
    selection_deadline: addDays(today(), GALLERY_RETENTION.selectionDays),
    booking_id: null,
  })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [pickBooking, setPickBooking] = useState(false)
  const bookings = useApiData(pickBooking ? '/api/admin/galleries/bookings' : null, {
    onError: (err) => apiErrorMessage(err, onExpired),
  })
  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }))

  const fromBooking = (b) => {
    setValues((v) => ({
      ...v,
      client_name: `${b.first_name} ${b.last_name}`,
      client_email: b.email,
      session_type: b.session_type,
      shoot_date: dateKey(new Date(b.start_at)),
      booking_id: b.id,
    }))
    setPickBooking(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const data = await api('/api/admin/galleries', {
        method: 'POST',
        body: { ...values, included_count: Number(values.included_count) },
      })
      onCreated(data.gallery, data.code)
    } catch (err) {
      setErrors(err.data?.errors ?? {})
      const message = apiErrorMessage(err, onExpired)
      if (message) setError(message)
    } finally {
      setBusy(false)
    }
  }

  const field = (name, label, input, hint) => (
    <div>
      <label htmlFor={`g-${name}`} className={labelClasses}>
        {label}
      </label>
      {input}
      {hint && <p className="mt-1 text-xs italic">{hint}</p>}
      <FieldError id={`g-${name}-error`}>{errors[name]}</FieldError>
    </div>
  )
  const aria = (name) => ({
    id: `g-${name}`,
    'aria-invalid': errors[name] ? 'true' : undefined,
    'aria-describedby': errors[name] ? `g-${name}-error` : undefined,
  })

  return (
    <form onSubmit={submit} noValidate className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl text-ink">Nouvelle galerie</h2>
        <button type="button" className={adminButton('quiet')} onClick={onCancel}>
          ← Retour aux galeries
        </button>
      </div>

      <div>
        <button type="button" className={adminButton('outline')} onClick={() => setPickBooking((v) => !v)}>
          Depuis une réservation
        </button>
        {pickBooking && (
          <div className="mt-3 border border-line p-3">
            {!bookings.data && <p className="text-sm italic">Chargement…</p>}
            {bookings.data?.bookings.length === 0 && <p className="text-sm italic">Aucune réservation confirmée récente.</p>}
            <ul className="divide-y divide-line">
              {bookings.data?.bookings.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => fromBooking(b)} className="min-h-11 w-full py-2 text-left text-sm hover:bg-mist/30">
                    {b.first_name} {b.last_name} — {sessionLabel(b.session_type)}, {formatDayFull(b.start_at)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {values.booking_id && <p className="mt-2 text-sm italic">Préremplie depuis une réservation confirmée.</p>}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {field('client_name', 'Nom du client', <input {...aria('client_name')} value={values.client_name} onChange={set('client_name')} className={inputClasses} autoComplete="off" />)}
        {field(
          'client_email',
          'Email du client',
          <input {...aria('client_email')} type="email" value={values.client_email} onChange={set('client_email')} className={inputClasses} autoComplete="off" />
        )}
        {field(
          'session_type',
          'Type de séance',
          <select {...aria('session_type')} value={values.session_type} onChange={set('session_type')} className={inputClasses}>
            {GALLERY_SESSION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        )}
        {field('shoot_date', 'Date du shooting', <input {...aria('shoot_date')} type="date" value={values.shoot_date} onChange={set('shoot_date')} className={inputClasses} />)}
      </div>

      <fieldset>
        <legend className={labelClasses}>Photos retouchées incluses</legend>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {INCLUDED_CHOICES.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={Number(values.included_count) === n}
              onClick={() => setValues((v) => ({ ...v, included_count: n }))}
              className={clsx(
                'font-label min-h-11 min-w-14 rounded-sm border px-3 text-sm',
                Number(values.included_count) === n ? 'border-ink bg-ink text-paper' : 'border-structure text-ink hover:border-ink'
              )}
            >
              {n}
            </button>
          ))}
          <label className="flex items-center gap-2 text-sm">
            ou
            <input
              {...aria('included_count')}
              type="number"
              min={INCLUDED_MIN}
              max={INCLUDED_MAX}
              value={values.included_count}
              onChange={set('included_count')}
              className="w-20 border-0 border-b border-ink/25 bg-transparent py-2 text-ink focus:border-accent focus:outline-none"
              aria-label="Nombre de photos incluses"
            />
          </label>
        </div>
        <FieldError id="g-included_count-error">{errors.included_count}</FieldError>
      </fieldset>

      {field(
        'selection_deadline',
        'Date limite de sélection',
        <input {...aria('selection_deadline')} type="date" min={today()} value={values.selection_deadline} onChange={set('selection_deadline')} className={inputClasses} />,
        `Par défaut : aujourd’hui + ${GALLERY_RETENTION.selectionDays} jours (durée à valider).`
      )}

      <div aria-live="polite">{error && <Notice tone="error">{error}</Notice>}</div>
      <button type="submit" disabled={busy} className={adminButton('solid')}>
        {busy ? 'Création…' : 'Créer la galerie'}
      </button>
    </form>
  )
}
