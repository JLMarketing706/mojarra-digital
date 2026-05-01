'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const LS_PREFIX = 'mojarra:draft:'

interface DraftMeta { savedAt: number }

/**
 * Auto-guarda un objeto serializable en Supabase (`form_drafts`) — cross-device —
 * con fallback a localStorage si no hay conexión / no hay user.
 *
 * Uso:
 *   const { hasDraft, restoreDraft, clearDraft, draftSavedAt } =
 *     useFormDraft('nuevo-tramite', form, setForm)
 */
export function useFormDraft<T extends object>(
  key: string,
  state: T,
  setState: (s: T) => void,
  opts: { debounceMs?: number; enabled?: boolean } = {},
) {
  const { debounceMs = 800, enabled = true } = opts
  const supabase = createClient()
  const lsKey = LS_PREFIX + key
  const [hasDraft, setHasDraft] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mounted = useRef(false)
  /** snapshot del estado al montar — solo guardamos si el state actual difiere de éste */
  const baseline = useRef<string>('')

  // Buscar borrador al montar (primero servidor, después localStorage)
  useEffect(() => {
    if (!enabled) return
    let cancel = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancel) return
      setUserId(user?.id ?? null)

      let foundServer = false
      if (user) {
        const { data } = await supabase
          .from('form_drafts')
          .select('data, updated_at')
          .eq('user_id', user.id)
          .eq('form_key', key)
          .maybeSingle()
        if (cancel) return
        if (data?.data) {
          setHasDraft(true)
          setDraftSavedAt(new Date(data.updated_at as string).getTime())
          foundServer = true
        }
      }

      if (!foundServer) {
        // Fallback localStorage
        try {
          const raw = localStorage.getItem(lsKey)
          if (raw) {
            const parsed = JSON.parse(raw) as { data: T; meta: DraftMeta }
            if (parsed?.data) {
              setHasDraft(true)
              setDraftSavedAt(parsed.meta?.savedAt ?? null)
            }
          }
        } catch { /* ignorar */ }
      }
      // Snapshot del estado vacío inicial — solo guardamos si el user lo modifica
      baseline.current = JSON.stringify(state)
      mounted.current = true
    }
    load()
    return () => { cancel = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Guardar con debounce en cada cambio (solo si difiere del baseline inicial)
  // Mantengo refs al state/userId actuales para poder flushear desde cleanup/beforeunload
  const stateRef = useRef(state)
  const userIdRef = useRef(userId)
  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { userIdRef.current = userId }, [userId])

  /** Persiste el state actual de forma síncrona en localStorage y dispara upsert
   *  asíncrono a Supabase. Usado por el debounce y por el cleanup. */
  function flushNow(snapshot: T) {
    const now = Date.now()
    const json = JSON.stringify(snapshot)
    if (json === baseline.current) return
    try {
      localStorage.setItem(lsKey, JSON.stringify({ data: snapshot, meta: { savedAt: now } }))
    } catch { /* lleno */ }
    if (userIdRef.current) {
      // fire-and-forget; si la pestaña se cierra antes, al menos quedó en localStorage
      supabase.from('form_drafts').upsert({
        user_id: userIdRef.current,
        form_key: key,
        data: snapshot,
        updated_at: new Date(now).toISOString(),
      }).then(() => { /* ok */ })
    }
    baseline.current = json
    setDraftSavedAt(now)
  }

  useEffect(() => {
    if (!enabled || !mounted.current) return
    const json = JSON.stringify(state)
    if (json === baseline.current) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => flushNow(state), debounceMs)
    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
        // Si había un save pendiente, ejecutarlo YA con el state actual
        // (evita perder cambios cuando el usuario sale antes del debounce)
        flushNow(stateRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, enabled, userId])

  // Listener global: flush al cerrar pestaña / navegar fuera
  useEffect(() => {
    if (!enabled) return
    function flush() {
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
        flushNow(stateRef.current)
      }
    }
    window.addEventListener('beforeunload', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('beforeunload', flush)
      window.removeEventListener('pagehide', flush)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  async function restoreDraft() {
    // Preferir el del servidor si existe
    if (userId) {
      const { data } = await supabase
        .from('form_drafts')
        .select('data')
        .eq('user_id', userId)
        .eq('form_key', key)
        .maybeSingle()
      if (data?.data) {
        const restored = data.data as T
        setState(restored)
        // Marcar el restored como nuevo baseline para evitar re-guardar inmediato
        baseline.current = JSON.stringify(restored)
        setHasDraft(false)
        return true
      }
    }
    // Fallback localStorage
    try {
      const raw = localStorage.getItem(lsKey)
      if (raw) {
        const parsed = JSON.parse(raw) as { data: T }
        setState(parsed.data)
        baseline.current = JSON.stringify(parsed.data)
        setHasDraft(false)
        return true
      }
    } catch { /* ignore */ }
    return false
  }

  async function clearDraft() {
    try { localStorage.removeItem(lsKey) } catch { /* noop */ }
    if (userId) {
      await supabase.from('form_drafts')
        .delete()
        .eq('user_id', userId).eq('form_key', key)
    }
    // Resetear baseline al estado actual para no re-guardar inmediatamente
    baseline.current = JSON.stringify(state)
    setHasDraft(false)
    setDraftSavedAt(null)
  }

  return { hasDraft, restoreDraft, clearDraft, draftSavedAt }
}
