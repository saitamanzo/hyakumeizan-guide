declare module 'redlock' {
  class Redlock {
    constructor(clients: unknown[], opts?: { retryCount?: number, retryDelay?: number })
    lock(resource: string, ttl: number): Promise<{ unlock(): Promise<void> }>
    unlock(lock: { unlock(): Promise<void> }): Promise<void>
  }
  export default Redlock
}
