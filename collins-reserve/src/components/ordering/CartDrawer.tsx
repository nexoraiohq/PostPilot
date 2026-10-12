import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useCart } from '@/context/cart'
import { formatKes } from '@/utils/format'
import { Drawer } from '@/components/ui/Modal'
import { QtyStepper } from '@/components/ui/QtyStepper'
import { EmptyState } from '@/components/ui/States'
import { buttonStyles } from '@/components/ui/Button'
import { ShoppingBag } from 'lucide-react'

export function CartDrawer() {
  const { isOpen, closeCart, lines, subtotalKes, setQuantity, removeLine, itemCount } = useCart()

  return (
    <Drawer open={isOpen} onClose={closeCart} title={`Your order${itemCount ? ` · ${itemCount}` : ''}`}>
      {lines.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={<ShoppingBag className="size-5" aria-hidden />}
            title="Your order is empty"
            description="Browse the menu and add a dish to begin. The kitchen is waiting."
            action={
              <Link to="/menu" onClick={closeCart} className={buttonStyles('primary', 'md')}>
                Explore the menu
              </Link>
            }
          />
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <ul className="divide-y divide-line px-6">
            {lines.map((line) => (
              <li key={line.key} className="flex gap-4 py-5">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-line/40">
                  {line.imageUrl && (
                    <img src={line.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-medium">{line.name}</p>
                    <button
                      type="button"
                      aria-label={`Remove ${line.name}`}
                      onClick={() => removeLine(line.key)}
                      className="rounded-md p-1.5 text-stone transition-colors hover:bg-error-soft hover:text-error"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                  {(line.variantName || line.addons.length > 0) && (
                    <p className="mt-0.5 truncate text-support text-stone">
                      {[line.variantName, ...line.addons.map((a) => a.name)].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <QtyStepper
                      value={line.quantity}
                      onChange={(q) => setQuantity(line.key, q)}
                      size="sm"
                      min={0}
                      label={line.name}
                    />
                    <span className="text-sm font-medium tabular-nums">{formatKes(line.unitPriceKes * line.quantity)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-auto border-t border-line bg-ivory px-6 py-6">
            <div className="flex items-baseline justify-between">
              <span className="text-support tracking-[0.08em] text-stone uppercase">Subtotal</span>
              <span className="text-lg font-medium tabular-nums">{formatKes(subtotalKes)}</span>
            </div>
            <p className="mt-1 text-support text-stone">
              Fees and total are confirmed at checkout. Payments are collected on pickup or delivery in this demo.
            </p>
            <Link
              to="/order"
              onClick={closeCart}
              className={buttonStyles('primary', 'lg', 'mt-4 w-full')}
            >
              Continue to checkout
            </Link>
            <button type="button" onClick={closeCart} className="mt-2 w-full py-2 text-support text-stone hover:text-ink">
              Keep browsing the menu
            </button>
          </div>
        </div>
      )}
    </Drawer>
  )
}
