import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowUpRight, Check, CreditCard, ShoppingBag, Store, TriangleAlert, Truck } from 'lucide-react'
import { useCart } from '@/context/cart'
import { useToast } from '@/context/toast'
import { useRestaurantData } from '@/hooks/data'
import { MAX_ORDER_LINES, createOrder } from '@/services/orders.service'
import type { FulfillmentMethod, Order, RestaurantSettings } from '@/types'
import { formatKes } from '@/utils/format'
import { cn } from '@/utils/cn'
import { Button, LinkButton } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { QtyStepper } from '@/components/ui/QtyStepper'
import { EmptyState, Skeleton } from '@/components/ui/States'

const AREAS = ['Kilimani', 'Lavington', 'Westlands', 'Kileleshwa', 'Other'] as const

const FULFILLMENT_OPTIONS: {
  value: FulfillmentMethod
  title: string
  description: string
  icon: typeof Store
}[] = [
  { value: 'pickup', title: 'Pickup', description: 'Collect from the dining room in Kilimani.', icon: Store },
  { value: 'delivery', title: 'Delivery', description: 'Brought to your door across Nairobi.', icon: Truck },
]

function buildOrderSchema(type: FulfillmentMethod) {
  return z
    .object({
      name: z.string().min(1, 'Please tell us who the order is for.'),
      phone: z
        .string()
        .min(1, 'We need a phone number to reach you.')
        .refine((value) => value.replace(/\D/g, '').length >= 9, 'Please enter a valid phone number.'),
      email: z.email('Enter a valid email address.'),
      address: z.string().max(300, 'Please keep the address under 300 characters.'),
      area: z.string(),
      deliveryNotes: z.string().max(300, 'Please keep notes under 300 characters.'),
    })
    .superRefine((value, ctx) => {
      if (type !== 'delivery') return
      if (value.address.trim().length < 8) {
        ctx.addIssue({
          code: 'custom',
          path: ['address'],
          message: 'Please add the full street address (at least 8 characters).',
        })
      }
      if (!value.area) {
        ctx.addIssue({ code: 'custom', path: ['area'], message: 'Please choose your delivery area.' })
      }
    })
}

type OrderFormValues = z.infer<ReturnType<typeof buildOrderSchema>>

function resolveType(type: FulfillmentMethod, settings: RestaurantSettings | null): FulfillmentMethod {
  if (!settings) return type
  if (type === 'pickup' && !settings.acceptPickup) return settings.acceptDelivery ? 'delivery' : 'pickup'
  if (type === 'delivery' && !settings.acceptDelivery) return settings.acceptPickup ? 'pickup' : 'delivery'
  return type
}

function friendlyOrderError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err ? (err as { code?: unknown }).code : undefined
  if (code === 'permission-denied') {
    return 'The restaurant could not validate this order. Please review your details and try again.'
  }
  if (err instanceof Error && err.message) return err.message
  return 'Something went wrong while placing your order. Please try again.'
}

