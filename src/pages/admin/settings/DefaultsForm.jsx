import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'
import { useApiData } from '../../../lib/useApiData'
import { DEFAULT_SETTINGS, SETTINGS_FIELDS, validateSettings } from '../../../../shared/settings.js'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { FieldError, Loading, Notice } from '../../../components/ui/Notice'
import { adminButton, apiErrorMessage, inputClasses, labelClasses } from '../adminUi'
import { WatermarkPreview } from '../galleries/UploadPanel'

const FIELDS = [
  ['included_default', 'Nombre de photos incluses par défaut', 'Prérempli à la création d’une galerie.'],
  ['selection_days', 'Durée de sélection (jours)', 'Date limite proposée à la création d’une galerie.'],
  ['delivery_days', 'Durée de téléchargement après livraison (jours)', 'Fixée au moment de la livraison.'],
  ['proofs_after_delivery_days', 'Délai de suppression des aperçus après livraison (jours)', 'Appliqué par le nettoyage quotidien.'],
  ['watermark_text', 'Texte du filigrane', null],
  ['review_url', 'Lien d’avis Google', 'Bouton d’avis de la galerie livrée, lien du pied de page et message de demande d’avis.'],
]

const asStrings = (settings) => Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, String(v)]))
const parse = (values) =>
  Object.fromEntries(Object.entries(values).map(([k, v]) => [k, SETTINGS_FIELDS[k]?.type === 'int' && /^-?\d+$/.test(v.trim()) ? Number(v) : v]))

/** Réglages par défaut : s'appliquent aux nouvelles galeries et aux prochaines actions. */
export function DefaultsForm({ onExpired, onFeedback }) {
  const [values, setValues] = useState(null)
  const { data, error, reload } = useApiData('/api/admin/settings', {
    onData: (d) => setValues((v) => v ?? asStrings(d.settings)),
    onError: (err) => apiErrorMessage(err, onExpired),
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [watermark, setWatermark] = useState(DEFAULT_SETTINGS.watermark_text)

  // Aperçu du filigrane redessiné après une courte pause de frappe.
  useEffect(() => {
    if (!values) return undefined
    const timer = setTimeout(() => setWatermark(values.watermark_text.trim() || DEFAULT_SETTINGS.watermark_text), 250)
    return () => clearTimeout(timer)
  }, [values])

  if (error && !data) {
    return (
      <Notice tone="error" action={<button type="button" className={adminButton('outline')} onClick={reload}>Réessayer</button>}>
        {error.message}
      </Notice>
    )
  }
  if (!values) return <Loading />

  const save = async (e) => {
    e.preventDefault()
    const { errors: found } = validateSettings(parse(values))
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      const result = await api('/api/admin/settings', { method: 'PUT', body: parse(values) })
      setValues(asStrings(result.settings))
      onFeedback({ message: 'Réglages enregistrés', tone: 'confirmed' })
    } catch (err) {
      setErrors(err.data?.errors ?? {})
      const message = apiErrorMessage(err, onExpired)
      if (message && !err.data?.errors) onFeedback({ message, tone: 'declined' })
    } finally {
      setBusy(false)
    }
  }
  const resetAll = async () => {
    try {
      const result = await api('/api/admin/settings', { method: 'DELETE' })
      setValues(asStrings(result.settings))
      setErrors({})
      onFeedback({ message: 'Valeurs d’origine rétablies', tone: 'confirmed' })
    } catch (err) {
      const message = apiErrorMessage(err, onExpired)
      if (message) onFeedback({ message, tone: 'declined' })
    }
  }

  return (
    <form onSubmit={save} noValidate data-testid="reglages">
      <p className="text-sm italic">
        Ces réglages s’appliquent aux nouvelles galeries et aux prochaines actions : les galeries existantes gardent leurs dates.
      </p>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {FIELDS.map(([key, label, help]) => {
          const field = SETTINGS_FIELDS[key]
          const id = `reglage-${key}`
          const describedBy = [help && `${id}-aide`, errors[key] && `${id}-erreur`].filter(Boolean).join(' ') || undefined
          return (
            <div key={key} className={key === 'watermark_text' || key === 'review_url' ? 'md:col-span-2' : undefined}>
              <label htmlFor={id} className={labelClasses}>
                {label}
              </label>
              <input
                id={id}
                name={key}
                type={field.type === 'int' ? 'number' : field.type === 'url' ? 'url' : 'text'}
                inputMode={field.type === 'int' ? 'numeric' : undefined}
                min={field.min}
                max={field.type === 'int' ? field.max : undefined}
                maxLength={field.type === 'text' ? field.max : undefined}
                value={values[key]}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                aria-invalid={errors[key] ? 'true' : undefined}
                aria-describedby={describedBy}
                className={inputClasses}
              />
              {help && (
                <p id={`${id}-aide`} className="mt-1 text-xs italic">
                  {help} Par défaut : {String(DEFAULT_SETTINGS[key])}.
                </p>
              )}
              <FieldError id={`${id}-erreur`}>{errors[key]}</FieldError>
              {key === 'watermark_text' && (
                <WatermarkPreview
                  text={watermark}
                  caption="Aperçu du filigrane. Le nouveau texte s’applique aux aperçus déposés après l’enregistrement : les aperçus déjà en ligne ne changent pas."
                />
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" disabled={busy} className={adminButton('solid')}>
          Enregistrer
        </button>
        <ConfirmDialog
          title="Revenir aux valeurs d’origine ?"
          description="Tous les réglages par défaut reprennent leur valeur d’origine (20 photos, 30 jours, 90 jours, 7 jours, filigrane et lien d’avis d’origine). Les galeries existantes ne changent pas."
          confirmLabel="Revenir aux valeurs d’origine"
          onConfirm={resetAll}
          trigger={
            <button type="button" className={adminButton('quiet')}>
              Revenir aux valeurs d’origine
            </button>
          }
        />
      </div>
    </form>
  )
}
