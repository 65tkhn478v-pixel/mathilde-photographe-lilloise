import * as RadioGroup from '@radix-ui/react-radio-group'
import { Link } from 'react-router-dom'
import { SESSION_TYPES } from '../../../shared/booking.js'
import { Button } from '../Button'
import { FieldError } from '../ui/Notice'
import { SessionTypeCard } from './SessionTypeCard'
import { StepHeading, linkClasses } from './shared'

export function StepSession({ value, onChange, onNext, error, focusOnMount }) {
  return (
    <div>
      <StepHeading focusOnMount={focusOnMount}>
        <span id="session-legend">Votre séance</span>
      </StepHeading>

      <RadioGroup.Root
        value={value ?? ''}
        onValueChange={onChange}
        aria-labelledby="session-legend"
        aria-describedby={error ? 'session-error' : undefined}
        className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4"
      >
        {SESSION_TYPES.map((type) => (
          <SessionTypeCard
            key={type.value}
            type={type.value}
            label={type.label}
            selected={value === type.value}
            dimmed={Boolean(value) && value !== type.value}
          />
        ))}
      </RadioGroup.Root>

      <div aria-live="polite">
        <FieldError id="session-error">{error}</FieldError>
      </div>

      <div className="mt-8">
        <Button type="button" onClick={onNext} className="w-full sm:w-auto">
          Continuer
        </Button>
      </div>

      <aside className="mt-14 border-l-2 border-structure py-1 pl-5">
        <p className="font-display text-xl text-ink">Un mariage ou un projet plus important ?</p>
        <p className="mt-2 text-ink">
          <Link to="/contact" className={linkClasses}>
            Écrivez-moi
          </Link>
          , on en parle ensemble.
        </p>
      </aside>
    </div>
  )
}
