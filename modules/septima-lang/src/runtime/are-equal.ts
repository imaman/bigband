import { stringify } from 'safe-stable-stringify'

export function areEqual(lhs: unknown, rhs: unknown) {
  return lhs === rhs || stringify(lhs) === stringify(rhs)
}
