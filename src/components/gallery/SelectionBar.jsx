import clsx from 'clsx'

/**
 * Barre fixe en bas d'écran pendant la sélection : compteur annoncé,
 * progression fine, filtre « Ma sélection » / « Toutes », validation.
 */
export function SelectionBar({ count, max, filter, onFilter, onValidate, locked }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
      data-testid="barre-selection"
    >
      <div className="h-0.5 w-full bg-mist" aria-hidden="true">
        <div className="h-full bg-ink" style={{ width: `${Math.min(100, (count / max) * 100)}%` }} />
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:flex-nowrap sm:px-6">
        <p className="font-label text-xs tracking-[0.15em] uppercase" aria-live="polite" data-testid="compteur">
          {count} / {max} sélectionnée{count > 1 ? 's' : ''}
        </p>
        <div className="contents sm:flex sm:items-center sm:gap-2">
          <div role="group" aria-label="Afficher" className="flex">
            {[
              ['all', 'Toutes'],
              ['selected', 'Ma sélection'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => onFilter(value)}
                className={clsx(
                  'font-label min-h-11 px-2 text-xs tracking-[0.1em] whitespace-nowrap uppercase sm:px-3',
                  filter === value ? 'underline decoration-1 underline-offset-[0.4em]' : 'opacity-80'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {!locked && (
            <button
              type="button"
              onClick={onValidate}
              disabled={count === 0}
              className="font-label min-h-11 w-full rounded-sm border border-ink bg-ink px-4 text-xs tracking-[0.15em] whitespace-nowrap text-paper uppercase disabled:opacity-50 sm:w-auto"
            >
              Valider ma sélection
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
