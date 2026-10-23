import { useCallback, useEffect, useState } from 'react'
import { useApiData } from '../../lib/useApiData'
import { Link } from 'react-router-dom'
import * as Tabs from '@radix-ui/react-tabs'
import clsx from 'clsx'
import { api } from '../../lib/api'
import { Loading, Notice } from '../../components/ui/Notice'
import { adminButton } from './adminUi'
import { AdminLogin } from './AdminLogin'
import { BookingsTab } from './BookingsTab'
import { SlotsTab } from './SlotsTab'
import { CalendarTab } from './CalendarTab'
import { Toast } from './Toast'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { HistoryTab } from './HistoryTab'

const TABS = [
  { value: 'calendrier', label: 'Calendrier' },
  { value: 'demandes', label: 'Demandes' },
  { value: 'creneaux', label: 'Mes créneaux' },
  { value: 'historique', label: 'Historique' },
]
const TAB_KEY = 'espace-mathilde:onglet'

function readStoredTab() {
  try {
    return sessionStorage.getItem(TAB_KEY)
  } catch {
    return null
  }
}

/** Empêche l'indexation : meta robots tant que la page est affichée. */
function useNoIndex() {
  useEffect(() => {
    const previousTitle = document.title
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => {
      meta.remove()
      document.title = previousTitle
    }
  }, [])
}

/**
 * Espace admin de Mathilde (/espace-mathilde) : non lié depuis le site public,
 * protégé par mot de passe (session vérifiée côté serveur à chaque requête).
 */
export default function EspaceMathilde() {
  useNoIndex()
  // Déconnexion ou session expirée pendant l'utilisation.
  const [signedOut, setSignedOut] = useState(false)
  const [expired, setExpired] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [tab, setTab] = useState(readStoredTab)
  const [toast, setToast] = useState(null)
  const onFeedback = useCallback((feedback) => setToast({ ...feedback, id: Date.now() }), [])
  const clearToast = useCallback(() => setToast(null), [])

  // Titre de l'onglet du navigateur : « (1) Espace Mathilde ».
  useEffect(() => {
    document.title = pendingCount > 0 ? `(${pendingCount}) Espace Mathilde` : 'Espace Mathilde'
  }, [pendingCount])

  const changeTab = (value) => {
    setTab(value)
    try {
      sessionStorage.setItem(TAB_KEY, value)
    } catch {
      // Stockage indisponible : l'onglet ne sera simplement pas mémorisé.
    }
  }

  const session = useApiData('/api/admin/session', {
    onData: (data) => {
      setPendingCount(data.pending_count)
      // Onglet par défaut : les demandes s'il y en a en attente.
      setTab((current) => current ?? (data.pending_count > 0 ? 'demandes' : 'calendrier'))
    },
  })
  const checkSession = session.reload

  // 'checking' | 'anonymous' | 'authenticated' | 'error'
  let status = 'checking'
  if (signedOut) status = 'anonymous'
  else if (session.data) status = 'authenticated'
  else if (session.error) status = session.error.status === 401 ? 'anonymous' : 'error'

  // Appelé par les onglets quand l'API répond 401 : retour à la connexion,
  // l'onglet courant est conservé.
  const onExpired = useCallback(() => {
    setExpired(true)
    setSignedOut(true)
  }, [])

  const logout = async () => {
    try {
      await api('/api/admin/logout', { method: 'POST' })
    } catch {
      // Le cookie expirera de lui-même ; on revient quand même à la connexion.
    }
    setExpired(false)
    setSignedOut(true)
  }

  if (status === 'checking') return <Shell><Loading /></Shell>

  if (status === 'error') {
    return (
      <Shell>
        <Notice
          tone="error"
          className="mx-auto mt-16 max-w-md"
          action={
            <button type="button" className={adminButton('outline')} onClick={checkSession}>
              Réessayer
            </button>
          }
        >
          Connexion impossible. Vérifiez votre réseau, puis réessayez.
        </Notice>
      </Shell>
    )
  }

  if (status === 'anonymous') {
    return (
      <Shell>
        <AdminLogin
          expired={expired}
          onSuccess={() => {
            setExpired(false)
            setSignedOut(false)
            checkSession()
          }}
        />
      </Shell>
    )
  }

  const shared = { onExpired, onPendingCount: setPendingCount, onFeedback }

  return (
    <Shell
      header={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-sm text-ink" aria-live="polite">
            {pendingCount > 0 ? (
              <button type="button" onClick={() => changeTab('demandes')} className="rounded-full">
                <StatusBadge state="pending" className="py-1">
                  {pendingCount} en attente
                </StatusBadge>
                <span className="sr-only"> : voir les demandes</span>
              </button>
            ) : (
              <span className="italic">Aucune demande en attente</span>
            )}
          </p>
          <button type="button" className={adminButton('quiet')} onClick={logout}>
            Se déconnecter
          </button>
        </div>
      }
    >
      <Tabs.Root value={tab ?? 'calendrier'} onValueChange={changeTab}>
        <Tabs.List
          aria-label="Sections de l'espace"
          className="flex gap-1 overflow-x-auto border-b border-line"
        >
          {TABS.map((t) => (
            <Tabs.Trigger
              key={t.value}
              value={t.value}
              className={clsx(
                'font-label -mb-px min-h-11 shrink-0 border-b-2 px-2.5 text-xs tracking-wide whitespace-nowrap uppercase focus-visible:outline-offset-[-2px] sm:px-5 sm:text-sm',
                'border-transparent text-ink data-[state=active]:border-ink'
              )}
            >
              {t.label}
              {t.value === 'demandes' && pendingCount > 0 && (
                <span className="ml-2 rounded-full border border-pending-line bg-pending-bg px-1.5 text-[0.7rem] text-pending">
                  {pendingCount}
                  <span className="sr-only"> en attente</span>
                </span>
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="calendrier" className="pt-6 focus-visible:outline-none">
          <CalendarTab {...shared} />
        </Tabs.Content>
        <Tabs.Content value="demandes" className="pt-6 focus-visible:outline-none">
          <BookingsTab {...shared} />
        </Tabs.Content>
        <Tabs.Content value="creneaux" className="pt-6 focus-visible:outline-none">
          <SlotsTab {...shared} />
        </Tabs.Content>
        <Tabs.Content value="historique" className="pt-6 focus-visible:outline-none">
          <HistoryTab {...shared} />
        </Tabs.Content>
      </Tabs.Root>
      <Toast toast={toast} onDone={clearToast} />
    </Shell>
  )
}

function Shell({ header, children }) {
  return (
    <div className="min-h-svh bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex items-baseline gap-4">
            <h1 className="text-2xl text-ink">Espace Mathilde</h1>
            <Link to="/" className="text-xs text-ink underline underline-offset-4 hover:no-underline">
              Voir le site
            </Link>
          </div>
          {header}
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 pt-4 pb-16 sm:px-6 lg:px-10">{children}</div>
    </div>
  )
}

