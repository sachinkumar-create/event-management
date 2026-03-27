import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { Button, Form, Spinner, Accordion, Tabs, Tab } from 'react-bootstrap';
import { toPng } from 'html-to-image';
import { BsDownload, BsArrowLeft, BsArrowsMove } from 'react-icons/bs';
import { getSpeaker, saveSNSCard, chatAssistant } from '../services/api';
import Draggable from 'react-draggable';
import { BsStars, BsMagic, BsChatDots, BsSend, BsRobot } from 'react-icons/bs';

const selectionStyles = `
    .ps-workspace { height: 100vh; background: #3c3c3c; display: flex; flex-direction: column; color: #ddd; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; overflow: hidden; }
    .ps-header { background: #323232; height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid #282828; flex-shrink: 0; }
    .ps-tabs { display: flex; gap: 24px; height: 100%; }
    .ps-tab { display: flex; align-items: center; font-size: 11px; color: #888; cursor: pointer; border-bottom: 2px solid transparent; text-transform: uppercase; letter-spacing: 0.5px; }
    .ps-tab.active { color: #fff; border-bottom-color: #0084ff; }
    .ps-close-btn { background: none; border: none; color: #888; font-size: 24px; cursor: pointer; }

    .ps-main-body { display: flex; flex: 1; overflow: hidden; background: #282828; }
    .ps-content-area { flex: 1; padding: 30px; display: flex; flex-direction: column; overflow: hidden; }
    .ps-section-label { font-size: 10px; color: #666; font-weight: 800; margin-bottom: 24px; letter-spacing: 1px; }
    .ps-scroll-container { flex: 1; overflow-y: auto; padding-right: 10px; }
    .ps-scroll-container::-webkit-scrollbar { width: 6px; }
    .ps-scroll-container::-webkit-scrollbar-thumb { background: #444; border-radius: 10px; }

    .ps-category-row { margin-bottom: 40px; }
    .ps-category-name { font-size: 13px; font-weight: 600; color: #bbb; margin-bottom: 16px; }
    .ps-presets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; }

    .ps-preset-tile { background: #3c3c3c; border: 1px solid #484848; padding: 12px; display: flex; flex-direction: column; align-items: center; cursor: pointer; border-radius: 2px; }
    .ps-preset-tile:hover { background: #444; }
    .ps-preset-tile.active { border-color: #0084ff; background: #444; box-shadow: inset 0 0 0 1px #0084ff; }

    .ps-thumb-outer { width: 100%; height: 60px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
    .ps-thumb-inner { width: 40px; border: 1px solid #666; background: #323232; opacity: 0.8; }
    .ps-tile-info { text-align: center; width: 100%; }
    .ps-tile-name { font-size: 10px; color: #eee; font-weight: 600; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ps-tile-dims { font-size: 9px; color: #777; }

    .ps-config-sidebar { width: 280px; background: #454545; padding: 25px; border-left: 1px solid #282828; display: flex; flex-direction: column; flex-shrink: 0; }
    .ps-sidebar-title { font-size: 10px; font-weight: 800; color: #fff; margin-bottom: 24px; }

    .ps-field label { display: block; font-size: 10px; color: #aaa; margin-bottom: 6px; }
    .ps-field input, .ps-field select { background: #323232; border: 1px solid #1a1a1a; color: #eee; height: 26px; padding: 0 8px; font-size: 11px; width: 100%; border-radius: 2px; }
    .ps-field input:focus { border-top: 1px solid #0084ff; outline: none; }

    .ps-field-row { display: flex; gap: 10px; }
    .ps-dim-swap { background: none; border: none; color: #777; cursor: pointer; padding: 0; font-size: 14px; }
    .ps-dim-swap:hover { color: #fff; }
    .ps-fake-unit { background: #3c3c3c; height: 26px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #888; border: 1px solid #222; border-radius: 2px; }

    .ps-orient-group { display: flex; gap: 4px; }
    .ps-orient-choice { width: 32px; height: 26px; border: 1px solid #1a1a1a; background: #323232; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 2px; }
    .ps-orient-choice.active { background: #5a5a5a; border-color: #0084ff; }
    .ps-icon-rect { border: 1px solid #aaa; }
    .ps-orient-choice.active .ps-icon-rect { border-color: #fff; }
    .ps-icon-rect.vertical { width: 8px; height: 12px; }
    .ps-icon-rect.horizontal { width: 12px; height: 8px; }

    .ps-checkbox-label { font-size: 10px; color: #aaa; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .ps-color-swatch { width: 26px; height: 26px; border: 1px solid #1a1a1a; border-radius: 2px; flex-shrink: 0; }

    .ps-create-btn { background: #555; color: #fff; border: 1px solid #222; height: 32px; width: 100%; font-size: 11px; font-weight: 600; cursor: pointer; margin-top: auto; border-radius: 16px; }
    .ps-create-btn:hover { background: #666; }

    /* Page Styles */
    .premium-tabs { background: #1a1a2e; padding: 5px 5px 0; }
    .premium-tabs .nav-link { color: #a0a0c0 !important; background: transparent !important; border: none !important; font-weight: 600; font-size: 0.85rem; padding: 12px 20px; border-radius: 8px 8px 0 0 !important; }
    .premium-tabs .nav-link.active { color: #13d999 !important; background: #161625 !important; border-bottom: 2px solid #13d999 !important; }
    .premium-accordion .accordion-button { background: #13d999 !important; color: #000 !important; padding: 10px !important; font-size: 0.8rem; font-weight: bold; border-radius: 8px !important; }
    .premium-accordion .accordion-item { border: 1px solid #3d3d5c !important; margin-bottom: 10px; border-radius: 8px !important; overflow: hidden; }
    .premium-accordion .accordion-body { background: #1a1a2e; padding: 15px !important; }
    .border-dashed { border: 2px dashed #3d3d5c !important; }
    .btn-outline-accent { color: #13d999; border: 1px solid #13d999; }
    .btn-outline-accent:hover { background: #13d999; color: black; }
    .muted-label { font-size: 10px; opacity: 0.6; text-transform: uppercase; margin-bottom: 4px; }
    .btn-accent { background: #13d999; color: black; border: none; font-weight: 600; }
    .btn-accent:hover { background: #10b982; }
    .bg-accent { background: #13d999 !important; }
    .text-accent { color: #13d999 !important; }
    .form-control-dark { background: #000000; border: 1px solid #3d3d5c; color: white !important; }
    .form-control-dark:focus { background: #111111; border-color: #13d999; box-shadow: none; }
    .form-select-dark { background: #000000; border: 1px solid #3d3d5c; color: white !important; }
    .form-select-dark:focus { background: #111111; border-color: #13d999; box-shadow: none; }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #3d3d5c; border-radius: 10px; }
`;

