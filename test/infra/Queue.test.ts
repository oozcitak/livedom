import $$ from './TestHelpers'

describe('Queue', () => {

  test('enqueue()', () => {
    const list = ['a', 'b', 'c']
    $$.infra.queue.enqueue(list, 'd')
    expect(list).toEqual(['a', 'b', 'c', 'd'])
  })

  test('dequeue()', () => {
    const list = ['a', 'b', 'c']
    const item = $$.infra.queue.dequeue(list)
    expect(item).toBe('a')
    expect(list).toEqual(['b', 'c'])
    $$.infra.queue.dequeue(list) // remove b
    $$.infra.queue.dequeue(list) // remove c
    expect($$.infra.queue.dequeue(list)).toBeNull()
  })

})