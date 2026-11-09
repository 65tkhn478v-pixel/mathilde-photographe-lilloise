import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Notice } from '../ui/Notice'

/** Écran de confirmation : miniatures choisies, mot facultatif, avertissement non bloquant. */
export function ValidateDialog({ open, onOpenChange, photos, max, srcOf, onConfirm, busy, error }) {
  const [comment, setComment] = useState('')
  const remaining = max - photos.length
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content className="fixed inset-0 z-50 flex flex-col bg-paper sm:inset-x-auto sm:top-1/2 sm:left-1/2 sm:max-h-[90vh] sm:w-[40rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:border sm:border-line">
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <Dialog.Title className="font-display text-3xl text-ink">Valider ma sélection</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm">
              {photos.length} photo{photos.length > 1 ? 's' : ''} choisie{photos.length > 1 ? 's' : ''} sur {max}. Une fois validée,
              la sélection ne pourra plus être modifiée.
            </Dialog.Description>
            {remaining > 0 && (
              <Notice className="mt-4">
                Vous pouvez encore en choisir {remaining}. Valider quand même ?
              </Notice>
            )}
            <ul className="mt-4 grid grid-cols-4 gap-1 sm:grid-cols-6">
              {photos.map((p) => (
                <li key={p.id} className="aspect-square overflow-hidden bg-mist">
                  <img src={srcOf(p, 'thumb')} alt="" loading="lazy" className="h-full w-full object-cover" />
                </li>
              ))}
            </ul>
            <label htmlFor="mot-mathilde" className="mt-6 block text-sm">
              Un mot pour Mathilde ? <span className="italic">(facultatif)</span>
            </label>
            <textarea
              id="mot-mathilde"
              rows={3}
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              aria-describedby="mot-compteur"
              className="mt-2 w-full border-0 border-b border-ink/25 bg-transparent px-0 py-2.5 text-ink focus:border-accent focus:outline-none"
            />
            <p id="mot-compteur" className="mt-1 text-xs italic">
              {comment.length} / 500 caractères
            </p>
            <div aria-live="assertive">{error && <Notice tone="error" className="mt-3">{error}</Notice>}</div>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
            <Dialog.Close className="font-label min-h-11 rounded-sm border border-ink/40 px-5 text-xs tracking-[0.15em] text-ink uppercase">
              Continuer à choisir
            </Dialog.Close>
            <button
              type="button"
              disabled={busy}
              onClick={() => onConfirm(comment)}
              className="font-label min-h-11 rounded-sm border border-ink bg-ink px-5 text-xs tracking-[0.15em] text-paper uppercase disabled:opacity-60"
            >
              {busy ? 'Envoi…' : 'Valider ma sélection'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
