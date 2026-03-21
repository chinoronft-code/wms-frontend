import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]   = useState({ username: '', password: '' });
  const [error, setError] = useState('');
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
        <form onSubmit={submit}>
          <div className="form-group">
            <label>ชื่อผู้ใช้</label>
            <input className="form-control" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="username" autoFocus />
          </div>
          <div className="form-group">
            <label>รหัสผ่าน</label>
            <input className="form-control" type="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="password" />
          </div>
          {error && (
            <div style={{ background:'#FDECEA', color:'#B00020', padding:'8px 12px', borderRadius:4, fontSize:12, marginBottom:12 }}>
              {error}
            </div>
          )}
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
            {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
}
