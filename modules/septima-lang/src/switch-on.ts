export function switchOn<G, K extends string>(selector: K, cases: Record<K, () => G>): G {
  const f = cases[selector]
  return f()
}
