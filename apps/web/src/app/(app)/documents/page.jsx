'use client'

import Link from 'next/link'
import {
  FileText,
  Receipt,
  Truck,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react'

const docs = [
  {
    title: 'Facture proforma',
    description: 'Choisir une vente existante puis générer une proforma.',
    href: '/ventes?document=proforma',
    icon: FileText,
  },
  {
    title: 'Facture définitive',
    description: 'Choisir une vente existante puis générer une facture.',
    href: '/ventes?document=facture',
    icon: Receipt,
  },
  {
    title: 'Bon de livraison',
    description: 'Choisir une vente existante puis imprimer le bon de livraison.',
    href: '/bons-livraison',
    icon: Truck,
  },
  {
    title: 'Bon de commande',
    description: 'Choisir une entrée de stock existante puis imprimer le bon de commande.',
    href: '/bons-commande',
    icon: ShoppingBag,
  },
]

export default function DocumentsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-500 text-sm mt-1">
          Choisissez le type de document commercial à créer ou à imprimer.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {docs.map(({ title, description, href, icon: Icon }) => (
          <Link
            key={title}
            href={href}
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Icon className="w-5 h-5" />
            </div>

            <h2 className="font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">{description}</p>

            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600">
              Ouvrir
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}