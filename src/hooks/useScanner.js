import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

/**
 * useScanner({ onResult, enabled })
 * Returns { videoRef, isScanning, error, startScan, stopScan }
 */
export const useScanner = ({ onResult, enabled = true }) => {
  const videoRef    = useRef(null);
  const readerRef   = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError]           = useState(null);

  const stopScan = useCallback(() => {
    readerRef.current?.reset();
    setIsScanning(false);
  }, []);

  const startScan = useCallback(async () => {
    if (!videoRef.current) return;
    setError(null);
    try {
      readerRef.current = new BrowserMultiFormatReader();
      setIsScanning(true);
      await readerRef.current.decodeFromVideoDevice(
        null,
        videoRef.current,
        (result, err) => {
          if (result) {
            onResult(result.getText());
          }
          if (err && !(err instanceof NotFoundException)) {
            console.warn('[Scanner]', err.message);
          }
        }
      );
    } catch (e) {
      setError('ไม่สามารถเปิดกล้องได้ — กรุณาอนุญาตการใช้กล้อง');
      setIsScanning(false);
    }
  }, [onResult]);

  useEffect(() => {
    if (enabled) startScan();
    return () => stopScan();
  }, [enabled, startScan, stopScan]);

  return { videoRef, isScanning, error, startScan, stopScan };
};
