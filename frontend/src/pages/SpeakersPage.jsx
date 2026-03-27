import { useState, useEffect } from 'react';
import { Table, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { getSpeakers, deleteSpeaker, getEvents } from '../services/api';
import { BsPlus, BsPencil, BsTrash, BsPersonBadge, BsShare } from 'react-icons/bs';
import { useNavigate } from 'react-router-dom';

export default function SpeakersPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [speakers, setSpeakers] = useState([]);

    const canManage = ['admin', 'manager'].includes(user?.role) || (user?.role === 'employee' && !!user?.assigned_event_id);

    const load = () => {
        getSpeakers().then(r => setSpeakers(Array.isArray(r.data) ? r.data : [])).catch(() => { });
    };
    useEffect(() => { load(); }, []);

    const handleDelete = async (id) => { if (window.confirm('Delete?')) { await deleteSpeaker(id); load(); } };

    return (
        <div className="animate-in">
            <div className="page-header d-flex justify-content-between align-items-center">
                <div><h4>Speakers</h4>
                    <p className='text-white small'>Manage event speakers and presenters.</p></div>
                {canManage && <Button className="btn-accent d-flex align-items-center gap-2" onClick={() => navigate('/speakers/add')}><BsPlus size={18} /> Add Speaker</Button>}
            </div>

            {speakers.length === 0 ? (
                <div className="empty-state" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                    <div className="empty-state-icon"><BsPersonBadge /></div>
                    <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>No Speakers Yet</p>
                    <p style={{ fontSize: '0.8rem' }}>Add speakers to your events.</p>
                </div>
            ) : (
                <Table responsive className="premium-table">
                    <thead><tr><th>#</th><th>Name</th><th>Role</th><th>Designation</th><th>Company</th><th>Email</th><th>Event</th><th style={{ width: 140 }}>Actions</th></tr></thead>
                    <tbody>
                        {speakers.map((s, i) => (
                            <tr key={s.id}>
                                <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                <td>
                                    <div className="d-flex align-items-center gap-3">
                                        <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', background: 'rgba(236,72,153,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-pink)', fontWeight: 700, fontSize: '0.9rem' }}>
                                            {s.photo_url ? <img src={s.photo_url} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} /> : s.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{s.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.designation}</div>
                                        </div>
                                    </div>
                                </td>
                                <td><span className={`badge-premium ${s.role ? 'status-ongoing' : ''}`} style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>{s.role || '—'}</span></td>
                                <td style={{ color: 'var(--text-secondary)' }}>{s.designation || '—'}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{s.company || '—'}</td>
                                <td style={{ color: 'var(--accent-sky)', fontSize: '0.85rem' }}>{s.email || '—'}</td>
                                <td><span className="badge-premium status-upcoming">{s.event_title || '—'}</span></td>
                                <td>
                                    <div className="d-flex gap-2">
                                        <button className="btn-action" title="View" onClick={() => navigate(`/speakers/view/${s.id}`)}><BsPersonBadge size={13} /></button>
                                        <button className="btn-action" title="SNS Card" onClick={() => navigate(`/speakers/sns/${s.id}`)}><BsShare size={13} /></button>
                                        {canManage && (
                                            <>
                                                <button className="btn-action" title="Edit" onClick={() => navigate(`/speakers/edit/${s.id}`)}><BsPencil size={13} /></button>
                                                <button className="btn-action danger" title="Delete" onClick={() => handleDelete(s.id)}><BsTrash size={13} /></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}
        </div>
    );
}
