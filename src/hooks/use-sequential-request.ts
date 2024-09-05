import { useCallback, useRef } from 'react'

const buildCancelableFetch = <T>(
  requestFn: (signal: AbortSignal) => Promise<T>
) => {
  const abortController = new AbortController()
  return {
    run: () =>
      new Promise<T>((resolve, reject) => {
        if (abortController.signal.aborted) {
          reject(new Error('CanceledError'))
          return
        }
        requestFn(abortController.signal).then(resolve, reject)
      }),
    cancel: () => {
      abortController.abort()
    },
  }
}
function useLatest<T>(value: T) {
  const ref = useRef(value)
  ref.current = value
  return ref
}
export function useSequentialRequest<T>(
  requestFn: (signal: AbortSignal) => Promise<T>
) {
  const requestFnRef = useLatest(requestFn)
  const currentRequest = useRef<{ cancel: () => void } | null>(null)
  return useCallback(async () => {
    if (currentRequest.current) {
      currentRequest.current.cancel()
    }
    const { run, cancel } = buildCancelableFetch(requestFnRef.current)
    currentRequest.current = { cancel }
    return run().finally(() => {
      if (currentRequest.current?.cancel === cancel) {
        currentRequest.current = null
      }
    })
  }, [requestFnRef])
}
