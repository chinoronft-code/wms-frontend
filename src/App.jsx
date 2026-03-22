import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import LoginPage     from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PackingPage   from './pages/PackingPage';
import InboundPage   from './pages/InboundPage';
import RequestsPage  from './pages/RequestsPage';
import './index.css';

const PrivateRoute = ({ children, roles }) => {
  const { user, isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const NAV_ITEMS = [
  { path: '/',         label: 'Dashboard',    roles: ['admin','packer','receiver'] },
  { path: '/packing',  label: 'Packing',      roles: ['admin','packer'] },
  { path: '/inbound',  label: 'Inbound',      roles: ['admin','receiver'] },
  { path: '/requests', label: 'POS Document', roles: ['admin'] },
];

const SIDEBAR_MAP = {
  '/': [
    { group: 'ภาพรวม', items: [
      { label: 'Dashboard', color: '#0070F2', path: '/' },
    ]},
  ],
  '/packing': [
    { group: 'จัดการ Request', items: [
      { label: 'Packing List',   color: '#0070F2', path: '/packing' },
      { label: 'SKU Assignment', color: '#627487', path: '/packing' },
      { label: 'Scan Barcode',   color: '#E76500', path: '/packing' },
    ]},
    { group: 'รับสินค้า', items: [
      { label: 'Scan Box Barcode', color: '#188918', path: '/inbound' },
      { label: 'Receiving Log',    color: '#627487', path: '/inbound' },
      { label: 'Discrepancy',      color: '#627487', path: '/inbound' },
    ]},
    { group: 'รายงาน', items: [
      { label: 'Summary Report', color: '#627487', path: '/' },
      { label: 'POS Export',     color: '#627487', path: '/requests' },
    ]},
  ],
  '/inbound': [
    { group: 'รับสินค้า', items: [
      { label: 'Scan Box Barcode', color: '#0070F2', path: '/inbound' },
      { label: 'Receiving Log',    color: '#627487', path: '/inbound' },
      { label: 'Discrepancy',      color: '#B00020', path: '/inbound' },
    ]},
  ],
  '/requests': [
    { group: 'เอกสาร', items: [
      { label: 'Import Request', color: '#0070F2', path: '/requests' },
      { label: 'รายการ Request', color: '#627487', path: '/requests' },
      { label: 'POS Export',     color: '#188918', path: '/requests' },
    ]},
  ],
};

const Layout = ({ children, title, toolbar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const sidebarGroups = SIDEBAR_MAP[currentPath] || SIDEBAR_MAP['/'];
  const today = new Date().toLocaleDateString('th-TH', { day:'2-digit', month:'2-digit', year:'numeric' });

  return (
    <div className="erp-wrap">
      {/* Header */}
      <div className="erp-header">
        <div className="logo">▪ WMS Pro — Warehouse Management System</div>
        <div className="nav">
          {NAV_ITEMS.filter(n => !n.roles || n.roles.includes(user?.role)).map(n => (
            <button
              key={n.path}
              className={`nav-btn ${currentPath === n.path ? 'active' : ''}`}
              onClick={() => navigate(n.path)}
            >
              {n.label}
            </button>
          ))}
        </div>
        <div className="user-info">
          <span>{user?.fullName} / {user?.role} &nbsp;|&nbsp; {today}</span>
          <button className="logout-btn" onClick={logout}>ออก</button>
        </div>
      </div>

      {/* Toolbar */}
      {toolbar && <div className="erp-toolbar">{toolbar}</div>}

      {/* Body */}
      <div className="erp-body">
        {/* Sidebar */}
        <div className="erp-sidebar">
          {sidebarGroups.map((g, gi) => (
            <div className="sidebar-group" key={gi}>
              <div className="sidebar-title">{g.group}</div>
              {g.items.map((item, ii) => (
                <div
                  key={ii}
                  className={`sidebar-item ${currentPath === item.path && ii === 0 ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <span className="sidebar-dot" style={{ background: item.color }}></span>
                  {item.label}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="erp-main">{children}</div>
      </div>

      {/* Footer */}
      <div className="erp-footer">
        <span>WMS Pro v1.0 | User: {user?.fullName}</span>
        <span>
          <span className="chip">Packing</span>
          <span className="chip">Inbound</span>
          <span className="chip">POS Sync</span>
          <span className="chip">Barcode</span>
        </span>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={
              <PrivateRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/packing" element={
              <PrivateRoute roles={['packer','admin']}>
                <Layout>
                  <PackingPage />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/inbound" element={
              <PrivateRoute roles={['receiver','admin']}>
                <Layout>
                  <InboundPage />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/requests" element={
              <PrivateRoute roles={['admin']}>
                <Layout>
                  <RequestsPage />
                </Layout>
              </PrivateRoute>
            } />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
