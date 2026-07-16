import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { BottomNav } from '@/app/BottomNav';
import { useAppState } from '@/lib/useStore';

/**
 * The 480px phone frame every screen renders inside, plus the screen transition.
 * Motion is restrained by design: a short fade-and-lift, and nothing at all when the
 * user has asked for reduced motion.
 */
export function AppShell(): JSX.Element {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const { settings } = useAppState();

  // The in-app toggle layers on top of the OS-level preference.
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', settings.reducedMotion);
  }, [settings.reducedMotion]);

  const still = reduceMotion || settings.reducedMotion;

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <div className="ambient-grid pointer-events-none fixed inset-0" aria-hidden="true" />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface-2 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <main id="main" className="app-frame relative z-10 flex-1 px-4 pb-6 pt-6">
        <motion.div
          key={location.pathname}
          initial={still ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={still ? { duration: 0 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