export default function OrderPage() {
  const { lines, itemCount, subtotalKes, setQuantity, clear } = useCart()
  const { settings } = useRestaurantData()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [type, setType] = useState<FulfillmentMethod>('pickup')
  const [orderError, setOrderError] = useState<string | null>(null)
  const [placing, setPlacing] = useState(false)
  const [placed, setPlaced] = useState<Order | null>(null)

  const effectiveType = resolveType(type, settings)
  const isDelivery = effectiveType === 'delivery'
  const orderingClosed = Boolean(settings && !settings.acceptPickup && !settings.acceptDelivery)

  const schema = useMemo(() => buildOrderSchema(effectiveType), [effectiveType])
  const {
    register,
    handleSubmit,
    clearErrors,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '', address: '', area: '', deliveryNotes: '' },
  })

  const servicePercent = settings?.serviceChargePercent ?? 0
  const serviceChargeKes = Math.round((subtotalKes * servicePercent) / 100)
  const freeOver = settings?.freeDeliveryOverKes ?? null
  const deliveryFeeKes =
    isDelivery && settings ? (freeOver != null && subtotalKes >= freeOver ? 0 : settings.deliveryFeeKes) : 0
  const totalKes = subtotalKes + deliveryFeeKes + serviceChargeKes

  /* Short race: show the reference, then hand over to live tracking. */
  useEffect(() => {
    if (!placed) return
    const timer = window.setTimeout(
      () => navigate(`/order/${placed.reference}`, { replace: true }),
      1400,
    )
    return () => window.clearTimeout(timer)
  }, [placed, navigate])

  function chooseType(next: FulfillmentMethod) {
    setType(next)
    setOrderError(null)
    if (next !== 'delivery') clearErrors(['address', 'area'])
  }

  const onSubmit = handleSubmit(
    async (values) => {
      setOrderError(null)
      if (lines.length === 0) return
      if (lines.length > MAX_ORDER_LINES) {
        setOrderError(
          `A single order can contain at most ${MAX_ORDER_LINES} different dishes. Please remove some before ordering.`,
        )
        return
      }
      setPlacing(true)
      try {
        const order = await createOrder({
          type: effectiveType,
          lines: lines.map((line) => ({
            itemId: line.itemId,
            quantity: line.quantity,
            variantId: line.variantId,
            addonIds: line.addons.map((addon) => addon.id),
          })),
          customer: { name: values.name, phone: values.phone, email: values.email },
          delivery: isDelivery
            ? { address: values.address, area: values.area, notes: values.deliveryNotes }
            : null,
          paymentMethod: 'pay_on_collection',
        })
        clear()
        setPlaced(order)
        toast('Order placed — the kitchen has it.', 'success')
      } catch (err) {
        setOrderError(friendlyOrderError(err))
      } finally {
        setPlacing(false)
      }
    },
    () => toast('Please check the highlighted fields.', 'error'),
  )

  /* ---------------------------- confirmation ---------------------------- */
  if (placed) {
    return (
      <section className="editorial-width section-y">
        <div className="mx-auto max-w-xl rounded-3xl border border-line bg-paper px-6 py-12 text-center sm:px-10">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
            <Check className="size-8" aria-hidden />
          </div>
          <p className="label-caps mt-6 text-champagne">Order placed</p>
          <h1 className="text-section mt-3">The kitchen has your order.</h1>
          <p className="mt-4 text-body text-stone">Keep this reference — it updates live as we cook.</p>
          <p className="mt-6 text-kpi tabular-nums">{placed.reference}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton to={`/order/${placed.reference}`}>
              Track order
              <ArrowUpRight className="size-4" aria-hidden />
            </LinkButton>
            <LinkButton to="/menu" variant="secondary">
              Back to the menu
            </LinkButton>
          </div>
          <p className="mt-4 text-support text-stone">Taking you to live tracking…</p>
        </div>
      </section>
    )
  }

  /* ------------------------------ empty cart ----------------------------- */
  if (lines.length === 0) {
    return (
      <section className="editorial-width section-y">
        <h1 className="sr-only">Your order</h1>
        <EmptyState
          className="mx-auto max-w-2xl"
          icon={<ShoppingBag className="size-5" aria-hidden />}
          title="Your order is empty"
          description="Browse the menu and add a dish to begin - the kitchen is waiting."
          action={<LinkButton to="/menu">Explore the menu</LinkButton>}
        />
      </section>
    )
  }

  /* -------------------------------- checkout ----------------------------- */
  return (
    <section className="editorial-width pt-10 pb-16 md:pt-14">
      <p className="label-caps mb-5 text-champagne">Order online</p>
      <h1 className="text-page">
        Your order<span className="text-champagne">.</span>
      </h1>
      <p className="mt-5 max-w-xl text-lead text-stone">
        Choose pickup or delivery, tell us where to send it, and we will take it straight to the kitchen. Payment is
        collected on pickup or delivery.
      </p>

      {orderingClosed && (
        <div
          role="alert"
          className="mt-7 flex items-start gap-3 rounded-2xl border border-error/30 bg-error-soft px-5 py-4"
        >
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-error" aria-hidden />
          <p className="text-support text-error">
            Online ordering is temporarily unavailable. Please call the restaurant to order.
          </p>
        </div>
      )}

      <div className="mt-9 grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          {/* Fulfilment */}
          <div className="rounded-2xl border border-line bg-paper p-6 sm:p-7">
            <h2 className="text-card">Fulfilment</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {FULFILLMENT_OPTIONS.map((option) => {
                const active = effectiveType === option.value
                const disabled = settings
                  ? option.value === 'pickup'
                    ? !settings.acceptPickup
                    : !settings.acceptDelivery
                  : false
                const Icon = option.icon
                return (
                  <label
                    key={option.value}
                    className={cn(
                      'relative flex cursor-pointer gap-4 rounded-2xl border p-5 transition-colors',
                      'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
                      disabled
                        ? 'cursor-not-allowed border-line bg-ivory/60 opacity-70'
                        : active
                          ? 'border-ink bg-ivory shadow-card'
                          : 'border-line bg-paper hover:border-stone/50',
                    )}
                  >
                    <input
                      type="radio"
                      name="fulfilment"
                      className="sr-only"
                      checked={active}
                      disabled={disabled}
                      onChange={() => chooseType(option.value)}
                    />
                    <Icon className="mt-0.5 size-5 shrink-0 text-champagne" aria-hidden />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-[15px] font-medium">
                        {option.title}
                        {active && <Check className="size-4" aria-hidden />}
                      </span>
                      <span className="mt-1 block text-support text-stone">{option.description}</span>
                      {disabled && (
                        <span className="mt-1 block text-support text-error">
                          Currently unavailable — please call us.
                        </span>
                      )}
                      {option.value === 'delivery' && !disabled && settings?.freeDeliveryOverKes != null && (
                        <span className="mt-1 block text-support text-stone">
                          Free over {formatKes(settings.freeDeliveryOverKes)}
                        </span>
                      )}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Items */}
          <div className="rounded-2xl border border-line bg-paper">
            <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-5">
              <h2 className="text-card">
                Your items
                <span className="ml-3 text-support font-sans text-stone">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>
              </h2>
              <Link
                to="/menu"
                className="shrink-0 text-[13px] font-medium underline-offset-4 hover:underline"
              >
                Add more dishes →
              </Link>
            </div>
            <ul className="divide-y divide-line px-6">
              {lines.map((line) => (
                <li key={line.key} className="flex gap-4 py-5">
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-line/40">
                    {line.imageUrl && (
                      <img
                        src={line.imageUrl}
                        alt=""
                        loading="lazy"
                        width={128}
                        height={128}
                        className="size-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[15px] font-medium">{line.name}</p>
                      <p className="shrink-0 text-[15px] font-medium tabular-nums">
                        {formatKes(line.unitPriceKes * line.quantity)}
                      </p>
                    </div>
                    {(line.variantName || line.addons.length > 0) && (
                      <p className="mt-0.5 truncate text-support text-stone">
                        {[line.variantName, ...line.addons.map((a) => a.name)].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <div className="mt-3">
                      <QtyStepper
                        value={line.quantity}
                        onChange={(q) => setQuantity(line.key, q)}
                        size="sm"
                        min={0}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-6 py-4">
              <Link to="/menu" className="text-[13px] font-medium text-stone underline-offset-4 hover:text-ink hover:underline">
                ← Keep browsing the menu
              </Link>
            </div>
          </div>

          {/* Details */}
          <form id="checkout" noValidate onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-line bg-paper p-6 sm:p-7">
            <div>
              <h2 className="text-card">Your details</h2>
              <p className="mt-2 text-support text-stone">
                Only what we need to prepare, call about, and deliver your order.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name" required error={errors.name?.message}>
                {(id) => (
                  <Input
                    id={id}
                    autoComplete="name"
                    placeholder="Full name"
                    invalid={Boolean(errors.name)}
                    {...register('name')}
                  />
                )}
              </Field>
              <Field label="Phone" required error={errors.phone?.message} hint="We may call if anything is unclear.">
                {(id) => (
                  <Input
                    id={id}
                    type="tel"
                    autoComplete="tel"
                    placeholder="07xx xxx xxx"
                    invalid={Boolean(errors.phone)}
                    {...register('phone')}
                  />
                )}
              </Field>
              <Field label="Email" required error={errors.email?.message} className="sm:col-span-2">
                {(id) => (
                  <Input
                    id={id}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    invalid={Boolean(errors.email)}
                    {...register('email')}
                  />
                )}
              </Field>

              {isDelivery && (
                <>
                  <Field
                    label="Street address"
                    required
                    error={errors.address?.message}
                    hint="House or building, street, and any landmarks."
                    className="sm:col-span-2"
                  >
                    {(id) => (
                      <Input
                        id={id}
                        autoComplete="street-address"
                        placeholder="e.g. 14 Ring Road, Kilimani"
                        invalid={Boolean(errors.address)}
                        {...register('address')}
                      />
                    )}
                  </Field>
                  <Field label="Area" required error={errors.area?.message}>
                    {(id) => (
                      <Select id={id} invalid={Boolean(errors.area)} {...register('area')}>
                        <option value="">Choose your area</option>
                        {AREAS.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  <Field
                    label="Delivery notes"
                    hint="Optional — gate codes, floor, where to knock."
                    error={errors.deliveryNotes?.message}
                  >
                    {(id) => <Textarea id={id} rows={2} placeholder="Optional" {...register('deliveryNotes')} />}
                  </Field>
                </>
              )}
            </div>

            {/* Enables Enter-to-submit from the details form. */}
            <button type="submit" tabIndex={-1} aria-hidden className="sr-only">
              Place order
            </button>
          </form>

          {/* Payment */}
          <div className="rounded-2xl border border-champagne/50 bg-champagne-soft/40 p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <p className="label-caps text-[#8a6f42]">Demo checkout</p>
              <CreditCard className="size-4 text-[#8a6f42]" aria-hidden />
            </div>
            <h2 className="text-card mt-3">Payment</h2>
            <label
              className={cn(
                'mt-4 flex cursor-pointer gap-3 rounded-2xl border border-ink/15 bg-paper p-4 transition-colors',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
              )}
            >
              <input
                type="radio"
                name="payment"
                value="pay_on_collection"
                defaultChecked
                readOnly
                className="sr-only"
              />
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-ink">
                <span className="size-2.5 rounded-full bg-ink" />
              </span>
              <span>
                <span className="block text-[15px] font-medium">
                  Pay on collection — cash or M-Pesa on pickup/delivery
                </span>
                <span className="mt-1 block text-support text-stone">
                  No online payment is processed in this demo.
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* Totals */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-line bg-paper p-6 sm:p-7 lg:sticky lg:top-28">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-card">Order summary</h2>
              <span className="text-support text-stone">
                {lines.length} {lines.length === 1 ? 'dish' : 'dishes'}
              </span>
            </div>

            <dl className="mt-5 space-y-3 text-[15px]">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-stone">Subtotal</dt>
                <dd className="font-medium tabular-nums">{formatKes(subtotalKes)}</dd>
              </div>

              {isDelivery && (
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-stone">
                    Delivery fee
                    {freeOver != null && settings && (
                      <span className="block text-[12px] text-stone/80">Free over {formatKes(freeOver)}</span>
                    )}
                  </dt>
                  <dd className="text-right">
                    {settings === null ? (
                      <Skeleton className="h-5 w-20" />
                    ) : (
                      <span className={cn('font-medium tabular-nums', deliveryFeeKes === 0 && 'text-success')}>
                        {deliveryFeeKes === 0 ? 'Free' : formatKes(deliveryFeeKes)}
                      </span>
                    )}
                  </dd>
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <dt className="text-stone">
                  Service charge
                  {settings && <span className="text-[12px] text-stone/80"> ({servicePercent}%)</span>}
                </dt>
                <dd className="text-right">
                  {settings === null ? (
                    <Skeleton className="h-5 w-20" />
                  ) : (
                    <span className="font-medium tabular-nums">{formatKes(serviceChargeKes)}</span>
                  )}
                </dd>
              </div>

              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
                <dt className="text-[15px] font-medium">Total</dt>
                <dd className="text-xl font-medium tabular-nums">{formatKes(totalKes)}</dd>
              </div>
            </dl>

            <p className="mt-4 text-support text-stone">
              Prices are re-validated by the server when you place the order.
            </p>

            {orderError && (
              <div role="alert" className="mt-5 rounded-2xl border border-error/30 bg-error-soft px-4 py-3">
                <div className="flex items-start gap-3">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-error" aria-hidden />
                  <p className="text-support text-error">{orderError}</p>
                </div>
              </div>
            )}

            <Button
              type="submit"
              form="checkout"
              size="lg"
              className="mt-5 w-full"
              loading={placing}
              disabled={orderingClosed}
            >
              Place order · {formatKes(totalKes)}
            </Button>
            <p className="mt-3 text-center text-support text-stone">
              Pay on collection — cash or M-Pesa.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
