import { useState, useEffect, useRef } from 'react';
import { Table, Button, Modal, Form, Alert, Row, Col, OverlayTrigger, Popover } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { getPartners, createPartner, updatePartner, deletePartner, reorderPartners, getEvents, getPartnerCategories, getSpeakers } from '../services/api';
import { BsPlus, BsPencil, BsTrash, BsBriefcase, BsLink45Deg, BsEye, BsGripVertical } from 'react-icons/bs';
import { useNavigate } from 'react-router-dom';

export default function PartnersPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [partners, setPartners] = useState([]);
    const [events, setEvents] = useState([]);
    const [categories, setCategories] = useState([]);
    const [speakers, setSpeakers] = useState([]);
    const [show, setShow] = useState(false);
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ 
        name: '', 
        website: '', 
        logo_url: '', 
        event_id: '', 
        category_id: '', 
        sequence: 0, 
        wishlist: '', 
        wishlist_speakers: [] 
    });
    const [logo, setLogo] = useState(null);
    const [preview, setPreview] = useState('');
    const [filterEvent, setFilterEvent] = useState('');

    // Drag-and-drop state
    const dragIdxRef = useRef(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const canManage = ['admin', 'manager'].includes(user?.role) || (user?.role === 'employee' && !!user?.assigned_event_id);

    const load = () => {
        getPartners().then(r => setPartners(Array.isArray(r.data) ? r.data : [])).catch(() => { });
        getEvents().then(r => setEvents(Array.isArray(r.data) ? r.data : [])).catch(() => { });
        getPartnerCategories().then(r => setCategories(Array.isArray(r.data) ? r.data : [])).catch(() => { });
        getSpeakers().then(r => setSpeakers(Array.isArray(r.data) ? r.data : [])).catch(() => { });
    };
    useEffect(() => { load(); }, []);

    // --- Drag-and-drop handlers (operate on filteredPartners list) ---
    const handleDragStart = (e, idx) => {
        dragIdxRef.current = idx;
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, idx) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIdx(idx);
    };

    const handleDragLeave = () => setDragOverIdx(null);

    const handleDrop = async (e, dropIdx) => {
        e.preventDefault();
        setDragOverIdx(null);
        const dragIdx = dragIdxRef.current;
        if (dragIdx === null || dragIdx === dropIdx) return;

        // Re-order the filtered list
        const reordered = [...filteredPartners];
        const [moved] = reordered.splice(dragIdx, 1);
        reordered.splice(dropIdx, 0, moved);

        // Assign new contiguous sequences (1-based)
        const updates = reordered.map((p, i) => ({ id: p.id, sequence: i + 1 }));

        // Optimistic UI update: merge back into full partners list preserving unfiltered ones
        setPartners(prev => {
            const filteredIds = new Set(filteredPartners.map(p => p.id));
            const others = prev.filter(p => !filteredIds.has(p.id));
            const updated = reordered.map((p, i) => ({ ...p, sequence: i + 1 }));
            return [...others, ...updated].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        });

        // Persist to backend
        setIsSaving(true);
        try {
            await reorderPartners(updates);
        } catch {
            load(); // Revert on error
        } finally {
            setIsSaving(false);
        }
        dragIdxRef.current = null;
    };

    const handleDragEnd = () => {
        dragIdxRef.current = null;
        setDragOverIdx(null);
    };

    // --- Modal ---
    const openModal = (item = null) => {
        if (item) {
            setEditing(item);
            setForm({
                name: item.name,
                website: item.website || '',
                logo_url: item.logo_url || '',
                event_id: item.event_id || '',
                category_id: item.category_id || '',
                sequence: item.sequence || 0,
                wishlist: item.wishlist || '',
                wishlist_speakers: item.wishlist_speakers ? item.wishlist_speakers.map(s => s.id) : []
            });
            if (!item.wishlist_speakers) {
                import('../services/api').then(api => {
                    api.getPartner(item.id).then(r => {
                        setForm(f => ({ ...f, wishlist_speakers: r.data.wishlist_speakers.map(s => s.id) }));
                    });
                });
            }
            setPreview(item.logo_url || '');
        } else {
            setEditing(null);
            setForm({ 
                name: '', website: '', logo_url: '', 
                event_id: user?.role === 'employee' ? user.assigned_event_id : '', 
                category_id: '', sequence: 0,
                wishlist: '', wishlist_speakers: []
            });
            setPreview('');
        }
        setLogo(null);
        setError('');
        setShow(true);
    };

    const handleSave = async () => {
        if (!form.category_id) return setError('Please select a category');

        const data = new FormData();
        Object.keys(form).forEach(key => {
            if (key === 'wishlist_speakers') {
                data.append(key, JSON.stringify(form[key]));
            } else {
                data.append(key, form[key]);
            }
        });
        if (logo) data.append('logo', logo);
        if (editing) data.append('id', editing.id);

        try {
            if (editing) await updatePartner(data);
            else await createPartner(data);
            setShow(false);
            load();
        } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    };

    const handleDelete = async (id) => { if (window.confirm('Delete?')) { await deletePartner(id); load(); } };

    const filteredPartners = filterEvent
        ? partners.filter(p => String(p.event_id) === String(filterEvent))
        : partners;

    return (
        <div className="animate-in">
            <div className="page-header d-flex justify-content-between align-items-center">
                <div><h4>Partners</h4>
                    <p className='text-white small'>Manage sponsors and partners for your events. {canManage && <span style={{ color: 'var(--accent-emerald)', fontWeight: 500 }}>Drag rows to reorder.</span>}</p></div>
                <div className="d-flex gap-2 align-items-center">
                    {isSaving && <span style={{ fontSize: '0.78rem', color: 'var(--accent-emerald)', opacity: 0.8 }}>Saving order…</span>}
                    <Form.Select
                        className="form-select-dark"
                        style={{ width: 220 }}
                        value={filterEvent}
                        onChange={(e) => setFilterEvent(e.target.value)}
                    >
                        <option value="">All Events</option>
                        {events.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.title}</option>
                        ))}
                    </Form.Select>
                    {canManage && <Button className="btn-accent d-flex align-items-center gap-2" onClick={() => openModal()}><BsPlus size={18} /> Add Partner</Button>}
                </div>
            </div>

            {filteredPartners.length === 0 ? (
                <div className="empty-state" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                    <div className="empty-state-icon"><BsBriefcase /></div>
                    <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>{filterEvent ? 'No Partners for this Event' : 'No Partners Yet'}</p>
                    <p style={{ fontSize: '0.8rem' }}>{filterEvent ? 'Try selecting a different event or clear the filter.' : 'Add partners and sponsors to your events.'}</p>
                </div>
            ) : (
                <Table responsive className="premium-table">
                    <thead>
                        <tr>
                            {canManage && <th style={{ width: 36 }}></th>}
                            <th>#</th>
                            <th>Logo</th>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Speaker</th>
                            <th>Sequence</th>
                            <th>Website</th>
                            <th>Event</th>
                            <th style={{ width: 140 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPartners.map((p, i) => (
                            <tr
                                key={p.id}
                                draggable={canManage}
                                onDragStart={canManage ? (e) => handleDragStart(e, i) : undefined}
                                onDragOver={canManage ? (e) => handleDragOver(e, i) : undefined}
                                onDragLeave={canManage ? handleDragLeave : undefined}
                                onDrop={canManage ? (e) => handleDrop(e, i) : undefined}
                                onDragEnd={canManage ? handleDragEnd : undefined}
                                style={{
                                    transition: 'background 0.15s, transform 0.15s, box-shadow 0.15s',
                                    background: dragOverIdx === i
                                        ? 'rgba(16,185,129,0.08)'
                                        : undefined,
                                    boxShadow: dragOverIdx === i
                                        ? 'inset 0 2px 0 0 var(--accent-emerald)'
                                        : undefined,
                                    cursor: canManage ? 'grab' : 'default',
                                    opacity: dragIdxRef.current === i ? 0.5 : 1,
                                }}
                            >
                                {canManage && (
                                    <td style={{ color: 'var(--text-muted)', verticalAlign: 'middle', paddingRight: 0 }}>
                                        <BsGripVertical size={16} style={{ cursor: 'grab', opacity: 0.5 }} />
                                    </td>
                                )}
                                <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                <td>
                                    {p.logo_url ? (
                                        <img src={p.logo_url} alt={p.name} style={{ width: 120, height: 120, borderRadius: 8, objectFit: 'contain', background: '#fff', padding: 4 }} />
                                    ) : (
                                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.8rem' }}>{p.name?.charAt(0)}</div>
                                    )}
                                </td>
                                <td><span style={{ fontWeight: 600 }}>{p.name}</span></td>
                                <td><span className="badge-premium" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-sky)' }}>{p.category_name || 'No Category'}</span></td>
                                <td>
                                    <OverlayTrigger
                                        trigger={['hover', 'focus']}
                                        placement="top"
                                        overlay={
                                            <Popover id={`popover-${p.id}`} className="premium-popover">
                                                <Popover.Header as="h3">Wishlist Speakers</Popover.Header>
                                                <Popover.Body>
                                                    {p.wishlist_speaker_names ? (
                                                        <div className="d-flex flex-column gap-3">
                                                            {p.wishlist_speaker_names.split('|||').map((name, idx) => {
                                                                const photo = p.wishlist_speaker_photos?.split('|||')[idx];
                                                                return (
                                                                    <div key={idx} className="d-flex align-items-center gap-3">
                                                                        <div style={{ width: 36, height: 36, borderRadius: 10, overflow: 'hidden', background: 'rgba(139,92,246,0.15)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                                            {photo ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a78bfa' }}>{name.charAt(0)}</span>}
                                                                        </div>
                                                                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                                                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }} className="text-truncate">{name}</div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : <div className="p-2 opacity-50 small">No speakers listed</div>}
                                                </Popover.Body>
                                            </Popover>
                                        }
                                    >
                                        <span className="badge-premium" style={{ background: 'rgba(236,72,153,0.1)', color: 'var(--accent-pink)', cursor: 'help' }}>
                                            {p.wishlist_speaker_count || 0} Wishlisted
                                        </span>
                                    </OverlayTrigger>
                                </td>
                                <td>{p.sequence || 0}</td>
                                <td>{p.website ? <a href={p.website} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-sky)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem' }}><BsLink45Deg /> Link</a> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                                <td><span className="badge-premium status-upcoming">{p.event_title || '—'}</span></td>
                                <td>
                                    <div className="d-flex gap-2">
                                        <button className="btn-action" title="View" onClick={() => navigate(`/partners/view/${p.id}`)}><BsEye size={13} /></button>
                                        {canManage && (
                                            <>
                                                <button className="btn-action" title="Edit" onClick={() => openModal(p)}><BsPencil size={13} /></button>
                                                <button className="btn-action danger" title="Delete" onClick={() => handleDelete(p.id)}><BsTrash size={13} /></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}

            {/* Partner Modal */}
            <Modal show={show} onHide={() => setShow(false)} centered size="lg" contentClassName="premium-modal">
                <Modal.Header closeButton closeVariant="white"><Modal.Title>{editing ? 'Edit Partner' : 'Add Partner'}</Modal.Title></Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger" className="py-2" style={{ fontSize: '0.85rem', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>{error}</Alert>}

                    <div className="d-flex align-items-center gap-3 mb-4 p-3" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 12, background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border-subtle)', overflow: 'hidden' }}>
                            {preview ? <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }} /> : <BsBriefcase size={24} style={{ color: 'var(--text-muted)' }} />}
                        </div>
                        <div>
                            <Form.Label className="m-0 mb-1" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Partner Logo</Form.Label>
                            <Form.Control
                                type="file"
                                size="sm"
                                accept="image/*"
                                onChange={e => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        setLogo(file);
                                        setPreview(URL.createObjectURL(file));
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <Form.Group className="mb-3"><Form.Label>Name *</Form.Label><Form.Control className="form-control-dark" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Partner name" /></Form.Group>
                    <Form.Group className="mb-3"><Form.Label>Website</Form.Label><Form.Control className="form-control-dark" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://..." /></Form.Group>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3"><Form.Label>Category *</Form.Label>
                                <Form.Select className="form-select-dark" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                                    <option value="">— Select Category —</option>
                                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3"><Form.Label>Sequence (Ordering)</Form.Label>
                                <Form.Control type="number" className="form-control-dark" value={form.sequence} onChange={e => setForm({ ...form, sequence: parseInt(e.target.value) || 0 })} />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Form.Group className="mb-3">
                        <Form.Label>Event</Form.Label>
                        <Form.Select 
                            className="form-select-dark" 
                            value={form.event_id} 
                            onChange={e => setForm({ ...form, event_id: e.target.value })}
                            disabled={user?.role === 'employee'}
                        >
                            <option value="">— Select Event —</option>
                            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label className="d-flex justify-content-between align-items-center">
                            Target Account List / Wishlist (Speakers)
                            <span className="text-accent small">{form.wishlist_speakers.length} selected</span>
                        </Form.Label>
                        <div className="speaker-checklist p-2" style={{ 
                            background: 'rgba(255,255,255,0.03)', 
                            borderRadius: 12, 
                            border: '1px solid var(--border-subtle)',
                            maxHeight: '250px',
                            overflowY: 'auto'
                        }}>
                            {speakers.length === 0 ? (
                                <div className="p-3 text-center text-muted small">No speakers available in the database</div>
                            ) : (
                                (() => {
                                    const filtered = speakers.filter(s => !form.event_id || String(s.event_id) === String(form.event_id));
                                    if (filtered.length === 0) return <div className="p-3 text-center text-muted small">No speakers found for the selected event</div>;
                                    return filtered.map(s => (
                                        <div key={s.id} className="d-flex align-items-center gap-3 p-2 mb-2 hover-select-item" style={{ 
                                            borderRadius: 8, 
                                            cursor: 'pointer',
                                            background: form.wishlist_speakers.includes(s.id) ? 'rgba(139,92,246,0.1)' : 'transparent',
                                            transition: 'all 0.2s'
                                        }} onClick={() => {
                                            const newWishlist = form.wishlist_speakers.includes(s.id)
                                                ? form.wishlist_speakers.filter(id => id !== s.id)
                                                : [...form.wishlist_speakers, s.id];
                                            setForm({ ...form, wishlist_speakers: newWishlist });
                                        }}>
                                            <Form.Check 
                                                type="checkbox" 
                                                checked={form.wishlist_speakers.includes(s.id)}
                                                onChange={() => {}} // Handled by div click
                                                style={{ pointerEvents: 'none' }}
                                            />
                                            <div style={{ width: 32, height: 32, borderRadius: 8, overflow: 'hidden', background: 'rgba(236,72,153,0.1)', flexShrink: 0 }}>
                                                {s.photo_url ? <img src={s.photo_url} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.name?.charAt(0)}
                                            </div>
                                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }} className="text-truncate">{s.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }} className="text-truncate">{s.designation} at {s.company}</div>
                                            </div>
                                        </div>
                                    ));
                                })()
                            )}
                        </div>
                    </Form.Group>

                    <Form.Group className="mb-0">
                        <Form.Label>Additional Notes</Form.Label>
                        <Form.Control 
                            as="textarea" 
                            rows={2} 
                            className="form-control-dark" 
                            value={form.wishlist} 
                            onChange={e => setForm({ ...form, wishlist: e.target.value })} 
                            placeholder="Any additional notes..." 
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer><Button variant="link" onClick={() => setShow(false)} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Cancel</Button><Button className="btn-accent" onClick={handleSave}>Save</Button></Modal.Footer>
            </Modal>
            <style>{`
                .form-control-dark::placeholder {
                    color: rgba(255, 255, 255, 0.4) !important;
                }
                .hover-select-item:hover {
                    background: rgba(255, 255, 255, 0.05) !important;
                }
                .speaker-checklist::-webkit-scrollbar {
                    width: 4px;
                }
                .speaker-checklist::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .premium-popover {
                    background-color: #1a1b3a !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    box-shadow: 0 15px 35px rgba(0,0,0,0.5) !important;
                    border-radius: 14px !important;
                    min-width: 220px;
                }
                .premium-popover .popover-header {
                    background-color: #1e1f4b !important;
                    color: #ffffff !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                    font-size: 0.85rem !important;
                    font-weight: 600 !important;
                    padding: 12px 16px !important;
                }
                .premium-popover .popover-body {
                    background-color: #1a1b3a !important;
                    color: #ffffff !important;
                    padding: 12px !important;
                }
                .premium-popover .popover-arrow::after {
                    border-top-color: #1a1b3a !important;
                    border-bottom-color: #1a1b3a !important;
                }
                tr[draggable="true"]:active {
                    cursor: grabbing !important;
                }
            `}</style>
        </div>
    );
}
