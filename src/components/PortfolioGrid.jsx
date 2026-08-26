import { useState } from 'react'
import { Reveal } from './Reveal'
import { Lightbox } from './Lightbox'

export function PortfolioGrid({ photos }) {
  const [index, setIndex] = useState(null)

  return (
    <>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
        {photos.map((photo, i) => (
          <Reveal key={photo.src} delay={(i % 3) * 0.08} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group block w-full overflow-hidden"
            >
              <img
                src={photo.src}
                alt={photo.alt}
                loading="lazy"
                decoding="async"
                className="w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
            </button>
          </Reveal>
        ))}
      </div>

      <Lightbox photos={photos} index={index} onClose={() => setIndex(null)} onNavigate={setIndex} />
    </>
  )
}
