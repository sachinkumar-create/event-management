import { useState, useEffect } from 'react';
import { Form, Button, Alert, Spinner, Card } from 'react-bootstrap';
import { getSettings, updateLogo } from '../services/api';
import { BsCloudUpload, BsCheckCircle } from 'react-icons/bs';

export default function AdminSettingsPage() {
    const [logo, setLogo] = useState('');
    const [logoWidth, setLogoWidth] = useState(36);
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [savingSize, setSavingSize] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        getSettings().then(r => {
            if (r.data.portal_logo) {
                setLogo(r.data.portal_logo);
                setPreview(r.data.portal_logo);
            }
            if (r.data.portal_logo_width) {
                setLogoWidth(parseInt(r.data.portal_logo_width, 10));
            }
        }).finally(() => setFetching(false));
    }, []);

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (f) {
            setFile(f);
            setPreview(URL.createObjectURL(f));
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setMessage({ type: '', text: '' });

        const formData = new FormData();
        formData.append('logo', file);

        try {
            const r = await updateLogo(formData);
            setMessage({ type: 'success', text: 'Portal logo updated successfully!' });
            // Force a refresh of the logo across the app
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            setMessage({ type: 'danger', text: err.response?.data?.error || 'Failed to update logo' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSize = async () => {
        setSavingSize(true);
        setMessage({ type: '', text: '' });
        try {
            const { updateSetting } = await import('../services/api');
            await updateSetting('portal_logo_width', logoWidth);
            setMessage({ type: 'success', text: 'Logo size updated successfully!' });
            // Force refresh to see changes in sidebar
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            setMessage({ type: 'danger', text: 'Failed to update logo size' });
        } finally {
            setSavingSize(false);
        }
    };

    if (fetching) return <div className="p-5 text-center"><Spinner animation="border" variant="primary" /></div>;

    return (
        <div className="animate-in max-w-2xl mx-auto">
            <div className="page-header">
                <h4>Admin Settings</h4>
                <p className="text-white small">Customize your portal branding and configuration.</p>
            </div>

            <Card className="premium-card p-4">
                <Card.Body>
                    <h5 className="mb-4 text-white">Portal Branding</h5>
                    
                    {message.text && (
                        <Alert variant={message.type} className="mb-4 d-flex align-items-center gap-2">
                            {message.type === 'success' && <BsCheckCircle />}
                            {message.text}
                        </Alert>
                    )}

                    <Form onSubmit={handleUpload}>
                        <Form.Group className="mb-4">
                            <Form.Label className="text-white-50 small mb-3">Portal Logo</Form.Label>
                            <div className="d-flex align-items-center gap-4">
                                <div 
                                    className="logo-preview-box"
                                    style={{
                                        width: 150,
                                        height: 150,
                                        borderRadius: 12,
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '2px dashed rgba(255,255,255,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}
                                >
                                    {preview ? (
                                        <img 
                                            src={preview.startsWith('blob:') ? preview : (preview.startsWith('http') ? preview : preview)} 
                                            alt="Logo Preview" 
                                            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} 
                                        />
                                    ) : (
                                        <div className="text-muted text-center p-2 small">
                                            <BsCloudUpload size={24} className="mb-2" />
                                            <div>No Logo</div>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleFileChange}
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                    />
                                </div>
                                <div className="flex-grow-1">
                                    <div className="text-white-50 small mb-2">
                                        Upload a professional logo for your event portal. Recommended size: 200x200px.
                                    </div>
                                    <Button 
                                        type="submit" 
                                        className="btn-accent px-4" 
                                        disabled={!file || loading}
                                    >
                                        {loading ? <Spinner size="sm" /> : 'Save New Logo'}
                                    </Button>
                                </div>
                            </div>
                        </Form.Group>
                    </Form>

                    <hr className="my-5" style={{ opacity: 0.1, borderColor: '#fff' }} />

                    <div className="mb-4">
                        <h5 className="text-white mb-2">Logo Appearance</h5>
                        <p className="text-white-50 small">Control how your logo is displayed in the sidebar.</p>
                    </div>

                    <Form.Group className="mb-4">
                        <Form.Label className="text-white-50 small mb-3">Logo Width (px)</Form.Label>
                        <div className="d-flex align-items-center gap-4">
                            <div className="flex-grow-1">
                                <Form.Range 
                                    min={20} 
                                    max={200} 
                                    value={logoWidth} 
                                    onChange={(e) => setLogoWidth(e.target.value)}
                                    className="custom-range"
                                />
                                <div className="d-flex justify-content-between text-white-50" style={{ fontSize: '0.7rem' }}>
                                    <span>20px</span>
                                    <span>{logoWidth}px</span>
                                    <span>200px</span>
                                </div>
                            </div>
                            <Button 
                                className="btn-accent px-4" 
                                onClick={handleUpdateSize}
                                disabled={savingSize}
                            >
                                {savingSize ? <Spinner size="sm" /> : 'Save Size'}
                            </Button>
                        </div>
                    </Form.Group>
                </Card.Body>
            </Card>

            <style>{`
                .premium-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-lg);
                }
                .logo-preview-box:hover {
                    border-color: var(--accent) !important;
                    background: rgba(139, 92, 246, 0.05) !important;
                }
                .custom-range::-webkit-slider-runnable-track {
                    background: rgba(255,255,255,0.1);
                    height: 6px;
                    border-radius: 3px;
                }
                .custom-range::-webkit-slider-thumb {
                    background: var(--accent);
                    margin-top: -5px;
                }
            `}</style>
        </div>
    );
}
