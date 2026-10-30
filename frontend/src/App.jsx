import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { HideBalProvider } from './context/BalContext.jsx'
import Layout from './components/Layout.jsx'
import { Toaster } from './components/toast.jsx'
import Login from './pages/Login.jsx'
import Admin from './pages/Admin.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Transactions from './pages/Transactions.jsx'
import Grafik from './pages/Grafik.jsx'
import Accounts from './pages/Accounts.jsx'
import Categories from './pages/Categories.jsx'
import Reminders from './pages/Reminders.jsx'
import DataMaster from './pages/DataMaster.jsx'

function Protected({ children }) {
  const { profile } = useAuth()
  return profile ? children : <Navigate to="/login" replace />
}

function AdminOnly({ children }) {
  const { profile } = useAuth()
  if (!profile) return <Navigate to="/login" replace />
  return profile.is_admin ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <HideBalProvider>
        <Toaster />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="grafik" element={<Grafik />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="categories" element={<Categories />} />
            <Route path="reminders" element={<Reminders />} />
            <Route path="data-master" element={<DataMaster />} />
            <Route path="admin" element={<AdminOnly><Admin /></AdminOnly>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HideBalProvider>
    </AuthProvider>
  )
}
