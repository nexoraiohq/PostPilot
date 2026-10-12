import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageLoading } from '@/components/ui/States'

/* Public pages */
const HomePage = lazy(() => import('@/pages/public/HomePage'))
const MenuPage = lazy(() => import('@/pages/public/MenuPage'))
const StoryPage = lazy(() => import('@/pages/public/StoryPage'))
const ExperiencesPage = lazy(() => import('@/pages/public/ExperiencesPage'))
const ReservePage = lazy(() => import('@/pages/public/ReservePage'))
const OrderPage = lazy(() => import('@/pages/public/OrderPage'))
const OrderTrackingPage = lazy(() => import('@/pages/public/OrderTrackingPage'))
const ContactPage = lazy(() => import('@/pages/public/ContactPage'))
const PrivacyPage = lazy(() => import('@/pages/public/PrivacyPage'))
const TermsPage = lazy(() => import('@/pages/public/TermsPage'))
const CancellationPage = lazy(() => import('@/pages/public/CancellationPage'))
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage'))

/* Admin pages */
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'))
const AdminOverviewPage = lazy(() => import('@/pages/admin/AdminOverviewPage'))
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage'))
const AdminOrderDetailPage = lazy(() => import('@/pages/admin/AdminOrderDetailPage'))
const AdminReservationsPage = lazy(() => import('@/pages/admin/AdminReservationsPage'))
const AdminMenuPage = lazy(() => import('@/pages/admin/AdminMenuPage'))
const AdminMenuFormPage = lazy(() => import('@/pages/admin/AdminMenuFormPage'))
const AdminTablesPage = lazy(() => import('@/pages/admin/AdminTablesPage'))
const AdminAvailabilityPage = lazy(() => import('@/pages/admin/AdminAvailabilityPage'))
const AdminCustomersPage = lazy(() => import('@/pages/admin/AdminCustomersPage'))
const AdminReportsPage = lazy(() => import('@/pages/admin/AdminReportsPage'))
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'))

function withSuspense(node: React.ReactNode) {
  return <Suspense fallback={<PageLoading />}>{node}</Suspense>
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: withSuspense(<HomePage />) },
      { path: '/menu', element: withSuspense(<MenuPage />) },
      { path: '/story', element: withSuspense(<StoryPage />) },
      { path: '/experiences', element: withSuspense(<ExperiencesPage />) },
      { path: '/reserve', element: withSuspense(<ReservePage />) },
      { path: '/order', element: withSuspense(<OrderPage />) },
      { path: '/order/:orderId', element: withSuspense(<OrderTrackingPage />) },
      { path: '/contact', element: withSuspense(<ContactPage />) },
      { path: '/privacy', element: withSuspense(<PrivacyPage />) },
      { path: '/terms', element: withSuspense(<TermsPage />) },
      { path: '/cancellation-policy', element: withSuspense(<CancellationPage />) },
      { path: '*', element: withSuspense(<NotFoundPage />) },
    ],
  },
  { path: '/admin/login', element: withSuspense(<AdminLoginPage />) },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: withSuspense(<AdminOverviewPage />) },
      { path: 'orders', element: withSuspense(<AdminOrdersPage />) },
      { path: 'orders/:id', element: withSuspense(<AdminOrderDetailPage />) },
      { path: 'reservations', element: withSuspense(<AdminReservationsPage />) },
      { path: 'menu', element: withSuspense(<AdminMenuPage />) },
      { path: 'menu/new', element: withSuspense(<AdminMenuFormPage />) },
      { path: 'menu/:id', element: withSuspense(<AdminMenuFormPage />) },
      { path: 'tables', element: withSuspense(<AdminTablesPage />) },
      { path: 'availability', element: withSuspense(<AdminAvailabilityPage />) },
      { path: 'customers', element: withSuspense(<AdminCustomersPage />) },
      { path: 'reports', element: withSuspense(<AdminReportsPage />) },
      { path: 'settings', element: withSuspense(<AdminSettingsPage />) },
    ],
  },
])
