import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '@/app/AppShell';
import { DashboardScreen } from '@/features/dashboard/DashboardScreen';
import { LogScreen } from '@/features/log/LogScreen';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { useAppState } from '@/lib/useStore';

// Scan pulls in file reading + the review flow, and Plan pulls the planner; neither is
// needed on first paint, so they load on demand.
const ScanScreen = lazy(() =>
  import('@/features/scan/ScanScreen').then((m) => ({ default: m.ScanScreen })),
);
const PlanScreen = lazy(() =>
  import('@/features/plan/PlanScreen').then((m) => ({ default: m.PlanScreen })),
);
const HistoryScreen = lazy(() =>
  import('@/features/history/HistoryScreen').then((m) => ({ default: m.HistoryScreen })),
);
const ProfileScreen = lazy(() =>
  import('@/features/profile/ProfileScreen').then((m) => ({ default: m.ProfileScreen })),
);

function ScreenFallback(): JSX.Element {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray" role="status">
      Loading…
    </div>
  );
}

/** Until a profile exists there are no targets, so every screen redirects to onboarding. */
function RequireProfile({ children }: { children: JSX.Element }): JSX.Element {
  const { profile } = useAppState();
  const location = useLocation();

  if (!profile) {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  }
  return children;
}

/** Once onboarded, the onboarding route is no longer the entry point. */
function OnboardingRoute(): JSX.Element {
  const { profile } = useAppState();
  if (profile) return <Navigate to="/" replace />;
  return <OnboardingScreen />;
}

export function AppRoutes(): JSX.Element {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <Routes>
        <Route path="/onboarding" element={<OnboardingRoute />} />

        <Route element={<AppShell />}>
          <Route
            path="/"
            element={
              <RequireProfile>
                <DashboardScreen />
              </RequireProfile>
            }
          />
          <Route
            path="/log"
            element={
              <RequireProfile>
                <LogScreen />
              </RequireProfile>
            }
          />
          <Route
            path="/scan"
            element={
              <RequireProfile>
                <ScanScreen />
              </RequireProfile>
            }
          />
          <Route
            path="/plan"
            element={
              <RequireProfile>
                <PlanScreen />
              </RequireProfile>
            }
          />
          <Route
            path="/history"
            element={
              <RequireProfile>
                <HistoryScreen />
              </RequireProfile>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireProfile>
                <ProfileScreen />
              </RequireProfile>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
