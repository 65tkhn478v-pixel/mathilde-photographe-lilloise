import { usePageMeta } from '../hooks/usePageMeta'
import { Reveal } from '../components/Reveal'
import { CONTACT_EMAIL } from '../data/site'
import { RETENTION_MONTHS } from '../../shared/booking.js'

export default function MentionsLegales() {
  usePageMeta({
    title: 'Mentions légales',
    description: 'Mentions légales du site de Mathilde Lecomte, photographe à Lille.',
    path: '/mentions-legales',
  })

  return (
    <div className="pt-28 md:pt-32">
      <div className="mx-auto max-w-2xl px-6 py-16 md:px-10 md:py-24">
        <Reveal>
          <h1 className="text-4xl text-ink md:text-5xl">Mentions légales</h1>

          <div className="mt-10 space-y-8 text-ink-soft">
            <section>
              <h2 className="font-display text-xl text-ink">Éditeur du site</h2>
              <p className="mt-2">
                Mathilde Lecomte — Photographe indépendante — Lille, Nord (Hauts-de-France).
              </p>
              <p className="mt-2 text-sm text-ink-faint">
                Statut juridique, numéro SIRET et adresse précise : à compléter par la
                cliente avant mise en ligne (informations non communiquées à ce stade).
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-ink">Contact</h2>
              <p className="mt-2">
                Via le{' '}
                <a href="/contact" className="underline hover:text-accent">
                  formulaire de contact
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-ink">Hébergement</h2>
              <p className="mt-2 text-sm text-ink-faint">
                Nom, adresse et contact de l'hébergeur : à compléter une fois l'hébergement
                définitif choisi.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-ink">Propriété intellectuelle</h2>
              <p className="mt-2">
                L'ensemble des photographies présentées sur ce site est la propriété de
                Mathilde Lecomte. Toute reproduction, représentation ou utilisation, totale ou
                partielle, sans autorisation préalable est interdite.
              </p>
            </section>

            <section id="donnees-personnelles" className="scroll-mt-32">
              <h2 className="font-display text-xl text-ink">Données personnelles</h2>
              <p className="mt-2">
                <strong className="font-normal italic">Données collectées.</strong> Via la
                réservation en ligne et le formulaire de contact : votre identité (nom, prénom),
                votre adresse mail, votre numéro de téléphone si vous le donnez, votre message et
                le créneau demandé.
              </p>
              <p className="mt-2">
                <strong className="font-normal italic">Finalité.</strong> Traiter votre demande
                de séance et vous recontacter.
              </p>
              <p className="mt-2">
                <strong className="font-normal italic">Destinataire.</strong> Mathilde Lecomte
                uniquement. Ces informations ne sont ni cédées ni utilisées à d'autres fins.
              </p>
              <p className="mt-2">
                {/* Durée à valider avec la cliente (constante RETENTION_MONTHS, shared/booking.js). */}
                <strong className="font-normal italic">Conservation.</strong> {RETENTION_MONTHS}{' '}
                mois après la date de la séance demandée.
              </p>
              <p className="mt-2">
                <strong className="font-normal italic">Vos droits.</strong> Vous pouvez demander
                l'accès à vos données, leur rectification ou leur effacement en écrivant à{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="break-all underline hover:text-accent">
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </section>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
