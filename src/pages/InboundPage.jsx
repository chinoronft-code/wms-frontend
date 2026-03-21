import React, { useState, useEffect, useRef } from 'react';
import { listRequests, scanBox, getReceiptSummary, confirmInbound } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { useToast } from '../components/common/Toast';

export default function InboundPage() {
  const toast = useToast();

  const [requests, setRequests]       = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [summary, setSummary]         = useState(null);
  const [lastResult, setLastResult]   = useState(null);
  const [qrInput, setQrInput]         = useState('');
  const [posDocNo, setPosDocNo]       = useState('');
  const [posDocDate, setPosDocDate]   = useState(new Date().toISOString().split('T')[0]);
  const [scanning, setScanning]       = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    listRequests({ limit: 20 }).then((d) => setRequests(d.data || []));
  }, []);

  const loadSummary = async (reqId) => {
    const data = await getReceiptSummary(reqId);
    setSummary(data);
  };

  const selectRequest = async (req) => {
    setSelectedReq(req);
    setLastResult(null);
    await loadSummary(req.id);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useSocket(selectedReq?.id, {
    onInboundReceived: async () => {
      if (selectedReq) await loadSummary(selectedReq.id);
    },
  });

  const handleScan = async (rawInput) => {
    const text = rawInput.trim();
    if (!text) return;
    setScanning(true);
    try {
      // Try to parse as JSON (QR payload), or pass as string
      let payload;
      try { payload = JSON.parse(text); }
      catch { payload = { boxId: text }; }

      const res = await scanBox(payload);
      setLastResult(res);
      setQrInput('');
      if (res.success) {
        toast.ok(res.message);
        if (selectedReq) await loadSummary(selectedReq.id);
      } else {
        toast.error(res.error);
      }
    } catch (e) {
      toast.error(e?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setScanning(false);
      inputRef.current?.focus();
    }
  };

  const handleConfirm = async () => {
    if (!selectedReq || !posDocNo) return;
    if (!window.confirm(`ยืนยันรับเข้า Request ${selectedReq.doc_no} ด้วยเลขที่ ${posDocNo}?`)) return;
    try {
      const res = await confirmInbound({
        requestId: selectedReq.id,
        posDocNo,
        posDocDate,
      });
      if (res.success) {
        toast.ok(`บันทึกรับเข้าสำเร็จ — ${posDocNo}`);
        await loadSummary(selectedReq.id);
      } else {
        toast.error(res.error);
      }
    } catch (e) {
      toast.error(e?.error || 'เกิดข้อผิดพลาด');
    }
  };

  const pct = summary
    ? summary.totalBoxes > 0 ? Math.round(summary.received / summary.totalBoxes * 100) : 0
    : 0;

  return (
    <>
      <div className="form-group">
        <label>เลือก Request</label>
        <select className="form-control" onChange={(e) => {
          const req = requests.find((r) => r.id === e.target.value);
          if (req) selectRequest(req);
        }} value={selectedReq?.id || ''}>
          <option value="">— เลือก Request —</option>
          {requests.map((r) => (
            <option key={r.id} value={r.id}>{r.doc_no}</option>
          ))}
        </select>
      </div>

      {selectedReq && summary && (
        <>
          {/* Summary metrics */}
          <div className="metrics">
            <div className="metric">
              <div className="val">{summary.totalBoxes}</div>
              <div className="label">ลังทั้งหมด</div>
            </div>
            <div className="metric">
              <div className="val" style={{ color: 'var(--sap-green)' }}>{summary.received}</div>
              <div className="label">รับแล้ว</div>
            </div>
            <div className="metric">
              <div className="val" style={{ color: 'var(--sap-orange)' }}>{summary.pending}</div>
              <div className="label">รอรับ</div>
            </div>
            <div className="metric">
              <div className="val" style={{ color: summary.withIssues > 0 ? 'var(--sap-red)' : 'var(--sap-green)' }}>{summary.withIssues}</div>
              <div className="label">มีปัญหา</div>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%`, background: summary.complete ? 'var(--sap-green)' : 'var(--sap-blue)' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--sap-muted)', marginTop: 3 }}>
              {pct}% — {summary.complete ? '✓ ครบทุกลัง' : `รอ ${summary.pending} ลัง`}
            </div>
          </div>

          {/* Scan Area */}
          <div className="scan-area">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>สแกน Barcode บนลัง</div>
            <div className="scan-input-row">
              <input
                ref={inputRef}
                className="form-control"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan(qrInput)}
                placeholder="สแกน QR Code บนลัง แล้วกด Enter"
                disabled={scanning}
              />
              <button className="btn btn-primary" onClick={() => handleScan(qrInput)} disabled={scanning || !qrInput}>
                {scanning ? '…' : 'รับ'}
              </button>
            </div>
          </div>

          {/* Last scan result */}
          {lastResult?.success && (
            <div className={`card`} style={{ borderColor: lastResult.discrepancies?.length > 0 ? 'var(--sap-red)' : 'var(--sap-green)', marginBottom: 12 }}>
              <div className="card-header" style={{ background: lastResult.discrepancies?.length > 0 ? 'var(--sap-red-bg)' : 'var(--sap-green-bg)' }}>
                {lastResult.boxNo} — {lastResult.status === 'complete' ? '✓ ครบถ้วน' : '⚠ พบความไม่ตรงกัน'}
              </div>
              {lastResult.discrepancies?.length > 0 && (
                <div className="card-body" style={{ padding: 0 }}>
                  <table className="erp-table">
                    <thead><tr><th>SKU</th><th>คาดหวัง</th><th>จริง</th><th>ต่าง</th></tr></thead>
                    <tbody>
                      {lastResult.discrepancies.map((d) => (
                        <tr key={d.skuCode}>
                          <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{d.skuCode}</td>
                          <td>{d.expectedQty}</td>
                          <td>{d.actualQty}</td>
                          <td style={{ color: d.actualQty > d.expectedQty ? 'var(--sap-orange)' : 'var(--sap-red)', fontWeight: 600 }}>
                            {d.actualQty - d.expectedQty > 0 ? '+' : ''}{d.actualQty - d.expectedQty}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Box list */}
          <div className="card">
            <div className="card-header">สถานะลัง</div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="erp-table">
                <thead><tr><th>ลัง</th><th>SKU</th><th>สถานะ</th><th>เวลารับ</th></tr></thead>
                <tbody>
                  {summary.boxes.map((box) => (
                    <tr key={box.id}>
                      <td style={{ fontWeight: 600 }}>{box.box_no}</td>
                      <td>{box.sku_count}</td>
                      <td>
                        {box.status === 'received' ? (
                          <span className={`badge ${parseInt(box.discrepancy_count) > 0 ? 'badge-error' : 'badge-done'}`}>
                            {parseInt(box.discrepancy_count) > 0 ? `⚠ ผิดพลาด ${box.discrepancy_count}` : '✓ ครบ'}
                          </span>
                        ) : (
                          <span className="badge badge-open">รอรับ</span>
                        )}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--sap-muted)' }}>
                        {box.received_at ? new Date(box.received_at).toLocaleTimeString('th-TH') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* POS Document confirm */}
          {summary.complete && (
            <div className="card">
              <div className="card-header">ยืนยันรับเข้า — ใส่เลขที่เอกสาร POS</div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 2, minWidth: 160 }}>
                    <label>เลขที่เอกสาร POS</label>
                    <input className="form-control" value={posDocNo}
                      onChange={(e) => setPosDocNo(e.target.value)}
                      placeholder="เช่น GR-2026-03210001" />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 130 }}>
                    <label>วันที่</label>
                    <input className="form-control" type="date" value={posDocDate}
                      onChange={(e) => setPosDocDate(e.target.value)} />
                  </div>
                </div>
                <button className="btn btn-primary btn-block" onClick={handleConfirm} disabled={!posDocNo}>
                  ✔ ยืนยันรับเข้าระบบ
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
