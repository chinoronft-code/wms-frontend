import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import LoginPage     from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PackingPage   from './pages/PackingPage';
import InboundPage   from './pages/InboundPage';
import RequestsPage  from './pages/RequestsPage';
import './index.css';

// SVG icons inline (no icon lib needed)
const IconDash  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
const IconPack  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const IconIn    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>;
const IconReq   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;

const PrivateRoute = ({ children, roles }) => {
  const { user, isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  return (
    <div className="page-wrap">
      <header className="app-header">
        <div className="logo">▪ WMS Pro</div>
        <div className="user">{user?.fullName} · {user?.role}</div>
        <button onClick={logout} style={{ background:'none', border:'none', color:'rgba(255,255,255,.6)', cursor:'pointer', fontSize:12 }}>ออก</button>
      </header>
      <main className="page-body">{children}</main>
      <nav className="bottom-nav">
        <NavLink to="/" end>       <IconDash/> Dashboard </NavLink>
        {(user?.role === 'packer' || user?.role === 'admin') &&
          <NavLink to="/packing">  <IconPack/> Packing   </NavLink>}
        {(user?.role === 'receiver' || user?.role === 'admin') &&
          <NavLink to="/inbound">  <IconIn/>   Inbound   </NavLink>}
        {user?.role === 'admin' &&
          <NavLink to="/requests"> <IconReq/>  Requests  </NavLink>}
      </nav>
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
            <Route path="/" element={<PrivateRoute><Layout><DashboardPage /></Layout></PrivateRoute>} />
            <Route path="/packing" element={<PrivateRoute roles={['packer','admin']}><Layout><PackingPage /></Layout></PrivateRoute>} />
            <Route path="/inbound" element={<PrivateRoute roles={['receiver','admin']}><Layout><InboundPage /></Layout></PrivateRoute>} />
            <Route path="/requests" element={<PrivateRoute roles={['admin']}><Layout><RequestsPage /></Layout></PrivateRoute>} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
