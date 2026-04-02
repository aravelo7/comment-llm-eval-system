import fs from 'node:fs/promises';
import path from 'node:path';

import { serverConfig } from '../config.js';

function createEmptyState() {
  return {
    connections: [],
    pendingStates: [],
  };
}

export class WeiboOAuthStore {
  constructor(filePath = serverConfig.weiboOauthFilePath) {
    this.filePath = filePath;
    this.state = createEmptyState();
  }

  async initialize() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      this.state = {
        ...createEmptyState(),
        ...(parsed && typeof parsed === 'object' ? parsed : {}),
      };
    } catch {
      this.state = createEmptyState();
      await this.persist();
    }
  }

  async persist() {
    await fs.writeFile(this.filePath, JSON.stringify(this.state, null, 2), 'utf8');
  }

  async savePendingState(record) {
    this.state.pendingStates = [
      record,
      ...this.state.pendingStates.filter((item) => item.state !== record.state),
    ];
    await this.persist();
    return record;
  }

  getPendingState(state) {
    return this.state.pendingStates.find((item) => item.state === state) || null;
  }

  async consumePendingState(state) {
    const record = this.getPendingState(state);
    this.state.pendingStates = this.state.pendingStates.filter((item) => item.state !== state);
    await this.persist();
    return record;
  }

  async saveConnection(record) {
    this.state.connections = [
      record,
      ...this.state.connections.filter(
        (item) => !(item.userId === record.userId && item.provider === record.provider),
      ),
    ];
    await this.persist();
    return record;
  }

  getConnectionByUser(userId, provider = 'weibo') {
    return (
      this.state.connections.find(
        (item) => item.userId === userId && item.provider === provider,
      ) || null
    );
  }

  async deleteConnectionByUser(userId, provider = 'weibo') {
    const existing = this.getConnectionByUser(userId, provider);
    if (!existing) {
      return null;
    }

    this.state.connections = this.state.connections.filter(
      (item) => !(item.userId === userId && item.provider === provider),
    );
    await this.persist();
    return existing;
  }
}
