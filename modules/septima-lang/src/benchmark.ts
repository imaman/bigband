/* eslint-disable no-console */
import { Septima } from './septima'

interface BenchmarkDef {
  name: string
  program: string
}

// Helper preamble: builds an array [1..n] using recursion (max n=250 to stay under the depth limit).
// Then we concatenate mapped copies to build larger arrays without deeper recursion.
const rangeHelper = `let range = fun(n) if (n <= 0) [] else [...range(n - 1), n]`

const r250 = `let r = range(250)`
const arr1000 = `let arr = [...r, ...r.map(x => x + 250), ...r.map(x => x + 500), ...r.map(x => x + 750)]`

const benchmarks: BenchmarkDef[] = [
  {
    // Chains several array transformations on a 1000-element array.
    // Stresses: function-call overhead in map/filter/reduce, array allocation.
    name: 'array_pipeline',
    program: [
      rangeHelper,
      r250,
      arr1000,
      `arr.map(x => x * x).filter(x => x % 3 == 0).map(x => x + 1).reduce((a, b) => a + b, 0)`,
    ].join('; '),
  },
  {
    // Computes fibonacci iteratively via reduce over a 2000-element array.
    // Each step creates a new [a, b] pair.
    // Stresses: array allocation, element access inside a tight reduce.
    name: 'fibonacci_iterative',
    program: [
      rangeHelper,
      r250,
      arr1000,
      `let big = [...arr, ...arr]`,
      `big.reduce(fun(acc, n) [acc[1], acc[0] + acc[1]], [0, 1])[1]`,
    ].join('; '),
  },
  {
    // Builds 1000 strings, joins them, splits them back, transforms with toUpperCase and replace,
    // then joins again. Repeated with different delimiters.
    // Stresses: string allocation, string method dispatch.
    name: 'string_processing',
    program: [
      rangeHelper,
      r250,
      arr1000,
      `let words = arr.map(n => \`item_\${n}_value\`)`,
      `let joined = words.join('::')`,
      `let parts = joined.split('::')`,
      `let upper = parts.map(s => s.toUpperCase())`,
      `let replaced = upper.map(s => s.replace('VALUE', 'DATA'))`,
      `let rejoined = replaced.join('--')`,
      `let parts2 = rejoined.split('--')`,
      `parts2.map(s => s.toLowerCase()).join(',').length`,
    ].join('; '),
  },
  {
    // Sorts a 500-element array in several different orders using custom comparators.
    // Stresses: comparator callback overhead (O(n log n) calls per sort).
    name: 'sorting',
    program: [
      rangeHelper,
      r250,
      `let arr = [...r, ...r.map(x => x + 250)]`,
      `let reversed = arr.sort((a, b) => b - a)`,
      `let scrambled = reversed.sort((a, b) => (a * 7 + 13) % 100 - (b * 7 + 13) % 100)`,
      `let sorted = scrambled.sort((a, b) => a - b)`,
      `sorted[0]`,
    ].join('; '),
  },
  {
    // flatMap producing 100*100 = 10,000 pair-objects, then filters and reduces.
    // Stresses: massive array + object allocation, nested lambda invocations.
    name: 'nested_iteration',
    program: [
      rangeHelper,
      `let xs = range(100)`,
      `let pairs = xs.flatMap(fun(x) xs.map(fun(y) {x: x, y: y, sum: x + y}))`,
      `let filtered = pairs.filter(p => p.sum % 7 == 0)`,
      `filtered.map(p => p.x * p.y).reduce((a, b) => a + b, 0)`,
    ].join('; '),
  },
  {
    // Creates 250 objects via fromEntries, reads them back, spreads new properties in,
    // then repeats the transformation pipeline.
    // Stresses: Object.fromEntries / Object.keys / Object.entries, spread on objects.
    name: 'object_transform',
    program: [
      rangeHelper,
      `let entries = range(250).map(fun(n) [\`key_\${n}\`, {value: n, squared: n * n, label: \`item_\${n}\`}])`,
      `let obj = Object.fromEntries(entries)`,
      `let keys = Object.keys(obj)`,
      `let t1 = Object.fromEntries(keys.map(fun(k) [k, {...obj[k], doubled: obj[k].value * 2}]))`,
      `let k2 = Object.keys(t1)`,
      `let t2 = Object.fromEntries(k2.map(fun(k) [k, {...t1[k], tripled: t1[k].value * 3}]))`,
      `Object.entries(t2).map(fun(e) e[1].doubled + e[1].squared + e[1].tripled).reduce((a, b) => a + b, 0)`,
    ].join('; '),
  },
  {
    // Composes 50 small functions together, then maps the composed function over 500 elements.
    // Each call to the composed function traverses 50 nested closures.
    // Stresses: closure creation, deep (but within-limit) call chains per element.
    name: 'closure_composition',
    program: [
      rangeHelper,
      `let compose = fun(f, g) fun(x) f(g(x))`,
      `let fns = range(50).map(fun(n) fun(x) x + 1)`,
      `let combined = fns.reduce(compose, x => x)`,
      r250,
      `let arr = [...r, ...r.map(x => x + 250)]`,
      `arr.map(combined).reduce((a, b) => a + b, 0)`,
    ].join('; '),
  },
  {
    // Parses and evaluates a program with many let-bindings and expressions.
    // Stresses: scanner, parser, and symbol-table lookup with deep scope chains.
    name: 'many_bindings',
    program: (() => {
      const bindings: string[] = []
      bindings.push('let v0 = 1')
      for (let i = 1; i < 500; i++) {
        bindings.push(`let v${i} = v${i - 1} + ${i}`)
      }
      bindings.push('v499')
      return bindings.join('; ')
    })(),
  },
]

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

