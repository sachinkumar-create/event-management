import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
    baseURL: API_BASE
});

// Attach token to every request
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

api.interceptors.response.use(response => {
    return response;
}, error => {
    return Promise.reject(error);
});

// Auth
export const checkEmail = (email) => api.post('/auth/check-email', { email });
export const loginUser = (email, password) => api.post('/auth/login', { email, password });
export const registerUser = (data) => api.post('/auth/register', data);
export const getCurrentUser = () => api.get('/auth/me');
export const inviteUser = (data) => api.post('/auth/invite', data);
export const validateInvite = (token) => api.get(`/auth/validate-invite/${token}`);
export const acceptInvite = (data) => api.post('/auth/accept-invite', data);
export const acceptExistingInvite = () => api.post('/auth/accept-invite-existing');
export const declineInvite = () => api.post('/auth/decline-invite');
export const deleteInvitation = (email) => api.delete(`/auth/invitation/${email}`);

// Events
export const getEvents = () => api.get('/events');
export const getEvent = (id) => api.get(`/events/${id}`);
export const createEvent = (data) => api.post('/events', data);
export const updateEvent = (data) => api.put(`/events/${data.id}`, data);
export const deleteEvent = (id) => api.delete(`/events/${id}`);

// Speakers
export const getSpeakers = (eventId) => api.get('/speakers');
export const getSpeaker = (id) => api.get(`/speakers/${id}`);
export const createSpeaker = (data) => api.post('/speakers', data);
export const updateSpeaker = (data) => {
    let id;
    if (data instanceof FormData) {
        id = data.get('id');
    } else {
        id = data.id;
    }
    return api.put(`/speakers/${id}`, data);
};
export const deleteSpeaker = (id) => api.delete(`/speakers/${id}`);

// SNS Card Saving
export const saveSNSCard = (id, data) => api.post(`/speakers/${id}/save-sns`, data);

// Partners
export const getPartners = (eventId) => api.get('/partners');
export const getPartner = (id) => api.get(`/partners/${id}`);
export const createPartner = (data) => api.post('/partners', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updatePartner = (data) => {
    let id;
    if (data instanceof FormData) {
        id = data.get('id');
    } else {
        id = data.id;
    }
    return api.put(`/partners/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const deletePartner = (id) => api.delete(`/partners/${id}`);
export const reorderPartners = (updates) => api.put('/partners/reorder', { updates });

// Partner Categories
export const getPartnerCategories = () => api.get('/partner-categories');
export const createPartnerCategory = (data) => api.post('/partner-categories', data);
export const updatePartnerCategory = (data) => api.put(`/partner-categories/${data.id}`, data);
export const deletePartnerCategory = (id) => api.delete(`/partner-categories/${id}`);

// Agendas
export const getAgendas = (eventId) => api.get(`/agendas/${eventId}`);
export const createAgenda = (data) => api.post('/agendas', data);
export const updateAgenda = (data) => api.put(`/agendas/${data.id}`, data);
export const deleteAgenda = (id) => api.delete(`/agendas/${id}`);
export const reorderAgendas = (updates) => api.put('/agendas/reorder', { updates });
export const getSpeakerAgendas = (id) => api.get(`/agendas/speaker/${id}`);

// Users
export const getUsers = () => api.get('/users');
export const updateUser = (data) => api.put(`/users/${data.id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);

// Attendees
export const getAttendees = (eventId) => api.get('/attendees' + (eventId ? `?event_id=${eventId}` : ''));
export const getAttendee = (id) => api.get(`/attendees/${id}`);
export const createAttendee = (data) => api.post('/attendees', data);
export const updateAttendee = (data) => api.put(`/attendees/${data.id}`, data);
export const deleteAttendee = (id) => api.delete(`/attendees/${id}`);
export const getAttendeeStats = () => api.get('/attendees/stats/summary');

// Speaker Travel
export const getSpeakerTravel = (speakerId) => api.get(`/travel/speaker/${speakerId}`);
export const getAllTravel = (speakerId) => api.get('/travel' + (speakerId ? `?speaker_id=${speakerId}` : ''));
export const createTravel = (data) => api.post('/travel', data);
export const updateTravel = (data) => api.put(`/travel/${data.id}`, data);
export const deleteTravel = (id) => api.delete(`/travel/${id}`);
export const getTravelStats = () => api.get('/travel/stats/summary');

// OpenAI
export const generateAIText = (data) => api.post('/openai/generate-text', data);
export const generateAIBackground = (data) => api.post('/openai/generate-background', data);
export const chatAssistant = (data) => api.post('/openai/chat-assistant', data);

// Settings
export const getSettings = () => api.get('/settings');
export const updateLogo = (formData) => api.post('/settings/logo', formData);
export const updateSetting = (key, value) => api.post('/settings', { key, value });

export default api;
