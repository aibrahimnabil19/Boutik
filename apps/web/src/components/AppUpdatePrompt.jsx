'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Download, X, RefreshCw } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/context/store'

const isDemoMode = process.env.NEXT_PUBLIC_IS_DEMO === 'true'

function isTauriDesktop() {
    return typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__
}

export default function AppUpdatePrompt() {
    const shop = useAppStore(s => s.shop)
    const [target, setTarget] = useState(null)
    const [loading, setLoading] = useState(false)

    const supabase = isDemoMode ? null : getSupabaseClient()

    const loadPendingUpdate = useCallback(async () => {
        if (isDemoMode) return
        if (!supabase) return
        if (!shop?.id) return

        const { data, error } = await supabase
            .from('app_update_targets')
            .select(`
        id,
        status,
        shop_id,
        release:release_id (
          id,
          version,
          title,
          notes,
          download_url,
          updater_url,
          mandatory,
          created_at
        )
      `)
            .eq('shop_id', shop.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) {
            console.warn('[update prompt load failed]', error.message)
            return
        }

        setTarget(data || null)

        if (data?.id) {
            await supabase
                .from('app_update_targets')
                .update({
                    status: 'seen',
                    seen_at: new Date().toISOString(),
                })
                .eq('id', data.id)
        }
    }, [shop?.id, supabase])

    useEffect(() => {
        if(isDemoMode) return
        if (!shop?.id) return
        if(!supabase) return

        loadPendingUpdate()

        const channel = supabase
            .channel(`shop-update-${shop.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'app_update_targets',
                    filter: `shop_id=eq.${shop.id}`,
                },
                () => loadPendingUpdate()
            )
            .subscribe()

        const interval = setInterval(loadPendingUpdate, 60_000)

        return () => {
            supabase.removeChannel(channel)
            clearInterval(interval)
        }
    }, [shop?.id, loadPendingUpdate, supabase])

    async function dismiss() {
        if (!target?.id) return

        await supabase
            .from('app_update_targets')
            .update({ status: 'dismissed' })
            .eq('id', target.id)

        setTarget(null)
    }

    async function installUpdate() {
        if (!target?.id) return

        setLoading(true)

        try {
            await supabase
                .from('app_update_targets')
                .update({
                    status: 'accepted',
                    accepted_at: new Date().toISOString(),
                })
                .eq('id', target.id)

            if (isTauriDesktop()) {
                const { check } = await import('@tauri-apps/plugin-updater')
                const { relaunch } = await import('@tauri-apps/plugin-process')

                const update = await check()

                if (!update) {
                    toast.info('Aucune mise à jour automatique trouvée.')
                    if (target.release?.download_url) {
                        window.open(target.release.download_url, '_blank')
                    }
                    return
                }

                await update.downloadAndInstall()

                await supabase
                    .from('app_update_targets')
                    .update({
                        status: 'installed',
                        installed_at: new Date().toISOString(),
                    })
                    .eq('id', target.id)

                await relaunch()
                return
            }

            if (target.release?.download_url) {
                window.open(target.release.download_url, '_blank')
            } else {
                toast.error('Lien de téléchargement non configuré.')
            }
        } catch (err) {
            toast.error(err.message || 'Mise à jour impossible')
        } finally {
            setLoading(false)
        }
    }

    if (!target?.release) return null

    if (isDemoMode) return null
if (!target?.release) return null

    return (
        <div className="fixed bottom-5 right-5 z-[9999] w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-gray-200 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-none">
                    <Download className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">
                        {target.release.title || 'Nouvelle mise à jour disponible'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Version {target.release.version}
                    </p>
                </div>

                {!target.release.mandatory && (
                    <button
                        onClick={dismiss}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="p-4">
                <p className="text-sm text-gray-600 whitespace-pre-line">
                    {target.release.notes || 'Une nouvelle version de Boutik est disponible.'}
                </p>

                <button
                    onClick={installUpdate}
                    disabled={loading}
                    className="mt-4 w-full h-11 rounded-xl bg-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-60"
                >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {loading ? 'Mise à jour…' : 'Mettre à jour'}
                </button>
            </div>
        </div>
    )
}