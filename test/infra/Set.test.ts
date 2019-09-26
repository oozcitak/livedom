import $$ from './TestHelpers'

describe('Set', () => {

  test('append()', () => {
    const set = new Set(['a', 'b', 'c'])
    $$.infra.set.append(set, 'd')
    expect(set).toEqual(new Set(['a', 'b', 'c', 'd']))
  })

  test('extend()', () => {
    const set = new Set(['a', 'b', 'c'])
    $$.infra.set.extend(set, new Set(['d', 'e']))
    expect(set).toEqual(new Set(['a', 'b', 'c', 'd', 'e']))
  })

  test('prepend()', () => {
    const set = new Set(['a', 'b', 'c'])
    $$.infra.set.prepend(set, 'd')
    expect(set).toEqual(new Set(['d', 'a', 'b', 'c']))
  })

  test('replace()', () => {
    const set = new Set(['a', 'b', 'c'])
    $$.infra.set.replace(set, 'b', 'd')
    expect(set).toEqual(new Set(['a', 'd', 'c']))
  })

  test('replace() with condition', () => {
    const set = new Set(['a', 'b1', 'b2', 'c'])
    $$.infra.set.replace(set, (item) => item.startsWith('b'), 'd')
    expect(set).toEqual(new Set(['a', 'd', 'c']))
  })

  test('insert()', () => {
    const set = new Set(['a', 'b', 'c'])
    $$.infra.set.insert(set, 'd', 1)
    expect(set).toEqual(new Set(['a', 'd', 'b', 'c']))
  })

  test('remove()', () => {
    const set = new Set(['a', 'b', 'c'])
    $$.infra.set.remove(set, 'b')
    expect(set).toEqual(new Set(['a', 'c']))
  })

  test('remove() with condition', () => {
    const set = new Set(['a', 'b1', 'b2', 'c'])
    $$.infra.set.remove(set, (item) => item.startsWith('b'))
    expect(set).toEqual(new Set(['a', 'c']))
  })

  test('empty()', () => {
    const set = new Set(['a', 'b', 'c'])
    $$.infra.set.empty(set)
    expect(set.size).toBe(0)
  })

  test('contains()', () => {
    const set = new Set(['a', 'b', 'c'])
    expect($$.infra.set.contains(set, 'b')).toBe(true)
    expect($$.infra.set.contains(set, 'd')).toBe(false)
  })

  test('remove() with condition', () => {
    const set = new Set(['a', 'b1', 'b2', 'c'])
    expect($$.infra.set.contains(set, (item) => item.startsWith('b'))).toBe(true)
    expect($$.infra.set.contains(set, (item) => item.startsWith('d'))).toBe(false)
  })

  test('size()', () => {
    const set = new Set(['a', 'b', 'c'])
    expect($$.infra.set.size(set)).toBe(3)
  })

  test('size() with condition', () => {
    const set = new Set(['a', 'b1', 'b2', 'c'])
    expect($$.infra.set.size(set, (item) => item.startsWith('b'))).toBe(2)
  })

  test('isEmpty()', () => {
    const set = new Set(['a', 'b', 'c'])
    expect($$.infra.set.isEmpty(set)).toBe(false)
    set.clear()
    expect($$.infra.set.isEmpty(set)).toBe(true)
  })

  test('forEach()', () => {
    const set = new Set(['a', 'b', 'c'])
    const newSet = new Set<string>()
    for (const item of $$.infra.set.forEach(set)) {
      newSet.add(item + '_')
    }
    expect(newSet).toEqual(new Set(['a_', 'b_', 'c_']))
  })

  test('forEach() with condition', () => {
    const set = new Set(['a', 'b1', 'b2', 'c'])
    const newSet = new Set<string>()
    for (const item of $$.infra.set.forEach(set, item => item.startsWith('b'))) {
      newSet.add(item + '_')
    }
    expect(newSet).toEqual(new Set(['b1_', 'b2_']))
  })

  test('clone()', () => {
    const set = new Set(['a', 'b', 'c'])
    const newSet = $$.infra.set.clone(set)
    expect(newSet).toEqual(new Set(['a', 'b', 'c']))
  })

  test('sortInAscendingOrder()', () => {
    const set = new Set(['c', 'b', 'a'])
    const newSet = $$.infra.set.sortInAscendingOrder(set, (a, b) => a < b)
    expect(newSet).toEqual(new Set(['a', 'b', 'c']))
  })

  test('sortInAscendingOrder() reverse', () => {
    const set = new Set(['a', 'b', 'c'])
    const newSet = $$.infra.set.sortInAscendingOrder(set, (a, b) => a < b)
    expect(newSet).toEqual(new Set(['a', 'b', 'c']))
  })

  test('sortInDescendingOrder()', () => {
    const set = new Set(['a', 'b', 'c'])
    const newSet = $$.infra.set.sortInDescendingOrder(set, (a, b) => a < b)
    expect(newSet).toEqual(new Set(['c', 'b', 'a']))
  })

  test('sortInDescendingOrder() reverse', () => {
    const set = new Set(['c', 'b', 'a'])
    const newSet = $$.infra.set.sortInDescendingOrder(set, (a, b) => a < b)
    expect(newSet).toEqual(new Set(['c', 'b', 'a']))
  })

  test('isSubsetOf()', () => {
    const superset = new Set(['a', 'b', 'c', 'd'])
    const subset = new Set(['b', 'c'])
    const otherset = new Set(['1', '2'])
    expect($$.infra.set.isSubsetOf(subset, superset)).toBe(true)
    expect($$.infra.set.isSubsetOf(otherset, superset)).toBe(false)
  })

  test('isSupersetOf()', () => {
    const superset = new Set(['a', 'b', 'c', 'd'])
    const subset = new Set(['b', 'c'])
    const otherset = new Set(['1', '2'])
    expect($$.infra.set.isSupersetOf(superset, subset)).toBe(true)
    expect($$.infra.set.isSupersetOf(superset, otherset)).toBe(false)
  })

  test('intersection()', () => {
    const set1 = new Set(['a', 'b', 'c', 'd'])
    const set2 = new Set(['b', 'c'])
    const newSet = $$.infra.set.intersection(set1, set2)
    expect(newSet).toEqual(new Set(['b', 'c']))
  })

  test('union()', () => {
    const set1 = new Set(['a', 'd'])
    const set2 = new Set(['b', 'c'])
    const newSet = $$.infra.set.union(set1, set2)
    expect(newSet).toEqual(new Set(['a', 'd', 'b', 'c']))
  })

  test('range()', () => {
    const set = $$.infra.set.range(1, 4)
    expect(set).toEqual(new Set([1, 2, 3, 4]))
  })

})