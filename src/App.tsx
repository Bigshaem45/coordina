import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { Layout } from './features/Layout';
import Home from './features/discover/Home';
import Onboarding from './features/onboarding/Onboarding';
import Landing from './features/landing/Landing';
import Auth from './features/auth/Auth';
import { Skeleton } from './design-system/ui';
import { ErrorBoundary } from './design-system/ErrorBoundary';
import { initCapacitor } from './lib/capacitor';

function NativeLifecycleBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    initCapacitor(() => {
      if (window.history.length > 1) {
        navigate(-1);
      }
    });
  }, [navigate]);
  return null;
}

const Discover = lazy(() => import('./features/discover/Discover'));
const EventDetail = lazy(() => import('./features/event/EventDetail'));
const SpaceProfile = lazy(() => import('./features/space/SpaceProfile'));
const MapView = lazy(() => import('./features/map/MapView'));
const PlanCart = lazy(() => import('./features/coordina/PlanCart'));
const Checkout = lazy(() => import('./features/checkout/Checkout'));
const Success = lazy(() => import('./features/checkout/Success'));
const Wallet = lazy(() => import('./features/wallet/Wallet'));
const Profile = lazy(() => import('./features/profile/Profile'));
const Organiser = lazy(() => import('./features/organiser/Organiser'));
const Admin = lazy(() => import('./features/admin/Admin'));
const DesignSystem = lazy(() => import('./design-system/Showcase'));
const Team = lazy(() => import('./features/team/Team'));
const VenuePortal = lazy(() => import('./features/venue/VenuePortal'));
const SquadList = lazy(() => import('./features/squad/Squad').then((m) => ({ default: m.SquadList })));
const SquadDetail = lazy(() => import('./features/squad/Squad').then((m) => ({ default: m.SquadDetail })));

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <NativeLifecycleBridge />
        <Suspense fallback={<div className="p-4"><Skeleton className="h-40" /></div>}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/team" element={<Team />} />
            <Route path="/venue-portal/:token" element={<VenuePortal />} />
            <Route path="/venue-portal" element={<VenuePortal />} />
            <Route element={<Layout />}>
              <Route path="home" element={<Home />} />
              <Route path="discover" element={<Discover />} />
              <Route path="event/:id" element={<EventDetail />} />
              <Route path="space/:id" element={<SpaceProfile />} />
              <Route path="map" element={<MapView />} />
              <Route path="plan" element={<PlanCart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="success/:orderId" element={<Success />} />
              <Route path="tickets" element={<Wallet />} />
              <Route path="profile" element={<Profile />} />
              <Route path="squad" element={<SquadList />} />
              <Route path="squad/:id" element={<SquadDetail />} />
              <Route path="organiser" element={<Organiser />} />
              <Route path="admin" element={<Admin />} />
              <Route path="design-system" element={<DesignSystem />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
