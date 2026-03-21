import React, { useState, useEffect, useRef } from 'react';
import { listRequests, importRequest, getProgress } from '../services/api';
import { useToast } from '../components/common/Toast';

export default function RequestsPage() {
  const toast = useToast();
  const fileRef = useRef(null);

  const [requests, setRequests]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [importing, setImporting]     = useState(false);
  const [description, setDescription] = useState('');
  const [selectedReq, setSelectedReq] = useState(null);
  const [progRows, setProgRows]       = useState([]);

  const load = () =>
    listRequests({ limit: 50 })
      .then((d) => setRequests(d.data || []))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error('กรุณาเลือกไฟล์');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('description', description);
    setImporting(true);
    try {
      const res = await importRequest(fd);
      if (res.success) {
        toast.ok(`Import สำเร็จ — ${res.request.docNo} (${res.request.totalSku} SKU, ${res.request.packers} Packers)`);
        fileRef.current.value = '';
        setDescription('');
        load();
      } else {
        toast.error(res.errors?.join(', ') || 'Import ล้มเหลว');
      }
    } catch (e) {
      toast.error(e?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setImporting(false);
    }
  };

  const viewProgress = async (req) => {
    setSelectedReq(req);
    const data = await getProgress(req.id);
    setProgRows(data);
  };

  const statusColor = { draft:'var(--sap-muted)', assigned:'var(--sap-blue)', packing:'var(--sap-orange)', completed:'var(--sap-green)', cancelled:'var(--sap-red)' };

  return (
    <>
      {/* Import Card */}
      <div className="card">
        <div className="card-header">Import Request จากจัดซื้อ</div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 2, minWidth: 180 }}>
              <label>ไฟล์ Excel / CSV</label>
              <input ref={fileRef} type="file" className="form-control" accept=".xlsx,.xls,.csv" />
            </div>
            <div className="form-group" style={{ flex: 3, minWidth: 180 }}>
              <label>หมายเหตุ (ไม่บังคับ)</label>
              <input className="form-control" value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="เช่น รอบสั่งซื้อ มีนาคม 2026" />
            </div>
            <div className="form-group">
              <label>&nbsp;</label>
              <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
                {importing ? 'กำลัง Import…' : '📥 Import'}
              </button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--sap-muted)', marginTop: 4 }}>
            ไฟล์ต้องมีคอลัมน์: <code>SKU Code, SKU Name, Barcode, Quantity</code>
          </div>
        </div>
      </div>

      {/* Request List */}
      <div className="card">
        <div className="card-header">
          รายการ Request ทั้งหมด
          <button className="btn" onClick={load} style={{ fontSize: 11, padding: '2px 8px' }}>รีเฟรช</button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--sap-muted)' }}>กำลังโหลด…</div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr><th>เลขที่</th><th>หมายเหตุ</th><th>SKU</th><th>แพ็คแล้ว</th><th>สถานะ</th><th></th></tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600, color: 'var(--sap-blue)', whiteSpace: 'nowrap' }}>{r.doc_no}</td>
                    <td style={{ color: 'var(--sap-muted)', fontSize: 11 }}>{r.description || '—'}</td>
                    <td>{r.total_sku}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="progress-bar" style={{ width: 50 }}>
                          <div className="progress-fill" style={{ width: `${r.total_sku > 0 ? Math.round(r.packed_sku / r.total_sku * 100) : 0}%` }} />
                        </div>
                        <span style={{ fontSize: 11 }}>{r.packed_sku}/{r.total_sku}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, color: statusColor[r.status] }}>{r.status}</span>
                    </td>
                    <td>
                      <button className="btn" style={{ fontSize: 11, padding: '2px 8px' }}
                        onClick={() => viewProgress(r)}>Progress</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Progress Detail Modal-ish */}
      {selectedReq && (
        <div className="card">
          <div className="card-header">
            Progress — {selectedReq.doc_no}
            <button className="btn" onClick={() => setSelectedReq(null)} style={{ fontSize: 11, padding: '2px 8px' }}>ปิด</button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="erp-table">
              <thead><tr><th>Packer</th><th>แพ็คแล้ว</th><th>ทั้งหมด</th><th>ลังเต็ม</th><th>%</th></tr></thead>
              <tbody>
                {progRows.map((row) => {
                  const pct = row.total > 0 ? Math.round(row.packed / row.total * 100) : 0;
                  return (
                    <tr key={row.packer_id}>
                      <td style={{ fontWeight: 600 }}>{row.full_name}</td>
                      <td>{row.packed}</td>
                      <td>{row.total}</td>
                      <td>{row.full_boxes}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="progress-bar" style={{ width: 60 }}>
                            <div className="progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--sap-green)' : 'var(--sap-blue)' }} />
                          </div>
                          <span style={{ fontSize: 11 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
