import { useState, useEffect } from 'react';
import { Button, Modal, Form, Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { getAgendas, createAgenda, updateAgenda, deleteAgenda, getEvents, getSpeakers, getPartners, reorderAgendas } from '../services/api';
import { BsPlus, BsPencil, BsTrash, BsClock, BsListTask, BsGeoAlt, BsMic, BsDownload, BsFileEarmarkPdf, BsImage, BsGripVertical } from 'react-icons/bs';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useRef } from 'react';

export default function AgendasPage() {
    const { user } = useAuth();
    const [agendas, setAgendas] = useState([]);
    const [events, setEvents] = useState([]);
    const [speakers, setSpeakers] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState('');
    const [selectedDay, setSelectedDay] = useState(1);
    const [maxDay, setMaxDay] = useState(1);
    const [partners, setPartners] = useState([]);
    const [showExportOptions, setShowExportOptions] = useState(false);
    const exportRef = useRef(null);
    const [show, setShow] = useState(false);
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ event_id: '', day_number: 1, title: '', description: '', speaker_ids: [], start_time: '', end_time: '' });
    const [exportBgColor, setExportBgColor] = useState('#ffffff');
    const [exportTextColor, setExportTextColor] = useState('#000000');
    const [exportAccentColor, setExportAccentColor] = useState('#000000');
    const [exportDayHeaderBg, setExportDayHeaderBg] = useState('linear-gradient(90deg, #8b5cf6, transparent)');
    const [exportDayHeaderText, setExportDayHeaderText] = useState('#ffffff');
    const [exportFontFamily, setExportFontFamily] = useState('Inter');
    const [exportBgImage, setExportBgImage] = useState(null);
    const [exportBgOverlay, setExportBgOverlay] = useState(0);
    const [exportBgOverlayColor, setExportBgOverlayColor] = useState('#000000');
    const [exportCompanyLogo, setExportCompanyLogo] = useState(null);
    const [exportEventLogo, setExportEventLogo] = useState(null);
    const [exportLogoSize, setExportLogoSize] = useState(60);
    const [exportShowPartners, setExportShowPartners] = useState(true);
    const [exportPartnersPosition, setExportPartnersPosition] = useState('bottom');
    const [exportPartnerSectionTitle, setExportPartnerSectionTitle] = useState('Our Partners');
    const [exportPartnerLogoSize, setExportPartnerLogoSize] = useState(50);
    const [exportPartnerCatColor, setExportPartnerCatColor] = useState('#000000');
    const [exportPartnerCatSize, setExportPartnerCatSize] = useState(16);
    const [exportPartnerCatWeight, setExportPartnerCatWeight] = useState('700');
    const [showCustomizer, setShowCustomizer] = useState(false);
    
    // Drag and Drop State
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverItem, setDragOverItem] = useState(null);
    const [isReordering, setIsReordering] = useState(false);

    const canManage = ['admin', 'manager'].includes(user?.role) || (user?.role === 'employee' && !!user?.assigned_event_id);

    useEffect(() => {
        getEvents().then(r => {
            const evts = Array.isArray(r.data) ? r.data : [];
            setEvents(evts);
            if (user?.role === 'employee' && user.assigned_event_id) {
                setSelectedEvent(user.assigned_event_id);
            } else if (evts.length > 0) {
                setSelectedEvent(evts[0].id);
            }
        }).catch(() => { });
        getSpeakers().then(r => setSpeakers(Array.isArray(r.data) ? r.data : [])).catch(() => { });
        getPartners().then(r => setPartners(Array.isArray(r.data) ? r.data : [])).catch(() => { });
    }, []);

    useEffect(() => {
        if (selectedEvent) {
            getAgendas(selectedEvent).then(r => {
                const items = Array.isArray(r.data) ? r.data : [];
                setAgendas(items);
                const days = items.reduce((max, a) => Math.max(max, a.day_number), 0);
                setMaxDay(Math.max(days, 1));
            }).catch(() => { });
        }
    }, [selectedEvent]);

    const filtered = agendas.filter(a => a.day_number === selectedDay);

    const openModal = (item = null) => {
        if (item) {
            setEditing(item);
            // Handle both array and potential null from JSON_ARRAYAGG (null when no speakers)
            const sids = Array.isArray(item.speakers) ? item.speakers.filter(s => s.id !== null).map(s => s.id) : [];
            setForm({ event_id: item.event_id, day_number: item.day_number, title: item.title, description: item.description || '', speaker_ids: sids, start_time: item.start_time, end_time: item.end_time });
        } else {
            setEditing(null);
            setForm({ 
                event_id: user?.role === 'employee' ? user.assigned_event_id : selectedEvent, 
                day_number: selectedDay, title: '', description: '', speaker_ids: [], start_time: '', end_time: '' 
            });
        }
        setError('');
        setShow(true);
    };

    const handleSave = async () => {
        try {
            if (editing) await updateAgenda({ ...form, id: editing.id });
            else await createAgenda(form);
            setShow(false);
            const r = await getAgendas(selectedEvent);
            const items = Array.isArray(r.data) ? r.data : [];
            setAgendas(items);
            setMaxDay(Math.max(items.reduce((max, a) => Math.max(max, a.day_number), 0), 1));
        } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    };
    const handleDelete = async (id) => {
        if (window.confirm('Delete?')) {
            await deleteAgenda(id);
            const r = await getAgendas(selectedEvent);
            setAgendas(Array.isArray(r.data) ? r.data : []);
        }
    };

    // Calculate duration in minutes between "HH:MM:SS" (or "HH:MM") strings
    const getDurationMins = (start, end) => {
        if (!start || !end) return 0;
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        return (h2 * 60 + m2) - (h1 * 60 + m1);
    };

    // Add minutes to "HH:MM:SS"
    const addMins = (timeStr, mins) => {
        if (!timeStr) return '';
        const [h, m, s] = timeStr.split(':').map(Number);
        const date = new Date(2000, 0, 1, h, m + mins, s || 0);
        return date.toTimeString().split(' ')[0];
    };

    const handleDragStart = (e, item) => {
        if (!canManage) {
            e.preventDefault();
            return;
        }
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        // Need to set data for Firefox
        e.dataTransfer.setData('text/plain', item.id);
        
        // A slight delay ensures the drag image captures correctly before modifying DOM
        setTimeout(() => {
            e.target.classList.add('dragging');
        }, 0);
    };

    const handleDragOver = (e, targetItem) => {
        e.preventDefault();
        if (!draggedItem || draggedItem.id === targetItem.id) return;
        setDragOverItem(targetItem);
    };

    const handleDrop = async (e, targetItem) => {
        e.preventDefault();
        e.currentTarget.classList.remove('dragging');
        
        if (!draggedItem || draggedItem.id === targetItem.id) {
            setDraggedItem(null);
            setDragOverItem(null);
            return;
        }

        const currentDayAgendas = agendas.filter(a => a.day_number === selectedDay);
        // Map current indices based on their display order (which matches DB order)
        const oldIndex = currentDayAgendas.findIndex(i => i.id === draggedItem.id);
        const newIndex = currentDayAgendas.findIndex(i => i.id === targetItem.id);

        if (oldIndex === -1 || newIndex === -1) return;

        // Create new reordered array
        const newItemsList = [...currentDayAgendas];
        newItemsList.splice(oldIndex, 1);
        newItemsList.splice(newIndex, 0, draggedItem);

        setIsReordering(true);
        try {
            // Calculate new times based on the new order preserving durations
            // Starting from the original start time of the FIRST item of the day
            let currentStartTime = currentDayAgendas[0].start_time;
            
            const updates = newItemsList.map((item, index) => {
                const duration = getDurationMins(item.start_time, item.end_time);
                const newEndTime = addMins(currentStartTime, duration);
                
                const updateParams = {
                    id: item.id,
                    sequence: index,
                    start_time: currentStartTime,
                    end_time: newEndTime
                };
                
                // Advance start time for the next item
                currentStartTime = newEndTime;
                return updateParams;
            });

            // Optimistic UI update
            const updatedAgendasMap = new Map(agendas.map(a => [a.id, a]));
            updates.forEach(upd => {
                const existing = updatedAgendasMap.get(upd.id);
                updatedAgendasMap.set(upd.id, { ...existing, ...upd });
            });
            setAgendas(Array.from(updatedAgendasMap.values()).sort((a, b) => {
                if (a.day_number !== b.day_number) return a.day_number - b.day_number;
                return a.sequence - b.sequence;
            }));

            // Sync with backend
            await reorderAgendas(updates);
            
            // Refresh full state to ensure consistency
            const r = await getAgendas(selectedEvent);
            setAgendas(Array.isArray(r.data) ? r.data : []);
        } catch (err) {
            console.error("Reorder failed: ", err);
            setError('Failed to save the new order.');
            // Revert to original state on failure
            const r = await getAgendas(selectedEvent);
            setAgendas(Array.isArray(r.data) ? r.data : []);
        } finally {
            setDraggedItem(null);
            setDragOverItem(null);
            setIsReordering(false);
        }
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('dragging');
        setDraggedItem(null);
        setDragOverItem(null);
    };

    const handleBgUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setExportBgImage(reader.result);
            reader.readAsDataURL(file);
        }
    };
    const handleLogoUpload = (e, setter) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setter(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleExport = async (type) => {
        if (!exportRef.current) return;
        try {
            // Wait for any potential layout shifts or image loads in the hidden component
            await new Promise(r => setTimeout(r, 800));
            const dataUrl = await toPng(exportRef.current, { cacheBust: true, backgroundColor: exportBgColor, quality: 1, pixelRatio: 2 });
            if (type === 'image') {
                const link = document.createElement('a');
                link.download = `agenda-${selectedEvent}.png`;
                link.href = dataUrl;
                link.click();
            } else if (type === 'pdf') {
                const img = new Image();
                img.src = dataUrl;
                await new Promise(r => img.onload = r);

                const container = exportRef.current;
                const containerRect = container.getBoundingClientRect();
                const scale = img.width / container.offsetWidth;

                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const pxToMm = pdfWidth / img.width;
                const maxPageHeightPx = (pdfHeight / pxToMm);

                // Find all elements that shouldn't be split
                const blocks = Array.from(container.querySelectorAll('.export-header, .export-day-header, .export-session-block, .export-partner-block'));
                const header = container.querySelector('.export-header');

                let pages = [];
                let currentChunk = [];
                let currentHeight = header ? (header.getBoundingClientRect().bottom - containerRect.top) * scale : 0;
                if (header) currentChunk.push({ top: 0, bottom: currentHeight });

                blocks.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    const elTop = (rect.top - containerRect.top) * scale;
                    const elBottom = (rect.bottom - containerRect.top) * scale;
                    const elHeight = elBottom - elTop;

                    if (currentHeight + elHeight > maxPageHeightPx && currentChunk.length > (header ? 1 : 0)) {
                        pages.push(currentChunk);
                        currentChunk = [{ top: elTop, bottom: elBottom }];
                        currentHeight = elHeight;
                    } else {
                        currentChunk.push({ top: elTop, bottom: elBottom });
                        currentHeight = elBottom - currentChunk[0].top;
                    }
                });
                if (currentChunk.length > 0) pages.push(currentChunk);

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;

                for (let i = 0; i < pages.length; i++) {
                    if (i > 0) pdf.addPage();
                    const chunk = pages[i];
                    const top = chunk[0].top;
                    const bottom = chunk[chunk.length - 1].bottom;
                    const height = bottom - top;

                    canvas.height = height;
                    ctx.drawImage(img, 0, top, img.width, height, 0, 0, img.width, height);

                    const pageDataUrl = canvas.toDataURL('image/png');
                    pdf.addImage(pageDataUrl, 'PNG', 0, 0, pdfWidth, height * pxToMm);
                }

                pdf.save(`agenda-${selectedEvent}.pdf`);
            }
        } catch (err) { console.error('Export failed', err); }
    };

    const eventObj = events.find(e => e.id == selectedEvent);
    const eventTitle = eventObj?.title || 'Event';
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };
    const eventDate = formatDate(eventObj?.start_date);

    return (
        <div className="animate-in">
            <div className="page-header d-flex justify-content-between align-items-center">
                <div><h4>Agendas</h4>
                    <p className='text-white small'>Schedule sessions for your events.</p></div>
                <div className="d-flex gap-3 align-items-center">
                    <Form.Select 
                        style={{ width: 200 }} 
                        className="form-select-dark" 
                        value={selectedEvent} 
                        onChange={e => { setSelectedEvent(e.target.value); setSelectedDay(1); }}
                        disabled={user?.role === 'employee' && !!user?.assigned_event_id}
                    >
                        {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                    </Form.Select>
                    <div className="dropdown">
                        <Button className="btn-accent d-flex align-items-center gap-2" styled={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }} onClick={() => setShowExportOptions(!showExportOptions)}>
                            <BsDownload size={16} /> Export
                        </Button>
                        {showExportOptions && (
                            <div className="export-dropdown-menu">
                                <button onClick={() => { setShowCustomizer(true); setShowExportOptions(false); }} className="dropdown-item"><BsPencil size={14} className="me-2" /> Customize & Export</button>
                                <hr style={{ margin: '4px 0', opacity: 0.1 }} />
                                <button onClick={() => { handleExport('image'); setShowExportOptions(false); }} className="dropdown-item"><BsImage size={14} className="me-2" /> Quick Image</button>
                                <button onClick={() => { handleExport('pdf'); setShowExportOptions(false); }} className="dropdown-item"><BsFileEarmarkPdf size={14} className="me-2" /> Quick PDF</button>
                            </div>
                        )}
                    </div>
                    {canManage && <Button className="btn-accent d-flex align-items-center gap-2" onClick={() => openModal()}><BsPlus size={18} /> Add Session</Button>}
                </div>
            </div>

            {/* Day Tabs */}
            <div className="d-flex mb-4" style={{ gap: 8 }}>
                {Array.from({ length: maxDay + 1 }, (_, i) => i + 1).map(d => (
                    <button
                        key={d}
                        className={`day-tab ${selectedDay === d ? 'active' : ''}`}
                        onClick={() => setSelectedDay(d)}
                    >
                        Day {d}
                    </button>
                ))}
            </div>

            {/* Timeline */}
            {filtered.length === 0 ? (
                <div className="empty-state" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                    <div className="empty-state-icon"><BsListTask /></div>
                    <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>No Sessions for Day {selectedDay}</p>
                    <p style={{ fontSize: '0.8rem' }}>Add agenda items to schedule this day.</p>
                </div>
            ) : (
                <div className={`agenda-list-container ${isReordering ? 'opacity-50' : ''}`} style={{ transition: 'opacity 0.2s' }}>
                    {filtered.map(a => (
                        <div 
                            key={a.id} 
                            className={`agenda-item d-flex gap-4 ${dragOverItem?.id === a.id ? 'drag-over' : ''} ${canManage ? 'draggable-item' : ''}`}
                            draggable={canManage}
                            onDragStart={(e) => handleDragStart(e, a)}
                            onDragOver={(e) => handleDragOver(e, a)}
                            onDrop={(e) => handleDrop(e, a)}
                            onDragEnd={handleDragEnd}
                            style={{ 
                                position: 'relative',
                                borderTop: dragOverItem?.id === a.id && draggedItem && agendas.indexOf(draggedItem) > agendas.indexOf(a) ? '2px solid var(--accent)' : 'var(--border-subtle)',
                                borderBottom: dragOverItem?.id === a.id && draggedItem && agendas.indexOf(draggedItem) < agendas.indexOf(a) ? '2px solid var(--accent)' : 'none',
                            }}
                        >
                            {canManage && (
                                <div className="drag-handle d-flex align-items-center justify-content-center" style={{ cursor: 'grab', color: 'var(--text-muted)', opacity: 0.5, marginLeft: '-10px' }} title="Drag to reorder">
                                    <BsGripVertical size={20} />
                                </div>
                            )}
                            <div style={{ minWidth: 70, textAlign: 'center' }}>
                                <BsClock style={{ color: 'var(--accent)', marginBottom: 4 }} />
                                <div className="agenda-time">{a.start_time?.slice(0, 5)}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.end_time?.slice(0, 5)}</div>
                            </div>
                            <div className="flex-grow-1">
                                <h6 style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)', fontSize: '1rem' }}>{a.title}</h6>
                                <div className="d-flex gap-3 flex-wrap mb-2">
                                    {Array.isArray(a.speakers) && a.speakers[0]?.id !== null && a.speakers.map(s => (
                                        <div key={s.id} className="speaker-mini-card">
                                            {s.photo_url ? (
                                                <img src={s.photo_url} alt={s.name} />
                                            ) : (
                                                <div className="speaker-mini-placeholder"><BsMic size={10} /></div>
                                            )}
                                            <div className="info">
                                                <div className="name">{s.name}</div>
                                                {s.designation && <div className="desc">{s.designation}</div>}
                                                {s.company && <div className="desc">{s.company}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {a.description && <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 0, marginTop: 10, lineHeight: 1.5 }}>{a.description}</p>}
                            </div>
                            {canManage && (
                                <div className="d-flex gap-1 align-self-start">
                                    <button className="btn-action" onClick={() => openModal(a)}><BsPencil size={13} /></button>
                                    <button className="btn-action danger" onClick={() => handleDelete(a.id)}><BsTrash size={13} /></button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Hidden Export Component */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                <div id="export-target" ref={exportRef} style={{
                    width: '1000px',
                    minHeight: '1414px',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: exportBgImage ? `url(${exportBgImage}) center/cover no-repeat` : exportBgColor,
                        backgroundColor: exportBgColor,
                        zIndex: 1
                    }}></div>

                    {exportBgImage && (
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: exportBgOverlayColor,
                            opacity: exportBgOverlay,
                            zIndex: 2
                        }}></div>
                    )}

                    <div style={{ position: 'relative', zIndex: 3, padding: '60px', color: exportTextColor, fontFamily: `${exportFontFamily}, sans-serif`, minHeight: '1414px' }}>
                        <div className="export-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px', borderBottom: `2px solid ${exportAccentColor}`, paddingBottom: '20px', gap: '20px' }}>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                {exportCompanyLogo && <img src={exportCompanyLogo} alt="Company Logo" style={{ maxHeight: `${exportLogoSize}px`, maxWidth: '100%', objectFit: 'contain' }} />}
                            </div>
                            <div style={{ flex: 2, textAlign: 'center' }}>
                                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: exportTextColor }}>{eventTitle}</h2>
                                {eventDate && <p style={{ color: `${exportTextColor}aa`, fontSize: '1.2rem', marginTop: '10px', fontWeight: 600 }}>{eventDate}</p>}
                            </div>
                            <div style={{ flex: 1, textAlign: 'right' }}>
                                {exportEventLogo && <img src={exportEventLogo} alt="Event Logo" style={{ maxHeight: `${exportLogoSize}px`, maxWidth: '100%', objectFit: 'contain' }} />}
                            </div>
                        </div>

                        {exportShowPartners && exportPartnersPosition === 'top' && partners.filter(p => p.event_id == selectedEvent).length > 0 && (
                            <div className="export-partner-block" style={{ marginBottom: '60px', borderBottom: `1px solid ${exportTextColor}20`, paddingBottom: '40px' }}>
                                <h3 style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 700, color: `${exportTextColor}aa`, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '40px' }}>{exportPartnerSectionTitle}</h3>

                                {Object.entries(
                                    partners.filter(p => p.event_id == selectedEvent).reduce((acc, p) => {
                                        const cat = p.category_name || 'Partners';
                                        if (!acc[cat]) acc[cat] = [];
                                        acc[cat].push(p);
                                        return acc;
                                    }, {})
                                ).map(([category, catPartners]) => (
                                    <div key={category} className="mb-4">
                                        <h4 style={{ textAlign: 'center', fontSize: `${exportPartnerCatSize}px`, fontWeight: exportPartnerCatWeight, color: exportPartnerCatColor, marginBottom: '20px', letterSpacing: '1px' }}>{category}</h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '40px', alignItems: 'center' }}>
                                            {catPartners.map(p => (
                                                <div key={p.id} style={{ textAlign: 'center', background: `${exportTextColor}05`, padding: '15px', borderRadius: '12px', minWidth: `${exportPartnerLogoSize + 40}px` }}>
                                                    {p.logo_url ? (
                                                        <img src={p.logo_url} alt={p.name} crossOrigin="anonymous" style={{ height: `${exportPartnerLogoSize}px`, maxWidth: '160px', objectFit: 'contain' }} />
                                                    ) : (
                                                        <div style={{ fontWeight: 700, color: exportTextColor, fontSize: '1.1rem' }}>{p.name}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {[...Array(maxDay)].map((_, i) => {
                            const dayNum = i + 1;
                            const daySessions = agendas.filter(a => a.day_number === dayNum);
                            if (daySessions.length === 0) return null;
                            return (
                                <div key={dayNum} className="export-day-group" style={{ marginBottom: '40px' }}>
                                    <h3 className="export-day-header" style={{ fontSize: '1.5rem', fontWeight: 700, padding: '10px 20px', background: exportDayHeaderBg, color: exportDayHeaderText, borderRadius: '8px', marginBottom: '20px' }}>Day {dayNum}</h3>
                                    {daySessions.map(session => (
                                        <div key={session.id} className="export-session-block" style={{ display: 'flex', gap: '20px', padding: '20px', background: `${exportTextColor}08`, borderRadius: '12px', border: `1px solid ${exportTextColor}15`, marginBottom: '15px' }}>
                                            <div style={{ minWidth: '80px', textAlign: 'center' }}>
                                                <div style={{ color: exportAccentColor, fontWeight: 700, fontSize: '1rem' }}>{session.start_time?.slice(0, 5)}</div>
                                                <div style={{ color: `${exportTextColor}88`, fontSize: '0.8rem' }}>{session.end_time?.slice(0, 5)}</div>
                                            </div>
                                            <div style={{ flexGrow: 1 }}>
                                                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: exportTextColor }}>{session.title}</h4>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                                    {Array.isArray(session.speakers) && session.speakers[0]?.id !== null && session.speakers.map(s => (
                                                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: `${exportAccentColor}15`, padding: '10px 16px', borderRadius: '12px', fontSize: '0.8rem' }}>
                                                            {s.photo_url ? (
                                                                <img src={s.photo_url} alt={s.name} crossOrigin="anonymous" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: exportAccentColor, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BsMic size={14} /></div>
                                                            )}
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <span style={{ fontWeight: 700, color: exportTextColor }}>{s.name}</span>
                                                                {s.designation && <span style={{ color: `${exportTextColor}aa`, fontSize: '0.7rem' }}>{s.designation}</span>}
                                                                {s.company && <span style={{ color: `${exportTextColor}aa`, fontSize: '0.7rem' }}>{s.company}</span>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {session.description && <p style={{ color: `${exportTextColor}aa`, fontSize: '0.85rem', lineHeight: 1.4, margin: 0 }}>{session.description}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}

                        {exportShowPartners && exportPartnersPosition === 'bottom' && partners.filter(p => p.event_id == selectedEvent).length > 0 && (
                            <div className="export-partner-block" style={{ marginTop: '60px', borderTop: `1px solid ${exportTextColor}20`, paddingTop: '40px' }}>
                                <h3 style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 700, color: `${exportTextColor}aa`, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '40px' }}>{exportPartnerSectionTitle}</h3>

                                {Object.entries(
                                    partners.filter(p => p.event_id == selectedEvent).reduce((acc, p) => {
                                        const cat = p.category_name || 'Partners';
                                        if (!acc[cat]) acc[cat] = [];
                                        acc[cat].push(p);
                                        return acc;
                                    }, {})
                                ).map(([category, catPartners]) => (
                                    <div key={category} className="export-partner-block" style={{ marginBottom: '40px' }}>
                                        <h4 style={{ textAlign: 'center', fontSize: `${exportPartnerCatSize}px`, fontWeight: exportPartnerCatWeight, color: exportPartnerCatColor, marginBottom: '20px', letterSpacing: '1px' }}>{category}</h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '40px', alignItems: 'center' }}>
                                            {catPartners.map(p => (
                                                <div key={p.id} style={{ textAlign: 'center', background: `${exportTextColor}05`, padding: '15px', borderRadius: '12px', minWidth: `${exportPartnerLogoSize + 40}px` }}>
                                                    {p.logo_url ? (
                                                        <img src={p.logo_url} alt={p.name} crossOrigin="anonymous" style={{ height: `${exportPartnerLogoSize}px`, maxWidth: '160px', objectFit: 'contain' }} />
                                                    ) : (
                                                        <div style={{ fontWeight: 700, color: exportTextColor, fontSize: '1.1rem' }}>{p.name}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Modal show={show} onHide={() => setShow(false)} centered contentClassName="premium-modal">
                <Modal.Header closeButton closeVariant="white"><Modal.Title>{editing ? 'Edit Session' : 'Add Session'}</Modal.Title></Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger" className="py-2" style={{ fontSize: '0.85rem', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>{error}</Alert>}
                    <Form.Group className="mb-3"><Form.Label>Title *</Form.Label><Form.Control className="form-control-dark" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Session title" /></Form.Group>
                    <Form.Group className="mb-3"><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={2} className="form-control-dark" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description" /></Form.Group>
                    <div className="d-flex gap-3">
                        <Form.Group className="mb-3 flex-fill"><Form.Label>Day Number</Form.Label><Form.Control type="number" min={1} className="form-control-dark" value={form.day_number} onChange={e => setForm({ ...form, day_number: parseInt(e.target.value) || 1 })} /></Form.Group>
                        <Form.Group className="mb-3 flex-fill">
                            <Form.Label>Event</Form.Label>
                            <Form.Select 
                                className="form-select-dark" 
                                value={form.event_id} 
                                onChange={e => setForm({ ...form, event_id: e.target.value })}
                                disabled={user?.role === 'employee' && !!user?.assigned_event_id}
                            >
                                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                            </Form.Select>
                        </Form.Group>
                    </div>
                    <div className="d-flex gap-3">
                        <Form.Group className="mb-3 flex-fill"><Form.Label>Start Time *</Form.Label><Form.Control type="time" className="form-control-dark" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></Form.Group>
                        <Form.Group className="mb-3 flex-fill"><Form.Label>End Time *</Form.Label><Form.Control type="time" className="form-control-dark" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></Form.Group>
                    </div>
                    <Form.Group className="mb-3">
                        <Form.Label>Speakers</Form.Label>
                        <div className="speaker-selection-grid">
                            {speakers.map(s => (
                                <div
                                    key={s.id}
                                    className={`speaker-select-item ${form.speaker_ids.includes(s.id) ? 'selected' : ''}`}
                                    onClick={() => {
                                        const ids = form.speaker_ids.includes(s.id)
                                            ? form.speaker_ids.filter(id => id !== s.id)
                                            : [...form.speaker_ids, s.id];
                                        setForm({ ...form, speaker_ids: ids });
                                    }}
                                >
                                    {s.photo_url ? <img src={s.photo_url} alt={s.name} /> : <div className="placeholder"><BsMic size={14} /></div>}
                                    <div className="info">
                                        <div className="name">{s.name}</div>
                                        <div className="desc">{s.designation} @ {s.company}</div>
                                    </div>
                                    <div className="checkbox">{form.speaker_ids.includes(s.id) ? '✓' : ''}</div>
                                </div>
                            ))}
                        </div>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer><Button variant="link" onClick={() => setShow(false)} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Cancel</Button><Button className="btn-accent" onClick={handleSave}>Save</Button></Modal.Footer>
            </Modal>

            {/* Customization Modal */}
            <Modal show={showCustomizer} onHide={() => setShowCustomizer(false)} size="xl" scrollable centered contentClassName="premium-modal">
                <Modal.Header closeButton closeVariant="white"><Modal.Title className='text-white'>Advanced Export Designer</Modal.Title></Modal.Header>
                <Modal.Body style={{ padding: 0, height: 'calc(100vh - 180px)', overflow: 'hidden', backgroundColor: '#0c0c46' }}>
                    <div className="d-flex h-100">
                        <div className="customizer-sidebar" style={{ width: '400px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.1)', padding: '30px', overflowY: 'auto' }}>
                            <div className="customizer-section mb-4">
                                <h6 className="section-label">General Styling</h6>
                                <div className="row g-3">
                                    <div className="col-6">
                                        <Form.Label>Base BG</Form.Label>
                                        <div className="d-flex align-items-center gap-2">
                                            <Form.Control type="color" value={exportBgColor} onChange={e => setExportBgColor(e.target.value)} style={{ width: 44, height: 32, padding: 2 }} />
                                            <Form.Control type="text" value={exportBgColor} onChange={e => setExportBgColor(e.target.value)} className="form-control-dark font-monospace" style={{ fontSize: '0.7rem' }} />
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <Form.Label>Base Text</Form.Label>
                                        <div className="d-flex align-items-center gap-2">
                                            <Form.Control type="color" value={exportTextColor} onChange={e => setExportTextColor(e.target.value)} style={{ width: 44, height: 32, padding: 2 }} />
                                            <Form.Control type="text" value={exportTextColor} onChange={e => setExportTextColor(e.target.value)} className="form-control-dark font-monospace" style={{ fontSize: '0.7rem' }} />
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <Form.Label>Accent & Timestamps</Form.Label>
                                        <div className="d-flex align-items-center gap-2">
                                            <Form.Control type="color" value={exportAccentColor} onChange={e => setExportAccentColor(e.target.value)} style={{ width: 44, height: 32, padding: 2 }} />
                                            <Form.Control type="text" value={exportAccentColor} onChange={e => setExportAccentColor(e.target.value)} className="form-control-dark font-monospace" style={{ fontSize: '0.7rem' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="customizer-section mb-4">
                                <h6 className="section-label">Day Header Style</h6>
                                <div className="row g-3">
                                    <div className="col-12">
                                        <Form.Label>Header Background</Form.Label>
                                        <div className="d-flex gap-2">
                                            <Form.Control type="color" value={exportDayHeaderBg.startsWith('linear-gradient') ? '#000000' : exportDayHeaderBg} onChange={e => setExportDayHeaderBg(e.target.value)} style={{ width: 44, height: 38, padding: 2 }} />
                                            <Form.Control className="form-control-dark font-monospace flex-grow-1" value={exportDayHeaderBg} onChange={e => setExportDayHeaderBg(e.target.value)} placeholder="Color or CSS Gradient" style={{ fontSize: '0.8rem' }} />
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <Form.Label>Header Text Color</Form.Label>
                                        <div className="d-flex align-items-center gap-2">
                                            <Form.Control type="color" value={exportDayHeaderText} onChange={e => setExportDayHeaderText(e.target.value)} style={{ width: 44, height: 32, padding: 2 }} />
                                            <Form.Control type="text" value={exportDayHeaderText} onChange={e => setExportDayHeaderText(e.target.value)} className="form-control-dark font-monospace" style={{ fontSize: '0.7rem' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="customizer-section mb-4">
                                <h6 className="section-label">Logos & Header</h6>
                                <div className="row g-3">
                                    <div className="col-12">
                                        <Form.Label>Company Logo (Left)</Form.Label>
                                        <Form.Control type="file" accept="image/*" onChange={e => handleLogoUpload(e, setExportCompanyLogo)} className="form-control-dark" />
                                        {exportCompanyLogo && <Button variant="link" className="p-0 text-danger" style={{ fontSize: '0.7rem' }} onClick={() => setExportCompanyLogo(null)}>Remove</Button>}
                                    </div>
                                    <div className="col-12">
                                        <Form.Label>Event Logo (Right)</Form.Label>
                                        <Form.Control type="file" accept="image/*" onChange={e => handleLogoUpload(e, setExportEventLogo)} className="form-control-dark" />
                                        {exportEventLogo && <Button variant="link" className="p-0 text-danger" style={{ fontSize: '0.7rem' }} onClick={() => setExportEventLogo(null)}>Remove</Button>}
                                    </div>
                                    <div className="col-12">
                                        <Form.Label className="d-flex justify-content-between">
                                            <span>Logo Size</span>
                                            <span className="text-accent">{exportLogoSize}px</span>
                                        </Form.Label>
                                        <Form.Range
                                            min={20} max={150} step={2}
                                            value={exportLogoSize}
                                            onChange={e => setExportLogoSize(parseInt(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="customizer-section mb-4">
                                <h6 className="section-label">Partner Options</h6>
                                <Form.Check
                                    type="switch"
                                    id="show-partners-switch"
                                    label="Show Partners on Agenda"
                                    checked={exportShowPartners}
                                    onChange={e => setExportShowPartners(e.target.checked)}
                                    className="mb-3"
                                />
                                {exportShowPartners && (
                                    <>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Branding Partner Text</Form.Label>
                                            <Form.Control
                                                type="text"
                                                className="form-control-dark"
                                                value={exportPartnerSectionTitle}
                                                onChange={e => setExportPartnerSectionTitle(e.target.value)}
                                                placeholder="e.g. Our Partners"
                                            />
                                        </Form.Group>
                                        <div className="row g-2 mb-3">
                                            <div className="col-6">
                                                <Form.Label>Category Color</Form.Label>
                                                <div className="d-flex align-items-center gap-2">
                                                    <Form.Control type="color" value={exportPartnerCatColor} onChange={e => setExportPartnerCatColor(e.target.value)} style={{ width: 44, height: 32, padding: 2 }} />
                                                    <Form.Control type="text" value={exportPartnerCatColor} onChange={e => setExportPartnerCatColor(e.target.value)} className="form-control-dark font-monospace" style={{ fontSize: '0.65rem' }} />
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <Form.Label>Category Size</Form.Label>
                                                <Form.Select className="form-select-dark" value={exportPartnerCatSize} onChange={e => setExportPartnerCatSize(parseInt(e.target.value))}>
                                                    {[10, 12, 14, 16, 18, 20, 24, 28].map(s => <option key={s} value={s}>{s}px</option>)}
                                                </Form.Select>
                                            </div>
                                        </div>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="d-flex justify-content-between">
                                                <span>Partner Logo Size</span>
                                                <span className="text-accent">{exportPartnerLogoSize}px</span>
                                            </Form.Label>
                                            <Form.Range
                                                min={20} max={120} step={2}
                                                value={exportPartnerLogoSize}
                                                onChange={e => setExportPartnerLogoSize(parseInt(e.target.value))}
                                            />
                                        </Form.Group>
                                        <Form.Group>
                                            <Form.Label>Partner Section Position</Form.Label>
                                            <Form.Select
                                                className="form-select-dark"
                                                value={exportPartnersPosition}
                                                onChange={e => setExportPartnersPosition(e.target.value)}
                                            >
                                                <option value="bottom">Bottom of Agenda</option>
                                                <option value="top">Top (After Header)</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </>
                                )}
                            </div>

                            <div className="customizer-section mb-4">
                                <h6 className="section-label">Typography & Template</h6>
                                <Form.Group className="mb-3">
                                    <Form.Label>Font Family</Form.Label>
                                    <Form.Select className="form-select-dark" value={exportFontFamily} onChange={e => setExportFontFamily(e.target.value)}>
                                        <option value="Inter">Inter (Modern Sans)</option>
                                        <option value="Montserrat">Montserrat (Geometric)</option>
                                        <option value="Playfair Display">Playfair Display (Premium Serif)</option>
                                        <option value="Poppins">Poppins (Friendly Sans)</option>
                                        <option value="Roboto">Roboto (Clean Sans)</option>
                                    </Form.Select>
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Background Image</Form.Label>
                                    <Form.Control type="file" accept="image/*" onChange={handleBgUpload} className="form-control-dark" />
                                    {exportBgImage && (
                                        <div className="mt-3 p-3" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                                            <Form.Label className="d-flex justify-content-between">
                                                <span>Background Overlay</span>
                                                <span className="text-accent">{Math.round(exportBgOverlay * 100)}%</span>
                                            </Form.Label>
                                            <Form.Range
                                                min={0} max={1} step={0.01}
                                                value={exportBgOverlay}
                                                onChange={e => setExportBgOverlay(parseFloat(e.target.value))}
                                            />
                                            <div className="mt-2 d-flex align-items-center gap-2">
                                                <Form.Control
                                                    type="color"
                                                    value={exportBgOverlayColor}
                                                    onChange={e => setExportBgOverlayColor(e.target.value)}
                                                    style={{ width: 44, height: 32, padding: 2 }}
                                                />
                                                <Form.Control
                                                    type="text"
                                                    value={exportBgOverlayColor}
                                                    onChange={e => setExportBgOverlayColor(e.target.value)}
                                                    className="form-control-dark font-monospace"
                                                    style={{ fontSize: '0.7rem' }}
                                                />
                                            </div>
                                            <Button variant="link" className="p-0 text-danger mt-2" style={{ fontSize: '0.7rem' }} onClick={() => { setExportBgImage(null); setExportBgOverlay(0); }}>Remove Background</Button>
                                        </div>
                                    )}
                                </Form.Group>
                            </div>
                            <div className="pb-3"></div>
                        </div>

                        <div className="preview-area" style={{ flex: 1, padding: '40px', overflowY: 'auto', backgroundColor: '#08082e' }}>
                            <h6 className="section-label mb-3">Real-time Designer Preview</h6>
                            <div className="export-preview-container-advanced" style={{
                                height: 'auto',
                                minHeight: '500px',
                                backgroundColor: exportBgColor,
                                borderRadius: '12px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    position: 'relative',
                                    minHeight: '100%',
                                    background: exportBgImage ? `url(${exportBgImage}) center/cover no-repeat` : exportBgColor,
                                    color: exportTextColor,
                                    fontFamily: `${exportFontFamily}, sans-serif`,
                                }}>
                                    {exportBgImage && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 0, left: 0, right: 0, bottom: 0,
                                            backgroundColor: exportBgOverlayColor,
                                            opacity: exportBgOverlay,
                                            zIndex: 1
                                        }}></div>
                                    )}
                                    <div style={{ position: 'relative', zIndex: 2, padding: '20px' }}>
                                        <div className="export-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: `1px solid ${exportAccentColor}`, paddingBottom: '10px', gap: '10px' }}>
                                            <div style={{ flex: 1, textAlign: 'left' }}>
                                                {exportCompanyLogo && <img src={exportCompanyLogo} alt="Company" style={{ maxHeight: `${exportLogoSize / 2}px`, maxWidth: '100%', objectFit: 'contain' }} />}
                                            </div>
                                            <div style={{ flex: 2, textAlign: 'center' }}>
                                                <h5 style={{ margin: 0, color: exportTextColor, fontFamily: exportFontFamily, fontSize: '1rem' }}>{eventTitle}</h5>
                                                {eventDate && <div style={{ color: `${exportTextColor}aa`, fontSize: '0.65rem', marginTop: '2px' }}>{eventDate}</div>}
                                            </div>
                                            <div style={{ flex: 1, textAlign: 'right' }}>
                                                {exportEventLogo && <img src={exportEventLogo} alt="Event" style={{ maxHeight: `${exportLogoSize / 2}px`, maxWidth: '100%', objectFit: 'contain' }} />}
                                            </div>
                                        </div>

                                        {exportShowPartners && exportPartnersPosition === 'top' && partners.filter(p => p.event_id == selectedEvent).length > 0 && (
                                            <div className="export-partner-block mb-4" style={{ textAlign: 'center', borderBottom: `1px solid ${exportTextColor}20`, paddingBottom: '20px' }}>
                                                <small style={{ textTransform: 'uppercase', letterSpacing: '1px', color: exportAccentColor, opacity: 0.8 }}>{exportPartnerSectionTitle}</small>
                                                {Object.entries(
                                                    partners.filter(p => p.event_id == selectedEvent).reduce((acc, p) => {
                                                        const cat = p.category_name || 'Partners';
                                                        if (!acc[cat]) acc[cat] = [];
                                                        acc[cat].push(p);
                                                        return acc;
                                                    }, {})
                                                ).map(([category, catPartners]) => (
                                                    <div key={category} className="mt-3">
                                                        <div style={{ fontSize: `${exportPartnerCatSize / 2}px`, fontWeight: exportPartnerCatWeight, color: exportPartnerCatColor, marginBottom: '5px' }}>{category}</div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', alignItems: 'center' }}>
                                                            {catPartners.slice(0, 6).map(p => (
                                                                <div key={p.id} style={{ background: `${exportTextColor}05`, padding: '8px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                                    {p.logo_url ? (
                                                                        <img src={p.logo_url} alt={p.name} style={{ height: `${exportPartnerLogoSize / 2.5}px`, maxWidth: '60px', objectFit: 'contain' }} />
                                                                    ) : (
                                                                        <span style={{ fontSize: '0.65rem', color: exportTextColor, fontWeight: 600 }}>{p.name}</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {catPartners.length > 6 && <span style={{ fontSize: '0.5rem', color: `${exportTextColor}88` }}>+{catPartners.length - 6}</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {[...Array(maxDay)].map((_, i) => {
                                            const dayNum = i + 1;
                                            const daySessions = agendas.filter(a => a.day_number === dayNum);
                                            if (daySessions.length === 0) return null;
                                            return (
                                                <div key={dayNum} className="mb-4">
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, padding: '4px 12px', background: exportDayHeaderBg, color: exportDayHeaderText, borderRadius: '4px', display: 'inline-block', marginBottom: '10px' }}>Day {dayNum}</div>
                                                    {daySessions.map(session => (
                                                        <div key={session.id} style={{ padding: '12px', background: `${exportTextColor}15`, borderRadius: '8px', border: `1px solid ${exportTextColor}15`, marginBottom: '10px' }}>
                                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: exportAccentColor }}>{session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}</div>
                                                            <div style={{ fontSize: '0.9rem', fontWeight: 700, margin: '4px 0', color: exportTextColor }}>{session.title}</div>
                                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                                                {Array.isArray(session.speakers) && session.speakers[0]?.id !== null && session.speakers.map(s => (
                                                                    <div key={s.id} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: exportAccentColor, overflow: 'hidden' }}>
                                                                            {s.photo_url && <img src={s.photo_url} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                                                        </div>
                                                                        <span style={{ fontSize: '0.65rem', color: `${exportTextColor}aa` }}>{s.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })}

                                        {exportShowPartners && exportPartnersPosition === 'bottom' && partners.filter(p => p.event_id == selectedEvent).length > 0 && (
                                            <div className="export-partner-block" style={{ marginTop: '30px', borderTop: `1px solid ${exportTextColor}20`, paddingTop: '20px', textAlign: 'center' }}>
                                                <small style={{ textTransform: 'uppercase', letterSpacing: '1px', color: exportAccentColor, opacity: 0.8 }}>{exportPartnerSectionTitle}</small>
                                                {Object.entries(
                                                    partners.filter(p => p.event_id == selectedEvent).reduce((acc, p) => {
                                                        const cat = p.category_name || 'Partners';
                                                        if (!acc[cat]) acc[cat] = [];
                                                        acc[cat].push(p);
                                                        return acc;
                                                    }, {})
                                                ).map(([category, catPartners]) => (
                                                    <div key={category} className="mt-3">
                                                        <div style={{ fontSize: `${exportPartnerCatSize / 2}px`, fontWeight: exportPartnerCatWeight, color: exportPartnerCatColor, marginBottom: '5px' }}>{category}</div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', alignItems: 'center' }}>
                                                            {catPartners.slice(0, 6).map(p => (
                                                                <div key={p.id} style={{ background: `${exportTextColor}05`, padding: '8px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                                    {p.logo_url ? (
                                                                        <img src={p.logo_url} alt={p.name} style={{ height: `${exportPartnerLogoSize / 2.5}px`, maxWidth: '60px', objectFit: 'contain' }} />
                                                                    ) : (
                                                                        <span style={{ fontSize: '0.65rem', color: exportTextColor, fontWeight: 600 }}>{p.name}</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {catPartners.length > 6 && <span style={{ fontSize: '0.5rem', color: `${exportTextColor}88` }}>+{catPartners.length - 6}</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer className="border-top border-secondary bg-darker d-flex justify-content-between py-3 px-4">
                    {/* <Button variant="outline-danger" onClick={() => setShowCustomizer(false)} className="px-4">
                        Close Designer
                    </Button> */}
                    <div className="d-flex gap-3">
                        <Button className="btn-accent d-flex align-items-center gap-2 px-4" onClick={() => handleExport('image')}>
                            <BsImage size={18} /> Export as PNG
                        </Button>
                        <Button className="btn-accent d-flex align-items-center gap-2 px-4" onClick={() => handleExport('pdf')}>
                            <BsFileEarmarkPdf size={18} /> Export as PDF
                        </Button>
                    </div>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

const highlightColor = 'var(--accent)';
