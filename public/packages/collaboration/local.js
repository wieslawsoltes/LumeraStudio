import {applyPatches, clone, validateScene} from '../core/index.js';

function failure(message, status = 400, data = {}) {
  return Object.assign(new Error(message), {status, data: {error: message, ...data}});
}

/** Browser-local storage; transactions keep revision checks and writes atomic across tabs. */
export class IndexedDBProjectStorage {
  constructor({name = 'lumera-local-v1', indexedDB = globalThis.indexedDB} = {}) {
    this.name = name;
    this.indexedDB = indexedDB;
    this.connection = null;
  }
  open() {
    if (this.connection) return this.connection;
    this.connection = new Promise((resolve, reject) => {
      if (!this.indexedDB) return reject(failure('Browser storage is unavailable. Export your scene to keep it.', 503));
      const request = this.indexedDB.open(this.name, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('projects')) request.result.createObjectStore('projects', {keyPath: 'id'});
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(failure('Close other Lumera tabs and retry opening browser storage.', 503));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); this.connection = null; };
        resolve(db);
      };
    }).catch(error => { this.connection = null; throw error; });
    return this.connection;
  }
  async list() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readonly');
      const request = tx.objectStore('projects').getAll();
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = tx.onerror = () => reject(tx.error || request.error || failure('Browser storage read failed.', 503));
    });
  }
  async transact(id, update) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', update ? 'readwrite' : 'readonly');
      const store = tx.objectStore('projects');
      const request = store.get(id);
      let result, error;
      request.onsuccess = () => {
        try {
          const current = request.result;
          if (update) {
            const outcome = update(current);
            result = outcome.result;
            if (outcome.record) store.put(outcome.record);
          } else result = current;
        } catch (cause) { error = cause; tx.abort(); }
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () => reject(error || tx.error || request.error || failure('Browser save failed. Export your scene to keep it.', 503));
    });
  }
  async close() { if (this.connection) (await this.connection).close(); this.connection = null; }
}

/** Transport compatible with ProjectClient.request; it never makes a network request. */
export function createLocalTransport({storage = new IndexedDBProjectStorage(), now = () => Date.now(), uuid = () => crypto.randomUUID()} = {}) {
  const identity = {id: 'local-browser', name: 'Local artist · this browser'};
  const requireProject = record => { if (!record) throw failure('Project not found in this browser.', 404); return record; };
  const snapshot = record => ({id: record.id, name: record.name, scene: clone(record.scene), revision: record.revision, role: 'owner'});
  return async function request(path, method = 'GET', body = {}) {
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    if (parts[0] === 'me' && method === 'GET') return clone(identity);
    if (parts[0] === 'join' || ['invites', 'members'].includes(parts[2])) {
      throw failure('GitHub Pages stores projects only in this browser. Export a scene to share it, or use the server-backed app for collaboration.', 501);
    }
    if (parts[0] !== 'projects') throw failure('Unknown local storage operation.', 404);
    if (parts.length === 1 && method === 'GET') {
      const projects = await storage.list();
      return {projects: projects.sort((a,b) => b.updated_at - a.updated_at).map(({id,name,revision,updated_at}) => ({id,name,revision,updated_at,role:'owner'}))};
    }
    if (parts.length === 1 && method === 'POST') {
      validateScene(body.scene);
      const id = uuid(), time = now();
      const record = {id, name: String(body.scene.name).slice(0,150), scene: clone(body.scene), revision: 1, created_at: time, updated_at: time, versions: []};
      return storage.transact(id, existing => {
        if (existing) throw failure('Project identifier collision; save again.', 409);
        return {record, result: {id,revision:1,role:'owner'}};
      });
    }
    const id = parts[1];
    if (!id) throw failure('Unknown local storage operation.', 404);
    if (parts.length === 2 && method === 'PATCH') {
      if (!Array.isArray(body.patches) || body.patches.length > 500) throw failure('Invalid patch batch.');
      return storage.transact(id, current => {
        const record = requireProject(current);
        if (body.revision !== record.revision) throw failure('Revision conflict.', 409, snapshot(record));
        let scene;
        try { scene = applyPatches(record.scene, body.patches, {check:true}); validateScene(scene); }
        catch (error) { throw failure(error.message, 409, snapshot(record)); }
        const next = {...record,scene,name:String(scene.name).slice(0,150),revision:record.revision+1,updated_at:now()};
        return {record: next, result: {revision:next.revision}};
      });
    }
    if (parts[2] === 'versions' && parts.length === 3 && method === 'POST') {
      return storage.transact(id, current => {
        const record = requireProject(current);
        const version = {id:uuid(),name:String(body.name || 'Checkpoint').slice(0,150),scene:clone(record.scene),author:identity.name,created_at:now()};
        return {record:{...record,versions:[version,...record.versions]},result:{id:version.id}};
      });
    }
    const record = requireProject(await storage.transact(id));
    if (parts.length === 2 && method === 'GET') return snapshot(record);
    if (parts[2] === 'presence' && parts.length === 3 && ['GET','POST'].includes(method)) {
      return {members:[{user_id:identity.id,name:identity.name,role:'owner',last_seen:now(),selection:JSON.stringify(body.selection || null)}]};
    }
    if (parts[2] === 'versions' && method === 'GET') {
      if (parts.length === 3) return {versions:record.versions.slice(0,30).map(({scene,...version}) => clone(version))};
      if (parts.length === 4) {
        const version = record.versions.find(v => v.id === parts[3]);
        if (!version) throw failure('Checkpoint not found.',404);
        return clone(version);
      }
    }
    throw failure('Unknown local storage operation.',404);
  };
}
