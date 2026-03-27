import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { getPartnerCategories, createPartnerCategory, updatePartnerCategory, deletePartnerCategory } from '../services/api';
import { BsPlus, BsPencil, BsTrash, BsTags } from 'react-icons/bs';

export default function PartnerCategoriesPage() {
    const { user } = useAuth();
    const [categories, setCategories] = useState([]);
    const [show, setShow] = useState(false);
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ name: '' });

    const canManage = ['admin', 'manager', 'employee'].includes(user?.role);
    const isAdmin = user?.role === 'admin';

    const load = () => {
        getPartnerCategories().then(r => setCategories(Array.isArray(r.data) ? r.data : [])).catch(() => { });
    };
    useEffect(() => { load(); }, []);

    const openModal = (item = null) => {
        if (item) {
            setEditing(item);
            setForm({ name: item.name });
        } else {
            setEditing(null);
            setForm({ name: '' });
        }
        setError('');
        setShow(true);
    };

    const handleSave = async () => {
        if (!form.name) return setError('Name is required');
        try {
            if (editing) await updatePartnerCategory({ ...form, id: editing.id });
            else await createPartnerCategory(form);
            setShow(false);
            load();
        } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete category? This will unset this category for all associated partners.')) {
            await deletePartnerCategory(id);
            load();
        }
    };

    return (
        <div className="animate-in">
            <div className="page-header d-flex justify-content-between align-items-center">
                <div>
                    <h4>Partner Categories</h4>
                    <p className='text-white small'>Manage categories for sponsors and partners.</p>
                </div>
                {canManage && (
                    <Button className="btn-accent d-flex align-items-center gap-2" onClick={() => openModal()}>
                        <BsPlus size={18} /> Add Category
                    </Button>
                )}
            </div>

            {categories.length === 0 ? (
                <div className="empty-state" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                    <div className="empty-state-icon"><BsTags /></div>
                    <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>No Categories Yet</p>
                    <p style={{ fontSize: '0.8rem' }}>Create categories to organize your partners.</p>
                </div>
            ) : (
                <Table responsive className="premium-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Name</th>
                            {canManage && <th style={{ width: 100 }}>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((c, i) => (
                            <tr key={c.id}>
                                <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                <td>
                                    <div className="d-flex align-items-center gap-2">
                                        <div style={{
                                            width: 32, height: 32, borderRadius: 8,
                                            background: 'rgba(139, 92, 246, 0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'var(--accent)', fontWeight: 700, fontSize: '0.8rem'
                                        }}>
                                            {c.name?.charAt(0)}
                                        </div>
                                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                                    </div>
                                </td>
                                {canManage && (
                                    <td>
                                        <button className="btn-action" onClick={() => openModal(c)}>
                                            <BsPencil size={13} />
                                        </button>
                                        <button className="btn-action danger" onClick={() => handleDelete(c.id)}>
                                            <BsTrash size={13} />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}

            <Modal show={show} onHide={() => setShow(false)} centered contentClassName="premium-modal">
                <Modal.Header closeButton closeVariant="white">
                    <Modal.Title style={{ color: 'var(--text-primary)' }}>{editing ? 'Edit Category' : 'Add Category'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && (
                        <Alert variant="danger" className="py-2" style={{
                            fontSize: '0.85rem', borderRadius: 10,
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                            color: '#f87171'
                        }}>
                            {error}
                        </Alert>
                    )}
                    <Form.Group className="mb-3">
                        <Form.Label>Name *</Form.Label>
                        <Form.Control
                            className="form-control-dark"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="Category name (e.g., Diamond Sponsor)"
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="link" onClick={() => setShow(false)} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                        Cancel
                    </Button>
                    <Button className="btn-accent" onClick={handleSave}>
                        Save
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
