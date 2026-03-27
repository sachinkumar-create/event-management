import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, Row, Col, Badge } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { getAttendees, createAttendee, updateAttendee, deleteAttendee, getEvents } from '../services/api';
import { BsPlus, BsPencil, BsTrash, BsPeopleFill, BsFunnel, BsPersonCheck, BsPersonX, BsPersonBadge, BsTelephone, BsEnvelope, BsBuilding } from 'react-icons/bs';

const STATUS_COLORS = {
    registered: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
    confirmed: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80', border: 'rgba(34,197,94,0.25)' },
    checked_in: { bg: 'rgba(168,85,247,0.12)', color: '#c084fc', border: 'rgba(168,85,247,0.25)' },
    cancelled: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'rgba(239,68,68,0.25)' },
};

const TICKET_COLORS = {
    general: { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', border: 'rgba(148,163,184,0.25)' },
    vip: { bg: 'rgba(234,179,8,0.12)', color: '#facc15', border: 'rgba(234,179,8,0.25)' },
    speaker: { bg: 'rgba(236,72,153,0.12)', color: '#f472b6', border: 'rgba(236,72,153,0.25)' },
    sponsor: { bg: 'rgba(14,165,233,0.12)', color: '#38bdf8', border: 'rgba(14,165,233,0.25)' },
};

export default function AttendeesPage() {
    const { user } = useAuth();
    const [attendees, setAttendees] = useState([]);
    const [events, setEvents] = useState([]);
    const [show, setShow] = useState(false);
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState('');
    const [filterEvent, setFilterEvent] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterTicket, setFilterTicket] = useState('');
    const [form, setForm] = useState({
        name: '', email: '', phone: '', company: '', designation: '',
        ticket_type: 'general', status: 'registered', event_id: '', notes: ''
    });

    const canManage = ['admin', 'manager'].includes(user?.role) || (user?.role === 'employee' && !!user?.assigned_event_id);

    const load = () => {
        getAttendees(filterEvent || undefined).then(r => setAttendees(Array.isArray(r.data) ? r.data : [])).catch(() => { });
    };

    useEffect(() => {
        getEvents().then(r => setEvents(Array.isArray(r.data) ? r.data : [])).catch(() => { });
    }, []);

    useEffect(() => { load(); }, [filterEvent]);

    const openModal = (item = null) => {
        if (item) {
            setEditing(item);
            setForm({
                name: item.name, email: item.email || '', phone: item.phone || '',
                company: item.company || '', designation: item.designation || '',
                ticket_type: item.ticket_type || 'general', status: item.status || 'registered',
                event_id: item.event_id || '', notes: item.notes || ''
            });
        } else {
            setEditing(null);
            setForm({ 
                name: '', email: '', phone: '', company: '', designation: '', 
                ticket_type: 'general', status: 'registered', 
                event_id: user?.role === 'employee' ? user.assigned_event_id : '', 
                notes: '' 
            });
        }
        setError('');
        setShow(true);
    };

    const handleSave = async () => {
        try {
            if (editing) await updateAttendee({ ...form, id: editing.id });
            else await createAttendee(form);
            setShow(false);
            load();
        } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this attendee?')) { await deleteAttendee(id); load(); }
    };

    // Filtered attendees
    let filtered = attendees;
    if (filterStatus) filtered = filtered.filter(a => a.status === filterStatus);
    if (filterTicket) filtered = filtered.filter(a => a.ticket_type === filterTicket);

    // Stats
    const stats = {
        total: attendees.length,
        confirmed: attendees.filter(a => a.status === 'confirmed').length,
        checked_in: attendees.filter(a => a.status === 'checked_in').length,
        cancelled: attendees.filter(a => a.status === 'cancelled').length,
    };

    const StatCard = ({ label, value, icon: Icon, color }) => (
        <Col xs={6} md={3}>
            <div style={{
                background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)', padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 14
            }}>
                <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: `${color}15`, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: color, fontSize: 18
                }}>
                    <Icon />
                </div>
                <div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                </div>
            </div>
        </Col>
    );

    return (
        <div className="animate-in">
            <div className="page-header d-flex justify-content-between align-items-center">
                <div><h4>Attendees</h4><p>Manage event delegates and participants.</p></div>
                {canManage && <Button className="btn-accent d-flex align-items-center gap-2" onClick={() => openModal()}><BsPlus size={18} /> Add Attendee</Button>}
            </div>

            {/* Stat Cards */}
            <Row className="g-3 mb-4">
                <StatCard label="Total" value={stats.total} icon={BsPeopleFill} color="#8b5cf6" />
                <StatCard label="Confirmed" value={stats.confirmed} icon={BsPersonCheck} color="#4ade80" />
                <StatCard label="Checked In" value={stats.checked_in} icon={BsPersonBadge} color="#c084fc" />
                <StatCard label="Cancelled" value={stats.cancelled} icon={BsPersonX} color="#f87171" />
            </Row>

            {/* Filters */}
            <div className="d-flex gap-2 mb-3 align-items-center flex-wrap">
                <BsFunnel className="text-muted" />
                <Form.Select size="sm" style={{ width: 160, background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 10 }} value={filterEvent} onChange={e => setFilterEvent(e.target.value)}>
                    <option value="">All Events</option>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </Form.Select>
                <Form.Select size="sm" style={{ width: 150, background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 10 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="registered">Registered</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="checked_in">Checked In</option>
                    <option value="cancelled">Cancelled</option>
                </Form.Select>
                <Form.Select size="sm" style={{ width: 150, background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 10 }} value={filterTicket} onChange={e => setFilterTicket(e.target.value)}>
                    <option value="">All Tickets</option>
                    <option value="general">General</option>
                    <option value="vip">VIP</option>
                    <option value="speaker">Speaker</option>
                    <option value="sponsor">Sponsor</option>
                </Form.Select>
                {(filterEvent || filterStatus || filterTicket) && (
                    <Button size="sm" variant="link" className="text-muted text-decoration-none" onClick={() => { setFilterEvent(''); setFilterStatus(''); setFilterTicket(''); }}>
                        Clear
                    </Button>
                )}
            </div>

            {filtered.length === 0 ? (
                <div className="empty-state" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                    <div className="empty-state-icon"><BsPeopleFill /></div>
                    <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>No Attendees Found</p>
                    <p style={{ fontSize: '0.8rem' }}>Add attendees or adjust your filters.</p>
                </div>
            ) : (
                <Table responsive className="premium-table">
                    <thead>
                        <tr>
                            <th>#</th><th>Name</th><th>Contact</th><th>Company</th>
                            <th>Ticket</th><th>Status</th><th>Event</th>
                            {canManage && <th style={{ width: 100 }}>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((a, i) => (
                            <tr key={a.id}>
                                <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                <td>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{a.name}</div>
                                        {a.designation && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{a.designation}</div>}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontSize: '0.8rem' }}>
                                        {a.email && <div className="d-flex align-items-center gap-1" style={{ color: 'var(--accent-sky)' }}><BsEnvelope size={11} /> {a.email}</div>}
                                        {a.phone && <div className="d-flex align-items-center gap-1 mt-1" style={{ color: 'var(--text-muted)' }}><BsTelephone size={11} /> {a.phone}</div>}
                                    </div>
                                </td>
                                <td style={{ color: 'var(--text-secondary)' }}>{a.company || '—'}</td>
                                <td>
                                    <span style={{
                                        display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem',
                                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em',
                                        background: TICKET_COLORS[a.ticket_type]?.bg, color: TICKET_COLORS[a.ticket_type]?.color,
                                        border: `1px solid ${TICKET_COLORS[a.ticket_type]?.border}`
                                    }}>{a.ticket_type}</span>
                                </td>
                                <td>
                                    <span style={{
                                        display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem',
                                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em',
                                        background: STATUS_COLORS[a.status]?.bg, color: STATUS_COLORS[a.status]?.color,
                                        border: `1px solid ${STATUS_COLORS[a.status]?.border}`
                                    }}>{a.status?.replace('_', ' ')}</span>
                                </td>
                                <td><span className="badge-premium status-upcoming">{a.event_title || '—'}</span></td>
                                {canManage && (
                                    <td>
                                        <button className="btn-action" onClick={() => openModal(a)}><BsPencil size={13} /></button>
                                        {user?.role === 'admin' && <button className="btn-action danger" onClick={() => handleDelete(a.id)}><BsTrash size={13} /></button>}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}

            {/* Modal */}
            <Modal show={show} onHide={() => setShow(false)} centered contentClassName="premium-modal" size="lg">
                <Modal.Header closeButton closeVariant="white"><Modal.Title style={{ color: 'var(--text-primary)' }}>{editing ? 'Edit Attendee' : 'Add Attendee'}</Modal.Title></Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger" className="py-2" style={{ fontSize: '0.85rem', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>{error}</Alert>}

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3"><Form.Label>Name *</Form.Label>
                                <Form.Control className="form-control-dark" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" required />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3"><Form.Label>Email</Form.Label>
                                <Form.Control type="email" className="form-control-dark" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3"><Form.Label>Phone</Form.Label>
                                <Form.Control className="form-control-dark" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3"><Form.Label>Company</Form.Label>
                                <Form.Control className="form-control-dark" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Organization" />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3"><Form.Label>Designation</Form.Label>
                                <Form.Control className="form-control-dark" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="Job title" />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Event</Form.Label>
                                <Form.Select 
                                    className="form-select-dark" 
                                    value={form.event_id} 
                                    onChange={e => setForm({ ...form, event_id: e.target.value })}
                                    disabled={user?.role === 'employee'}
                                >
                                    <option value="">Select Event</option>
                                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3"><Form.Label>Ticket Type</Form.Label>
                                <Form.Select className="form-select-dark" value={form.ticket_type} onChange={e => setForm({ ...form, ticket_type: e.target.value })}>
                                    <option value="general">General</option>
                                    <option value="vip">VIP</option>
                                    <option value="speaker">Speaker</option>
                                    <option value="sponsor">Sponsor</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3"><Form.Label>Status</Form.Label>
                                <Form.Select className="form-select-dark" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                    <option value="registered">Registered</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="checked_in">Checked In</option>
                                    <option value="cancelled">Cancelled</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3"><Form.Label>Notes</Form.Label>
                        <Form.Control as="textarea" rows={2} className="form-control-dark" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes..." />
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
