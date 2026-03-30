import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

import { serverConfig } from '../config.js';
import { hashPassword } from './password.js';

const seededUsers = [
  {
    id: 'u_admin_001',
    email: 'admin@example.com',
    nickname: '平台管理员',
    role: 'admin',
    plan: 'vip',
    status: 'active',
    password: 'Admin#2026Demo',
  },
  {
    id: 'u_reviewer_001',
    email: 'reviewer@example.com',
    nickname: '审核员小李',
    role: 'reviewer',
    plan: 'free',
    status: 'active',
    password: 'Reviewer#2026Demo',
  },
];

function nowIso() {
  return new Date().toISOString();
}

function toPublicUser(record) {
  const { passwordHash: _passwordHash, ...user } = record;
  return user;
}

export class UserStore {
  constructor(filePath = serverConfig.usersFilePath) {
    this.filePath = filePath;
    this.users = [];
  }

  async initialize() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        this.users = parsed;
        return;
      }
    } catch {
      // first boot falls through to seed
    }

    const createdAt = nowIso();
    this.users = await Promise.all(
      seededUsers.map(async (user) => ({
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        plan: user.plan,
        status: user.status,
        createdAt,
        updatedAt: createdAt,
        passwordHash: await hashPassword(user.password),
      })),
    );
    await this.persist();
  }

  async persist() {
    await fs.writeFile(this.filePath, JSON.stringify(this.users, null, 2), 'utf8');
  }

  listPublicUsers() {
    return this.users.map(toPublicUser);
  }

  findByEmail(email) {
    return this.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) || null;
  }

  findById(id) {
    return this.users.find((user) => user.id === id) || null;
  }

  async create({ email, nickname, passwordHash }) {
    const createdAt = nowIso();
    const record = {
      id: `u_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
      email: email.toLowerCase(),
      nickname,
      role: 'reviewer',
      plan: 'free',
      status: 'active',
      createdAt,
      updatedAt: createdAt,
      passwordHash,
    };

    this.users.push(record);
    await this.persist();
    return toPublicUser(record);
  }

  toPublicUser(record) {
    return toPublicUser(record);
  }
}
