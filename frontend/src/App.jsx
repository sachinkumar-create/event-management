import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EventsPage from './pages/EventsPage';
import SpeakersPage from './pages/SpeakersPage';
import PartnersPage from './pages/PartnersPage';
import PartnerCategoriesPage from './pages/PartnerCategoriesPage';
import AgendasPage from './pages/AgendasPage';
import UsersPage from './pages/UsersPage';
import SpeakerFormPage from './pages/SpeakerFormPage';
import SNSGeneratorPage from './pages/SNSGeneratorPage';
import AttendeesPage from './pages/AttendeesPage';
import SpeakerTravelPage from './pages/SpeakerTravelPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import SpeakerViewPage from './pages/SpeakerViewPage';
import PartnerViewPage from './pages/PartnerViewPage';
import 'bootstrap/dist/css/bootstrap.min.css';

function ProtectedRoute({ children, roles }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
    return children;
}

function AppRoutes() {
    const { user } = useAuth();
    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
            <Route path="/accept-invite/:token" element={user ? <Navigate to="/dashboard" replace /> : <AcceptInvitePage />} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/speakers" element={<SpeakersPage />} />
                <Route path="/speakers/add" element={<SpeakerFormPage />} />
                <Route path="/speakers/edit/:id" element={<SpeakerFormPage />} />
                <Route path="/speakers/view/:id" element={<SpeakerViewPage />} />
                <Route path="/speakers/sns/:id" element={<SNSGeneratorPage />} />
                <Route path="/partners" element={<PartnersPage />} />
                <Route path="/partners/view/:id" element={<PartnerViewPage />} />
                <Route path="/partner-categories" element={<PartnerCategoriesPage />} />
                <Route path="/agendas" element={<AgendasPage />} />
                <Route path="/attendees" element={<AttendeesPage />} />
                <Route path="/travel" element={<SpeakerTravelPage />} />
                <Route path="/users" element={<ProtectedRoute roles={['admin', 'manager']}><UsersPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute roles={['admin']}><AdminSettingsPage /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
