import { randomUUID } from 'node:crypto';

export class SessionStore {
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
    this.sessions = new Map();
  }

  create(userId, remember = false) {
    const sessionId = randomUUID();
    const expiresAt = Date.now() + (remember ? this.ttlMs * 3 : this.ttlMs);

    this.sessions.set(sessionId, {
      id: sessionId,
      userId,
      expiresAt,
      createdAt: Date.now(),
    });

    return {
      id: sessionId,
      expiresAt,
    };
  }

  get(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    if (Date.now() >= session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  delete(sessionId) {
    if (!sessionId) {
      return;
    }
    this.sessions.delete(sessionId);
  }
}
