import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import GroupPage from './pages/GroupPage';
import ExpensePage from './pages/ExpensePage';
import BalancesPage from './pages/BalancesPage';
import CsvImportPage from './pages/CsvImportPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/groups/:groupId" element={
            <ProtectedRoute><GroupPage /></ProtectedRoute>
          } />
          <Route path="/groups/:groupId/expenses/:expenseId" element={
            <ProtectedRoute><ExpensePage /></ProtectedRoute>
          } />
          <Route path="/groups/:groupId/balances" element={
            <ProtectedRoute><BalancesPage /></ProtectedRoute>
          } />
          <Route path="/groups/:groupId/csv" element={
            <ProtectedRoute><CsvImportPage /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
