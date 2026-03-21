import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3000';

let _socket = null;

const getSocket = () => {
  if (!_socket || _socket.disconnected) {
    _socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem('wms_token') },
      transports: ['websocket'],
    });
  }
  return _socket;
};

/**
 * useSocket(requestId, handlers)
 * handlers: { onScan, onBoxFull, onInboundReceived }
 */
export const useSocket = (requestId, handlers = {}) => {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!requestId) return;
    const socket = getSocket();

    socket.emit('join:request', { requestId });

    const onScan = (data) => handlersRef.current.onScan?.(data);
    const onInbound = (data) => handlersRef.current.onInboundReceived?.(data);

    socket.on('packing:scan', onScan);
    socket.on('inbound:received', onInbound);

    return () => {
      socket.off('packing:scan', onScan);
      socket.off('inbound:received', onInbound);
      socket.emit('leave:request', { requestId });
    };
  }, [requestId]);
};
