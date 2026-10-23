import * as RadioGroup from '@radix-ui/react-radio-group'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { SESSION_TYPES } from '../../../shared/booking.js'
import { CATEGORIES, PHOTOS } from '../../data/portfolio'
import { Button } from '../Button'
import { FieldError } from '../ui/Notice'
import { StepHeading, choiceClasses, linkClasses } from './shared'

// Photo réelle du portfolio quand il en existe une pour ce type (couverture de
// la galerie, avec son alt existant). Portrait et Famille : pas de galerie,
// donc pas d'image.
function photoFor(type) {
  const cover = CATEGORIES.find((c) => c.slug === type)?.cover
  if (!cover) return null
  const photo = PHOTOS[type]?.find((p) => p.src === cover)
  return photo ? { src: photo.src, alt: photo.alt } : null
}

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
        className="mt-8 border-t border-line"
      >
        {SESSION_TYPES.map((type) => {
          const photo = photoFor(type.value)
          return (
            <RadioGroup.Item
              key={type.value}
              value={type.value}
              aria-labelledby={`session-${type.value}`}
              className={clsx(
                choiceClasses,
                'group -mt-px flex min-h-20 w-full items-center justify-between gap-4 border-x-0 px-4 text-left sm:px-6'
              )}
            >
              <span className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current"
                >
                  <RadioGroup.Indicator className="h-2 w-2 rounded-full bg-current" />
                </span>
                <span id={`session-${type.value}`} className="font-display text-2xl md:text-3xl">
                  {type.label}
                </span>
              </span>
              {photo && (
                <img
                  src={photo.src}
                  alt={photo.alt}
                  loading="lazy"
                  decoding="async"
                  className="my-2 h-16 w-12 shrink-0 object-cover md:h-20 md:w-16"
                />
              )}
            </RadioGroup.Item>
          )
        })}
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
