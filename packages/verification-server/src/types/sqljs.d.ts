declare module 'sql.js' {
  export interface Statement {
    bind(values: (string | number | null | Uint8Array)[]): boolean
    step(): boolean
    getAsObject(): Record<string, unknown>
    free(): void
  }

  export class Database {
    constructor(data?: Uint8Array)
    run(sql: string, params?: unknown[]): Database
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
  }

  interface SqlJsStatic {
    Database: typeof Database
  }

  export default function initSqlJs(): Promise<SqlJsStatic>
}
