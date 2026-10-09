import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync, existsSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { SECTIONS } from './bank.js';
import { scoreExam, reviewStatus, interviewSummary } from './scoring.js';

export const token = () => randomBytes(32).toString('base64url');
export const hash = value => createHash('sha256').update(value).digest('hex');
export function sameSecret(a, b) {
  return timingSafeEqual(Buffer.from(hash(String(a))), Buffer.from(hash(String(b))));
}
export function passwordHash(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, stored) {
  const [salt, expected] = stored.split(':');
  const actual = scryptSync(password, salt, 64);
  return expected.length === 128 && timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}

export function openStore(dataDir, clock = Date.now) {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(join(dataDir, 'talenta.sqlite'));
  chmodSync(join(dataDir, 'talenta.sqlite'), 0o600);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      password TEXT NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
      role TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL, started_at INTEGER, finished_at INTEGER,
      section_index INTEGER NOT NULL DEFAULT 0, section_deadline INTEGER,
      answers TEXT NOT NULL DEFAULT '{}', result TEXT,
      interview TEXT NOT NULL DEFAULT '{}', note TEXT NOT NULL DEFAULT '',
      finish_reason TEXT, consent_at INTEGER, decision TEXT NOT NULL DEFAULT 'belum_diputuskan',
      reviewed_at INTEGER, created_by TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, kind TEXT NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      exam_id TEXT REFERENCES exams(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL,
      exam_id TEXT, at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS exam_status ON exams(status);
    CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires_at);
  `);
  const bootstrapPath = join(dataDir, 'bootstrap-token');
  if (!db.prepare('SELECT id FROM users LIMIT 1').get() && !existsSync(bootstrapPath)) writeFileSync(bootstrapPath, token(), { mode: 0o600, flag: 'wx' });

  function audit(actor, action, examId = null) {
    db.prepare('INSERT INTO audit(actor,action,exam_id,at) VALUES(?,?,?,?)').run(actor, action, examId, clock());
  }
  function setupUser({ email, name, password, setupCode }) {
    if (db.prepare('SELECT id FROM users LIMIT 1').get()) return { error: 'Akun penguji sudah dibuat.', status: 409 };
    if (!existsSync(bootstrapPath) || !sameSecret(setupCode, readFileSync(bootstrapPath, 'utf8').trim())) return { error: 'Kode penyiapan tidak valid.', status: 403 };
    const id = token();
    db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(id, email, name, passwordHash(password), clock());
    unlinkSync(bootstrapPath);
    audit(id, 'admin_created');
    return { id, email, name };
  }
  function getSession(raw, kind) {
    if (!raw) return null;
    return db.prepare('SELECT * FROM sessions WHERE token_hash=? AND kind=? AND expires_at>?').get(hash(raw), kind, clock()) || null;
  }
  function createSession(kind, userId, examId, lifetime) {
    const raw = token();
    db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(clock());
    db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(hash(raw), kind, userId, examId, clock() + lifetime);
    return raw;
  }
  function getExam(id) { return db.prepare('SELECT * FROM exams WHERE id=?').get(id); }
  function completeExam(exam, reason = 'submitted', finishedAt = clock()) {
    const result = scoreExam(JSON.parse(exam.answers), exam.role);
    db.prepare("UPDATE exams SET status='completed',finished_at=?,finish_reason=?,result=? WHERE id=? AND status='active'").run(finishedAt, reason, JSON.stringify(result), exam.id);
    audit(`peserta:${exam.id}`, `exam_${reason}`, exam.id);
    return getExam(exam.id);
  }
  function refreshExam(exam) {
    if (!exam || exam.status !== 'active') return exam;
    let index = exam.section_index;
    let deadline = exam.section_deadline;
    while (clock() >= deadline) {
      index++;
      if (index >= SECTIONS.length) return completeExam(exam, 'timeout', deadline);
      deadline += SECTIONS[index].minutes * 60_000;
    }
    if (index !== exam.section_index) {
      db.prepare('UPDATE exams SET section_index=?,section_deadline=? WHERE id=?').run(index, deadline, exam.id);
      return getExam(exam.id);
    }
    return exam;
  }
  function publicExam(exam) {
    return { id: exam.id, name: exam.name, role: exam.role, status: exam.status, serverTime: clock(), startedAt: exam.started_at, finishedAt: exam.finished_at, sectionIndex: exam.section_index, deadline: exam.section_deadline, ...(exam.status === 'active' ? { answers: JSON.parse(exam.answers) } : {}) };
  }
  function adminExam(exam, detail = false) {
    const result = exam.result ? JSON.parse(exam.result) : null;
    const interview = JSON.parse(exam.interview);
    const status = exam.status === 'pending' && clock() > exam.expires_at ? 'expired' : exam.status;
    return {
      id: exam.id, name: exam.name, email: exam.email, role: exam.role, status,
      createdAt: exam.created_at, expiresAt: exam.expires_at, startedAt: exam.started_at, finishedAt: exam.finished_at,
      sectionIndex: exam.section_index, finishReason: exam.finish_reason,
      answered: Object.values(JSON.parse(exam.answers)).filter(v => v !== '' && v !== null).length,
      total: result?.total ?? null, percent: result?.percent ?? null,
      review: reviewStatus(result, interview), interviewSummary: interviewSummary(interview),
      decision: exam.decision, reviewedAt: exam.reviewed_at,
      ...(detail ? { result, interview, note: exam.note, consentAt: exam.consent_at } : {}),
    };
  }
  return { db, bootstrapPath, clock, audit, setupUser, getSession, createSession, getExam, completeExam, refreshExam, publicExam, adminExam, close: () => db.close() };
}
