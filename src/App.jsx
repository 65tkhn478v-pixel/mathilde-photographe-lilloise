import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { Nav } from './components/Nav'
import { Footer } from './components/Footer'
import { ScrollToTop } from './components/ScrollToTop'
import { MobileBookingBar } from './components/MobileBookingBar'
import { Loading } from './components/ui/Notice'
import Home from './pages/Home'
import About from './pages/About'
import Portfolio from './pages/Portfolio'
import PortfolioCategory from './pages/PortfolioCategory'
import Services from './pages/Services'
import Contact from './pages/Contact'
import MentionsLegales from './pages/MentionsLegales'
import NotFound from './pages/NotFound'

// Chargées à la demande : la réservation et l'espace admin n'alourdissent
// pas le bundle de l'accueil.
const Reserver = lazy(() => import('./pages/Reserver'))
const EspaceMathilde = lazy(() => import('./pages/admin/EspaceMathilde'))

export const ADMIN_PATH = '/espace-mathilde'

function App() {
  const { pathname } = useLocation()
  // L'espace admin a sa propre en-tête, sans la navigation publique.
  const isAdmin = pathname.startsWith(ADMIN_PATH)

  return (
    // reducedMotion="user" désactive automatiquement les animations Framer
    // Motion pour les visiteurs ayant activé prefers-reduced-motion.
    <MotionConfig reducedMotion="user">
      <ScrollToTop />
      {!isAdmin && <Nav />}
      <main>
        <Suspense fallback={<Loading className="min-h-[60vh] pt-40" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/a-propos" element={<About />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/portfolio/:slug" element={<PortfolioCategory />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/reserver" element={<Reserver />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path={ADMIN_PATH} element={<EspaceMathilde />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <MobileBookingBar />}
    </MotionConfig>
  )
}

export default App
