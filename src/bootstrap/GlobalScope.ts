// GlobalScope is kept for backwards compatibility but the dual-scope system
// has been removed. All commands run in the single Default scope.
export enum Scope {
  Default = 0,
  Admin = 1, // legacy, unused
}
export const scope = Scope.Default
export function setScope(_: Scope) {}
export function fromString(_: string): Scope { return Scope.Default }
export function toString(_: Scope): string { return 'Default' }
