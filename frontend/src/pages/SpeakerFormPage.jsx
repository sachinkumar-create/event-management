import { useState, useEffect } from 'react';
import { Form, Button, Alert, Image, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createSpeaker, getSpeaker, updateSpeaker, getEvents } from '../services/api';
import { BsArrowLeft, BsCloudUpload, BsShare } from 'react-icons/bs';

export default function SpeakerFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isEdit = !!id;

    const [form, setForm] = useState({ 
        name: '', 
        bio: '', 
        designation: '', 
        company: '', 
        email: '', 
        role: '', 
        event_id: '', 
        photo_url: '',
        topic: '',
        panel: '',
        mobile_no: '',
        linkedin_url: ''
    });
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        getEvents().then(r => {
            const evts = Array.isArray(r.data) ? r.data : [];
            setEvents(evts);
            if (!isEdit && user?.role === 'employee' && user.assigned_event_id) {
                setForm(prev => ({ ...prev, event_id: user.assigned_event_id }));
            }
        }).catch(() => { });
        if (isEdit) {
            // We need a specific getSpeaker(id) function or filter from list. 
            // For now, let's assume getSpeakers() returns list and we filter, 
            // OR we add getSpeaker(id) to api.js. Let's add getSpeaker(id) to api.js first or use filter if not available.
            // Actually, let's implement getSpeaker(id) in api.js context efficiently.
            // For now, fetching list and finding.
            import('../services/api').then(api => {
                api.getSpeakers().then(r => {
                    const s = r.data.find(sp => sp.id === parseInt(id));
                    if (s) {
                        setForm({
                            name: s.name,
                            bio: s.bio || '',
                            designation: s.designation || '',
                            company: s.company || '',
                            email: s.email || '',
                            role: s.role || '',
                            event_id: s.event_id || '',
                            photo_url: s.photo_url || '',
                            topic: s.topic || '',
                            panel: s.panel || '',
                            mobile_no: s.mobile_no || '',
                            linkedin_url: s.linkedin_url || ''
                        });
                        if (s.photo_url) setPreview(s.photo_url);
                    }
                });
            });
        }
    }, [id, isEdit]);

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (f) {
            setFile(f);
            setPreview(URL.createObjectURL(f));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const formData = new FormData();
            Object.keys(form).forEach(key => formData.append(key, form[key]));
            if (file) formData.append('photo', file);

            if (isEdit) {
                formData.append('id', id);
                await updateSpeaker(formData);
            } else {
                await createSpeaker(formData);
            }
            navigate('/speakers');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save speaker');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-in max-w-2xl mx-auto p-4">
            <Button variant="link" className="mb-3 p-0 text-decoration-none text-white" onClick={() => navigate('/speakers')}>
                <BsArrowLeft /> Back to Speakers
            </Button>

            <div className="premium-card p-4">
                <h4 className="mb-4 text-white">{isEdit ? 'Edit Speaker' : 'Add New Speaker'}</h4>

                {error && <Alert variant="danger">{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                    <div className="mb-4 text-center">
                        <div className="mx-auto mb-3" style={{ width: 120, height: 120, borderRadius: '50%', background: 'var(--bg-body)', border: '2px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                            {preview ? (
                                <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <BsCloudUpload size={24} className="text-muted" />
                            )}
                            <input type="file" onChange={handleFileChange} accept="image/*" style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                        </div>
                        <Form.Label className="text-white small">Click to upload photo</Form.Label>
                    </div>

                    <Form.Group className="mb-3">
                        <Form.Label>Name</Form.Label>
                        <Form.Control className="form-control-dark" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </Form.Group>

                    <div className="d-flex gap-3">
                        <Form.Group className="mb-3 flex-fill">
                            <Form.Label>Designation</Form.Label>
                            <Form.Control className="form-control-dark" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-3 flex-fill">
                            <Form.Label>Company</Form.Label>
                            <Form.Control className="form-control-dark" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                        </Form.Group>
                    </div>

                    <div className="d-flex gap-3">
                        <Form.Group className="mb-3 flex-fill">
                            <Form.Label>Email <span className="text-danger">*</span></Form.Label>
                            <Form.Control type="email" className="form-control-dark" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                        </Form.Group>
                        <Form.Group className="mb-3 flex-fill">
                            <Form.Label>Mobile No</Form.Label>
                            <Form.Control className="form-control-dark" value={form.mobile_no} onChange={e => setForm({ ...form, mobile_no: e.target.value })} />
                        </Form.Group>
                    </div>

                    <div className="d-flex gap-3">
                        <Form.Group className="mb-3 flex-fill">
                            <Form.Label>Topic</Form.Label>
                            <Form.Control className="form-control-dark" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-3 flex-fill">
                            <Form.Label>Panel</Form.Label>
                            <Form.Control className="form-control-dark" value={form.panel} onChange={e => setForm({ ...form, panel: e.target.value })} />
                        </Form.Group>
                    </div>

                    <Form.Group className="mb-3">
                        <Form.Label>LinkedIn ID / URL</Form.Label>
                        <Form.Control className="form-control-dark" value={form.linkedin_url} onChange={e => setForm({ ...form, linkedin_url: e.target.value })} placeholder="e.g. linkedin.com/in/username" />
                    </Form.Group>

                    <div className="d-flex gap-3">
                        <Form.Group className="mb-3 flex-fill">
                            <Form.Label>Role</Form.Label>
                            <Form.Select className="form-select-dark" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                <option value="">Select Role</option>
                                <option value="Keynote">Keynote</option>
                                <option value="VIP">VIP</option>
                                <option value="Govt">Govt</option>
                                <option value="Partner Speaker">Partner Speaker</option>
                                <option value="Panelist">Panelist</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3 flex-fill">
                            <Form.Label>Event</Form.Label>
                            <Form.Select 
                                className="form-select-dark" 
                                value={form.event_id} 
                                onChange={e => setForm({ ...form, event_id: e.target.value })}
                                disabled={user?.role === 'employee' && !!user?.assigned_event_id}
                            >
                                <option value="">Select Event</option>
                                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                            </Form.Select>
                        </Form.Group>
                    </div>

                    <Form.Group className="mb-4">
                        <Form.Label>Bio</Form.Label>
                        <Form.Control as="textarea" rows={4} className="form-control-dark" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
                    </Form.Group>

                    <div className="d-flex gap-3">
                        <Button type="submit" className="btn-accent flex-grow-1" disabled={loading}>
                            {loading ? <Spinner size="sm" /> : 'Save Speaker'}
                        </Button>
                        {isEdit && (
                            <Button variant="outline-light" onClick={() => navigate(`/speakers/sns/${id}`)} title="Create Social Card">
                                <BsShare className="me-2" /> Generate SNS Card
                            </Button>
                        )}
                    </div>
                </Form>
            </div>

            <style>{`
                .form-control-dark, .form-select-dark {
                    background-color: rgba(255, 255, 255, 0.05) !important;
                    color: #fff !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                }
                .form-control-dark:focus, .form-select-dark:focus {
                    background-color: rgba(255, 255, 255, 0.1) !important;
                    color: #fff !important;
                    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.25) !important;
                }
                .form-control-dark::placeholder {
                    color: rgba(255, 255, 255, 0.4) !important;
                }
            `}</style>
        </div>
    );
}
