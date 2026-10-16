import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AdminLayout } from '@/layouts/AdminLayout'
import { SiteLayout } from '@/layouts/SiteLayout'
import HomePage from '@/pages/HomePage'
import RouteErrorPage from '@/pages/RouteErrorPage'

// Every page except Home is code-split so the first load stays small.
const AboutPage = lazy(() => import('@/pages/AboutPage'))
const DoctorsPage = lazy(() => import('@/pages/DoctorsPage'))
const ServicesPage = lazy(() => import('@/pages/ServicesPage'))
const DentalPage = lazy(() => import('@/pages/departments/DentalPage'))
const SkinPage = lazy(() => import('@/pages/departments/SkinPage'))
const HairPage = lazy(() => import('@/pages/departments/HairPage'))
const AppointmentsPage = lazy(() => import('@/pages/AppointmentsPage'))
const BlogPage = lazy(() => import('@/pages/BlogPage'))
const BlogPostPage = lazy(() => import('@/pages/BlogPostPage'))
const ContactPage = lazy(() => import('@/pages/ContactPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'))
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'))
const AdminDoctorsPage = lazy(() => import('@/pages/admin/AdminDoctorsPage'))
const AdminServicesPage = lazy(() => import('@/pages/admin/AdminServicesPage'))
const AdminKnowledgePage = lazy(() => import('@/pages/admin/AdminKnowledgePage'))
const AdminMessagesPage = lazy(() => import('@/pages/admin/AdminMessagesPage'))

export const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/doctors', element: <DoctorsPage /> },
      { path: '/services', element: <ServicesPage /> },
      { path: '/services/dental', element: <DentalPage /> },
      { path: '/services/skin', element: <SkinPage /> },
      { path: '/services/hair', element: <HairPage /> },
      { path: '/appointments', element: <AppointmentsPage /> },
      { path: '/blog', element: <BlogPage /> },
      { path: '/blog/:slug', element: <BlogPostPage /> },
      { path: '/contact', element: <ContactPage /> },
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
    ],
  },
])
