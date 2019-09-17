import $$ from './TestHelpers'

describe('AbortController', () => {

  const controller = new $$.AbortController()
  const signal = controller.signal

  function doWork(signal: any) {
    if (signal.aborted) {
      return Promise.reject(new $$.DOMException('Aborted', 'AbortError'))
    }
  
    return new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => {
        reject(new $$.DOMException('Aborted', 'AbortError'))
      })
      for(let i = 0; i < 100000; i++) {
        //
      }
      resolve(true)
    })
  }

  test('abort()', () => {
    expect(signal.aborted).toBeFalsy()
    doWork(signal)
    controller.abort()
    expect(signal.aborted).toBeTruthy()  
  })

})