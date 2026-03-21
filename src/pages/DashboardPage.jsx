import React, { useEffect, useState } from 'react';
import { listRequests } from '../services/api';
import { useAuth } from '../context/AuthContext';

const statusLabel = { draft:'ร่าง', assigned:'มอบหมายแล้ว', packing:'กำลังแพ็ค', completed:'เสร็จสิ้น', cancelled:'ยกเลิก' };
const statusClass = { draft:'badge-open', assigned:'badge-full', packing:'badge-open', completed:'badge-done', cancelled:'badge-error' };

export default function DashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    listRequests({ limit: 10 })
      .then((d) => setRequests(d.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const active    = requests.filter((r) => r.status === 'packing').length;
  const completed = requests.filter((r) => r.status === 'completed').length;

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>สวัสดี, {user?.fullName}</div>
        <div style={{ fontSize: 12, color: 'var(--sap-muted)' }}>{new Date().toLocaleDateString('th-TH', { dateStyle: 'full' })}</div>
      </div>

      <div className="metrics">
        <div className="metric">
          <div className="val">{requests.length}</div>
          <div className="label">Request ทั้งหมด</div>
        </div>
        <div className="metric">
          <div className="val" style={{ color: 'var(--sap-orange)' }}>{active}</div>
          <div className="label">กำลังดำเนินการ</div>
        </div>
        <div className="metric">
          <div className="val" style={{ color: 'var(--sap-green)' }}>{completed}</div>
          <div className="label">เสร็จสิ้น</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Request ล่าสุด</div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--sap-muted)' }}>กำลังโหลด…</div>
          ) : requests.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--sap-muted)' }}>ยังไม่มี Request</div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>เลขที่</th>
                  <th>SKU</th>
                  <th>แพ็คแล้ว</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: 'var(--sap-blue)' }}>{r.doc_no}</td>
                    <td>{r.total_sku}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="progress-bar" style={{ width: 60 }}>
                          <div className="progress-fill" style={{ width: `${r.total_sku > 0 ? Math.round(r.packed_sku / r.total_sku * 100) : 0}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--sap-muted)' }}>
                          {r.packed_sku}/{r.total_sku}
                        </span>
                      </div>
                    </td>
                    <td><span className={`badge ${statusClass[r.status]}`}>{statusLabel[r.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
