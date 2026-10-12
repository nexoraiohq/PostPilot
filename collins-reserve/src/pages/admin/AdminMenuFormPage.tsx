import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, ImageOff, Plus, Star, Trash2 } from 'lucide-react'
import { useMenuData } from '@/hooks/data'
import { useToast } from '@/context/toast'
import { Badge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { EmptyState, PageLoading } from '@/components/ui/States'
import { createMenuItem, updateMenuItem } from '@/services/menu.service'
import { formatKes } from '@/utils/format'
import { cn } from '@/utils/cn'
import { DIETARY_LABELS, type DietaryTag, type MenuItem } from '@/types'
import { Card, PageHead, errorMessage } from '@/pages/admin/_adminui'

const DIETARY_KEYS = ['vegetarian', 'vegan', 'gluten_free', 'spicy', 'nuts', 'dairy', 'shellfish'] as const

const IMAGE_SUGGESTIONS = [
  'photo-1414235077428-338989a2e8c0',
  'photo-1504674900247-0877df9cc836',
  'photo-1540189549336-e6e99c3679fe',
  'photo-1467003909585-2f8a72700288',
  'photo-1473093295043-cdd812d0e601',
  'photo-1578985545062-69928b1d9587',
]

function suggestionUrl(id: string): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`
}

const variantSchema = z.object({
  name: z.string().trim().min(1, 'Option name required').max(60, 'Up to 60 characters'),
  priceDeltaKes: z
    .number({ error: 'Enter an amount' })
    .int('Whole shillings only')
    .min(-1000000, 'Check this amount')
    .max(1000000, 'Check this amount'),
})

const addonSchema = z.object({
  name: z.string().trim().min(1, 'Add-on name required').max(60, 'Up to 60 characters'),
  priceKes: z
    .number({ error: 'Enter an amount' })
    .int('Whole shillings only')
    .min(0, 'Cannot be negative')
    .max(1000000, 'Check this amount'),
})

const dishSchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .trim()
    .min(2, 'At least 2 characters')
    .max(120, 'Up to 120 characters'),
  description: z
    .string({ error: 'Description is required' })
    .trim()
    .min(2, 'At least 2 characters')
    .max(600, 'Up to 600 characters'),
  categoryId: z.string({ error: 'Choose a category' }).min(1, 'Choose a category'),
  priceKes: z
    .number({ error: 'Enter a price' })
    .int('Enter whole shillings')
    .min(50, 'Minimum KES 50')
    .max(1000000, 'Maximum KES 1,000,000'),
  imageUrl: z
    .string({ error: 'Image URL is required' })
    .trim()
    .min(1, 'Image URL is required')
    .max(600, 'Up to 600 characters')
    .refine((value) => /^https?:\/\/\S+$/.test(value), 'Enter a valid URL starting with https://'),
  sortOrder: z
    .number({ error: 'Enter a sort order' })
    .int('Whole numbers only')
    .min(0, 'Cannot be negative')
    .max(9999, 'Maximum 9999'),
  available: z.boolean(),
  featured: z.boolean(),
  allergenNoteSample: z.boolean(),
  tags: z.array(z.enum(DIETARY_KEYS)),
  variants: z.array(variantSchema).max(3, 'Up to 3 options'),
  addons: z.array(addonSchema).max(3, 'Up to 3 add-ons'),
})

type DishForm = z.infer<typeof dishSchema>

function describeError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  if (raw.includes('permission-denied') || raw.includes('Permissions')) {
    return 'You do not have permission to make this change.'
  }
  if (raw.includes('unavailable') || raw.includes('network')) {
    return 'The network is unavailable. Please try again.'
  }
  return raw.replace(/^Firebase:\s*/g, '') || 'Something went wrong.'
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function emptyForm(categoryId: string): DishForm {
  return {
    name: '',
    description: '',
    categoryId,
    priceKes: 0,
    imageUrl: '',
    sortOrder: 0,
    available: true,
    featured: false,
    allergenNoteSample: false,
    tags: [],
    variants: [],
    addons: [],
  }
}

function itemToForm(item: MenuItem, fallbackCategory: string): DishForm {
  return {
    name: item.name,
    description: item.description,
    categoryId: item.categoryId || fallbackCategory,
    priceKes: item.priceKes,
    imageUrl: item.imageUrl,
    sortOrder: item.sortOrder,
    available: item.available,
    featured: item.featured,
    allergenNoteSample: item.allergenNoteSample ?? false,
    tags: item.tags ?? [],
    variants: (item.variants ?? []).map((v) => ({ name: v.name, priceDeltaKes: v.priceDeltaKes })),
    addons: (item.addons ?? []).map((a) => ({ name: a.name, priceKes: a.priceKes })),
  }
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-ink">{label}</p>
        {hint && <p className="text-support text-stone">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-10 w-[52px] shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-ink' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'absolute top-1.5 left-1.5 size-7 rounded-full bg-paper shadow-[0_1px_3px_rgba(23,23,21,0.25)] transition-transform duration-200',
            checked && 'translate-x-[22px]',
          )}
        />
      </button>
    </div>
  )
}

export default function AdminMenuFormPage() {
  const { id } = useParams<{ id: string }>()
  const editing = Boolean(id)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { categories, itemById, loading, error } = useMenuData()

  const item = id ? itemById(id) : undefined
  const [saving, setSaving] = useState(false)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const initialized = useRef<string | null>(null)

  const preselect = searchParams.get('category') ?? ''
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DishForm>({
    resolver: zodResolver(dishSchema),
    defaultValues: emptyForm(preselect),
  })

  const variantArray = useFieldArray({ control, name: 'variants' })
  const addonArray = useFieldArray({ control, name: 'addons' })
  const watched = useWatch({ control })

  useEffect(() => {
    if (!editing) {
      if (initialized.current !== null) {
        initialized.current = null
        reset(emptyForm(preselect))
      }
      return
    }
    if (initialized.current === id || loading || !item) return
    initialized.current = id ?? null
    reset(itemToForm(item, preselect))
  }, [editing, id, item, loading, preselect, reset])

  const imageUrl = watched.imageUrl ?? ''
  const tags: DietaryTag[] = watched.tags ?? []
  const featured = watched.featured ?? false
  const available = watched.available ?? true
  const categoryName = categories.find((c) => c.id === (watched.categoryId ?? ''))?.name

  const imgFailed = imageUrl !== '' && failedSource === imageUrl

  const onSubmit = handleSubmit(async (values) => {
    if (!id && categories.length === 0) {
      toast('Add a category before adding dishes.', 'error')
      return
    }
    setSaving(true)
    const payload = {
      ...values,
      priceKes: Math.round(values.priceKes),
      sortOrder: Math.round(values.sortOrder),
      variants: values.variants.map((v, index) => ({
        id: item?.variants?.[index]?.id ?? newId(),
        name: v.name,
        priceDeltaKes: Math.round(v.priceDeltaKes),
      })),
      addons: values.addons.map((a, index) => ({
        id: item?.addons?.[index]?.id ?? newId(),
        name: a.name,
        priceKes: Math.round(a.priceKes),
      })),
    }
    try {
      if (id) {
        await updateMenuItem(id, payload)
        toast('Dish updated', 'success')
      } else {
        await createMenuItem(payload)
        toast('Dish added to the menu', 'success')
      }
      navigate('/admin/menu')
    } catch (e) {
      toast(describeError(e), 'error')
      setSaving(false)
    }
  })

  const header = (
    <PageHead
      title={editing ? 'Edit dish' : 'New dish'}
      subtitle={
        editing
          ? 'Update the dish as it appears on the public menu.'
          : 'Add a dish to the menu. It appears publicly as soon as it is saved.'
      }
      actions={
        <LinkButton to="/admin/menu" variant="secondary">
          <ArrowLeft className="size-4" aria-hidden />
          Back to menu
        </LinkButton>
      }
    />
  )

  if (error) {
    return (
      <>
        {header}
        <EmptyState
          title="Couldn’t load the menu"
          description={errorMessage(error, 'Something went wrong while loading this dish.')}
          action={
            <LinkButton to="/admin/menu" variant="secondary">
              Back to menu
            </LinkButton>
          }
        />
      </>
    )
  }

  if (editing && loading) return <PageLoading label="Loading dish" />

  if (editing && !item) {
    return (
      <>
        {header}
        <EmptyState
          title="Dish not found"
          description="This dish may have been deleted, or the link is no longer valid."
          action={<LinkButton to="/admin/menu">Back to menu</LinkButton>}
        />
      </>
    )
  }

  if (!editing && !loading && categories.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          title="No categories yet"
          description="Create a category on the menu page before adding dishes."
          action={<LinkButton to="/admin/menu">Manage categories</LinkButton>}
        />
      </>
    )
  }

  const watchedTags: DietaryTag[] = tags ?? []

  return (
    <>
      {header}

      <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          <Card>
            <h2 className="text-card">Dish details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Name" required error={errors.name?.message} className="sm:col-span-2">
                {(fieldId) => (
                  <Input id={fieldId} maxLength={120} placeholder="Charred aubergine, tahini" {...register('name')} />
                )}
              </Field>
              <Field label="Description" required error={errors.description?.message} className="sm:col-span-2">
                {(fieldId) => (
                  <Textarea
                    id={fieldId}
                    rows={3}
                    maxLength={600}
                    placeholder="How it is cooked, what comes with it."
                    {...register('description')}
                  />
                )}
              </Field>
              <Field label="Category" required error={errors.categoryId?.message}>
                {(fieldId) => (
                  <Select id={fieldId} {...register('categoryId')}>
                    <option value="">Choose a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Price (KES)" required error={errors.priceKes?.message} hint="Whole shillings, 50–1,000,000">
                {(fieldId) => (
                  <Input
                    id={fieldId}
                    type="number"
                    inputMode="numeric"
                    step={1}
                    min={50}
                    max={1000000}
                    placeholder="0"
                    {...register('priceKes', { valueAsNumber: true })}
                  />
                )}
              </Field>
              <Field label="Sort order" required error={errors.sortOrder?.message} hint="Lower numbers appear first">
                {(fieldId) => (
                  <Input
                    id={fieldId}
                    type="number"
                    inputMode="numeric"
                    step={1}
                    min={0}
                    {...register('sortOrder', { valueAsNumber: true })}
                  />
                )}
              </Field>
              <Field label="Image URL" required error={errors.imageUrl?.message} className="sm:col-span-2">
                {(fieldId) => (
                  <Input
                    id={fieldId}
                    type="url"
                    maxLength={600}
                    placeholder="https://images.unsplash.com/…"
                    {...register('imageUrl')}
                  />
                )}
              </Field>
            </div>

            <div className="mt-4">
              <p className="text-[13px] font-medium text-ink">Or pick a verified photo</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {IMAGE_SUGGESTIONS.map((photoId) => (
                  <button
                    key={photoId}
                    type="button"
                    onClick={() => setValue('imageUrl', suggestionUrl(photoId), { shouldDirty: true, shouldValidate: true })}
                    aria-label={`Use suggested photo ${photoId}`}
                    className={cn(
                      'size-14 overflow-hidden rounded-xl border transition-colors',
                      imageUrl === suggestionUrl(photoId) ? 'border-ink' : 'border-line hover:border-stone',
                    )}
                  >
                    <img
                      src={suggestionUrl(photoId).replace('w=900', 'w=200')}
                      alt=""
                      loading="lazy"
                      width={200}
                      height={200}
                      className="size-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-card">Dietary tags</h2>
            <p className="mt-1 text-support text-stone">Shown as badges on the public menu.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(Object.keys(DIETARY_LABELS) as DietaryTag[]).map((tag) => (
                <Checkbox
                  key={tag}
                  label={DIETARY_LABELS[tag]}
                  checked={watchedTags.includes(tag)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...watchedTags, tag]
                      : watchedTags.filter((t) => t !== tag)
                    setValue('tags', next, { shouldDirty: true, shouldValidate: true })
                  }}
                />
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-card">Options</h2>
                <p className="mt-1 text-support text-stone">
                  Variants change the price (e.g. half / full). Add-ons are extras. Up to 3 of each.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="label-caps text-stone">Variants</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={variantArray.fields.length >= 3}
                  onClick={() => variantArray.append({ name: '', priceDeltaKes: 0 })}
                >
                  <Plus className="size-3.5" aria-hidden />
                  Add variant
                </Button>
              </div>
              {variantArray.fields.length === 0 ? (
                <p className="mt-3 text-support text-stone">No variants — the dish is sold as one size.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {variantArray.fields.map((row, index) => (
                    <div key={row.id} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_10rem_2.5rem]">
                      <Field label={`Variant ${index + 1} name`} error={errors.variants?.[index]?.name?.message}>
                        {(fieldId) => (
                          <Input
                            id={fieldId}
                            maxLength={60}
                            placeholder="Half portion"
                            {...register(`variants.${index}.name`)}
                          />
                        )}
                      </Field>
                      <Field label="Price delta (KES)" error={errors.variants?.[index]?.priceDeltaKes?.message}>
                        {(fieldId) => (
                          <Input
                            id={fieldId}
                            type="number"
                            inputMode="numeric"
                            step={1}
                            placeholder="0"
                            {...register(`variants.${index}.priceDeltaKes`, { valueAsNumber: true })}
                          />
                        )}
                      </Field>
                      <div className="flex items-end pb-1">
                        <button
                          type="button"
                          aria-label={`Remove variant ${index + 1}`}
                          onClick={() => variantArray.remove(index)}
                          className="inline-flex size-10 items-center justify-center rounded-xl border border-line text-stone transition-colors hover:border-error/40 hover:bg-error-soft hover:text-error"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {errors.variants?.message && (
                <p role="alert" className="mt-2 text-support text-error">
                  {errors.variants.message}
                </p>
              )}
            </div>

            <div className="mt-6 border-t border-line pt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="label-caps text-stone">Add-ons</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={addonArray.fields.length >= 3}
                  onClick={() => addonArray.append({ name: '', priceKes: 0 })}
                >
                  <Plus className="size-3.5" aria-hidden />
                  Add add-on
                </Button>
              </div>
              {addonArray.fields.length === 0 ? (
                <p className="mt-3 text-support text-stone">No add-ons for this dish.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {addonArray.fields.map((row, index) => (
                    <div key={row.id} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_10rem_2.5rem]">
                      <Field label={`Add-on ${index + 1} name`} error={errors.addons?.[index]?.name?.message}>
                        {(fieldId) => (
                          <Input
                            id={fieldId}
                            maxLength={60}
                            placeholder="Extra avocado"
                            {...register(`addons.${index}.name`)}
                          />
                        )}
                      </Field>
                      <Field label="Price (KES)" error={errors.addons?.[index]?.priceKes?.message}>
                        {(fieldId) => (
                          <Input
                            id={fieldId}
                            type="number"
                            inputMode="numeric"
                            step={1}
                            min={0}
                            placeholder="0"
                            {...register(`addons.${index}.priceKes`, { valueAsNumber: true })}
                          />
                        )}
                      </Field>
                      <div className="flex items-end pb-1">
                        <button
                          type="button"
                          aria-label={`Remove add-on ${index + 1}`}
                          onClick={() => addonArray.remove(index)}
                          className="inline-flex size-10 items-center justify-center rounded-xl border border-line text-stone transition-colors hover:border-error/40 hover:bg-error-soft hover:text-error"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {errors.addons?.message && (
                <p role="alert" className="mt-2 text-support text-error">
                  {errors.addons.message}
                </p>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-card">Visibility</h2>
            <div className="mt-3">
              <ToggleRow
                label="Available"
                hint="Off means sold out — the dish stays visible but cannot be ordered."
                checked={available}
                onChange={(next) => setValue('available', next, { shouldDirty: true, shouldValidate: true })}
              />
              <ToggleRow
                label="Featured"
                hint="Featured dishes appear on the home page."
                checked={featured}
                onChange={(next) => setValue('featured', next, { shouldDirty: true, shouldValidate: true })}
              />
              <ToggleRow
                label="Sample allergen info"
                hint="Shows the demo allergen notice on the public menu."
                checked={watched.allergenNoteSample ?? false}
                onChange={(next) =>
                  setValue('allergenNoteSample', next, { shouldDirty: true, shouldValidate: true })
                }
              />
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <LinkButton to="/admin/menu" variant="ghost">
              Cancel
            </LinkButton>
            <Button type="submit" loading={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add dish'}
            </Button>
          </div>
        </div>

        <aside className="lg:col-span-5 xl:col-span-4">
          <div className="lg:sticky lg:top-8">
            <p className="label-caps mb-3 text-stone">Public menu preview</p>
            <div className="overflow-hidden rounded-2xl border border-line bg-paper">
              <div className="relative aspect-[4/5] bg-line/40">
                {imageUrl && !imgFailed ? (
                  <img
                    src={imageUrl}
                    alt=""
                    onError={() => setFailedSource(imageUrl)}
                    className="size-full object-cover"
                    width={900}
                    height={1125}
                  />
                ) : (
                  <div className="flex size-full flex-col items-center justify-center gap-2 text-stone">
                    <ImageOff className="size-5" aria-hidden />
                    <span className="text-support">No image yet</span>
                  </div>
                )}
                {watchedTags.length > 0 && (
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    {watchedTags.slice(0, 2).map((tag) => (
                      <Badge key={tag} className="bg-paper/90 text-ink backdrop-blur">
                        {DIETARY_LABELS[tag]}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-card">{watched.name || 'Dish name'}</h3>
                  <span className="whitespace-nowrap text-[15px] font-medium tabular-nums">
                    {formatKes(Math.round(watched.priceKes || 0))}
                  </span>
                </div>
                <p className="mt-2 text-support text-stone line-clamp-3">
                  {watched.description || 'A short, appetising description goes here.'}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  <Badge tone="champagne">{categoryName ?? 'Category'}</Badge>
                  {featured && (
                    <Badge tone="champagne">
                      <Star className="size-3" aria-hidden />
                      Featured
                    </Badge>
                  )}
                  <Badge tone={available ? 'success' : 'error'}>{available ? 'Available' : 'Sold out'}</Badge>
                </div>
              </div>
            </div>
            <Link
              to="/menu"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium underline-offset-4 hover:underline"
            >
              Open the public menu
            </Link>
          </div>
        </aside>
      </form>
    </>
  )
}
