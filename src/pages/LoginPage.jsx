import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]     = useState({ username: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch (err) {
      setError(err?.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          ▪ WMS Pro
          <span>Warehouse Management System</span>
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid #D0D5DB', margin: '20px 0' }} />
        <form onSubmit={submit}>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label>ชื่อผู้ใช้ (Username)</label>
            <input
              className="form-control"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="กรอก username"
              autoFocus
              style={{ padding: '7px 8px', fontSize: 13 }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>รหัสผ่าน (Password)</label>
            <input
              className="form-control"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="กรอก password"
              style={{ padding: '7px 8px', fontSize: 13 }}
            />
          </div>
          {error && (
            <div style={{
              background: '#FDECEA', color: '#B00020', border: '1px solid #B00020',
              padding: '7px 12px', borderRadius: 3, fontSize: 12, marginBottom: 12,
              borderLeft: '3px solid #B00020'
            }}>
              {error}
            </div>
          )}
          <button
            className="toolbar-btn primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '8px 14px', fontSize: 13 }}
          >
            {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
          </button>
        </form>
        <div style={{ marginTop: 16, fontSize: 11, color: '#627487', textAlign: 'center' }}>
          WMS Pro v1.0 — Warehouse Management System
        </div>
      </div>
    </div>
  );
}
