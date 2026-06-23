import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Workers from './pages/Workers';
import RestrictedZones from './pages/RestrictedZones';
import ScanWorkerId from './pages/ScanWorkerId';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('safesight_token');
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto w-full relative">
        {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid rgba(71, 85, 105, 0.5)',
            borderRadius: '12px',
          },
        }}
        containerStyle={{
          bottom: 20,
          right: 20,
        }}
        limit={3}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workers"
          element={
            <ProtectedRoute>
              <Workers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/zones"
          element={
            <ProtectedRoute>
              <RestrictedZones />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute>
              <ScanWorkerId />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
