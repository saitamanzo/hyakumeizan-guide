declare module 'hot-shots' {
  export class StatsD {
    constructor(opts?: { host?: string, port?: number })
    increment(stat: string, value?: number): void
    close?(): void
  }
  export default StatsD
}
