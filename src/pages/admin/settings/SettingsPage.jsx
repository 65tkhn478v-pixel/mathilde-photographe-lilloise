import { adminButton } from '../adminUi'
import { DefaultsForm } from './DefaultsForm'
import { StorageSection } from './StorageSection'

/**
 * Paramètres de l'espace Mathilde (/espace-mathilde/parametres) : stockage
 * des galeries (place utilisée, tri) puis réglages par défaut. Pas de
 * changement de mot de passe ici : il reste dans les secrets Cloudflare.
 */
export default function SettingsPage({ onBack, onExpired, onFeedback }) {
  return (
    <div className="space-y-12">
      <div>
        <button type="button" className={adminButton('quiet', 'px-0')} onClick={onBack}>
          ← Retour
        </button>
        <h2 className="mt-2 text-3xl text-ink">Paramètres</h2>
      </div>
      <section aria-labelledby="p-stockage" className="border-t border-line pt-6">
        <h3 id="p-stockage" className="font-display text-2xl text-ink">
          Stockage
        </h3>
        <div className="mt-4">
          <StorageSection onExpired={onExpired} onFeedback={onFeedback} />
        </div>
      </section>
      <section aria-labelledby="p-reglages" className="border-t border-line pt-6">
        <h3 id="p-reglages" className="font-display text-2xl text-ink">
          Réglages par défaut
        </h3>
        <div className="mt-4">
          <DefaultsForm onExpired={onExpired} onFeedback={onFeedback} />
        </div>
      </section>
    </div>
  )
}