function formatMs(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`
  }
  return `${ms.toFixed(1)}ms`
}

function runBenchmark(def: BenchmarkDef, iterations: number) {
  // Warmup
  Septima.run(def.program)

  const times: number[] = []
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    Septima.run(def.program)
    const elapsed = performance.now() - start
    times.push(elapsed)
  }

  const sorted = [...times].sort((a, b) => a - b)
  return {
    name: def.name,
    times,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: median(sorted),
    mean: times.reduce((a, b) => a + b, 0) / times.length,
  }
}

function main() {
  const args = process.argv.slice(2)
  let iterations = 10
  let filter: string | undefined

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--iterations' || args[i] === '-n') {
      iterations = Number(args[i + 1])
      i++
    } else if (args[i] === '--filter' || args[i] === '-f') {
      filter = args[i + 1]
      i++
    } else if (args[i] === '--list') {
      console.log('Available benchmarks:')
      for (const b of benchmarks) {
        console.log(`  ${b.name}`)
      }
      return
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log('Usage: benchmark [options]')
      console.log('')
      console.log('Options:')
      console.log('  -n, --iterations <N>  Number of iterations per benchmark (default: 10)')
      console.log('  -f, --filter <name>   Run only benchmarks matching this substring')
      console.log('  --list                List available benchmarks')
      console.log('  -h, --help            Show this help')
      return
    }
  }

  const filterStr = filter
  const selected = filterStr ? benchmarks.filter(b => b.name.includes(filterStr)) : benchmarks

  if (selected.length === 0) {
    console.log(`No benchmarks matching "${filter ?? ''}"`)
    return
  }

  console.log(`Running ${selected.length} benchmark(s), ${iterations} iteration(s) each`)
  console.log('')

  const nameWidth = Math.max(...selected.map(b => b.name.length))

  const results = []
  for (const def of selected) {
    const result = runBenchmark(def, iterations)
    results.push(result)

    const name = result.name.padEnd(nameWidth)
    const med = formatMs(result.median)
    const avg = formatMs(result.mean)
    const lo = formatMs(result.min)
    const hi = formatMs(result.max)
    console.log(`${name}  median=${med}  mean=${avg}  min=${lo}  max=${hi}`)
  }

  console.log('')
  console.log('Done.')
}

main()
