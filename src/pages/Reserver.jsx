import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePageMeta } from '../hooks/usePageMeta'
import { api, ApiError } from '../lib/api'
import {
  EMAIL_MAX_LENGTH,
  EMAIL_PATTERN,
  MESSAGE_MAX_LENGTH,
  PHONE_PATTERN,
  SESSION_TYPE_VALUES,
} from '../../shared/booking.js'
import { StepSession } from '../components/booking/StepSession'
import { StepSlot } from '../components/booking/StepSlot'
import { StepDetails } from '../components/booking/StepDetails'
import { StepSummary } from '../components/booking/StepSummary'
import { BookingDone } from '../components/booking/BookingDone'

const TOTAL_STEPS = 4

const emptyDetails = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  message: '',
  consent: false,
  website: '', // champ piège anti-robot
}

/** Même règles que la validation serveur (worker/public.js). */
function validateDetails(d) {
  const errors = {}
  if (!d.first_name.trim()) errors.first_name = 'Indiquez votre prénom.'
  if (!d.last_name.trim()) errors.last_name = 'Indiquez votre nom.'
  const email = d.email.trim()
  if (!email) errors.email = 'Indiquez votre adresse mail.'
  else if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email))
    errors.email = 'Cette adresse mail ne semble pas valide (exemple : prenom@exemple.fr).'
  if (d.phone.trim() && !PHONE_PATTERN.test(d.phone.trim()))
    errors.phone = 'Ce numéro ne semble pas valide (chiffres, espaces et + uniquement).'
  if (d.message.length > MESSAGE_MAX_LENGTH) errors.message = `Votre message dépasse ${MESSAGE_MAX_LENGTH} caractères.`
  if (!d.consent) errors.consent = 'Merci de cocher la case pour que je puisse traiter votre demande.'
  return errors
}

const DETAIL_FIELDS = ['first_name', 'last_name', 'email', 'phone', 'message', 'consent']

export default function Reserver() {
  usePageMeta({
    fullTitle: 'Réserver une séance photo à Lille — Mathilde Lecomte',
    description:
      'Réservez votre séance photo portrait, famille, grossesse ou naissance à Lille : choisissez l’un des créneaux proposés par Mathilde Lecomte, photographe.',
    path: '/reserver',
    image: '/images/portfolio/grossesse/grossesse-03.webp',
  })

  const [searchParams] = useSearchParams()
  const preset = searchParams.get('seance')
  const presetValid = SESSION_TYPE_VALUES.includes(preset)

  // Depuis la page Services (?seance=grossesse) : type présélectionné, on
  // ouvre directement l'étape du créneau.
  const [step, setStep] = useState(presetValid ? 2 : 1)
  const [navigated, setNavigated] = useState(false)
  const [sessionType, setSessionType] = useState(presetValid ? preset : null)
  const [slot, setSlot] = useState(null)
  const [details, setDetails] = useState(emptyDetails)
  const [errors, setErrors] = useState({})
  const [slotNotice, setSlotNotice] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [booking, setBooking] = useState(null)
  const reduceMotion = useReducedMotion()

  const goTo = (next) => {
    setNavigated(true)
    setStep(next)
    setSubmitError(null)
  }

  const nextFromSession = () => {
    if (!sessionType) return setErrors({ session: 'Choisissez un type de séance.' })
    setErrors({})
    goTo(2)
  }

  const nextFromSlot = () => {
    if (!slot) return setErrors({ slot: 'Choisissez un créneau.' })
    setErrors({})
    setSlotNotice(null)
    goTo(3)
  }

  const nextFromDetails = () => {
    const found = validateDetails(details)
    setErrors(found)
    const first = DETAIL_FIELDS.find((f) => found[f])
    if (first) {
      document.getElementById(`field-${first}`)?.focus()
      return
    }
    goTo(4)
  }

  const onSlotChange = useCallback((value) => {
    setSlot(value)
    if (value) setErrors((e) => ({ ...e, slot: undefined }))
  }, [])

  const submit = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const data = await api('/api/bookings', {
        method: 'POST',
        body: {
          slot_id: slot.id,
          session_type: sessionType,
          first_name: details.first_name,
          last_name: details.last_name,
          email: details.email,
          phone: details.phone,
          message: details.message,
          consent: details.consent,
          website: details.website,
        },
      })
      // Récapitulatif construit à partir de ce qui a été saisi (la réponse
      // contient la référence ; elle est identique côté serveur).
      setBooking({
        reference: data.reference,
        session_type: sessionType,
        first_name: details.first_name.trim(),
        last_name: details.last_name.trim(),
        email: details.email.trim(),
        phone: details.phone.trim() || null,
        message: details.message.trim() || null,
        slot,
      })
      goTo('done')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Créneau pris entre-temps : retour au choix du créneau, coordonnées conservées.
        setSlot(null)
        setSlotNotice(`${err.message} Vos coordonnées sont conservées.`)
        goTo(2)
      } else if (err instanceof ApiError && err.status === 422 && err.data?.errors) {
        const fieldErrors = err.data.errors
        setErrors(fieldErrors)
        if (fieldErrors.slot_id) goTo(2)
        else if (fieldErrors.session_type) goTo(1)
        else if (DETAIL_FIELDS.some((f) => fieldErrors[f])) goTo(3)
        else setSubmitError(err.message)
      } else {
        setSubmitError(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const transition = reduceMotion ? { duration: 0 } : { duration: 0.25, ease: [0.22, 1, 0.36, 1] }

  return (
    <div className="pt-28 md:pt-32">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:px-10 md:py-20">
        <header className="text-center">
          <p className="font-label text-xs tracking-[0.3em] text-accent uppercase">Réservation</p>
          <h1 className="mt-4 text-4xl text-ink md:text-5xl">Réserver une séance</h1>
          {step !== 'done' && (
            <p className="mt-6 text-ink">
              Choisissez votre séance, puis l’un des créneaux que je propose. Je vous recontacte ensuite pour la
              confirmer.
            </p>
          )}
        </header>

        {step !== 'done' && (
          <div className="mt-12 flex items-center gap-4">
            <p className="font-label shrink-0 text-xs tracking-[0.2em] uppercase">
              Étape {step} sur {TOTAL_STEPS}
            </p>
            <div className="flex flex-1 gap-1.5" aria-hidden="true">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <span key={i} className={`h-px flex-1 ${i < step ? 'bg-ink' : 'bg-line'}`} />
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
            transition={transition}
            className="mt-10"
          >
            {step === 1 && (
              <StepSession
                value={sessionType}
                onChange={(v) => {
                  setSessionType(v)
                  setErrors({})
                }}
                onNext={nextFromSession}
                error={errors.session ?? errors.session_type}
                focusOnMount={navigated}
              />
            )}
            {step === 2 && (
              <StepSlot
                value={slot}
                onChange={onSlotChange}
                onNext={nextFromSlot}
                onBack={() => goTo(1)}
                notice={slotNotice}
                error={errors.slot ?? errors.slot_id}
                focusOnMount={navigated}
              />
            )}
            {step === 3 && (
              <StepDetails
                values={details}
                onChange={setDetails}
                errors={errors}
                onNext={nextFromDetails}
                onBack={() => goTo(2)}
                focusOnMount={navigated}
              />
            )}
            {step === 4 && (
              <StepSummary
                sessionType={sessionType}
                slot={slot}
                details={details}
                onEdit={goTo}
                onSubmit={submit}
                submitting={submitting}
                error={submitError}
                focusOnMount={navigated}
              />
            )}
            {step === 'done' && booking && <BookingDone booking={booking} focusOnMount />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
