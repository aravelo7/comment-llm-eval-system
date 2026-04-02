import fs from 'node:fs/promises';
import path from 'node:path';

import { serverConfig } from '../config.js';

function createEmptyState() {
  return {
    legacyImportedItems: [],
    consentRecords: [],
    importJobs: [],
    conversations: [],
    messages: [],
    reviewResults: [],
    auditRecords: [],
  };
}

export class ImportStore {
  constructor(filePath = serverConfig.importDataFilePath) {
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

  async saveBatch(batchItems) {
    this.state.legacyImportedItems = [...batchItems, ...this.state.legacyImportedItems];
    await this.persist();
    return batchItems;
  }

  listItems() {
    return this.state.legacyImportedItems;
  }

  async createConsent(record) {
    this.state.consentRecords.unshift(record);
    await this.persist();
    return record;
  }

  findConsentById(id) {
    return this.state.consentRecords.find((item) => item.id === id) || null;
  }

  async createJob(record) {
    this.state.importJobs.unshift(record);
    await this.persist();
    return record;
  }

  async updateJob(jobId, updater) {
    const index = this.state.importJobs.findIndex((item) => item.id === jobId);
    if (index < 0) {
      return null;
    }

    const current = this.state.importJobs[index];
    const next =
      typeof updater === 'function'
        ? {
            ...current,
            ...updater(current),
          }
        : {
            ...current,
            ...updater,
          };

    this.state.importJobs[index] = next;
    await this.persist();
    return next;
  }

  listJobsByUser(userId) {
    return this.state.importJobs.filter((item) => item.userId === userId);
  }

  getJobById(id) {
    return this.state.importJobs.find((item) => item.id === id) || null;
  }

  async replaceMessagesForJob(jobId, messages, conversations) {
    this.state.messages = this.state.messages.filter((item) => item.importJobId !== jobId);
    this.state.conversations = this.state.conversations.filter((item) => item.importJobId !== jobId);
    this.state.messages.unshift(...messages);
    this.state.conversations.unshift(...conversations);
    await this.persist();
  }

  listMessagesByUser(userId) {
    return this.state.messages.filter((item) => item.userId === userId);
  }

  listMessagesByJob(jobId, userId) {
    return this.state.messages.filter(
      (item) => item.importJobId === jobId && (!userId || item.userId === userId),
    );
  }

  listConversationsByJob(jobId, userId) {
    return this.state.conversations.filter(
      (item) => item.importJobId === jobId && (!userId || item.userId === userId),
    );
  }

  async replaceReviewResultsForJob(jobId, reviewResults) {
    this.state.reviewResults = this.state.reviewResults.filter((item) => item.jobId !== jobId);
    this.state.reviewResults.unshift(...reviewResults);
    await this.persist();
  }

  listReviewResultsByJob(jobId, userId) {
    return this.state.reviewResults.filter(
      (item) => item.jobId === jobId && (!userId || item.userId === userId),
    );
  }

  async appendAuditRecord(record) {
    this.state.auditRecords.unshift(record);
    await this.persist();
    return record;
  }

  listAuditRecordsByJob(jobId, userId) {
    return this.state.auditRecords.filter(
      (item) => item.jobId === jobId && (!userId || item.userId === userId),
    );
  }

  async deleteJob(jobId, userId) {
    const job = this.getJobById(jobId);
    if (!job || job.userId !== userId) {
      return null;
    }

    this.state.importJobs = this.state.importJobs.filter((item) => item.id !== jobId);
    this.state.conversations = this.state.conversations.filter((item) => item.importJobId !== jobId);
    this.state.messages = this.state.messages.filter((item) => item.importJobId !== jobId);
    this.state.reviewResults = this.state.reviewResults.filter((item) => item.jobId !== jobId);
    this.state.auditRecords = this.state.auditRecords.filter((item) => item.jobId !== jobId);
    await this.persist();
    return job;
  }
}
