import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthLayout } from '../layouts/AuthLayout'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { GuestRoute, ProtectedRoute } from './ProtectedRoute'

const LoginPage = lazy(() => import('../pages/Login/Login').then((m) => ({ default: m.LoginPage })))
const ForgotPasswordPage = lazy(() =>
  import('../pages/Login/ForgotPassword').then((m) => ({ default: m.ForgotPasswordPage })),
)
const SignupPage = lazy(() => import('../pages/Signup/Signup').then((m) => ({ default: m.SignupPage })))
const DashboardPage = lazy(() =>
  import('../pages/Dashboard/Dashboard').then((m) => ({ default: m.DashboardPage })),
)
const TransactionsPage = lazy(() =>
  import('../pages/Transactions/Transactions').then((m) => ({ default: m.TransactionsPage })),
)
const AccountsPage = lazy(() =>
  import('../pages/Accounts/Accounts').then((m) => ({ default: m.AccountsPage })),
)
const CategoriesPage = lazy(() =>
  import('../pages/Categories/Categories').then((m) => ({ default: m.CategoriesPage })),
)
const ImportPage = lazy(() => import('../pages/Import/Import').then((m) => ({ default: m.ImportPage })))
const AnalyticsPage = lazy(() =>
  import('../pages/Analytics/Analytics').then((m) => ({ default: m.AnalyticsPage })),
)
const ReportsPage = lazy(() => import('../pages/Reports/Reports').then((m) => ({ default: m.ReportsPage })))
const GroupsPage = lazy(() => import('../pages/Groups/Groups').then((m) => ({ default: m.GroupsPage })))
const GroupDetailsPage = lazy(() =>
  import('../pages/Groups/GroupDetails').then((m) => ({ default: m.GroupDetailsPage })),
)
const SharingOverviewPage = lazy(() =>
  import('../pages/Sharing/SharingOverview').then((m) => ({ default: m.SharingOverviewPage })),
)
const PeoplePage = lazy(() => import('../pages/People/People').then((m) => ({ default: m.PeoplePage })))
const SharedExpensesPage = lazy(() =>
  import('../pages/SharedExpenses/SharedExpenses').then((m) => ({ default: m.SharedExpensesPage })),
)
const SettlementsPage = lazy(() =>
  import('../pages/Settlements/Settlements').then((m) => ({ default: m.SettlementsPage })),
)
const AIPage = lazy(() => import('../pages/AI/AI').then((m) => ({ default: m.AIPage })))
const ProfilePage = lazy(() => import('../pages/Profile/Profile').then((m) => ({ default: m.ProfilePage })))
const SettingsPage = lazy(() =>
  import('../pages/Settings/Settings').then((m) => ({ default: m.SettingsPage })),
)

export function AppRoutes() {
  return (
    <Routes>
        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/:groupId" element={<GroupDetailsPage />} />
            <Route path="/sharing" element={<SharingOverviewPage />} />
            <Route path="/people" element={<PeoplePage />} />
            <Route path="/shared-expenses" element={<SharedExpensesPage />} />
            <Route path="/settlements" element={<SettlementsPage />} />
            <Route path="/ai" element={<AIPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
  )
}
