import { useState } from 'react'
import { Info, ShoppingBag } from 'lucide-react'
import { useCart } from '@/context/cart'
import { useToast } from '@/context/toast'
import { MAX_ORDER_LINES } from '@/services/orders.service'
import { DIETARY_LABELS, type MenuItem } from '@/types'
import { formatKes } from '@/utils/format'
import { cn } from '@/utils/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { QtyStepper } from '@/components/ui/QtyStepper'

export interface DishDetailModalProps {
  item: MenuItem | null
  onClose: () => void
}

/**
 * Detail dialog for a single dish: large photo, full description,
 * variants, add-ons and a live line total before adding to the cart.
 * The caller should mount it with `key={item.id}` so selections reset per dish.
 */
export function DishDetailModal({ item, onClose }: DishDetailModalProps) {
  const { lines, addLine } = useCart()
  const { toast } = useToast()
  const [quantity, setQuantity] = useState(1)
  const [variantId, setVariantId] = useState<string | null>(item?.variants[0]?.id ?? null)
  const [addonIds, setAddonIds] = useState<string[]>([])

  if (!item) return null

  const variant =
    item.variants.length > 0 ? (item.variants.find((v) => v.id === variantId) ?? item.variants[0]) : null
  const selectedAddons = item.addons.filter((a) => addonIds.includes(a.id))
  const unitPriceKes =
    item.priceKes + (variant?.priceDeltaKes ?? 0) + selectedAddons.reduce((sum, a) => sum + a.priceKes, 0)
  const lineTotalKes = unitPriceKes * quantity

  function toggleAddon(id: string) {
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]))
  }

  function handleAdd() {
    if (!item || !item.available) return
    const alreadyInOrder = lines.some((l) => l.itemId === item.id)
    if (!alreadyInOrder && lines.length >= MAX_ORDER_LINES) {
      toast(`An order can hold at most ${MAX_ORDER_LINES} different dishes.`, 'error')
      return
    }
    addLine(item, { quantity, variant, addons: selectedAddons })
    toast(`${item.name} added to your order`, 'success')
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={item.name} wide>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-line/40">
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            className={cn('aspect-[4/3] w-full object-cover', !item.available && 'grayscale opacity-60')}
          />
          {!item.available && (
            <Badge tone="error" className="absolute left-4 top-4 shadow-sm">
              Sold out
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-line pb-5">
          <p className="text-xl font-medium tabular-nums">{formatKes(item.priceKes)}</p>
          <p className="text-support text-stone">
            {variant ? `Plus ${variant.name.toLowerCase()} option` : 'Base price before add-ons'}
          </p>
        </div>

        <p className="text-body leading-relaxed text-stone">{item.description}</p>

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <Badge key={tag} tone="champagne">
                {DIETARY_LABELS[tag]}
              </Badge>
            ))}
          </div>
        )}

        {item.allergenNoteSample && (
          <p className="flex items-start gap-2.5 rounded-xl bg-ivory px-4 py-3 text-support text-stone">
            <Info className="mt-0.5 size-4 shrink-0 text-champagne" aria-hidden />
            <span>Allergen details are sample content for this demo — please ask the team.</span>
          </p>
        )}

        {item.variants.length > 0 && (
          <fieldset>
            <legend className="label-caps mb-3 text-stone">Choose an option</legend>
            <div className="flex flex-wrap gap-2">
              {item.variants.map((v) => {
                const active = v.id === variant?.id
                return (
                  <label
                    key={v.id}
                    className={cn(
                      'cursor-pointer rounded-full border px-4 py-2.5 text-[14px] transition-colors',
                      active ? 'border-ink bg-ink text-ivory' : 'border-line bg-paper hover:border-stone/50',
                    )}
                  >
                    <input
                      type="radio"
                      name="dish-variant"
                      className="peer sr-only"
                      checked={active}
                      onChange={() => setVariantId(v.id)}
                    />
                    <span className="flex items-center gap-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ink">
                      {v.name}
                      {v.priceDeltaKes !== 0 && (
                        <span className={cn('tabular-nums', active ? 'text-ivory/70' : 'text-stone')}>
                          {v.priceDeltaKes > 0 ? '+' : '−'} {formatKes(Math.abs(v.priceDeltaKes))}
                        </span>
                      )}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}

        {item.addons.length > 0 && (
          <fieldset>
            <legend className="label-caps mb-3 text-stone">Add-ons</legend>
            <div className="space-y-2.5">
              {item.addons.map((a) => (
                <Checkbox
                  key={a.id}
                  className="rounded-xl border border-line bg-paper px-4 py-3 transition-colors hover:border-stone/40"
                  checked={addonIds.includes(a.id)}
                  onChange={() => toggleAddon(a.id)}
                  label={
                    <span className="flex w-full items-center justify-between gap-4">
                      <span>{a.name}</span>
                      <span className="tabular-nums text-stone">+ {formatKes(a.priceKes)}</span>
                    </span>
                  }
                />
              ))}
            </div>
          </fieldset>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-ivory px-5 py-4">
          <QtyStepper value={quantity} onChange={setQuantity} min={1} max={20} />
          <div className="text-right">
            <p className="label-caps text-stone">Line total</p>
            <p className="text-xl font-medium tabular-nums">{formatKes(lineTotalKes)}</p>
          </div>
        </div>

        {!item.available && (
          <p className="rounded-xl bg-error-soft px-4 py-3 text-support text-error">
            This dish is sold out right now. Please ask the team about today&apos;s alternatives.
          </p>
        )}

        <Button size="lg" className="w-full" onClick={handleAdd} disabled={!item.available}>
          <ShoppingBag className="size-4" aria-hidden />
          {item.available ? 'Add to order' : 'Currently unavailable'}
        </Button>
      </div>
    </Modal>
  )
}
