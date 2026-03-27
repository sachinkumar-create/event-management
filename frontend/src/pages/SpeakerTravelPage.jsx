import { useState, useEffect } from 'react';
import { Button, Modal, Form, Alert, Row, Col } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { getAllTravel, createTravel, updateTravel, deleteTravel, getSpeakers } from '../services/api';
import { BsPlus, BsPencil, BsTrash, BsFunnel, BsGeoAlt, BsCalendar3, BsCurrencyRupee, BsTicketPerforated, BsAirplane } from 'react-icons/bs';

const TYPE_META = {
    flight: { icon: '✈️', label: 'Flight', color: '#60a5fa' },
    hotel: { icon: '🏨', label: 'Hotel', color: '#fbbf24' },
    cab: { icon: '🚕', label: 'Cab', color: '#4ade80' },
    train: { icon: '🚆', label: 'Train', color: '#f472b6' },
    other: { icon: '📦', label: 'Other', color: '#94a3b8' },
};

const STATUS_COLORS = {
    pending: { bg: 'rgba(234,179,8,0.12)', color: '#facc15', border: 'rgba(234,179,8,0.25)' },
    booked: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
    confirmed: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80', border: 'rgba(34,197,94,0.25)' },
    cancelled: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'rgba(239,68,68,0.25)' },
};

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatTime = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};
const formatCost = (v) => {
    if (!v || v === 0) return '—';
    return '₹' + Number(v).toLocaleString('en-IN');
};

