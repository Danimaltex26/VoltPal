import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import TabLayout from './components/TabLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AnalysisPage from './pages/AnalysisPage';
import TroubleshootPage from './pages/TroubleshootPage';
import ReferencePage from './pages/ReferencePage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import LearnPage from './pages/LearnPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <TabLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/analysis" replace />} />
          <Route path="analysis" element={<AnalysisPage />} />
          <Route path="troubleshoot" element={<TroubleshootPage />} />
          <Route path="reference" element={<ReferencePage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="learn" element={<LearnPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
