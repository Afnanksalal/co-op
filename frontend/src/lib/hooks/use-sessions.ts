'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useSessionStore } from '@/lib/store';
import type { Session, Message, CreateSessionRequest, CreateMessageRequest } from '@/lib/api/types';

export function useSessions() {
  const { sessions, currentSession, setSessions, setCurrentSession, addSession, updateSession } = useSessionStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getSessions();
      setSessions(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch sessions';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [setSessions]);

  const createSession = useCallback(async (data: CreateSessionRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const session = await api.createSession(data);
      addSession(session);
      setCurrentSession(session);
      return session;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create session';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [addSession, setCurrentSession]);

  const getSession = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const session = await api.getSession(id);
      setCurrentSession(session);
      return session;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch session';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentSession]);

  const endSession = useCallback(async (id: string) => {
    setError(null);
    try {
      await api.endSession(id);
      updateSession(id, { status: 'ended' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to end session';
      setError(message);
      throw err;
    }
  }, [updateSession]);

  return {
    sessions,
    currentSession,
    isLoading,
    error,
    fetchSessions,
    createSession,
    getSession,
    endSession,
    setCurrentSession,
  };
}

export function useSessionMessages(sessionId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async (limit?: number) => {
    if (!sessionId) return [];
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getSessionMessages(sessionId, limit);
      setMessages(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch messages';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const addMessage = useCallback(async (data: CreateMessageRequest) => {
    if (!sessionId) throw new Error('No session selected');
    
    setError(null);
    try {
      const message = await api.addSessionMessage(sessionId, data);
      setMessages((prev) => [...prev, message]);
      return message;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add message';
      setError(message);
      throw err;
    }
  }, [sessionId]);

  const getHistory = useCallback(async () => {
    if (!sessionId) return null;
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getSessionHistory(sessionId);
      setMessages(data.messages);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch history';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  return {
    messages,
    isLoading,
    error,
    fetchMessages,
    addMessage,
    getHistory,
    setMessages,
  };
}