export default function SNSGeneratorPage() {
    return (
        <>
            <style>{selectionStyles}</style>
            <SNSGeneratorInternal />
        </>
    );
}

function SNSGeneratorInternal() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [speaker, setSpeaker] = useState(null);
    const [image, setImage] = useState(null);
    const [cropper, setCropper] = useState();
    const [croppedImage, setCroppedImage] = useState(null);
    const [background, setBackground] = useState(null);
    const [backgroundDimensions, setBackgroundDimensions] = useState({ width: 800, height: 800 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const cardRef = useRef(null);
    const photoRef = useRef(null);
    const elementRefs = useRef({});
    const [photoSettings, setPhotoSettings] = useState({ size: 400 });
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 800 });
    const [viewportScale, setViewportScale] = useState(1);
    const containerRef = useRef(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const chatEndRef = useRef(null);
    const [hasInitialDesign, setHasInitialDesign] = useState(false);
    const [bgOverlay, setBgOverlay] = useState({ color: '#000000', opacity: 0.3 });
    const [bgPosition, setBgPosition] = useState('center');
    const [selectedFormat, setSelectedFormat] = useState(null);
    const [customSize, setCustomSize] = useState({ width: 1080, height: 1080, background: 'White' });

    const formatPresets = {
        'Instagram': [
            { id: 'insta_square', name: 'Instagram', width: 1080, height: 1080, ratio: '1:1' },
            { id: 'insta_story', name: 'Insta Story', width: 1080, height: 1920, ratio: '9:16' },
            { id: 'insta_portrait', name: 'Insta Portrait', width: 1080, height: 1350, ratio: '4:5' }
        ],
        'Facebook': [
            { id: 'fb_cover', name: 'FB Page Cover', width: 1640, height: 664, ratio: '2.47:1' },
            { id: 'fb_event', name: 'FB Event Image', width: 1920, height: 1080, ratio: '16:9' },
            { id: 'fb_group', name: 'FB Group Header', width: 1640, height: 856, ratio: '1.91:1' }
        ],
        'YouTube': [
            { id: 'yt_thumb', name: 'Youtube Thumbnail', width: 1280, height: 720, ratio: '16:9' },
            { id: 'yt_profile', name: 'Youtube Profile', width: 800, height: 800, ratio: '1:1' },
            { id: 'yt_cover', name: 'Youtube Cover', width: 2560, height: 1440, ratio: '16:9' }
        ],
        'Twitter': [
            { id: 'tw_profile', name: 'Twitter Profile', width: 400, height: 400, ratio: '1:1' },
            { id: 'tw_header', name: 'Twitter Header', width: 1500, height: 500, ratio: '3:1' }
        ]
    };

    // Default positions as percentages of canvas size
    const [positions, setPositions] = useState({
        photo: { x: 0.34, y: 0.125 },
        name: { x: 0.25, y: 0.5 },
        designation: { x: 0.25, y: 0.575 },
        company: { x: 0.25, y: 0.65 }
    });

    // Auto-scale canvas to fit container
    useEffect(() => {
        if (containerRef.current) {
            const containerWidth = containerRef.current.offsetWidth - 80;
            const containerHeight = containerRef.current.offsetHeight - 80;
            const scaleX = containerWidth / canvasSize.width;
            const scaleY = containerHeight / canvasSize.height;
            const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
            setViewportScale(parseFloat(scale.toFixed(2)));
        }
    }, [canvasSize]);

    // Element States
    const [elements, setElements] = useState({
        name: { text: '', color: '#ffffff', fontSize: 40, fontFamily: 'Inter', fontWeight: '800', textDecoration: 'none', letterSpacing: 0, show: true },
        designation: { text: '', color: '#ffffff', fontSize: 20, fontFamily: 'Inter', fontWeight: '500', textDecoration: 'none', letterSpacing: 0, show: true },
        company: { text: '', color: '#ffffff', fontSize: 18, fontFamily: 'Inter', fontWeight: '500', textDecoration: 'none', letterSpacing: 0, show: true },
    });

    // Ensure ref exists for each element
    Object.keys(elements).forEach(key => {
        if (!elementRefs.current[key]) {
            elementRefs.current[key] = { current: null };
        }
    });

    useEffect(() => {
        setLoading(true);
        getSpeaker(id)
            .then(r => {
                const s = r.data;
                if (s) {
                    setSpeaker(s);
                    setElements(prev => ({
                        ...prev,
                        name: { ...prev.name, text: s.name || '' },
                        designation: { ...prev.designation, text: s.designation || 'Speaker' },
                        company: { ...prev.company, text: s.company || '' }
                    }));
                    if (s.photo_url) {
                        setImage(s.photo_url);
                    }
                }
            })
            .catch(err => {
                console.error('Failed to fetch speaker:', err);
                setError(err.response?.data?.error || 'Failed to load speaker data.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [id]);

    const addCustomElement = () => {
        const id = `custom_${Date.now()}`;
        setElements(prev => ({
            ...prev,
            [id]: { text: 'New Text', color: '#ffffff', fontSize: 24, fontFamily: 'Inter', fontWeight: '600', textDecoration: 'none', letterSpacing: 0, show: true, isCustom: true }
        }));
        setPositions(prev => ({
            ...prev,
            [id]: { x: 0.5, y: 0.5 }
        }));
    };

    const removeElement = (key) => {
        const newElements = { ...elements };
        delete newElements[key];
        setElements(newElements);
        const newPositions = { ...positions };
        delete newPositions[key];
        setPositions(newPositions);
    };

    const handleCrop = () => {
        if (cropper && typeof cropper.getCroppedCanvas === 'function') {
            const canvas = cropper.getCroppedCanvas();
            if (canvas) {
                setCroppedImage(canvas.toDataURL());
            }
        }
    };

    const handleDownload = async () => {
        if (cardRef.current) {
            setSaving(true);
            try {
                await document.fonts.ready;
                // Wait for all images to be loaded
                const images = cardRef.current.getElementsByTagName('img');
                await Promise.all(Array.from(images).map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
                }));

                const dataUrl = await toPng(cardRef.current, {
                    pixelRatio: 2,
                    skipFonts: false,
                    style: {
                        transform: 'none',
                    }
                });
                const link = document.createElement('a');
                link.download = `sns-card-${speaker.name.replace(/\s+/g, '-').toLowerCase()}.png`;
                link.href = dataUrl;
                link.click();
            } catch (err) {
                console.error('Download failed', err);
            } finally {
                setSaving(false);
            }
        }
    };

    const handleSave = async () => {
        if (cardRef.current) {
            setSaving(true);
            try {
                await document.fonts.ready;
                const images = cardRef.current.getElementsByTagName('img');
                await Promise.all(Array.from(images).map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
                }));

                const dataUrl = await toPng(cardRef.current, {
                    pixelRatio: 2,
                    skipFonts: false,
                    style: {
                        transform: 'none',
                    }
                });

                // Convert dataUrl to Blob
                const response = await fetch(dataUrl);
                const blob = await response.blob();

                // Wrap in FormData
                const formData = new FormData();
                formData.append('sns_card', blob, `sns-card-${speaker.id}-${Date.now()}.png`);

                await saveSNSCard(id, formData);
                alert('SNS Card saved successfully!');
            } catch (err) {
                console.error('Save failed', err);
                alert('Failed to save SNS card.');
            } finally {
                setSaving(false);
            }
        }
    };

    const handleBgUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setBackground(url);
        }
    };


    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setImage(url);
            setCroppedImage(null);
        }
    };

    const updateElement = (key, field, value) => {
        setElements(prev => ({
            ...prev,
            [key]: { ...prev[key], [field]: value }
        }));
    };

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Auto-generate initial design
    useEffect(() => {
        if (speaker && selectedFormat && !hasInitialDesign) {
            setHasInitialDesign(true);
            handleChatSend(`Generate a professional and modern design for this speaker card with a suitable background and elegant layout. The canvas size is ${canvasSize.width}x${canvasSize.height}.`);
        }
    }, [speaker, selectedFormat]);


    const handleFormatSelect = (preset) => {
        setCustomSize({ width: preset.width, height: preset.height, background: 'White' });
    };

    const handleCreate = () => {
        const { width, height } = customSize;
        setCanvasSize({ width, height });
        setBackgroundDimensions({ width, height });
        
        // Initial scaling
        const scaleFactor = Math.min(width, height) / 800;
        setPhotoSettings(prev => ({ ...prev, size: Math.round(400 * scaleFactor) }));
        setElements(prev => ({
            name: { ...prev.name, fontSize: Math.round(40 * scaleFactor) },
            designation: { ...prev.designation, fontSize: Math.round(20 * scaleFactor) },
            company: { ...prev.company, fontSize: Math.round(18 * scaleFactor) }
        }));
        
        setSelectedFormat('custom');
    };

    const swapDimensions = () => {
        setCustomSize(prev => ({ ...prev, width: prev.height, height: prev.width }));
    };

    const handleChatSend = async (msg = inputMessage) => {
        const text = msg.trim();
        if (!text) return;

        const newMessages = [...messages, { role: 'user', content: text }];
        setMessages(newMessages);
        setInputMessage('');
        setAiLoading(true);

        try {
            const res = await chatAssistant({
                message: text,
                history: messages,
                currentState: {
                    elements,
                    positions,
                    background,
                    photoSettings,
                    bgOverlay
                }
            });

            const { message, updates } = res.data;

            if (updates) {
                if (updates.elements) {
                    setElements(prev => {
                        const next = { ...prev };
                        Object.keys(updates.elements).forEach(key => {
                            next[key] = { ...next[key], ...updates.elements[key] };
                        });
                        return next;
                    });
                }
                if (updates.positions) {
                    setPositions(prev => ({ ...prev, ...updates.positions }));
                }
                if (updates.background) {
                    setBackground(updates.background);
                }
                if (updates.bgPosition) {
                    setBgPosition(updates.bgPosition);
                }
                if (updates.photoSettings) {
                    setPhotoSettings(prev => ({ ...prev, ...updates.photoSettings }));
                }
                if (updates.bgOverlay) {
                    setBgOverlay(prev => ({ ...prev, ...updates.bgOverlay }));
                }
            }

            setMessages(prev => [...prev, { role: 'assistant', content: message }]);
        } catch (err) {
            console.error('Chat failed', err);
            const errorMsg = err.response?.data?.error || 'Sorry, I encountered an error. Please try again.';
            setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
        } finally {
            setAiLoading(false);
        }
    };

    const updatePosition = (key, xPercent, yPercent) => {
        setPositions(prev => ({
            ...prev,
            [key]: { x: xPercent, y: yPercent }
        }));
    };

    const handleAIGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setAiLoading(true);
        setAiResults([]);
        try {
            if (aiType === 'text') {
                const res = await generateAIText({
                    prompt: aiPrompt,
                    currentData: {
                        name: elements.name.text,
                        designation: elements.designation.text,
                        company: elements.company.text
                    }
                });
                setAiResults(res.data);
            } else {
                const res = await generateAIBackground({ prompt: aiPrompt });
                setAiResults(res.data);
            }
        } catch (err) {
            console.error('AI Generation failed', err);
            const errorMsg = err.response?.data?.error || err.message || 'AI Generation failed. Please check your API key and prompt.';
            alert(errorMsg);
        } finally {
            setAiLoading(false);
        }
    };

    const applyAIResult = (result) => {
        if (aiType === 'text') {
            setElements(prev => ({
                ...prev,
                name: { ...prev.name, text: result.name || prev.name.text },
                designation: { ...prev.designation, text: result.designation || prev.designation.text },
                company: { ...prev.company, text: result.company || prev.company.text }
            }));
        } else {
            setBackground(result);
            setCanvasSize({ width: 1024, height: 1024 });
            setBackgroundDimensions({ width: 1024, height: 1024 });
        }
        setShowAiModal(false);
        setAiPrompt('');
        setAiResults([]);
    };

    if (loading) return <div className="p-5 text-center"><Spinner animation="border" variant="light" /><p className="mt-3 text-white">Loading speaker details...</p></div>;
    if (error) return <div className="p-5 text-center"><h5 className="text-danger">{error}</h5><Button variant="link" onClick={() => navigate('/speakers')}>Back to Speakers</Button></div>;
    if (!speaker) return <div className="p-5 text-center"><h5 className="text-white">Speaker not found</h5><Button variant="link" onClick={() => navigate('/speakers')}>Back to Speakers</Button></div>;

    if (!selectedFormat) {
        return (
            <div className="ps-workspace animate-in">
                {/* Header */}
                <div className="ps-header">
                    <div className="ps-tabs">
                        <div className="ps-tab active">Recent</div>
                        <div className="ps-tab">Saved</div>
                        <div className="ps-tab">Mobile</div>
                        <div className="ps-tab">Web</div>
                        <div className="ps-tab">Art & Illustration</div>
                    </div>
                    <button className="ps-close-btn" onClick={() => navigate('/speakers')}>&times;</button>
                </div>

                <div className="ps-main-body">
                    {/* Left: Presets Grid */}
                    <div className="ps-content-area">
                        <h6 className="ps-section-label">BLANK DOCUMENT PRESETS</h6>
                        <div className="ps-scroll-container">
                            {Object.entries(formatPresets).map(([category, items]) => (
                                <div key={category} className="ps-category-row">
                                    <h6 className="ps-category-name">{category}</h6>
                                    <div className="ps-presets-grid">
                                        {items.map(preset => (
                                            <div 
                                                key={preset.id} 
                                                className={`ps-preset-tile ${customSize.width === preset.width && customSize.height === preset.height ? 'active' : ''}`}
                                                onClick={() => handleFormatSelect(preset)}
                                            >
                                                <div className="ps-thumb-outer">
                                                    <div className="ps-thumb-inner" style={{ aspectRatio: preset.width / preset.height }}></div>
                                                </div>
                                                <div className="ps-tile-info">
                                                    <span className="ps-tile-name">{preset.name}</span>
                                                    <span className="ps-tile-dims">{preset.width} x {preset.height} px</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Photoshop Sidebar */}
                    <div className="ps-config-sidebar">
                        <h6 className="ps-sidebar-title">PRESET DETAILS</h6>
                        
                        <div className="ps-field-row mb-3">
                            <div className="ps-field flex-grow-1">
                                <label>Width</label>
                                <input 
                                    type="number" 
                                    value={customSize.width} 
                                    onChange={e => setCustomSize({...customSize, width: parseInt(e.target.value)})}
                                />
                            </div>
                            <div className="ps-field flex-grow-1">
                                <div className="d-flex align-items-center justify-content-between">
                                    <label>Height</label>
                                    <button className="ps-dim-swap" onClick={swapDimensions}>⇆</button>
                                </div>
                                <input 
                                    type="number" 
                                    value={customSize.height} 
                                    onChange={e => setCustomSize({...customSize, height: parseInt(e.target.value)})}
                                />
                            </div>
                            <div className="ps-field" style={{ width: '70px' }}>
                                <label>&nbsp;</label>
                                <div className="ps-fake-unit">Pixels</div>
                            </div>
                        </div>

                        <div className="ps-field-row mb-3">
                            <div className="ps-field flex-grow-1">
                                <label>Orientation</label>
                                <div className="ps-orient-group">
                                    <div className={`ps-orient-choice ${customSize.width < customSize.height ? 'active' : ''}`} onClick={() => customSize.width > customSize.height && swapDimensions()}>
                                        <div className="ps-icon-rect portrait"></div>
                                    </div>
                                    <div className={`ps-orient-choice ${customSize.width > customSize.height ? 'active' : ''}`} onClick={() => customSize.width < customSize.height && swapDimensions()}>
                                        <div className="ps-icon-rect landscape"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="ps-field d-flex align-items-end pb-1" style={{ width: '130px' }}>
                                <label className="ps-checkbox-label">
                                    <input type="checkbox" /> Artboards
                                </label>
                            </div>
                        </div>

                        <div className="ps-field-row mb-3">
                            <div className="ps-field flex-grow-1">
                                <label>Resolution</label>
                                <input type="number" defaultValue="72" />
                            </div>
                            <div className="ps-field" style={{ width: '120px' }}>
                                <label>&nbsp;</label>
                                <select>
                                    <option>Pixels / Inch</option>
                                </select>
                            </div>
                        </div>

                        <div className="ps-field mb-3">
                            <label>Color Mode</label>
                            <div className="d-flex gap-2">
                                <select className="flex-grow-1">
                                    <option>RGB Color</option>
                                </select>
                                <select style={{ width: '80px' }}>
                                    <option>8 bit</option>
                                </select>
                            </div>
                        </div>

                        <div className="ps-field mb-3">
                            <label>Background Contents</label>
                            <div className="d-flex gap-2">
                                <select className="flex-grow-1" value={customSize.background} onChange={e => setCustomSize({...customSize, background: e.target.value})}>
                                    <option>White</option>
                                    <option>Black</option>
                                    <option>Transparent</option>
                                </select>
                                <div className="ps-color-swatch" style={{ background: customSize.background.toLowerCase() }}></div>
                            </div>
                        </div>

                        <div className="ps-field mb-4">
                            <label>Color Profile</label>
                            <select>
                                <option>sRGB IEC61966-2.1</option>
                            </select>
                        </div>

                        <button className="ps-create-btn" onClick={handleCreate}>Create</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4 animate-in" style={{ height: '100vh', overflow: 'hidden' }}>
            <div className="d-flex align-items-center mb-3">
                <Button variant="link" className="p-0 text-decoration-none text-muted me-3" onClick={() => navigate('/speakers')}>
                    <BsArrowLeft size={20} />
                </Button>
                <h4 className="m-0 text-white">SNS Card Generator</h4>
            </div>

            <div className="row g-4" style={{ height: 'calc(100vh - 100px)' }}>
                {/* Tools Panel -> Tabbed Sidebar */}
                <div className="col-lg-4 h-100">
                    <div className="premium-card p-0 h-100 overflow-hidden d-flex flex-column" style={{ background: '#161625' }}>
                        <Tabs defaultActiveKey="manual" id="designer-tabs" className="premium-tabs border-0 flex-shrink-0">
                            <Tab eventKey="manual" title={<span><BsMagic className="me-2" /> Manual</span>}>
                                <div className="p-3 overflow-auto" style={{ height: 'calc(100vh - 250px)' }}>
                                    <Accordion defaultActiveKey="0" flush className="premium-accordion">
                                        {/* Image & Background */}
                                        <Accordion.Item eventKey="0" className="bg-transparent border-0 mb-2">
                                            <Accordion.Header>Image & Background</Accordion.Header>
                                            <Accordion.Body>
                                                <div className="mb-3">
                                                    <label className="form-label small" style={{ color: '#fff' }}>Speaker Photo Crop</label>
                                                    <div style={{ height: 200, background: '#000', borderRadius: 8, overflow: 'hidden' }}>
                                                        <Cropper
                                                            style={{ height: '100%', width: '100%' }}
                                                            initialAspectRatio={1}
                                                            src={image || 'https://via.placeholder.com/300'}
                                                            viewMode={1}
                                                            guides={true}
                                                            minCropBoxHeight={10}
                                                            minCropBoxWidth={10}
                                                            background={false}
                                                            autoCropArea={1}
                                                            checkOrientation={false}
                                                            onInitialized={(instance) => setCropper(instance)}
                                                        />
                                                    </div>
                                                    <Button size="sm" className="mt-2 w-100 btn-secondary-glass" onClick={handleCrop}>Update Crop</Button>
                                                </div>

                                                <div className="mb-3 text-start">
                                                    <label className="form-label text-white small muted-label">Upload New Photo</label>
                                                    <Form.Control type="file" size="sm" className="form-control-dark" onChange={handlePhotoUpload} accept="image/*" />
                                                </div>

                                                <div className="mb-3 text-start">
                                                    <label className="form-label small text-white muted-label">Canvas Format</label>
                                                    <Button variant="outline-accent" size="sm" className="w-100" onClick={() => setSelectedFormat(null)}>Change Format</Button>
                                                </div>

                                                <div className="mb-3 text-start">
                                                    <label className="form-label small text-white muted-label">Upload Template (BG)</label>
                                                    <Form.Control type="file" size="sm" className="form-control-dark" onChange={handleBgUpload} accept="image/*" />
                                                </div>

                                                {background && (
                                                    <div className="mb-3 text-start">
                                                        <label className="form-label small text-white muted-label">BG Image Position</label>
                                                        <Form.Select 
                                                            size="sm" 
                                                            className="form-select-dark" 
                                                            value={bgPosition} 
                                                            onChange={(e) => setBgPosition(e.target.value)}
                                                        >
                                                            <option value="center">Center</option>
                                                            <option value="top">Top</option>
                                                            <option value="bottom">Bottom</option>
                                                            <option value="left">Left</option>
                                                            <option value="right">Right</option>
                                                        </Form.Select>
                                                    </div>
                                                )}

                                                <div className="mb-3">
                                                    <label className="form-label small text-white text-start d-block muted-label">Photo Size</label>
                                                    <Form.Range
                                                        min={100}
                                                        max={800}
                                                        value={photoSettings.size}
                                                        onChange={(e) => setPhotoSettings(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                                                    />
                                                    <div className="small text-white text-end">{photoSettings.size}px</div>
                                                </div>

                                                {/* Overlay Controls */}
                                                <div className="mb-3 pt-3 border-top border-secondary">
                                                    <label className="form-label small text-white d-block muted-label">Background Overlay</label>
                                                    <div className="d-flex align-items-center gap-3">
                                                        <Form.Control
                                                            type="color"
                                                            className="form-control form-control-color"
                                                            value={bgOverlay.color}
                                                            onChange={(e) => setBgOverlay(prev => ({ ...prev, color: e.target.value }))}
                                                            style={{ width: 40, background: 'black', border: '1px solid #3d3d5c' }}
                                                        />
                                                        <div className="flex-grow-1">
                                                            <Form.Range
                                                                min={0}
                                                                max={1}
                                                                step={0.1}
                                                                value={bgOverlay.opacity}
                                                                onChange={(e) => setBgOverlay(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                                                            />
                                                        </div>
                                                        <div className="small text-white">{Math.round(bgOverlay.opacity * 100)}%</div>
                                                    </div>
                                                </div>
                                            </Accordion.Body>
                                        </Accordion.Item>

                                        {/* Dynamic Text Customization */}
                                        {Object.keys(elements).map((key, idx) => (
                                            <Accordion.Item eventKey={String(idx + 1)} key={key} className="bg-transparent border-0 mb-2">
                                                <Accordion.Header>
                                                    <div className="d-flex align-items-center justify-content-between w-100 me-3">
                                                        <span className="text-capitalize">{elements[key].isCustom ? elements[key].text.substring(0, 15) : key}</span>
                                                        {elements[key].isCustom && (
                                                            <Button
                                                                variant="link"
                                                                size="sm"
                                                                className="p-0 text-danger text-decoration-none small"
                                                                onClick={(e) => { e.stopPropagation(); removeElement(key); }}
                                                            >Remove</Button>
                                                        )}
                                                    </div>
                                                </Accordion.Header>
                                                <Accordion.Body>
                                                    <Form.Group className="mb-2">
                                                        <Form.Control
                                                            size="sm"
                                                            className="form-control-dark"
                                                            value={elements[key].text}
                                                            onChange={e => updateElement(key, 'text', e.target.value)}
                                                            placeholder="Enter text..."
                                                        />
                                                    </Form.Group>
                                                    <div className="row g-2">
                                                        <div className="col-6">
                                                            <label className="small text-white muted-label">Color</label>
                                                            <Form.Control
                                                                type="color"
                                                                className="form-control form-control-color w-100"
                                                                value={elements[key].color}
                                                                onChange={e => updateElement(key, 'color', e.target.value)}
                                                                style={{ background: 'black', border: '1px solid #3d3d5c' }}
                                                            />
                                                        </div>
                                                        <div className="col-6">
                                                            <label className="small text-white muted-label">Size (px)</label>
                                                            <Form.Control
                                                                type="number"
                                                                size="sm"
                                                                className="form-control-dark"
                                                                value={elements[key].fontSize}
                                                                onChange={e => updateElement(key, 'fontSize', parseInt(e.target.value))}
                                                            />
                                                        </div>
                                                        <div className="col-6 mt-2">
                                                            <label className="small text-white muted-label">Weight</label>
                                                            <Form.Select
                                                                size="sm"
                                                                className="form-select-dark"
                                                                value={elements[key].fontWeight}
                                                                onChange={e => updateElement(key, 'fontWeight', e.target.value)}
                                                            >
                                                                <option value="300">Light</option>
                                                                <option value="400">Normal</option>
                                                                <option value="500">Medium</option>
                                                                <option value="600">SemiBold</option>
                                                                <option value="700">Bold</option>
                                                                <option value="800">ExtraBold</option>
                                                            </Form.Select>
                                                        </div>
                                                        <div className="col-6 mt-2">
                                                            <label className="small text-white muted-label">Spacing</label>
                                                            <Form.Control
                                                                type="number"
                                                                size="sm"
                                                                className="form-control-dark"
                                                                value={elements[key].letterSpacing}
                                                                onChange={e => updateElement(key, 'letterSpacing', parseFloat(e.target.value))}
                                                            />
                                                        </div>
                                                        <div className="col-12 mt-2">
                                                            <label className="small text-white muted-label">Decoration</label>
                                                            <Form.Select
                                                                size="sm"
                                                                className="form-select-dark"
                                                                value={elements[key].textDecoration}
                                                                onChange={e => updateElement(key, 'textDecoration', e.target.value)}
                                                            >
                                                                <option value="none">None</option>
                                                                <option value="underline">Underline</option>
                                                                <option value="overline">Overline</option>
                                                                <option value="capitalize">Capitalize</option>
                                                                <option value="uppercase">Uppercase</option>
                                                            </Form.Select>
                                                        </div>
                                                        <div className="col-12 mt-2">
                                                            <label className="small text-white muted-label">Font</label>
                                                            <Form.Select
                                                                size="sm"
                                                                className="form-select-dark"
                                                                value={elements[key].fontFamily}
                                                                onChange={e => updateElement(key, 'fontFamily', e.target.value)}
                                                            >
                                                                <option value="Inter">Inter</option>
                                                                <option value="Montserrat">Montserrat</option>
                                                                <option value="Poppins">Poppins</option>
                                                                <option value="Roboto">Roboto</option>
                                                                <option value="Playfair Display">Playfair (Serif)</option>
                                                                <option value="Lora">Lora (Serif)</option>
                                                            </Form.Select>
                                                        </div>
                                                    </div>
                                                </Accordion.Body>
                                            </Accordion.Item>
                                        ))}
                                    </Accordion>
                                    <Button variant="outline-accent" size="sm" className="w-100 mt-3 py-2 border-dashed" onClick={addCustomElement}>
                                        + Add Custom Text
                                    </Button>
                                </div>
                            </Tab>
                            <Tab eventKey="ai" title={<span><BsRobot className="me-2" /> AI Assistant</span>}>
                                <div className="d-flex flex-column h-100 overflow-hidden" style={{ height: 'calc(100vh - 250px)' }}>
                                    <div className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-3">
                                        {messages.length === 0 && !aiLoading && (
                                            <div className="text-center p-4 opacity-50">
                                                <BsChatDots size={40} className="mb-3" />
                                                <p className="small">Ask AI to design your card...</p>
                                            </div>
                                        )}
                                        {messages.map((msg, idx) => (
                                            <div key={idx} className={`d-flex ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                                                <div className={`p-3 rounded-4 small ${msg.role === 'user' ? 'bg-accent text-black fw-bold' : 'bg-dark border border-secondary text-white'}`} style={{ maxWidth: '85%' }}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))}
                                        {aiLoading && (
                                            <div className="d-flex justify-content-start animate-fade">
                                                <div className="p-3 rounded-4 bg-dark border border-secondary text-white d-flex align-items-center gap-2">
                                                    <Spinner size="sm" animation="grow" variant="accent" />
                                                    <span className="small">Thinking...</span>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>

                                    {/* Chat Input */}
                                    <div className="p-3 border-top border-secondary bg-darker">
                                        <div className="input-group input-group-sm">
                                            <Form.Control
                                                className="form-control-dark border-0 rounded-start-pill px-3"
                                                placeholder="Suggest changes..."
                                                value={inputMessage}
                                                onChange={(e) => setInputMessage(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                                            />
                                            <Button className="btn-accent rounded-end-pill px-3" onClick={() => handleChatSend()}>
                                                <BsSend />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Tab>
                        </Tabs>

                        <div className="p-3 border-top border-secondary d-flex gap-2 bg-dark mt-auto">
                            <Button className="btn-secondary-glass flex-grow-1" onClick={handleSave} disabled={saving}>
                                {saving ? <Spinner size="sm" /> : <>Save Card</>}
                            </Button>
                            <Button variant="outline-light" className="flex-grow-1" onClick={handleDownload}>
                                <BsDownload className="me-2" /> Download
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="col-lg-8 h-100">
                    <div ref={containerRef} className="bg-darker rounded-4 border border-secondary p-4 h-100 d-flex align-items-center justify-content-center overflow-auto">
                        <div style={{ width: canvasSize.width * viewportScale, height: canvasSize.height * viewportScale, position: 'relative' }}>
                            <div ref={cardRef} style={{ width: canvasSize.width, height: canvasSize.height, position: 'absolute', top: 0, left: 0, transform: `scale(${viewportScale})`, transformOrigin: 'top left', overflow: 'hidden', background: '#1e1e2f' }}>
                                
                                {/* Background + Overlay */}
                                {background && (
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
                                        <img src={background} alt="BG" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: bgPosition }} />
                                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: bgOverlay.color, opacity: bgOverlay.opacity, zIndex: 1 }}></div>
                                    </div>
                                )}

                                {/* Photo */}
                                {positions.photo && (
                                    <Draggable
                                        nodeRef={photoRef}
                                        position={{ x: positions.photo.x * canvasSize.width, y: positions.photo.y * canvasSize.height }}
                                        onDrag={(e, data) => updatePosition('photo', data.x / canvasSize.width, data.y / canvasSize.height)}
                                    >
                                        <div ref={photoRef} style={{ position: 'absolute', cursor: 'grab', zIndex: 5 }}>
                                            <div style={{ width: photoSettings.size, height: photoSettings.size, borderRadius: '8px', overflow: 'hidden' }}>
                                                <img src={croppedImage || image || 'https://via.placeholder.com/250'} alt="Speaker" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                                            </div>
                                        </div>
                                    </Draggable>
                                )}

                                {/* All Text Elements */}
                                {Object.keys(elements).map((key) => {
                                    if (!positions[key] || !elements[key].show) return null;
                                    return (
                                        <Draggable
                                            key={key}
                                            nodeRef={elementRefs.current[key]}
                                            position={{ x: positions[key].x * canvasSize.width, y: positions[key].y * canvasSize.height }}
                                            onDrag={(e, data) => updatePosition(key, data.x / canvasSize.width, data.y / canvasSize.height)}
                                        >
                                            <div ref={elementRefs.current[key]} style={{ position: 'absolute', cursor: 'grab', zIndex: 10, whiteSpace: 'nowrap' }}>
                                                <span style={{
                                                    color: elements[key].color,
                                                    fontSize: elements[key].fontSize,
                                                    fontFamily: elements[key].fontFamily,
                                                    fontWeight: elements[key].fontWeight,
                                                    textDecoration: elements[key].textDecoration === 'underline' || elements[key].textDecoration === 'overline' ? elements[key].textDecoration : 'none',
                                                    textTransform: elements[key].textDecoration === 'uppercase' || elements[key].textDecoration === 'capitalize' ? elements[key].textDecoration : 'none',
                                                    letterSpacing: `${elements[key].letterSpacing}px`
                                                }}>
                                                    {elements[key].text}
                                                </span>
                                            </div>
                                        </Draggable>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
