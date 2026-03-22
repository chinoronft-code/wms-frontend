import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/common/Toast';
import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export default function ChangePasswordPage() {
  const toast    = useToast();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      return toast.error('รหัสผ่านใหม่ไม่ตรงกัน');
    }
    if (form.newPassword.length < 4) {
      return toast.error('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร');
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('wms_token');
      await axios.post(
        `${BASE}/auth/change-password`,
        { oldPassword: form.oldPassword, newPassword: form.newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.ok('เปลี่ยนรหัสผ่านสำเร็จ');
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 400 }}>
      <div className="card-header">เปลี่ยนรหัสผ่าน</div>
      <div className="card-body">
        <form onSubmit={submit}>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label>รหัสผ่านเดิม</label>
            <input className="form-control" type="password"
              value={form.oldPassword}
              onChange={e => setForm({ ...form, oldPassword: e.target.value })}
              placeholder="กรอกรหัสผ่านเดิม" autoFocus />
          </div>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label>รหัสผ่านใหม่</label>
            <input className="form-control" type="password"
              value={form.newPassword}
              onChange={e => setForm({ ...form, newPassword: e.target.value })}
              placeholder="กรอกรหัสผ่านใหม่" />
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>ยืนยันรหัสผ่านใหม่</label>
            <input className="form-control" type="password"
              value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="กรอกรหัสผ่านใหม่อีกครั้ง" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="toolbar-btn primary" type="submit" disabled={loading}
              style={{ flex: 1, justifyContent: 'center' }}>
              {loading ? 'กำลังบันทึก…' : '✔ บันทึกรหัสผ่านใหม่'}
            </button>
            <button className="toolbar-btn" type="button" onClick={() => navigate(-1)}>
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
