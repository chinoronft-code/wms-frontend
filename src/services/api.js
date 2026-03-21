import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({ baseURL: BASE });

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('wms_token');
      localStorage.removeItem('wms_user');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data || err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const login = (username, password) =>
  api.post('/auth/login', { username, password });

// ─── Requests ────────────────────────────────────────────────────────────────
export const listRequests    = (params) => api.get('/requests', { params });
export const getRequest      = (id)     => api.get(`/requests/${id}`);
export const getMySkuList    = (id)     => api.get(`/requests/${id}/my-sku`);
export const getProgress     = (id)     => api.get(`/requests/${id}/progress`);
export const importRequest   = (formData) =>
  api.post('/requests/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// ─── Packing ─────────────────────────────────────────────────────────────────
export const scanSku       = (requestId, barcode) => api.post('/packing/scan', { requestId, barcode });
export const listBoxes     = (requestId)  => api.get(`/packing/boxes/${requestId}`);
export const getBoxDetail  = (boxId)      => api.get(`/packing/box/${boxId}`);
export const closeBox      = (boxId)      => api.patch(`/packing/box/${boxId}/close`);
export const getLabelUrl   = (boxId)      => `${BASE}/packing/box/${boxId}/label`;
export const submitPacking = (requestId)  => api.post('/packing/submit', { requestId });

// ─── Inbound ─────────────────────────────────────────────────────────────────
export const scanBox         = (qrPayload, posDocumentId) =>
  api.post('/inbound/scan', { qrPayload, posDocumentId });
export const confirmInbound  = (data) => api.post('/inbound/confirm', data);
export const getReceiptSummary = (requestId) => api.get(`/inbound/summary/${requestId}`);

// ─── POS ─────────────────────────────────────────────────────────────────────
export const syncToPOS   = (posDocId)   => api.post(`/pos/sync/${posDocId}`);
export const exportToJson = (requestId) => api.get(`/pos/export/${requestId}`);
