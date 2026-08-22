import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PublicLayout } from '@/layouts/PublicLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { ProtectedAdminRoute } from '@/components/ProtectedAdminRoute'
import { ProtectedCustomerRoute } from '@/components/ProtectedCustomerRoute'
import { PageLoader } from '@/components/ui/Spinner'
import AdminLoginPage from '@/pages/admin/AdminLoginPage'

const HomePage = lazy(() => import('@/pages/public/HomePage'))
const ProductsPage = lazy(() => import('@/pages/public/ProductsPage'))
const ProductDetailPage = lazy(() => import('@/pages/public/ProductDetailPage'))
const CartPage = lazy(() => import('@/pages/public/CartPage'))
const LoginPage = lazy(() => import('@/pages/public/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/public/RegisterPage'))
const CheckoutPage = lazy(() => import('@/pages/public/CheckoutPage'))
const PayPage = lazy(() => import('@/pages/public/PayPage'))
const AccountPage = lazy(() => import('@/pages/public/AccountPage'))
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage'))
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const AdminProductsPage = lazy(() => import('@/pages/admin/ProductsPage'))
const ProductEditPage = lazy(() => import('@/pages/admin/ProductEditPage'))
const CategoriesPage = lazy(() => import('@/pages/admin/CategoriesPage'))
const CategoryProductsPage = lazy(() => import('@/pages/admin/CategoryProductsPage'))
const OrdersPage = lazy(() => import('@/pages/admin/OrdersPage'))
const OrderDetailPage = lazy(() => import('@/pages/admin/OrderDetailPage'))
const CustomersPage = lazy(() => import('@/pages/admin/CustomersPage'))
const DeliveryPage = lazy(() => import('@/pages/admin/DeliveryPage'))
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'))

function Fallback() {
  return <PageLoader label="Loading page…" />
}

export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route element={<ProtectedAdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<DashboardPage />} />
            <Route path="/admin/products" element={<AdminProductsPage />} />
            <Route path="/admin/products/:id" element={<ProductEditPage />} />
            <Route path="/admin/categories" element={<CategoriesPage />} />
            <Route path="/admin/categories/:id" element={<CategoryProductsPage />} />
            <Route path="/admin/orders" element={<OrdersPage />} />
            <Route path="/admin/orders/:id" element={<OrderDetailPage />} />
            <Route path="/admin/customers" element={<CustomersPage />} />
            <Route path="/admin/delivery" element={<DeliveryPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
            <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Route>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedCustomerRoute />}>
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders/:id/pay" element={<PayPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
