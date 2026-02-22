export function failMe(message: string): never {
  throw new Error(message)
}
