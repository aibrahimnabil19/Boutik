// apps/web/src/app/(app)/clients/page.jsx
'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { v4 as uuid } from 'uuid'
import { toast } from 'sonner'
import { Users, Plus, Trash2, ChevronRight, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { getAll, localUpsert, localDelete } from '@/lib/db/local'
import { formatFCFA } from '@/lib/core/calculations'
import {
  PageHeader, SearchBar, Modal, FormField, EmptyState,
  ConfirmDialog, Btn, StatCard, Badge, inputCls
} from '@/components/ui'

export default function ClientsPage() {
  const shop = useAppStore(s => s.shop)
  const [clients, setClients] = useState([])
  const [transactions, setTransactions] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [txModal, setTxModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [loading, setLoading] = useState(true)
  // Guard against double-submit
  const submittingRef = useRef(false)

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd') }
  })
  const {
    register: registerTx, handleSubmit: handleTxSubmit, reset: resetTx
  } = useForm({ defaultValues: { date: format(new Date(), 'yyyy-MM-dd'), type: 'debit' } })

  const load = useCallback(async () => {
    if (!shop?.id) return
    const [c, t] = await Promise.all([
      getAll('clients', shop.id),
      getAll('client_transactions', shop.id),
    ])
    setClients(c)
    setTransactions(t)
    setLoading(false)
  }, [shop?.id])

  useEffect(() => { load() }, [load])

  function clientBalance(clientId) {
    return transactions
      .filter(t => t.client_id === clientId)
      .reduce((sum, t) => sum + (t.amount || 0), 0)
  }

  async function onAddClient(data) {
    // Prevent double-submit
    if (submittingRef.current) return
    submittingRef.current = true

    try {
      const record = {
        id: uuid(), shop_id: shop.id,
        name: data.name.trim(), phone: data.phone || '', address: data.address || '',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending',
      }
      await localUpsert('clients', record)
      toast.success('Client ajouté')
      setModal(false)
      reset()
      // Reload after a short delay to let debounced sync settle
      setTimeout(() => load(), 500)
    } catch (err) {
      toast.error(err.message || 'Erreur')
    } finally {
      submittingRef.current = false
    }
  }

  async function onAddTx(data) {
    if (submittingRef.current) return
    submittingRef.current = true

    try {
      const amount = Number(data.amount)
      const signed = data.type === 'credit' ? -Math.abs(amount) : Math.abs(amount)
      const record = {
        id: uuid(), shop_id: shop.id, client_id: selected.id,
        date: data.date, label: data.label, amount: signed,
        type: data.type,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending',
      }
      await localUpsert('client_transactions', record)
      toast.success(data.type === 'credit' ? 'Paiement enregistré' : 'Créance ajoutée')
      setTxModal(false)
      resetTx({ date: format(new Date(), 'yyyy-MM-dd'), type: 'debit' })
      setTimeout(() => load(), 500)
    } catch (err) {
      toast.error(err.message || 'Erreur')
    } finally {
      submittingRef.current = false
    }
  }

  const filtered = useMemo(() =>
    clients.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)), [clients, search])

  const withBalance = useMemo(() =>
    filtered.map(c => ({ ...c, balance: clientBalance(c.id) })), [filtered, transactions])

  const totalCreances = useMemo(() =>
    clients.reduce((s, c) => s + Math.max(0, clientBalance(c.id)), 0), [clients, transactions])

  const clientTx = useMemo(() =>
    selected ? transactions.filter(t => t.client_id === selected.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date)) : [], [selected, transactions])

  if (selected) {
    const balance = clientBalance(selected.id)
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelected(null)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">{selected.name}</h1>
            <p className="text-gray-500 text-sm">{selected.phone}</p>
          </div>
          <div className="ml-auto">
            <Btn icon={Plus} onClick={() => { resetTx({ date: format(new Date(), 'yyyy-MM-dd'), type: 'debit' }); setTxModal(true) }}>
              Nouvelle ligne
            </Btn>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Solde actuel"
            value={formatFCFA(Math.abs(balance))}
            color={balance > 0 ? 'amber' : balance < 0 ? 'green' : 'blue'}
            sub={balance > 0 ? '⚠ Client doit payer' : balance < 0 ? '✓ Crédit client' : 'Solde nul'}
          />
          <StatCard label="Total dû" value={formatFCFA(transactions.filter(t => t.client_id === selected.id && t.amount > 0).reduce((s,t)=>s+t.amount,0))} color="red" />
          <StatCard label="Total payé" value={formatFCFA(Math.abs(transactions.filter(t => t.client_id === selected.id && t.amount < 0).reduce((s,t)=>s+t.amount,0)))} color="green" />
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Historique des transactions</h3>
          </div>
          {clientTx.length === 0 ? (
            <EmptyState icon={Users} title="Aucune transaction" description="Ajoutez une créance ou un paiement." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Date','Libellé','Type','Montant'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clientTx.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{format(new Date(tx.date), 'dd MMM yyyy', { locale: fr })}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{tx.label}</td>
                    <td className="px-4 py-3">
                      <Badge color={tx.amount > 0 ? 'red' : 'green'}>
                        {tx.amount > 0 ? 'Créance' : 'Paiement'}
                      </Badge>
                    </td>
                    <td className={`px-4 py-3 font-bold ${tx.amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{formatFCFA(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={3} className="px-4 py-3 font-semibold text-gray-700">Solde</td>
                  <td className={`px-4 py-3 font-bold text-lg ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {formatFCFA(balance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <Modal open={txModal} onClose={() => setTxModal(false)} title="Nouvelle ligne" maxW="max-w-md">
          <form onSubmit={handleTxSubmit(onAddTx)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Date" required>
                <input {...registerTx('date', { required: true })} type="date" className={inputCls} />
              </FormField>
              <FormField label="Type" required>
                <select {...registerTx('type')} className={inputCls}>
                  <option value="debit">Créance (client doit)</option>
                  <option value="credit">Paiement (client paie)</option>
                </select>
              </FormField>
            </div>
            <FormField label="Libellé" required>
              <input {...registerTx('label', { required: true })} placeholder="Ex: Facture N°01, Règlement..." className={inputCls} />
            </FormField>
            <FormField label="Montant (FCFA)" required>
              <input {...registerTx('amount', { required: true, min: 1 })} type="number" min="1" className={inputCls} />
            </FormField>
            <div className="flex gap-3 justify-end pt-2">
              <Btn variant="secondary" onClick={() => setTxModal(false)}>Annuler</Btn>
              <Btn type="submit">Enregistrer</Btn>
            </div>
          </form>
        </Modal>
      </div>
    )
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length !== 1 ? 's' : ''}`}
        action={<Btn icon={Plus} onClick={() => { reset({ date: format(new Date(), 'yyyy-MM-dd') }); setModal(true) }}>Nouveau client</Btn>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total clients" value={clients.length} color="blue" icon={Users} />
        <StatCard label="Créances totales" value={formatFCFA(totalCreances)} color="amber" icon={TrendingUp} />
        <StatCard label="Avec solde dû"
          value={clients.filter(c => clientBalance(c.id) > 0).length} color="red" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex-1 max-w-xs">
            <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un client…" />
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Chargement…</div>
        ) : withBalance.length === 0 ? (
          <EmptyState icon={Users} title="Aucun client"
            description="Ajoutez vos clients pour suivre leurs créances."
            action={<Btn icon={Plus} onClick={() => setModal(true)}>Ajouter un client</Btn>}
          />
        ) : (
          <div className="divide-y divide-gray-50">
            {withBalance.map(c => (
              <div key={c.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setSelected(c)}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-none"
                     style={{ background: 'var(--color-primary)' }}>
                  {(c.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.phone || c.address || '—'}</p>
                </div>
                <div className="text-right">
                  {c.balance !== 0 ? (
                    <>
                      <p className={`font-bold ${c.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatFCFA(Math.abs(c.balance))}
                      </p>
                      <p className="text-xs text-gray-400">{c.balance > 0 ? 'à payer' : 'crédit'}</p>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">Solde nul</span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-none" />
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nouveau client" maxW="max-w-md">
        <form onSubmit={handleSubmit(onAddClient)} className="space-y-4">
          <FormField label="Nom du client" required>
            <input {...register('name', { required: 'Requis' })} placeholder="Ex: Energie Plus" className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Téléphone">
              <input {...register('phone')} placeholder="96 87 75 88" className={inputCls} />
            </FormField>
            <FormField label="Adresse">
              <input {...register('address')} placeholder="Ex: Niamey" className={inputCls} />
            </FormField>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="secondary" onClick={() => setModal(false)}>Annuler</Btn>
            <Btn type="submit">Ajouter</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}