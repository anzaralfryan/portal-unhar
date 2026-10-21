/**
 * useKrsDraft — Offline KRS Draft
 *
 * Menyimpan pilihan matkul ke IndexedDB saat mahasiswa offline,
 * lalu sync otomatis ke server saat koneksi kembali.
 *
 * Cara pakai di KrsPage:
 *   const { drafts, isOnline, addDraft, removeDraft, syncNow, isSyncing } = useKrsDraft()
 *
 *   // Saat tambah matkul:
 *   if (!isOnline) { addDraft(jadwalId, matkul); return }
 *   doAdd(jadwalId)
 *
 *   // Sync manual:
 *   await syncNow((jadwalId) => krsService.addMatkul(krsId, jadwalId))
 */

import { useState, useEffect, useCallback } from 'react'

const DB_NAME    = 'portal-krs-db'
const DB_VERSION = 1
const STORE_DRAFT = 'krs_draft'
const STORE_AUTH  = 'auth'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_DRAFT)) {
        db.createObjectStore(STORE_DRAFT, { keyPath: 'clientId' })
      }
      if (!db.objectStoreNames.contains(STORE_AUTH)) {
        db.createObjectStore(STORE_AUTH, { keyPath: 'key' })
      }
    }
    req.onsuccess  = (e) => resolve(e.target.result)
    req.onerror    = (e) => reject(e.target.error)
  })
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror   = () => reject(req.error)
  })
}

export function useKrsDraft() {
  const [drafts,     setDrafts]     = useState([])
  const [isOnline,   setIsOnline]   = useState(navigator.onLine)
  const [isSyncing,  setIsSyncing]  = useState(false)
  const [lastSynced, setLastSynced] = useState(null)

  // ── Pantau status koneksi ──────────────────────────────
  useEffect(() => {
    const goOnline  = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // ── Load drafts dari IndexedDB saat mount ──────────────
  useEffect(() => {
    openDb()
      .then(db => getAllFromStore(db, STORE_DRAFT))
      .then(setDrafts)
      .catch(() => {})
  }, [])

  // ── Simpan token ke IndexedDB (untuk SW Background Sync) ──
  const saveTokenForSW = useCallback(async (token) => {
    try {
      const db = await openDb()
      const tx = db.transaction(STORE_AUTH, 'readwrite')
      tx.objectStore(STORE_AUTH).put({ key: 'token', value: token })
    } catch {}
  }, [])

  // ── Tambah draft ke IndexedDB ─────────────────────────
  const addDraft = useCallback(async (jadwalId, matkulNama, matkulDetail = {}) => {
    const draft = {
      clientId:    `draft-${jadwalId}-${Date.now()}`,
      jadwal_id:   jadwalId,
      nama:        matkulNama || 'Mata Kuliah',
      kode:        matkulDetail.kode   || '',
      sks:         matkulDetail.sks    || 0,
      dosen:       matkulDetail.dosen  || '',
      created_at:  new Date().toISOString(),
    }

    const db = await openDb()
    const tx = db.transaction(STORE_DRAFT, 'readwrite')
    tx.objectStore(STORE_DRAFT).put(draft)

    setDrafts(prev => {
      // Hindari duplikat jadwal_id yang sama
      const tanpaDuplikat = prev.filter(d => d.jadwal_id !== jadwalId)
      return [...tanpaDuplikat, draft]
    })

    // Daftarkan Background Sync jika browser support
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready
        .then(reg => reg.sync.register('sync-krs-draft'))
        .catch(() => {})
    }

    return draft
  }, [])

  // ── Hapus satu draft dari IndexedDB ──────────────────
  const removeDraft = useCallback(async (clientId) => {
    const db = await openDb()
    const tx = db.transaction(STORE_DRAFT, 'readwrite')
    tx.objectStore(STORE_DRAFT).delete(clientId)
    setDrafts(prev => prev.filter(d => d.clientId !== clientId))
  }, [])

  // ── Hapus semua draft ─────────────────────────────────
  const clearAllDrafts = useCallback(async () => {
    const db = await openDb()
    const tx = db.transaction(STORE_DRAFT, 'readwrite')
    tx.objectStore(STORE_DRAFT).clear()
    setDrafts([])
  }, [])

  /**
   * Sync manual — kirim semua draft ke server.
   * @param {Function} addMatkulFn — fungsi async(jadwalId) yang memanggil API
   * @returns {{ synced: number, failed: number }}
   */
  const syncNow = useCallback(async (addMatkulFn) => {
    if (!navigator.onLine || drafts.length === 0) return { synced: 0, failed: 0 }
    setIsSyncing(true)

    let synced = 0
    let failed = 0
    const failedDrafts = []

    for (const draft of drafts) {
      try {
        await addMatkulFn(draft.jadwal_id)
        await removeDraft(draft.clientId)
        synced++
      } catch {
        failed++
        failedDrafts.push(draft)
      }
    }

    if (synced > 0) setLastSynced(new Date())
    setIsSyncing(false)
    return { synced, failed }
  }, [drafts, removeDraft])

  return {
    drafts,
    isOnline,
    isSyncing,
    lastSynced,
    addDraft,
    removeDraft,
    clearAllDrafts,
    syncNow,
    saveTokenForSW,
  }
}
