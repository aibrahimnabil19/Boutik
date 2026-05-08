// apps/web/src/app/(app)/depenses/page.jsx
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { v4 as uuid } from 'uuid'
import { toast } from 'sonner'
import { Wallet, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { getAll, localUpsert, localDelete } from '@/lib/db/local'
import { formatFCFA } from '@/lib/core/calculations'
import {
  PageHeader, SearchBar, Modal, FormField, EmptyState,
  ConfirmDialog, Btn, StatCard, inputCls, selectCls
} from '@/components/ui'
import FrenchInput from '@/components/FrenchInput'

const CATEGORIES = ['Transport', 'Salaire', 'Loyer', 'Eau / Électricité', 'Recharge téléphone', 'Maintenance', 'Publicité', 'Autre']

export default function DepensesPage() {
  const shop = useAppStore(s => s.shop)
  const [expenses, setExpenses] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [loading, setLoading] = useState(true)

  const { register, handleSubmit, reset, control } = useForm({
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd'), amount: '' }
  })

  const load = useCallback(async () => {
    if (!shop?.id) return
    const e = await getAll('expenses', shop.id)
    setExpenses(e.sort((a, b) => new Date(b.date) - new Date(a.date)))
    setLoading(false)
  }, [shop?.id])

  useEffect(() => { load() }, [load])

  async function onSubmit(data) {
    const record = {
      id: uuid(),
      shop_id: shop.id,
      date: data.date,
      description: data.description,
      amount: Number(data.amount),
      category: data.category || 'Autre',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending',
    }
    await localUpsert('expenses', record)
    toast.success('Dépense ajoutée')
    setModal(false)
    load()
  }

  const filtered = useMemo(() =>
    expenses.filter(e =>
      e.description?.toLowerCase().includes(search.toLowerCase()) ||
      e.category?.toLowerCase().includes(search.toLowerCase())
    ), [expenses, search])

  const total = useMemo(() => expenses.reduce((a, e) => a + (e.amount || 0), 0), [expenses])
  const byMonth = useMemo(() => {
    const now = new Date()
    return expenses
      .filter(e => new Date(e.date).getMonth() === now.getMonth() && new Date(e.date).getFullYear() === now.getFullYear())
      .reduce((a, e) => a + (e.amount || 0), 0)
  }, [expenses])

  return (
    <div className="p-6">
      <PageHeader
        title="Dépenses"
        subtitle={`${expenses.length} dépense${expenses.length !== 1 ? 's' : ''}`}
        action={<Btn icon={Plus} onClick={() => { reset({ date: format(new Date(), 'yyyy-MM-dd') }); setModal(true) }}>Nouvelle dépense</Btn>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total dépenses" value={formatFCFA(total)} color="red" icon={Wallet} />
        <StatCard label="Ce mois-ci" value={formatFCFA(byMonth)} color="amber" />
        <StatCard label="Nombre" value={expenses.length} color="blue" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex-1 max-w-xs">
            <SearchBar value={search} onChange={setSearch} placeholder="Rechercher…" />
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Wallet} title="Aucune dépense"
            action={<Btn icon={Plus} onClick={() => setModal(true)}>Ajouter</Btn>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Date', 'Description', 'Catégorie', 'Montant', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {format(new Date(e.date), 'dd MMM yy', { locale: fr })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{e.description}</td>
                    <td className="px-4 py-3 text-gray-500">{e.category}</td>
                    <td className="px-4 py-3 font-bold text-red-600">{formatFCFA(e.amount)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setConfirm(e.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-600">Total affiché</td>
                  <td className="px-4 py-3 font-bold text-red-700">
                    {formatFCFA(filtered.reduce((a, e) => a + (e.amount || 0), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nouvelle dépense">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" required>
              <input {...register('date', { required: true })} type="date" className={inputCls} />
            </FormField>
            <FormField label="Catégorie">
              <select {...register('category')} className={inputCls}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Description" required>
            <input {...register('description', { required: 'Requis' })}
              placeholder="Ex: Transport sur vente" className={inputCls} />
          </FormField>
          <FormField label="Montant (FCFA)" required>
            <Controller
              name="amount"
              control={control}
              rules={{ required: 'Requis' }}
              render={({ field }) => (
                <FrenchInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="0"
                  required
                  className={inputCls}
                />
              )}
            />
          </FormField>
          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="secondary" onClick={() => setModal(false)}>Annuler</Btn>
            <Btn type="submit">Enregistrer</Btn>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => { localDelete('expenses', confirm); load(); toast.success('Dépense supprimée') }}
        title="Supprimer la dépense" message="Êtes-vous sûr ?" />
    </div>
  )
}