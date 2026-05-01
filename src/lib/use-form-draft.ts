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
      mounted.current = true
    }
    load()
    return () => { cancel = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Guardar con debounce en cada cambio
  useEffect(() => {
    if (!enabled || !mounted.current) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const now = Date.now()
      // Guardar en localStorage siempre (rápido, offline)
      try {
        localStorage.setItem(lsKey, JSON.stringify({ data: state, meta: { savedAt: now } }))
      } catch { /* localStorage lleno */ }
      // Intentar guardar en Supabase si hay user
      if (userId) {
        await supabase.from('form_drafts').upsert({
          user_id: userId,
          form_key: key,
          data: state,
          updated_at: new Date(now).toISOString(),
        })
      }
      setDraftSavedAt(now)
    }, debounceMs)
    return () => { if (timer.current) clearTimeout(timer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, enabled, userId])

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
        setState(data.data as T)
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
    setHasDraft(false)
    setDraftSavedAt(null)
  }

  return { hasDraft, restoreDraft, clearDraft, draftSavedAt }
}
