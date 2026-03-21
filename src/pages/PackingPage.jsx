import React, { useState, useEffect, useCallback, useRef } from 'react';
import { listRequests, getMySkuList, scanSku, listBoxes, getBoxDetail,
         submitPacking, getLabelUrl } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { useToast } from '../components/common/Toast';

export default function PackingPage() {
  const toast = useToast();

  const [requests, setRequests]         = useState([]);
  const [selectedReq, setSelectedReq]   = useState(null);
  const [boxes, setBoxes]               = useState([]);
  const [activeBox, setActiveBox]       = useState(null);
  const [boxItems, setBoxItems]         = useState([]);
  const [progress, setProgress]         = useState({ packed: 0, total: 0 });
  const [barcode, setBarcode]           = useState('');
  const [scanning, setScanning]         = useState(false);
  const inputRef = useRef(null);

  // Load requests on mount
  useEffect(() => {
    listRequests({ limit: 20 }).then((d) => setRequests(d.data || []));
  }, []);

  const loadBoxes = useCallback(async (reqId) => {
    const data = await listBoxes(reqId);
    setBoxes(data);
    // Auto-select the open box
    const open = data.find((b) => b.status === 'open');
    if (open) selectBox(open.id, data);
  }, []); // eslint-disable-line

  const selectBox = useCallback(async (boxId, currentBoxes) => {
    const detail = await getBoxDetail(boxId);
    setActiveBox(detail);
    setBoxItems(detail.items || []);
  }, []);

  const loadProgress = useCallback(async (reqId) => {
    const items = await getMySkuList(reqId);
    setProgress({
      total:  items.length,
      packed: items.filter((i) => i.is_packed).length,
    });
  }, []);

  const selectRequest = async (req) => {
    setSelectedReq(req);
    setActiveBox(null);
    setBoxItems([]);
    await Promise.all([loadBoxes(req.id), loadProgress(req.id)]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Real-time socket update
  useSocket(selectedReq?.id, {
    onScan: async ({ boxId, boxNo, skuCode, skuName, boxCount, boxStatus }) => {
      // Update box list + active box items
      await loadBoxes(selectedReq.id);
      await loadProgress(selectedReq.id);
      if (activeBox?.id === boxId || boxStatus === 'open') {
        const detail = await getBoxDetail(boxId);
        setActiveBox(detail);
        setBoxItems(detail.items || []);
      }
    },
  });

  const handleScan = async (barcodeVal) => {
    const code = barcodeVal.trim();
    if (!code || !selectedReq) return;
    setScanning(true);
    try {
      const res = await scanSku(selectedReq.id, code);
      if (res.success) {
        toast.ok(`✔ ${res.skuCode} → ${res.boxNo} (${res.boxCount}/${20})`);
        setBarcode('');
        // Refresh box detail
        await loadBoxes(selectedReq.id);
        await loadProgress(selectedReq.id);
        if (res.boxFull) toast.info(`ลัง ${res.boxNo} เต็มแล้ว — เปิดลังใหม่อัตโนมัติ`);
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

  const handleSubmit = async () => {
    if (!selectedReq) return;
    if (!window.confirm('ยืนยันส่งลังทั้งหมดไปยังแผนกรับสินค้า?')) return;
    try {
      await submitPacking(selectedReq.id);
      toast.ok('ส่งลังเรียบร้อยแล้ว');
      await loadBoxes(selectedReq.id);
    } catch (e) {
      toast.error(e?.error || 'เกิดข้อผิดพลาด');
    }
  };

  const pct = progress.total > 0 ? Math.round(progress.packed / progress.total * 100) : 0;

  return (
    <>
      {/* Request Selector */}
      <div className="form-group">
        <label>เลือก Request</label>
        <select className="form-control" onChange={(e) => {
          const req = requests.find((r) => r.id === e.target.value);
          if (req) selectRequest(req);
        }} value={selectedReq?.id || ''}>
          <option value="">— เลือก Request —</option>
          {requests.map((r) => (
            <option key={r.id} value={r.id}>{r.doc_no} ({r.status})</option>
          ))}
        </select>
      </div>

      {selectedReq && (
        <>
          {/* Progress */}
          <div className="metrics">
            <div className="metric">
              <div className="val">{progress.total}</div>
              <div className="label">SKU ของฉัน</div>
            </div>
            <div className="metric">
              <div className="val" style={{ color: 'var(--sap-green)' }}>{progress.packed}</div>
              <div className="label">สแกนแล้ว</div>
            </div>
            <div className="metric">
              <div className="val" style={{ color: 'var(--sap-orange)' }}>{progress.total - progress.packed}</div>
              <div className="label">คงเหลือ</div>
            </div>
            <div className="metric">
              <div className="val">{boxes.length}</div>
              <div className="label">ลังทั้งหมด</div>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--sap-muted)', marginTop: 3 }}>{pct}% เสร็จแล้ว</div>
          </div>

          {/* Scan Area */}
          <div className="scan-area">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              สแกน SKU → {activeBox ? `ลัง ${activeBox.box_no} (${boxItems.length}/20)` : 'รอเลือกลัง'}
            </div>
            <div className="scan-input-row">
              <input
                ref={inputRef}
                className="form-control"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan(barcode)}
                placeholder="สแกน Barcode หรือพิมพ์ SKU แล้วกด Enter"
                disabled={scanning}
              />
              <button className="btn btn-primary" onClick={() => handleScan(barcode)} disabled={scanning || !barcode}>
                {scanning ? '…' : 'สแกน'}
              </button>
            </div>
          </div>

          {/* Box Grid */}
          <div className="card">
            <div className="card-header">
              ลังทั้งหมด
              <button className="btn btn-success" onClick={handleSubmit}>ส่งลังทั้งหมด</button>
            </div>
            <div className="card-body">
              <div className="box-grid">
                {boxes.map((box) => (
                  <div
                    key={box.id}
                    className={`box-card ${activeBox?.id === box.id ? 'active' : ''} ${box.status === 'full' || box.status === 'label_printed' || box.status === 'submitted' ? 'full' : ''}`}
                    onClick={() => selectBox(box.id, boxes)}
                  >
                    <div className="box-no">{box.box_no}</div>
                    <div className="box-info">{box.sku_count}/20 SKU</div>
                    <div className="box-info">
                      <span className={`badge ${box.status === 'open' ? 'badge-open' : box.status === 'submitted' ? 'badge-done' : 'badge-full'}`} style={{ fontSize: 10, padding: '1px 5px' }}>
                        {box.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Box Items */}
          {activeBox && (
            <div className="card">
              <div className="card-header">
                {activeBox.box_no} — รายการ SKU
                <a
                  href={getLabelUrl(activeBox.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn"
                  style={{ fontSize: 11, padding: '3px 10px' }}
                >
                  🖨 Label PDF
                </a>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="erp-table">
                  <thead>
                    <tr><th>#</th><th>SKU</th><th>ชื่อ</th><th style={{ textAlign: 'right' }}>ชิ้น</th></tr>
                  </thead>
                  <tbody>
                    {boxItems.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--sap-muted)', padding: 16 }}>ยังไม่มี SKU ในลังนี้</td></tr>
                    ) : boxItems.map((item, i) => (
                      <tr key={item.id}>
                        <td style={{ color: 'var(--sap-muted)' }}>{i + 1}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{item.sku_code}</td>
                        <td>{item.sku_name}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.quantity_packed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
