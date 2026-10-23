import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { Button } from '../Button'

/** Confirmation avant une action (admin). */
export function ConfirmDialog({ trigger, title, description, confirmLabel, onConfirm }) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <AlertDialog.Content className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md border border-line bg-paper p-6 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2">
          <AlertDialog.Title className="font-display text-2xl text-ink">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-3 text-sm text-ink">{description}</AlertDialog.Description>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" className="px-5">
                Annuler
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button className="px-5" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
