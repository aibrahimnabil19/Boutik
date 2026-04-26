// apps/web/src/app/(app)/fournisseurs/page.jsx
// Supplier management: list suppliers, track debts/payments (dettes fournisseurs).
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { v4 as uuid } from 'uuid'
import { toast } from 'sonner'
import { Truck, Plus, ChevronRight, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAppStore } from '@/context/store'
import { getAll, localUpsert } from '@/lib/db/local'
import { formatFCFA } from '@/lib/core/calculations'
import {
  PageHeader, SearchBar, Modal, FormField, EmptyState,
  Btn, StatCard, Badge, inputCls
} from '@/components/ui'

export default function FournisseursPage() {
  const shop = useAppStore(s => s.shop)
  const [suppliers, setSuppliers] = useState([])
  const [transactions, setTransactions] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [txModal, setTxModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  const { register, handleSubmit, reset } = useForm()
  const { register: registerTx, handleSubmit: handleTxSubmit, reset: resetTx } = useForm({
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd'), type: 'debit' }
  })

  const load = useCallback(async () => {
    if (!shop?.id) return
    const [s, t] = await Promise.all([
      getAll('suppliers', shop.id),
      getAll('supplier_transactions', shop.id),
    ])
    setSuppliers(s)
    setTransactions(t)
    setLoading(false)
  }, [shop?.id])

  useEffect(() => { load() }, [load])

  // Balance: positive = we owe supplier; negative = supplier owes us
  function supplierBalance(supplierId) {
    return transactions
      .filter(t => t.supplier_id === supplierId)
      .reduce((sum, t) => sum + (t.amount || 0), 0)
  }

  async function onAddSupplier(data) {
    const record = {
      id: uuid(), shop_id: shop.id, name: data.name,
      phone: data.phone || '', address: data.address || '',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending',
    }
    await localUpsert('suppliers', record)
    toast.success('Fournisseur ajouté')
    setModal(false)
    load()
  }

  async function onAddTx(data) {
    const amount = Number(data.amount)
    const signed = data.type === 'credit' ? -Math.abs(amount) : Math.abs(amount)
    const record = {
      id: uuid(), shop_id: shop.id, supplier_id: selected.id,
      date: data.date, label: data.label, amount: signed, type: data.type,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(), sync_status: 'pending',
    }
    await localUpsert('supplier_transactions', record)
    toast.success(data.type === 'credit' ? 'Paiement enregistré' : 'Dette ajoutée')
    setTxModal(false)
    load()
  }

  const filtered = useMemo(() =>
    suppliers.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search)), [suppliers, search])

  const withBalance = useMemo(() =>
    filtered.map(s => ({ ...s, balance: supplierBalance(s.id) })), [filtered, transactions])

  const totalDettes = useMemo(() =>
    suppliers.reduce((s, sup) => s + Math.max(0, supplierBalance(sup.id)), 0), [suppliers, transactions])

  const supplierTx = useMemo(() =>
    selected ? transactions.filter(t => t.supplier_id === selected.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date)) : [], [selected, transactions])

  if (selected) {
    const balance = supplierBalance(selected.id)
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
            <Btn icon={Plus} onClick={() => {
              resetTx({ date: format(new Date(), 'yyyy-MM-dd'), type: 'debit' })
              setTxModal(true)
            }}>Nouvelle ligne</Btn>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Solde actuel"
            value={formatFCFA(Math.abs(balance))}
            color={balance > 0 ? 'red' : balance < 0 ? 'green' : 'blue'}
            sub={balance > 0 ? '⚠ Nous devons payer' : balance < 0 ? '✓ Fournisseur nous doit' : 'Soldé'}
          />
          <StatCard label="Total achats" value={formatFCFA(transactions.filter(t => t.supplier_id === selected.id && t.amount > 0).reduce((s,t)=>s+t.amount,0))} color="amber" />
          <StatCard label="Total payé" value={formatFCFA(Math.abs(transactions.filter(t => t.supplier_id === selected.id && t.amount < 0).reduce((s,t)=>s+t.amount,0)))} color="green" />
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Historique</h3>
          </div>
          {supplierTx.length === 0 ? (
            <EmptyState icon={Truck} title="Aucune transaction" />
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
                {supplierTx.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{format(new Date(tx.date), 'dd MMM yyyy', { locale: fr })}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{tx.label}</td>
                    <td className="px-4 py-3">
                      <Badge color={tx.amount > 0 ? 'red' : 'green'}>
                        {tx.amount > 0 ? 'Dette' : 'Paiement'}
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
                  <td className={`px-4 py-3 font-bold text-lg ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
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
                  <option value="debit">Achat / Dette</option>
                  <option value="credit">Paiement</option>
                </select>
              </FormField>
            </div>
            <FormField label="Libellé" required>
              <input {...registerTx('label', { required: true })} placeholder="Ex: Onduleur Felicity, Règlement..." className={inputCls} />
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
        title="Fournisseurs"
        subtitle={`${suppliers.length} fournisseur${suppliers.length !== 1 ? 's' : ''}`}
        action={<Btn icon={Plus} onClick={() => { reset(); setModal(true) }}>Nouveau fournisseur</Btn>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total fournisseurs" value={suppliers.length} color="blue" icon={Truck} />
        <StatCard label="Dettes totales" value={formatFCFA(totalDettes)} color="red" />
        <StatCard label="Avec dette"
          value={suppliers.filter(s => supplierBalance(s.id) > 0).length} color="amber" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex-1 max-w-xs">
            <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un fournisseur…" />
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Chargement…</div>
        ) : withBalance.length === 0 ? (
          <EmptyState icon={Truck} title="Aucun fournisseur"
            action={<Btn icon={Plus} onClick={() => setModal(true)}>Ajouter</Btn>}
          />
        ) : (
          <div className="divide-y divide-gray-50">
            {withBalance.map(s => (
              <div key={s.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setSelected(s)}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-none bg-purple-500">
                  {(s.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.phone || s.address || '—'}</p>
                </div>
                <div className="text-right">
                  {s.balance !== 0 ? (
                    <>
                      <p className={`font-bold ${s.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatFCFA(Math.abs(s.balance))}
                      </p>
                      <p className="text-xs text-gray-400">{s.balance > 0 ? 'à payer' : 'crédit'}</p>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">Soldé</span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-none" />
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nouveau fournisseur" maxW="max-w-md">
        <form onSubmit={handleSubmit(onAddSupplier)} className="space-y-4">
          <FormField label="Nom du fournisseur" required>
            <input {...register('name', { required: 'Requis' })} placeholder="Ex: TATA, NOUHOU..." className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Téléphone">
              <input {...register('phone')} placeholder="97 16 69 11" className={inputCls} />
            </FormField>
            <FormField label="Adresse">
              <input {...register('address')} placeholder="Niamey" className={inputCls} />
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