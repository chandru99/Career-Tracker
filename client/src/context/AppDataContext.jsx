import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { getApplications, getNetworking, getLamp, getAnalytics } from '../api'

const AppDataContext = createContext(null)

export function AppDataProvider({ children }) {
  const [cache, setCacheState] = useState({})
  const cacheRef = useRef({})   // always-current mirror of cache state
  const [loading, setLoading] = useState({})

  // setCache keeps both the ref (synchronous) and the state (triggers re-render) in sync
  const setCache = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(cacheRef.current) : updater
    cacheRef.current = next
    setCacheState(next)
  }, [])

  const fetchIfNeeded = useCallback(async (key, fetchFn) => {
    if (cacheRef.current[key]) return cacheRef.current[key]
    if (loading[key]) return null
    setLoading(prev => ({ ...prev, [key]: true }))
    try {
      const res = await fetchFn()
      if (!res.ok) {
        const err = new Error(String(res.status))
        err.status = res.status
        throw err
      }
      const data = await res.json()
      setCache(prev => ({ ...prev, [key]: data }))
      return data
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }))
    }
  }, [loading, setCache])

  const invalidate = useCallback((key) => {
    setCache(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [setCache])

  const invalidateAll = useCallback(() => setCache({}), [setCache])

  return (
    <AppDataContext.Provider value={{
      cache, loading,
      fetchIfNeeded,
      invalidate,
      invalidateAll,
      getApps: () => fetchIfNeeded('applications', getApplications),
      getNet: () => fetchIfNeeded('networking', getNetworking),
      getLampData: () => fetchIfNeeded('lamp', getLamp),
      getAnalyticsData: () => fetchIfNeeded('analytics', getAnalytics),
    }}>
      {children}
    </AppDataContext.Provider>
  )
}

export const useAppData = () => useContext(AppDataContext)
