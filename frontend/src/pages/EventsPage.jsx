import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../services/api';
import { BsPlus, BsPencil, BsTrash, BsCalendarEvent } from 'react-icons/bs';

export default function EventsPage() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [show, setShow] = useState(false);
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ title: '', description: '', start_date: '', end_date: '', venue: '', status: 'upcoming' });

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const isAdmin = user?.role === 'admin';
    const canManage = ['admin', 'manager'].includes(user?.role);

    const load = () => {
        setError('');
        getEvents()
            .then(r => setEvents(Array.isArray(r.data) ? r.data : []))
            .catch(err => {
                console.error('Events Load Error:', err);
                setError(err.response?.data?.error || 'Failed to load events. Please try logging in again.');
            });
    };
    useEffect(() => { load(); }, [user?.assigned_event_id]);

    const openModal = (event = null) => {
        if (event) {
            setEditing(event);
            setForm({ title: event.title, description: event.description || '', start_date: event.start_date, end_date: event.end_date, venue: event.venue || '', status: event.status });
        } else {
            setEditing(null);
            setForm({ title: '', description: '', start_date: '', end_date: '', venue: '', status: 'upcoming' });
        }
        setError('');
        setShow(true);
    };

    const handleSave = async () => {
        try {
            if (editing) await updateEvent({ ...form, id: editing.id });
            else await createEvent(form);
            setShow(false);
            load();
        } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this event?')) { await deleteEvent(id); load(); }
    };

    return (
        <div className="animate-in">
            <div className="page-header d-flex justify-content-between align-items-center">
                <div>
                    <h4>Events</h4>
                    <p className='text-white small'>Manage all your events in one place.</p>
                </div>
                {canManage && <Button className="btn-accent d-flex align-items-center gap-2" onClick={() => openModal()}><BsPlus size={18} /> Create Event</Button>}
            </div>

            {error && <Alert variant="danger" className="mb-4 py-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: 'var(--radius-lg)' }}>{error}</Alert>}

            {events.length === 0 ? (
                <div className="empty-state" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                    <div className="empty-state-icon"><BsCalendarEvent /></div>
                    <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>No Events Yet</p>
                    <p style={{ fontSize: '0.8rem' }}>Create your first event to get started.</p>
                </div>
            ) : (
                <Table responsive className="premium-table">
                    <thead>
                        <tr><th>#</th><th>Title</th><th>Venue</th><th>Start</th><th>End</th><th>Status</th><th>Created By</th>{canManage && <th style={{ width: 100 }}>Actions</th>}</tr>
                    </thead>
                    <tbody>
                        {events.map((e, i) => (
                            <tr key={e.id}>
                                <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                <td style={{ fontWeight: 600 }}>{e.title}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{e.venue || '—'}</td>
                                <td style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{formatDate(e.start_date)}</td>
                                <td style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{formatDate(e.end_date)}</td>
                                <td><span className={`badge-premium status-${e.status}`}>{e.status}</span></td>
                                <td style={{ color: 'var(--text-secondary)' }}>{e.creator_name}</td>
                                {canManage && (
                                    <td>
                                        <button className="btn-action" onClick={() => openModal(e)}><BsPencil size={13} /></button>
                                        {(isAdmin || (user?.role === 'manager' && e.created_by === user?.id)) && (
                                            <button className="btn-action danger" onClick={() => handleDelete(e.id)}><BsTrash size={13} /></button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}

            <Modal show={show} onHide={() => setShow(false)} centered contentClassName="premium-modal">
                <Modal.Header closeButton closeVariant="white"><Modal.Title>{editing ? 'Edit Event' : 'Create Event'}</Modal.Title></Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger" className="py-2" style={{ fontSize: '0.85rem', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>{error}</Alert>}
                    <Form.Group className="mb-3"><Form.Label>Title</Form.Label><Form.Control className="form-control-dark" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Enter event title" /></Form.Group>
                    <Form.Group className="mb-3"><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={2} className="form-control-dark" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description" /></Form.Group>
                    <Form.Group className="mb-3"><Form.Label>Venue</Form.Label><Form.Control className="form-control-dark" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} placeholder="Event venue" /></Form.Group>
                    <div className="d-flex gap-3">
                        <Form.Group className="mb-3 flex-fill">
                            <Form.Label>Start Date</Form.Label>
                            <Form.Control 
                                type="date" 
                                className="form-control-dark" 
                                value={form.start_date ? form.start_date.split('T')[0] : ''} 
                                onChange={e => setForm({ ...form, start_date: e.target.value })} 
                                disabled={user?.role === 'employee'}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3 flex-fill">
                            <Form.Label>End Date</Form.Label>
                            <Form.Control 
                                type="date" 
                                className="form-control-dark" 
                                value={form.end_date ? form.end_date.split('T')[0] : ''} 
                                onChange={e => setForm({ ...form, end_date: e.target.value })} 
                                disabled={user?.role === 'employee'}
                            />
                        </Form.Group>
                    </div>
                    <Form.Group className="mb-3">
                        <Form.Label>Status</Form.Label>
                        <Form.Select 
                            className="form-select-dark" 
                            value={form.status} 
                            onChange={e => setForm({ ...form, status: e.target.value })}
                            disabled={user?.role === 'employee'}
                        >
                            <option value="upcoming">Upcoming</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="link" onClick={() => setShow(false)} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Cancel</Button>
                    <Button className="btn-accent" onClick={handleSave}>Save</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
