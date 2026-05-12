import { useEffect, useRef, useState, useCallback } from 'react';

export function useWebSocket() {
  const [state, setState] = useState(null);
  const [tick, setTick] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current) return;

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    // In Vite dev, /ws is proxied. In prod, served from same origin.
    const url = `${proto}://${window.location.host}/ws`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'state') {
          setState(msg.state);
        } else if (msg.type === 'tick') {
          setTick(msg);
        }
      } catch {}
    };

    ws.onclose = () => {
      setWsConnected(false);
      wsRef.current = null;
      if (!reconnectTimerRef.current) {
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          connect();
        }, 1500);
      }
    };

    ws.onerror = () => {
      try { ws.close(); } catch {}
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const send = useCallback((msg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  return { state, tick, wsConnected, send };
}
