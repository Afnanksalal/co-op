// Network connectivity check with caching

import { useState, useCallback, useRef } from 'react';
import { WEB_URL, CONNECTION_TIMEOUT_MS } from '../constants';

export type ConnectionState = 'loading' | 'connected' | 'offline' | 'error';

interface UseConnectionReturn {
  state: ConnectionState;
  errorMessage: string;
  checkConnection: () => Promise<void>;
}

// Cache connection result for 5 seconds to avoid repeated checks
const CONNECTION_CACHE_MS = 5000;

export function useConnection(): UseConnectionReturn {
  const [state, setState] = useState<ConnectionState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const lastCheckRef = useRef<number>(0);
  const lastResultRef = useRef<ConnectionState>('loading');

  const checkConnection = useCallback(async () => {
    const now = Date.now();
    
    // Return cached result if recent
    if (now - lastCheckRef.current < CONNECTION_CACHE_MS && lastResultRef.current === 'connected') {
      setState('connected');
      return;
    }

    setState('loading');
    setErrorMessage('');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT_MS);

    try {
      const response = await fetch(WEB_URL, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
        // Reduce overhead
        headers: {
          'Accept': '*/*',
        },
      });

      clearTimeout(timeout);
      lastCheckRef.current = Date.now();

      if (response.ok) {
        lastResultRef.current = 'connected';
        setState('connected');
      } else {
        lastResultRef.current = 'error';
        setErrorMessage(`Server returned ${response.status}`);
        setState('error');
      }
    } catch (error) {
      clearTimeout(timeout);
      lastCheckRef.current = Date.now();
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastResultRef.current = 'error';
          setErrorMessage('Connection timed out');
          setState('error');
        } else {
          lastResultRef.current = 'offline';
          setState('offline');
        }
      } else {
        lastResultRef.current = 'offline';
        setState('offline');
      }
    }
  }, []);

  return { state, errorMessage, checkConnection };
}
