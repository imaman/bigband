export function failMe<R>(hint?: string): NonNullable<R> {
  if (!hint) {
    throw new Error(`This expression must never be evaluated`)
  }

  throw new Error(`Bad value: ${hint}`)
}
