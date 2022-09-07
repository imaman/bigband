import { Value } from './value'

export function findStringMethod(s: string, indexValue: string | Value) {
  const index = Value.toStringOrNumber(indexValue)
  if (typeof index === 'number') {
    throw new Error(`Index is of type number - not supported`)
  }
  if (index === 'at') {
    return Value.foreign(n => s.at(n.assertNum()))
  }
  if (index === 'charAt') {
    return Value.foreign(n => s.charAt(n.assertNum()))
  }
  if (index === 'concat') {
    return Value.foreign(arg => s.concat(arg.assertStr()))
  }
  if (index === 'endsWith') {
    return Value.foreign(arg => s.endsWith(arg.assertStr()))
  }
  if (index === 'includes') {
    return Value.foreign(arg => s.includes(arg.assertStr()))
  }
  if (index === 'indexOf') {
    return Value.foreign(searchString => s.indexOf(searchString.assertStr()))
  }
  if (index === 'lastIndexOf') {
    return Value.foreign(searchString => s.lastIndexOf(searchString.assertStr()))
  }
  if (index === 'length') {
    return Value.num(s.length)
  }
  if (index === 'match') {
    return Value.foreign(r => s.match(r.assertStr()))
  }
  if (index === 'matchAll') {
    return Value.foreign(r => [...s.matchAll(new RegExp(r.assertStr(), 'g'))])
  }
  if (index === 'padEnd') {
    return Value.foreign((maxLength, fillString) => s.padEnd(maxLength.assertNum(), fillString?.assertStr()))
  }
  if (index === 'padStart') {
    return Value.foreign((maxLength, fillString) => s.padStart(maxLength.assertNum(), fillString?.assertStr()))
  }
  if (index === 'repeat') {
    return Value.foreign(count => s.repeat(count.assertNum()))
  }
  if (index === 'replace') {
    return Value.foreign((searchValue, replacer) => s.replace(searchValue.assertStr(), replacer.assertStr()))
  }
  if (index === 'replaceAll') {
    return Value.foreign((searchValue, replacer) => s.replaceAll(searchValue.assertStr(), replacer.assertStr()))
  }
  if (index === 'search') {
    return Value.foreign(searcher => s.search(searcher.assertStr()))
  }
  if (index === 'slice') {
    return Value.foreign((start, end) => s.slice(start?.assertNum(), end?.assertNum()))
  }
  if (index === 'split') {
    return Value.foreign(splitter => s.split(splitter.assertStr()))
  }
  if (index === 'startsWith') {
    return Value.foreign(arg => s.startsWith(arg.assertStr()))
  }
  if (index === 'substring') {
    return Value.foreign((start, end) => s.substring(start.assertNum(), end?.assertNum()))
  }
  if (index === 'toLowerCase') {
    return Value.foreign(() => s.toLowerCase())
  }
  if (index === 'toUpperCase') {
    return Value.foreign(() => s.toUpperCase())
  }
  if (index === 'trim') {
    return Value.foreign(() => s.trim())
  }
  if (index === 'trimEnd') {
    return Value.foreign(() => s.trimEnd())
  }
  if (index === 'trimStart') {
    return Value.foreign(() => s.trimStart())
  }
  throw new Error(`Unrecognized string method: ${index}`)
}
