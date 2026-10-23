import { useState } from 'react'
import { api } from '../../lib/api'
import { FieldError, Notice } from '../../components/ui/Notice'
import { adminButton, inputClasses, labelClasses } from './adminUi'

export function AdminLogin({ expired, onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!password) {
      setError('Saisissez votre mot de passe.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api('/api/admin/login', { method: 'POST', body: { password } })
      setPassword('')
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto mt-12 max-w-sm space-y-6">
      <h2 className="text-3xl text-ink">Connexion</h2>
      {expired && <Notice>Votre session a expiré. Reconnectez-vous pour reprendre là où vous en étiez.</Notice>}
      <div>
        <label htmlFor="admin-password" className={labelClasses}>
          Mot de passe
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'admin-password-error' : undefined}
          className={inputClasses}
        />
        <div aria-live="polite">
          <FieldError id="admin-password-error">{error}</FieldError>
        </div>
      </div>
      <button type="submit" disabled={busy} className={adminButton('solid', 'w-full')}>
        {busy ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  )
}
