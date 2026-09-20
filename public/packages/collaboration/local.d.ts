export class IndexedDBProjectStorage {
  constructor(options?: {name?: string; indexedDB?: IDBFactory});
  open(): Promise<IDBDatabase>;
  list(): Promise<any[]>;
  transact(id: string, update?: (record: any) => {record?: any; result: any}): Promise<any>;
  close(): Promise<void>;
}
export function createLocalTransport(options?: {storage?: Pick<IndexedDBProjectStorage, 'list' | 'transact'>; now?: () => number; uuid?: () => string}): (path: string, method?: string, body?: any) => Promise<any>;
