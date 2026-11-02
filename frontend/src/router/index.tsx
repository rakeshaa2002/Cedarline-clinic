import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AdminLayout } from '@/layouts/AdminLayout'
import { SiteLayout } from '@/layouts/SiteLayout'
import AboutPage from '@/pages/AboutPage'
import BookAppointmentPage from '@/pages/BookAppointmentPage'
import CentrePage from '@/pages/CentrePage'
import CentresPage from '@/pages/CentresPage'
import ContactPage from '@/pages/ContactPage'
import DoctorPage from '@/pages/DoctorPage'
import DoctorsPage from '@/pages/DoctorsPage'
// import HomePage from '@/pages/HomePage'
import NotFoundPage from '@/pages/NotFoundPage'
import RouteErrorPage from '@/pages/RouteErrorPage'
import ServiceCategoryPage from '@/pages/ServiceCategoryPage'
import ServicesPage from '@/pages/ServicesPage'
import TreatmentPage from '@/pages/TreatmentPage'

// The public RUA site loads eagerly (instant navigation); the admin panel is code-split.
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'))
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'))
const AdminDoctorsPage = lazy(() => import('@/pages/admin/AdminDoctorsPage'))
const AdminServicesPage = lazy(() => import('@/pages/admin/AdminServicesPage'))
const AdminKnowledgePage = lazy(() => import('@/pages/admin/AdminKnowledgePage'))
const AdminMessagesPage = lazy(() => import('@/pages/admin/AdminMessagesPage'))
const AdminAppointmentsPage = lazy(() => import('@/pages/admin/AdminAppointmentsPage'))
const AdminBlogPage = lazy(() => import('@/pages/admin/AdminBlogPage'))
const AdminGalleryPage = lazy(() => import('@/pages/admin/AdminGalleryPage'))
const AdminThemePage = lazy(() => import('@/pages/admin/AdminThemePage'))

export const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      // Home page is hidden for now; redirect visitors to /about-us
      { path: '/', element: <Navigate to="/about-us" replace /> },
      { path: '/home', element: <Navigate to="/about-us" replace /> },
      { path: '/services', element: <ServicesPage /> },
      { path: '/services/:category', element: <ServiceCategoryPage /> },
      { path: '/services/:category/:treatment', element: <TreatmentPage /> },
      { path: '/doctors', element: <DoctorsPage /> },
      { path: '/doctors/:slug', element: <DoctorPage /> },
      { path: '/centers', element: <CentresPage /> },
      { path: '/centers/:slug', element: <CentrePage /> },
      { path: '/about-us', element: <AboutPage /> },
      { path: '/contact', element: <ContactPage /> },
      { path: '/book-appointment', element: <BookAppointmentPage /> },
      // Old and alternative URLs
      { path: '/about', element: <Navigate to="/about-us" replace /> },
      { path: '/appointments', element: <Navigate to="/book-appointment" replace /> },
      { path: '/centres', element: <Navigate to="/centers" replace /> },
      { path: '/blog/*', element: <Navigate to="/services" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '/admin/login', element: <AdminLoginPage />, errorElement: <RouteErrorPage /> },
  { path: '/doctor/login', element: <AdminLoginPage />, errorElement: <RouteErrorPage /> },
  { path: '/doctor', element: <Navigate to="/admin" replace /> },
  {
    path: '/admin',
    element: <AdminLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'doctors', element: <AdminDoctorsPage /> },
      { path: 'services', element: <AdminServicesPage /> },
      { path: 'knowledge', element: <AdminKnowledgePage /> },
      { path: 'messages', element: <AdminMessagesPage /> },
      { path: 'appointments', element: <AdminAppointmentsPage /> },
      { path: 'blog', element: <AdminBlogPage /> },
      { path: 'gallery', element: <AdminGalleryPage /> },
      { path: 'theme', element: <AdminThemePage /> },
    ],
  },
])
