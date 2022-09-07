export function extractMessage(e: unknown): string | unknown {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const typed = e as { message?: string }
  return typed.message
}
