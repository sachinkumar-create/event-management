import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, InputGroup } from 'react-bootstrap';
import { getUsers, inviteUser, updateUser, deleteUser, getEvents, deleteInvitation } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BsPlus, BsPencil, BsTrash, BsPeople, BsClipboard } from 'react-icons/bs';

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [events, setEvents] = useState([]);
    const [show, setShow] = useState(false);
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState('');
    const [successLink, setSuccessLink] = useState('');
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee', event_id: '', assigned_task: '' });

    // Filters
    const [roleFilter, setRoleFilter] = useState('');
    const [eventFilter, setEventFilter] = useState('');

    const loadUsers = () => getUsers().then(r => setUsers(Array.isArray(r.data) ? r.data : [])).catch(() => { });
    const loadEvents = () => getEvents().then(r => setEvents(Array.isArray(r.data) ? r.data : [])).catch(() => { });

    useEffect(() => {
        loadUsers();
        loadEvents();
    }, []);

    const openModal = (item = null) => {
        if (item) {
            setEditing(item);
            setForm({ name: item.name, email: item.email, password: '', role: item.role, event_id: item.assigned_event_id || '', assigned_task: item.assigned_task || '' });
        } else {
            setEditing(null);
            // Default role for managers is employee
            setForm({ email: '', role: currentUser?.role === 'manager' ? 'employee' : 'employee', event_id: '', assigned_task: '' });
        }
        setError('');
        setSuccessLink('');
        setShow(true);
    };

    const handleSave = async () => {
        try {
            setError('');
            if (editing) {
                if (editing.status === 'accepted') {
                    await updateUser({ ...form, id: editing.id });
                } else {
                    // Updating an invitation - we'll re-invite which handles deletion and re-creation with new data
                    await inviteUser({ email: form.email, role: form.role, event_id: form.event_id || null, assigned_task: form.assigned_task || null });
                }
                setShow(false);
                loadUsers();
            } else {
                const res = await inviteUser({ email: form.email, role: form.role, event_id: form.event_id || null, assigned_task: form.assigned_task || null });
                setSuccessLink(window.location.origin + res.data.inviteLink);
            }
        } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    };

    const handleDelete = async (item) => {
        const isUser = item.status === 'accepted';
        const msg = isUser ? 'Delete this user?' : 'Revoke this invitation?';
        if (window.confirm(msg)) {
            try {
                if (isUser) await deleteUser(item.id);
                else await deleteInvitation(item.email);
                loadUsers();
            } catch (err) { alert(err.response?.data?.error || 'Failed'); }
        }
    };

    // Managers see limited roles
    const availableRoles = currentUser?.role === 'admin' ? ['admin', 'manager', 'employee'] : ['employee'];

    const filteredUsers = users.filter(u => {
        if (currentUser?.role !== 'admin') return true;

        let matchRole = true;
        if (roleFilter) matchRole = u.role === roleFilter;

        let matchEvent = true;
        if (eventFilter) {
            if (eventFilter === 'unassigned') matchEvent = !u.assigned_event_id;
            else matchEvent = u.assigned_event_id === Number(eventFilter);
        }

        return matchRole && matchEvent;
    });

    return (
        <div className="animate-in">
            <div className="page-header d-flex justify-content-between align-items-center">
                <div><h4>{currentUser?.role === 'manager' ? 'My Team' : 'Users & Invitations'}</h4><p className="text-white small">Manage system access and assign events to staff.</p></div>
                <div className="d-flex gap-3 align-items-center">
                    {currentUser?.role === 'admin' && (
                        <>
                            <Form.Select className="form-select-dark" style={{ width: 140, padding: '6px 10px', fontSize: '0.8rem' }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                                <option value="">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="employee">Employee</option>
                            </Form.Select>
                            <Form.Select className="form-select-dark" style={{ width: 180, padding: '6px 10px', fontSize: '0.8rem' }} value={eventFilter} onChange={e => setEventFilter(e.target.value)}>
                                <option value="">All Events</option>
                                <option value="unassigned">General / Unassigned</option>
                                {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                            </Form.Select>
                        </>
                    )}
                    <Button className="btn-accent d-flex align-items-center gap-2" onClick={() => openModal()}><BsPlus size={18} /> Invite User</Button>
                </div>
            </div>

            {filteredUsers.length === 0 ? (
                <div className="empty-state" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                    <div className="empty-state-icon"><BsPeople /></div>
                    <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>No Team Members Yet</p>
                    <p style={{ fontSize: '0.8rem' }}>Invite users to your team.</p>
                </div>
            ) : (
                <Table responsive className="premium-table">
                    <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Event / Task</th><th>Status</th><th>Activity</th><th style={{ width: 100 }}>Actions</th></tr></thead>
                    <tbody>
                        {filteredUsers.map((u, i) => (
                            <tr key={u.id}>
                                <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                <td>
                                    <div className="d-flex align-items-center gap-2">
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 700, fontSize: '0.8rem' }}>
                                            {u.name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <span style={{ fontWeight: u.name ? 600 : 400, opacity: u.name ? 1 : 0.6 }}>
                                            {u.name || '(Pending Invite)'}
                                        </span>
                                    </div>
                                </td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.email}</td>
                                <td><span className={`badge-premium role-${u.role}`}>{u.role}</span></td>
                                <td style={{ fontSize: '0.85rem' }}>
                                    <div style={{ fontWeight: 600, color: '#000' }}>
                                        {u.assigned_event_id ? (events.find(e => e.id === u.assigned_event_id)?.title || 'Event #' + u.assigned_event_id) : <span className="opacity-50">General</span>}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#000 !important' }}>
                                        {u.assigned_task || <span className="opacity-50">No task assigned</span>}
                                    </div>
                                </td>
                                <td>
                                    <span className={`badge-premium status-${u.status === 'accepted' ? 'ongoing' : 'upcoming'}`} style={{ fontSize: '0.65rem' }}>
                                        {u.status === 'accepted' ? 'Accepted' : 'Pending'}
                                    </span>
                                </td>
                                <td>
                                    <div className="d-flex gap-2 align-items-center" style={{ fontSize: '0.75rem' }}>
                                        <div title="Speakers added"><span style={{ color: 'var(--accent-pink)' }}>S:</span> <strong>{u.speaker_count || 0}</strong></div>
                                        <div title="Partners added"><span style={{ color: 'var(--accent-sky)' }}>P:</span> <strong>{u.partner_count || 0}</strong></div>
                                        <div title="Delegates added"><span style={{ color: 'var(--accent)' }}>D:</span> <strong>{u.attendee_count || 0}</strong></div>
                                    </div>
                                </td>
                                <td>
                                    {u.status === 'accepted' ? (
                                        <>
                                            <button className="btn-action" onClick={() => openModal(u)}><BsPencil size={13} /></button>
                                            <button className="btn-action danger" onClick={() => handleDelete(u)}><BsTrash size={13} /></button>
                                        </>
                                    ) : (
                                        <div className="d-flex align-items-center gap-2">
                                            <button className="btn-action" onClick={() => openModal(u)}><BsPencil size={13} /></button>
                                            <button className="btn-action danger" title="Revoke Invitation" onClick={() => handleDelete(u)}><BsTrash size={13} /></button>
                                            <div className="text-muted small italic">Invite sent</div>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}

            <Modal show={show} onHide={() => { setShow(false); setSuccessLink(''); }} centered contentClassName="premium-modal">
                <Modal.Header closeButton closeVariant="white"><Modal.Title>{editing ? 'Edit User' : 'Invite User'}</Modal.Title></Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger" className="py-2" style={{ fontSize: '0.85rem', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>{error}</Alert>}

                    {successLink ? (
                        <div className="mb-3 text-center animate-in">
                            <div className="p-3 mb-4" style={{ background: 'rgba(16,185,129,0.1)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)' }}>
                                <h6 style={{ color: '#10b981', fontWeight: 700, marginBottom: 8 }}>Invitation Link Ready!</h6>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 0 }}>Send this to <strong>{form.email}</strong> to complete setup.</p>
                            </div>
                            <InputGroup>
                                <Form.Control readOnly value={successLink} className="form-control-dark" style={{ borderRight: 'none', fontSize: '0.8rem' }} />
                                <Button className="btn-accent" style={{ padding: '0 20px' }} onClick={() => { navigator.clipboard.writeText(successLink); alert('Link copied!'); }}>
                                    <BsClipboard />
                                </Button>
                            </InputGroup>
                        </div>
                    ) : (
                        <>
                            {editing && <Form.Group className="mb-3"><Form.Label>Name</Form.Label><Form.Control className="form-control-dark" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" /></Form.Group>}
                            <Form.Group className="mb-3"><Form.Label>Email Address</Form.Label><Form.Control type="email" readOnly={editing} className="form-control-dark" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="staff@company.com" /></Form.Group>

                            <div className="d-flex gap-3">
                                <Form.Group className="mb-3 flex-fill">
                                    <Form.Label>Role</Form.Label>
                                    <Form.Select className="form-select-dark" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                        {availableRoles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                                    </Form.Select>
                                </Form.Group>

                                {(form.role === 'employee' || form.role === 'manager') && (
                                    <Form.Group className="mb-3 flex-fill">
                                        <Form.Label>Assign Event</Form.Label>
                                        <Form.Select className="form-select-dark" value={form.event_id} onChange={e => setForm({ ...form, event_id: e.target.value })}>
                                            <option value="">No Specific Event</option>
                                            {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                                        </Form.Select>
                                    </Form.Group>
                                )}
                            </div>

                            {editing && <Form.Group className="mb-3"><Form.Label>Update Password <span className="small opacity-50">(optional)</span></Form.Label><Form.Control type="password" className="form-control-dark" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /></Form.Group>}

                            {(form.role === 'employee' || form.role === 'manager') && (
                                <Form.Group className="mb-3">
                                    <Form.Label>Assigned Task / Role Description</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        className="form-control-dark"
                                        value={form.assigned_task}
                                        onChange={e => setForm({ ...form, assigned_task: e.target.value })}
                                        placeholder="e.g., Manage Speaker Travel, Handling Registration Desk..."
                                    />
                                </Form.Group>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="link" onClick={() => { setShow(false); setSuccessLink(''); }} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{successLink ? 'Close' : 'Cancel'}</Button>
                    {!successLink && <Button className="btn-accent px-4" onClick={handleSave}>{editing ? 'Save Changes' : 'Generate Invitation'}</Button>}
                </Modal.Footer>
            </Modal>
        </div>
    );
}
