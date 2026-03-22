import React, { useState, useEffect, useCallback, useRef } from 'react';
import { listRequests, getMySkuList, scanSku, listBoxes,
         getBoxDetail, submitPacking, getLabelUrl } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { useToast } from '../components/common/Toast';

const statusBadge = (status) => {
  const map = { open:'status-open', full:'status-done', label_printed:'status-done', submitted:'status-partial', received:'status-partial' };
  const label = { open:'กำลังแพ็ค', full:'เต็ม', label_printed:'พิมพ์แล้ว', submitted:'ส่งแล้ว', received:'รับแล้ว' };
  return <span className={`status-badge ${map[status]||'status-open'}`}>{label[status]||status}</span>;
};

export default function PackingPage() {
  const toast = useToast();
  const inputRef = useRef(null);

  const [requests, setRequests]       = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [activeTab, setActiveTab]     = useState(0);
  const [boxes, setBoxes]             = useState([]);
  const [activeBox, setActiveBox]     = useState(null);
  const [boxItems, setBoxItems]       = useState([]);
  const [skuList, setSkuList]         = useState([]);
  const [progress, setProgress]       = useState({ packed: 0, total: 0 });
  const [barcode, setBarcode]         = useState('');
  const [scanning, setScanning]       = useState(false);

  useEffect(() => {
    listRequests({ limit: 20 }).then(d => setRequests(d.data || []));
  }, []);

  const loadBoxes = useCallback(async (reqId) => {
    const data = await listBoxes(reqId);
    setBoxes(data);
    const open = data.find(b => b.status === 'open');
    if (open) {
      const detail = await getBoxDetail(open.id);
      setActiveBox(detail);
      setBoxItems(detail.items || []);
    }
  }, []);

  const loadProgress = useCallback(async (reqId) => {
    const items = await getMySkuList(reqId);
    setSkuList(items);
    setProgress({ total: items.length, packed: items.filter(i => i.is_packed).length });
  }, []);

  const selectBox = useCallback(async (boxId) => {
    const detail = await getBoxDetail(boxId);
    setActiveBox(detail);
    setBoxItems(detail.items || []);
  }, []);

  const selectRequest = async (req) => {
    setSelectedReq(req);
    setActiveBox(null);
    setBoxItems([]);
    setActiveTab(0);
    await Promise.all([loadBoxes(req.id), loadProgress(req.id)]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useSocket(selectedReq?.id, {
    onScan: async () => {
      if (!selectedReq) return;
      await Promise.all([loadBoxes(selectedReq.id), loadProgress(selectedReq.id)]);
    },
  });

  const handleScan = async (code) => {
    const val = (code || barcode).trim();
    if (!val || !selectedReq) return;
    setScanning(true);
    try {
      const res = await scanSku(selectedReq.id, val);
      if (res.success) {
        toast.ok(`✔ ${res.skuCode} → ${res.boxNo} (${res.boxCount}/20)`);
        setBarcode('');
        await Promise.all([loadBoxes(selectedReq.id), loadProgress(selectedReq.id)]);
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
  const fullBoxes = boxes.filter(b => ['full','label_printed','submitted'].includes(b.status)).length;

  return (
    <>
      {/* Toolbar */}
      <div style={{ background:'white', borderBottom:'1px solid #D0D5DB', padding:'6px 0', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:12 }}>
        {selectedReq && <span className="doc-badge">{selectedReq.doc_no}</span>}
        <div className="toolbar-sep" />
        <div className="form-group" style={{ flexDirection:'row', alignItems:'center', gap:6, minWidth:0 }}>
          <label style={{ whiteSpace:'nowrap', color:'#627487', fontSize:11 }}>Request:</label>
          <select className="form-control" style={{ width:220 }}
            onChange={e => { const r = requests.find(x => x.id === e.target.value); if(r) selectRequest(r); }}
            value={selectedReq?.id || ''}
          >
            <option value="">— เลือก Request —</option>
            {requests.map(r => <option key={r.id} value={r.id}>{r.doc_no}</option>)}
          </select>
        </div>
        <div className="toolbar-sep" />
        <button className="toolbar-btn" onClick={() => activeBox && window.open(getLabelUrl(activeBox.id), '_blank')}>
          🖨 Print Barcode Label
        </button>
        <button className="toolbar-btn">📤 Export Box Manifest</button>
        <div className="toolbar-sep" />
        <button className="toolbar-btn primary" onClick={handleSubmit} disabled={!selectedReq}>
          ✔ Submit &amp; Send to Receiving
        </button>
        {selectedReq && (
          <div style={{ marginLeft:'auto', fontSize:11, color:'#627487' }}>
            สถานะ: {statusBadge(progress.packed === progress.total && progress.total > 0 ? 'full' : 'open')}
          </div>
        )}
      </div>

      {selectedReq && (
        <>
          {/* Metrics */}
          <div className="metrics-row">
            <div className="metric-card"><div className="metric-val">{progress.total}</div><div className="metric-label">SKU ทั้งหมด (Request)</div></div>
            <div className="metric-card"><div className="metric-val" style={{color:'#E76500'}}>{progress.total}</div><div className="metric-label">SKU ของคุณ</div></div>
            <div className="metric-card"><div className="metric-val" style={{color:'#188918'}}>{progress.packed}</div><div className="metric-label">สแกนแล้ว</div></div>
            <div className="metric-card"><div className="metric-val" style={{color:'#B00020'}}>{progress.total - progress.packed}</div><div className="metric-label">คงเหลือ</div></div>
            <div className="metric-card"><div className="metric-val">{boxes.length}</div><div className="metric-label">ลังที่ใช้ (max 20 SKU/ลัง)</div></div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <div className={`tab ${activeTab===0?'active':''}`} onClick={() => setActiveTab(0)}>📦 ลังสินค้า (Packing Boxes)</div>
            <div className={`tab ${activeTab===1?'active':''}`} onClick={() => setActiveTab(1)}>📋 SKU ทั้งหมดของฉัน</div>
          </div>

          {activeTab === 0 && (
            <div style={{ display:'flex', gap:12 }}>
              {/* Left: Scan + Table */}
              <div style={{ flex:1, minWidth:0 }}>
                <div className="scan-box">
                  <div style={{ fontSize:13, fontWeight:600, color:'#1D2733', marginBottom:4 }}>สแกนสินค้าเข้าลัง</div>
                  <div style={{ fontSize:11, color:'#627487' }}>
                    ลังที่กำลังแพ็ค: <strong style={{color:'#0070F2'}}>{activeBox?.box_no || '—'}</strong>
                    {activeBox && ` (${boxItems.length}/20 SKU)`}
                  </div>
                  <div className="scan-input">
                    <input
                      ref={inputRef}
                      value={barcode}
                      onChange={e => setBarcode(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleScan()}
                      placeholder="สแกน Barcode หรือพิมพ์ SKU แล้วกด Enter"
                      disabled={scanning}
                    />
                    <button onClick={() => handleScan()} disabled={scanning || !barcode}>
                      {scanning ? '…' : 'สแกน ↵'}
                    </button>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <span>{activeBox ? `${activeBox.box_no} — รายการ SKU ในลัง` : 'เลือกลังด้านขวา'}</span>
                    <span className="status-badge status-partial">{boxItems.length} / 20 SKU</span>
                  </div>
                  <div className="card-body" style={{ padding:0 }}>
                    <table className="erp-table">
                      <thead>
                        <tr><th>#</th><th>SKU Code</th><th>ชื่อสินค้า</th><th style={{textAlign:'center'}}>จำนวน (ชิ้น)</th><th>เวลาสแกน</th></tr>
                      </thead>
                      <tbody>
                        {boxItems.length === 0 ? (
                          <tr><td colSpan={5} style={{textAlign:'center',padding:20,color:'#627487'}}>ยังไม่มี SKU ในลังนี้</td></tr>
                        ) : boxItems.map((item, i) => (
                          <tr key={item.id}>
                            <td style={{color:'#627487'}}>{i+1}</td>
                            <td><code style={{fontSize:11}}>{item.sku_code}</code></td>
                            <td>{item.sku_name}</td>
                            <td style={{textAlign:'center'}}>{item.quantity_packed}</td>
                            <td style={{fontSize:11,color:'#627487'}}>{new Date(item.scanned_at).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right: Box Grid + POS */}
              <div style={{ width:210, minWidth:210, flexShrink:0 }}>
                <div className="card">
                  <div className="card-header">ลังทั้งหมด ({boxes.length} ลัง)</div>
                  <div className="card-body" style={{ padding:8 }}>
                    <div className="box-grid" style={{ gridTemplateColumns:'1fr 1fr' }}>
                      {boxes.map(box => (
                        <div
                          key={box.id}
                          className={`box-item ${activeBox?.id===box.id?'active-box':''} ${['full','label_printed'].includes(box.status)?'full':''} ${box.status==='submitted'?'submitted':''}`}
                          onClick={() => selectBox(box.id)}
                        >
                          <div className="box-num">{box.box_no}</div>
                          <div className="box-info" style={{color: box.status==='full'||box.status==='label_printed'?'#188918':'#627487'}}>
                            {box.status==='full'||box.status==='label_printed' ? `✔ เต็ม ${box.sku_count}/20` : `${box.sku_count}/20 SKU`}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop:10 }}>
                      <div style={{ fontSize:11, color:'#627487', marginBottom:4 }}>ความคืบหน้ารวม</div>
                      <div className="progress-bar"><div className="progress-fill" style={{ width:`${pct}%` }} /></div>
                      <div style={{ fontSize:11, color:'#627487', marginTop:3 }}>{progress.packed} / {progress.total} SKU ({pct}%)</div>
                    </div>

                    <div style={{ marginTop:10, paddingTop:8, borderTop:'1px solid #D0D5DB', display:'flex', flexDirection:'column', gap:4 }}>
                      <button className="toolbar-btn" style={{ justifyContent:'center', width:'100%' }}>+ เพิ่มลังใหม่</button>
                      <button
                        className="toolbar-btn"
                        style={{ justifyContent:'center', width:'100%', color:'#188918', borderColor:'#188918' }}
                        onClick={() => activeBox && window.open(getLabelUrl(activeBox.id), '_blank')}
                      >
                        🖨 พิมพ์ Barcode ลัง
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">เอกสาร POS</div>
                  <div className="card-body">
                    <div className="form-group" style={{ marginBottom:8 }}>
                      <label>เลขที่เอกสาร</label>
                      <input className="form-control" placeholder="GR-2026-XXXXXXXX" />
                    </div>
                    <div className="form-group">
                      <label>วันที่รับเข้า</label>
                      <input className="form-control" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 1 && (
            <div className="card">
              <div className="card-header">
                <span>SKU ทั้งหมดของฉัน</span>
                <span className="status-badge status-partial">{progress.packed}/{progress.total} สแกนแล้ว</span>
              </div>
              <div className="card-body" style={{ padding:0 }}>
                <table className="erp-table">
                  <thead>
                    <tr><th>#</th><th>SKU Code</th><th>ชื่อสินค้า</th><th>จำนวน</th><th>ลัง</th><th>สถานะ</th></tr>
                  </thead>
                  <tbody>
                    {skuList.map((item, i) => (
                      <tr key={item.id} style={{ background: item.is_packed ? '#F1FAF1' : '' }}>
                        <td style={{color:'#627487'}}>{i+1}</td>
                        <td><code style={{fontSize:11}}>{item.sku_code}</code></td>
                        <td>{item.sku_name}</td>
                        <td>{item.quantity}</td>
                        <td style={{fontSize:11,color:'#0070F2'}}>{item.box_no || '—'}</td>
                        <td>{item.is_packed ? <span className="status-badge status-done">✔ สแกนแล้ว</span> : <span className="status-badge status-open">รอสแกน</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!selectedReq && (
        <div style={{ textAlign:'center', padding:60, color:'#627487' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>📦</div>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>เลือก Request เพื่อเริ่มแพ็คสินค้า</div>
          <div style={{ fontSize:12 }}>เลือกจาก dropdown ด้านบน</div>
        </div>
      )}
    </>
  );
}
