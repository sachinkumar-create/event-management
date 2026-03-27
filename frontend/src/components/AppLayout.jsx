import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Nav, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { getSettings } from '../services/api';
import { BsCalendarEvent, BsPeople, BsPersonBadge, BsBriefcase, BsListTask, BsSpeedometer2, BsBoxArrowRight, BsShieldLock, BsTags, BsPeopleFill, BsAirplane, BsGear } from 'react-icons/bs';

const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: BsSpeedometer2, roles: ['admin', 'manager', 'employee'] },
    { path: '/events', label: 'Events', icon: BsCalendarEvent, roles: ['admin', 'manager', 'employee'] },
    { path: '/speakers', label: 'Speakers', icon: BsPersonBadge, roles: ['admin', 'manager', 'employee'] },
    { path: '/partners', label: 'Partners', icon: BsBriefcase, roles: ['admin', 'manager', 'employee'] },
    { path: '/partner-categories', label: 'Categories', icon: BsTags, roles: ['admin', 'manager', 'employee'] },
    { path: '/agendas', label: 'Agendas', icon: BsListTask, roles: ['admin', 'manager', 'employee'] },
    { path: '/attendees', label: 'Attendees', icon: BsPeopleFill, roles: ['admin', 'manager', 'employee'] },
    { path: '/travel', label: 'Travel', icon: BsAirplane, roles: ['admin', 'manager', 'employee'] },
    { path: '/users', label: 'Users', icon: BsPeople, roles: ['admin', 'manager'] },
    { path: '/settings', label: 'Settings', icon: BsGear, roles: ['admin'] },
];

export default function AppLayout() {
    const { user, logout, pendingInvite, clearInvite, updateAuth } = useAuth();
    const navigate = useNavigate();
    const [portalLogo, setPortalLogo] = useState('');
    const [logoWidth, setLogoWidth] = useState(36);

    useEffect(() => {
        getSettings().then(r => {
            if (r.data.portal_logo) setPortalLogo(r.data.portal_logo);
            if (r.data.portal_logo_width) setLogoWidth(parseInt(r.data.portal_logo_width, 10));
        }).catch(() => {});
    }, []);

    const handleAcceptInvite = async () => {
        try {
            const { acceptExistingInvite } = await import('../services/api');
            const res = await acceptExistingInvite();
            updateAuth(res.data.token, res.data.user);
            clearInvite();
            alert('Invitation accepted! Your role and assigned event have been updated.');
        } catch (err) { alert('Failed to accept invitation'); }
    };

    const handleDeclineInvite = async () => {
        if (window.confirm('Are you sure you want to decline this invitation?')) {
            try {
                const { declineInvite } = await import('../services/api');
                await declineInvite();
                clearInvite();
            } catch (err) { alert('Failed to decline invitation'); }
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="d-flex vh-100">
            {/* Sidebar remains same... */}
            <div className="sidebar d-flex flex-column" style={{ width: 250, minWidth: 250 }}>
                {/* Logo */}
                <div className="p-3 d-flex align-items-center justify-content-center" style={{ borderBottom: '1px solid var(--border-subtle)', minHeight: 80 }}>
                    {portalLogo ? (
                        <img src={portalLogo} alt="Logo" style={{ width: logoWidth, height: 'auto', borderRadius: 10, objectFit: 'contain' }} />
                    ) : (
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'linear-gradient(135deg, var(--accent), var(--accent-pink))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, color: '#fff',
                            boxShadow: '0 4px 12px rgba(139,92,246,0.3)'
                        }}>
                            <BsShieldLock />
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <Nav className="flex-column p-3 flex-grow-1">
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 14px 10px', marginBottom: 4 }}>
                        Navigation
                    </div>
                    {menuItems
                        .filter(item => item.roles.includes(user?.role || 'employee'))
                        .map(item => {
                            const Icon = item.icon;
                            const displayLabel = (item.path === '/users' && user?.role === 'manager') ? 'My Team' : item.label;
                            return (
                                <Nav.Link
                                    as={NavLink}
                                    to={item.path}
                                    key={item.path}
                                    className="d-flex align-items-center gap-3"
                                >
                                    <Icon size={16} /> {displayLabel}
                                </Nav.Link>
                            );
                        })}
                </Nav>

                {/* User Card */}
                <div className="p-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <div className="d-flex align-items-center gap-2 mb-2">
                        <div style={{
                            width: 34, height: 34, borderRadius: 10,
                            background: 'rgba(139,92,246,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--accent)', fontWeight: 700, fontSize: '0.8rem'
                        }}>
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
                            <span className={`badge-premium role-${user?.role}`} style={{ fontSize: '0.65rem' }}>{user?.role}</span>
                        </div>
                    </div>
                    <Button
                        variant="link"
                        size="sm"
                        onClick={handleLogout}
                        className="w-100 d-flex align-items-center justify-content-center gap-1 p-2"
                        style={{
                            color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem',
                            background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                            border: '1px solid var(--border-subtle)'
                        }}
                    >
                        <BsBoxArrowRight /> Sign Out
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow-1 d-flex flex-column" style={{ background: 'var(--bg-primary)', overflow: 'hidden' }}>
                {/* Pending Invitation Banner */}
                {pendingInvite && (
                    <div style={{ 
                        background: 'linear-gradient(90deg, var(--accent), var(--accent-pink))', 
                        padding: '10px 24px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                        zIndex: 1000
                    }}>
                        <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500 }}>
                            👋 You have a pending invitation to join as <strong style={{ textTransform: 'capitalize' }}>{pendingInvite.role}</strong> {pendingInvite.event_title && <>for event: <strong>{pendingInvite.event_title}</strong></>} 
                            {pendingInvite.assigned_task && <div className="mt-1" style={{ fontSize: '0.75rem', opacity: 0.9 }}>Your Primary Task: <strong>{pendingInvite.assigned_task}</strong></div>}
                        </div>
                        <div className="d-flex gap-2">
                            <Button size="sm" variant="light" style={{ fontWeight: 600, borderRadius: 8 }} onClick={handleAcceptInvite}>Accept</Button>
                            <Button size="sm" variant="outline-light" style={{ fontWeight: 600, borderRadius: 8 }} onClick={handleDeclineInvite}>Decline</Button>
                        </div>
                    </div>
                )}

                {/* Topbar */}
                <div className="topbar d-flex align-items-center justify-content-between px-4" style={{ height: 56, minHeight: 56 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
                        Event Management System
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>

                {/* Page Content */}
                <div className="content-area flex-grow-1 p-4" style={{ overflowY: 'auto' }}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