export default function SpeakerTravelPage() {
    const { user } = useAuth();
    const [records, setRecords] = useState([]);
    const [speakers, setSpeakers] = useState([]);
    const [show, setShow] = useState(false);
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState('');
    const [filterSpeaker, setFilterSpeaker] = useState('');
    const [filterType, setFilterType] = useState('');
    const [selectedTypes, setSelectedTypes] = useState([]);

    const canManage = ['admin', 'manager'].includes(user?.role) || (user?.role === 'employee' && !!user?.assigned_event_id);

    const blankForm = {
        speaker_id: '', travel_type: 'flight', title: '', details: '',
        from_location: '', to_location: '', departure_date: '', arrival_date: '',
        booking_ref: '', cost: '', currency: 'INR', status: 'pending', notes: ''
    };
    const [form, setForm] = useState({ ...blankForm });

    const load = () => {
        getAllTravel(filterSpeaker || undefined).then(r => setRecords(Array.isArray(r.data) ? r.data : [])).catch(() => { });
    };

    useEffect(() => {
        getSpeakers().then(r => setSpeakers(Array.isArray(r.data) ? r.data : [])).catch(() => { });
    }, []);
    useEffect(() => { load(); }, [filterSpeaker]);

    const openModal = (item = null) => {
        if (item) {
            setEditing(item);
            setSelectedTypes([item.travel_type]);
            setForm({
                speaker_id: item.speaker_id, travel_type: item.travel_type || 'flight',
                title: item.title || '', details: item.details || '',
                from_location: item.from_location || '', to_location: item.to_location || '',
                departure_date: item.departure_date ? item.departure_date.slice(0, 16) : '',
                arrival_date: item.arrival_date ? item.arrival_date.slice(0, 16) : '',
                booking_ref: item.booking_ref || '', cost: item.cost || '',
                currency: item.currency || 'INR', status: item.status || 'pending',
                notes: item.notes || ''
            });
        } else {
            setEditing(null);
            setSelectedTypes(['flight']);
            setForm({ ...blankForm });
        }
        setError('');
        setShow(true);
    };

    const handleSave = async () => {
        if (!form.speaker_id) { setError('Please select a speaker'); return; }
        if (user.role === 'employee' && !editing && selectedTypes.length === 0) {
            setError('Please select at least one travel type'); return;
        }
        try {
            if (editing) {
                await updateTravel({ ...form, id: editing.id });
            } else if (user.role === 'employee') {
                for (const t of selectedTypes) {
                    await createTravel({ ...form, travel_type: t });
                }
            } else {
                await createTravel(form);
            }
            setShow(false);
            load();
        } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this travel record?')) { await deleteTravel(id); load(); }
    };

    // Filter
    let filtered = records;
    if (filterType) filtered = filtered.filter(r => r.travel_type === filterType);

    // Cost summary
    const totalCost = filtered.filter(r => r.status !== 'cancelled').reduce((s, r) => s + Number(r.cost || 0), 0);
    const costByType = {};
    filtered.filter(r => r.status !== 'cancelled').forEach(r => {
        costByType[r.travel_type] = (costByType[r.travel_type] || 0) + Number(r.cost || 0);
    });

    return (
        <div className="animate-in">
            <div className="page-header d-flex justify-content-between align-items-center">
                <div><h4>Travel Management</h4><p>Track speaker flights, hotels, and travel logistics.</p></div>
                {canManage && (
                    <Button className="btn-accent d-flex align-items-center gap-2" onClick={() => openModal()}>
                        <BsPlus size={18} /> {user?.role === 'employee' ? 'Request Travel' : 'Add Travel'}
                    </Button>
                )}
            </div>

            {/* Cost Summary */}
            <div className="mb-4" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', padding: '20px 24px' }}>
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                    <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total Budget</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                            <BsCurrencyRupee style={{ fontSize: '1.4rem', opacity: 0.6 }} />{totalCost.toLocaleString('en-IN')}
                        </div>
                    </div>
                    <div className="d-flex gap-4 flex-wrap">
                        {Object.entries(costByType).map(([type, cost]) => (
                            <div key={type} className="text-center">
                                <div style={{ fontSize: '1.4rem' }}>{TYPE_META[type]?.icon}</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: TYPE_META[type]?.color }}>{formatCost(cost)}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{TYPE_META[type]?.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="d-flex gap-2 mb-3 align-items-center flex-wrap">
                <BsFunnel className="text-muted" />
                <Form.Select size="sm" style={{ width: 200, background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 10 }} value={filterSpeaker} onChange={e => setFilterSpeaker(e.target.value)}>
                    <option value="">All Speakers</option>
                    {speakers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Form.Select>
                <Form.Select size="sm" style={{ width: 150, background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 10 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="">All Types</option>
                    {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </Form.Select>
                {(filterSpeaker || filterType) && (
                    <Button size="sm" variant="link" className="text-muted text-decoration-none" onClick={() => { setFilterSpeaker(''); setFilterType(''); }}>Clear</Button>
                )}
            </div>

            {/* Travel Cards */}
            {filtered.length === 0 ? (
                <div className="empty-state" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                    <div className="empty-state-icon"><BsAirplane /></div>
                    <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>No Travel Records</p>
                    <p style={{ fontSize: '0.8rem' }}>Add travel arrangements for speakers.</p>
                </div>
            ) : (
                <div className="d-flex flex-column gap-3">
                    {filtered.map(r => {
                        const meta = TYPE_META[r.travel_type] || TYPE_META.other;
                        const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
                        return (
                            <div key={r.id} style={{
                                background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border-subtle)', padding: '18px 22px',
                                transition: 'border-color 0.2s',
                            }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = meta.color + '44'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                            >
                                <div className="d-flex align-items-start gap-3 flex-wrap">
                                    {/* Type Icon */}
                                    <div style={{
                                        width: 48, height: 48, borderRadius: 14,
                                        background: meta.color + '15', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
                                        flexShrink: 0
                                    }}>
                                        {meta.icon}
                                    </div>

                                    {/* Main Info */}
                                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                        <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{r.title || meta.label}</span>
                                            <span style={{
                                                display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem',
                                                fontWeight: 600, textTransform: 'uppercase',
                                                background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`
                                            }}>{r.status}</span>
                                        </div>

                                        <div className="d-flex flex-wrap gap-3 mb-2" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {r.speaker_name && (
                                                <span className="d-flex align-items-center gap-1">
                                                    <span style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(236,72,153,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#f472b6', fontWeight: 700 }}>
                                                        {r.speaker_name.charAt(0)}
                                                    </span>
                                                    {r.speaker_name}
                                                </span>
                                            )}
                                            {(r.from_location || r.to_location) && (
                                                <span className="d-flex align-items-center gap-1">
                                                    <BsGeoAlt size={12} style={{ color: meta.color }} />
                                                    {r.from_location}{r.from_location && r.to_location && ' → '}{r.to_location}
                                                </span>
                                            )}
                                            {r.departure_date && (
                                                <span className="d-flex align-items-center gap-1">
                                                    <BsCalendar3 size={11} />
                                                    {formatDate(r.departure_date)} {formatTime(r.departure_date)}
                                                    {r.arrival_date && <> — {formatDate(r.arrival_date)} {formatTime(r.arrival_date)}</>}
                                                </span>
                                            )}
                                        </div>

                                        {r.booking_ref && (
                                            <div className="d-flex align-items-center gap-1 mb-1" style={{ fontSize: '0.75rem' }}>
                                                <BsTicketPerforated size={12} style={{ color: 'var(--accent)' }} />
                                                <span style={{ color: 'var(--text-secondary)' }}>Ref:</span>
                                                <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600 }}>{r.booking_ref}</span>
                                            </div>
                                        )}

                                        {r.details && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{r.details}</div>}
                                    </div>

                                    {/* Cost + Actions */}
                                    <div className="text-end" style={{ flexShrink: 0 }}>
                                        {r.cost > 0 && (
                                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: meta.color, marginBottom: 8 }}>
                                                {formatCost(r.cost)}
                                            </div>
                                        )}
                                        {canManage && (
                                            <div className="d-flex gap-1 justify-content-end">
                                                <button className="btn-action" onClick={() => openModal(r)}><BsPencil size={12} /></button>
                                                <button className="btn-action danger" onClick={() => handleDelete(r.id)}><BsTrash size={12} /></button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            <Modal show={show} onHide={() => setShow(false)} centered contentClassName="premium-modal" size="lg">
                <Modal.Header closeButton closeVariant="white">
                    <Modal.Title style={{ color: 'var(--text-primary)' }}>{editing ? 'Edit Travel' : 'Add Travel Record'}</Modal.Title></Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger" className="py-2" style={{ fontSize: '0.85rem', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>{error}</Alert>}

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3"><Form.Label>Speaker *</Form.Label>
                                <Form.Select className="form-select-dark" value={form.speaker_id} onChange={e => setForm({ ...form, speaker_id: e.target.value })}>
                                    <option value="">Select Speaker</option>
                                    {speakers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Travel Type</Form.Label>
                                {user.role === 'employee' && !editing ? (
                                    <div className="d-flex flex-wrap gap-3 p-2" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                                        {['flight', 'hotel', 'cab'].map(type => (
                                            <Form.Check 
                                                key={type}
                                                type="checkbox"
                                                id={`type-${type}`}
                                                label={`${TYPE_META[type].icon} ${TYPE_META[type].label}`}
                                                checked={selectedTypes.includes(type)}
                                                onChange={e => {
                                                    if (e.target.checked) setSelectedTypes([...selectedTypes, type]);
                                                    else setSelectedTypes(selectedTypes.filter(t => t !== type));
                                                }}
                                                style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <Form.Select className="form-select-dark" value={form.travel_type} onChange={e => setForm({ ...form, travel_type: e.target.value })}>
                                        {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                                    </Form.Select>
                                )}
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3"><Form.Label>Title</Form.Label>
                        <Form.Control className="form-control-dark" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. DEL → BOM IndiGo 6E-204" />
                    </Form.Group>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3"><Form.Label>From</Form.Label>
                                <Form.Control className="form-control-dark" value={form.from_location} onChange={e => setForm({ ...form, from_location: e.target.value })} placeholder="Origin city / hotel name" />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3"><Form.Label>To</Form.Label>
                                <Form.Control className="form-control-dark" value={form.to_location} onChange={e => setForm({ ...form, to_location: e.target.value })} placeholder="Destination city / hotel name" />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3"><Form.Label>Departure / Check-in</Form.Label>
                                <Form.Control type="datetime-local" className="form-control-dark" value={form.departure_date} onChange={e => setForm({ ...form, departure_date: e.target.value })} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3"><Form.Label>Arrival / Check-out</Form.Label>
                                <Form.Control type="datetime-local" className="form-control-dark" value={form.arrival_date} onChange={e => setForm({ ...form, arrival_date: e.target.value })} />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row>
                        {user.role !== 'employee' && (
                            <>
                                <Col md={4}>
                                    <Form.Group className="mb-3"><Form.Label>Booking Ref / PNR</Form.Label>
                                        <Form.Control className="form-control-dark" value={form.booking_ref} onChange={e => setForm({ ...form, booking_ref: e.target.value })} placeholder="ABC123" />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group className="mb-3"><Form.Label>Cost</Form.Label>
                                        <Form.Control type="number" className="form-control-dark" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="0" />
                                    </Form.Group>
                                </Col>
                                <Col md={2}>
                                    <Form.Group className="mb-3"><Form.Label>Currency</Form.Label>
                                        <Form.Select className="form-select-dark" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                                            <option value="INR">INR</option>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                            <option value="GBP">GBP</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </>
                        )}
                        <Col md={user.role === 'employee' ? 12 : 3}>
                            <Form.Group className="mb-3"><Form.Label>Status</Form.Label>
                                <Form.Select 
                                    className="form-select-dark" 
                                    value={form.status} 
                                    onChange={e => setForm({ ...form, status: e.target.value })}
                                    disabled={user?.role === 'employee'}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="booked">Booked</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="cancelled">Cancelled</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3"><Form.Label>Details</Form.Label>
                        <Form.Control as="textarea" rows={2} className="form-control-dark" value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} placeholder="Additional details..." />
                    </Form.Group>

{user.role !== 'employee' && (
                        <Form.Group className="mb-3"><Form.Label>Notes</Form.Label>
                            <Form.Control as="textarea" rows={2} className="form-control-dark" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes..." />
                        </Form.Group>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="link" onClick={() => setShow(false)} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Cancel</Button>
                    <Button className="btn-accent" onClick={handleSave}>Save</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
