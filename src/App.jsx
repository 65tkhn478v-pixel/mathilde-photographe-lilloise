import { Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { Nav } from './components/Nav'
import { Footer } from './components/Footer'
import { ScrollToTop } from './components/ScrollToTop'
import Home from './pages/Home'
import About from './pages/About'
import Portfolio from './pages/Portfolio'
import PortfolioCategory from './pages/PortfolioCategory'
import Services from './pages/Services'
import Contact from './pages/Contact'
import MentionsLegales from './pages/MentionsLegales'
import NotFound from './pages/NotFound'

function App() {
  return (
    // reducedMotion="user" désactive automatiquement les animations Framer
    // Motion pour les visiteurs ayant activé prefers-reduced-motion.
    <MotionConfig reducedMotion="user">
      <ScrollToTop />
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/a-propos" element={<About />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/portfolio/:slug" element={<PortfolioCategory />} />
          <Route path="/services" element={<Services />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/mentions-legales" element={<MentionsLegales />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </MotionConfig>
  )
}

export default App
