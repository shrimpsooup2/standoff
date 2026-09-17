// Keeping the night on disk.
//
// The host is somebody's laptop on somebody's wifi. It will be closed, slept,
// unplugged, updated and carried into another room, and the game should not
// care. Every change is written to a file, atomically, and picked up again on
// the next boot.
//
// If the disk is read-only, full, unhelpful or simply not answering, the game
// carries on in memory and says so once. Losing the ability to save is not a
// reason to stop playing, and a write that never returns must not be able to
// wedge the ones behind it.

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const DEFAULT_DIR = process.env.STANDOFF_DATA
  ?? path.join(process.cwd(), '.standoff');

/** A filesystem call that never comes back is a real thing. Do not wait forever. */
const WRITE_TIMEOUT_MS = 4000;

function withDeadline(promise, ms, what) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error(`${what} did not answer`), { code: 'ETIMEDOUT' })), ms);
      timer.unref?.();
    }),
  ]).finally(() => clearTimeout(timer));
}

export class Store {
  constructor({ dir = DEFAULT_DIR, file = 'tables.json' } = {}) {
    this.dir = dir;
    this.path = path.join(dir, file);
    this.queue = Promise.resolve();
    this.pending = null;
    this.timer = null;
    this.warned = false;
    this.writable = true;
  }

  /** Load whatever survived the last shutdown. Never throws. */
  loadSync() {
    try {
      const raw = fs.readFileSync(this.path, 'utf8');
      if (raw.length > 64 * 1024 * 1024) throw new Error('save file is implausibly large');
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return null;
      return data;
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.warn(`[standoff] could not read ${this.path} (${err.code ?? err.message}); starting with an empty table`);
        // keep the bad file around rather than silently destroying evidence
        try { fs.renameSync(this.path, `${this.path}.broken`); } catch { /* nothing to do */ }
      }
      return null;
    }
  }

  /** Coalesce rapid changes into one write a beat. */
  save(getData, { immediate = false } = {}) {
    this.pending = getData;
    if (immediate) {
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      return this.flush();
    }
    if (this.timer) return this.queue;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, 250);
    this.timer.unref?.();
    return this.queue;
  }

  flush() {
    const getData = this.pending;
    this.pending = null;
    if (!getData || !this.writable) return this.queue;
    this.queue = this.queue.then(() => this.write(getData)).catch(() => {});
    return this.queue;
  }

  async write(getData) {
    let body;
    try {
      body = JSON.stringify(getData());
    } catch (err) {
      this.warnOnce(`could not serialise the table (${err.message})`);
      return;
    }
    // atomic: write beside the real file, then rename over it, so a power cut
    // never leaves half a game behind
    const tmp = path.join(this.dir, `.tmp-${process.pid}-${Date.now()}`);
    try {
      await withDeadline((async () => {
        await fsp.mkdir(this.dir, { recursive: true });
        await fsp.writeFile(tmp, body, 'utf8');
        await fsp.rename(tmp, this.path);
      })(), WRITE_TIMEOUT_MS, `writing to ${this.dir}`);
    } catch (err) {
      withDeadline(fsp.unlink(tmp), 1000, 'cleanup').catch(() => {});
      this.warnOnce(`cannot write to ${this.dir} (${err.code ?? err.message})`);
      this.writable = false;
    }
  }

  /** Blocking write, for the moment the process is going away. */
  flushSync(getData) {
    if (!this.writable) return;
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      const tmp = path.join(this.dir, `.tmp-exit-${process.pid}`);
      fs.writeFileSync(tmp, JSON.stringify(getData()), 'utf8');
      fs.renameSync(tmp, this.path);
    } catch (err) {
      this.warnOnce(`could not save on the way out (${err.code ?? err.message})`);
    }
  }

  warnOnce(message) {
    if (this.warned) return;
    this.warned = true;
    console.warn(`[standoff] ${message}. The game carries on; it just will not survive a restart.`);
  }
}

/** Somewhere sensible to keep things if the working directory is not writable. */
export function fallbackDir() {
  return path.join(os.tmpdir(), 'standoff');
}
