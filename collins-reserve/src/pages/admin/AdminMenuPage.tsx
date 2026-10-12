import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useMenuData } from '@/hooks/data'
import { useToast } from '@/context/toast'
import { Badge } from '@/components/ui/Badge'
import { Button, LinkButton } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, Skeleton } from '@/components/ui/States'
import { formatKes } from '@/utils/format'
import { cn } from '@/utils/cn'
import {
  createCategory,
  deleteCategory,
  deleteMenuItem,
  reorderMenuItems,
  updateCategory,
  updateMenuItem,
} from '@/services/menu.service'
import { DIETARY_LABELS, type MenuCategory, type MenuItem } from '@/types'
import { Card, ConfirmDialog, KpiCard, PageHead } from '@/pages/admin/_adminui'

function errorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  if (raw.includes('permission-denied') || raw.includes('Permissions')) {
    return 'You do not have permission to make this change.'
  }
  return raw.replace(/^Firebase:\s*/g, '').replace(/\s*\(\w+\/\w+\)\.?$/, '') || 'Something went wrong.'
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function AvailabilitySwitch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean
  disabled?: boolean
  onChange: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative h-10 w-[52px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40',
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
  )
}

function RowIconButton({
  label,
  disabled,
  onClick,
  children,
  tone = 'default',
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
  tone?: 'default' | 'danger'
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex size-10 items-center justify-center rounded-xl border border-line text-stone transition-colors hover:border-ink/30 hover:bg-ivory hover:text-ink disabled:pointer-events-none disabled:opacity-30',
        tone === 'danger' && 'hover:border-error/40 hover:bg-error-soft hover:text-error',
      )}
    >
      {children}
    </button>
  )
}

interface CategoryFormState {
  name: string
  slug: string
  description: string
  sortOrder: number
}

const EMPTY_CATEGORY_FORM: CategoryFormState = { name: '', slug: '', description: '', sortOrder: 0 }

export default function AdminMenuPage() {
  const { categories, items, loading, error } = useMenuData()
  const { toast } = useToast()

  const [busyId, setBusyId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'editCategory' | 'newCategory' | 'deleteItem' | 'deleteCategory' | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(EMPTY_CATEGORY_FORM)
  const [slugTouched, setSlugTouched] = useState(false)
  const [activeCategory, setActiveCategory] = useState<MenuCategory | null>(null)
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>()
    for (const category of categories) map.set(category.id, [])
    const orphan: MenuItem[] = []
    for (const item of items) {
      const bucket = map.get(item.categoryId)
      if (bucket) bucket.push(item)
      else orphan.push(item)
    }
    return { map, orphan }
  }, [categories, items])

  const soldOutCount = items.filter((i) => !i.available).length
  const featuredCount = items.filter((i) => i.featured).length
  const categoryFormValid =
    categoryForm.name.trim().length >= 2 &&
    categoryForm.name.trim().length <= 60 &&
    categoryForm.slug.trim().length >= 2 &&
    categoryForm.slug.trim().length <= 60 &&
    Number.isInteger(categoryForm.sortOrder)

  async function run(action: () => Promise<unknown>, success: string): Promise<boolean> {
    try {
      await action()
      toast(success, 'success')
      return true
    } catch (e) {
      toast(errorMessage(e), 'error')
      return false
    }
  }

  async function toggleAvailability(item: MenuItem) {
    setBusyId(item.id)
    await run(
      () => updateMenuItem(item.id, { available: !item.available }),
      item.available ? `${item.name} marked sold out` : `${item.name} is available again`,
    )
    setBusyId(null)
  }

  async function moveItem(categoryId: string, index: number, direction: -1 | 1) {
    const current = grouped.map.get(categoryId) ?? []
    const target = index + direction
    if (target < 0 || target >= current.length) return
    const moved = current[index]
    if (!moved) return
    const next = [...current]
    next[index] = next[target]
    next[target] = moved

    const orderedIds: string[] = []
    for (const category of categories) {
      const bucket = category.id === categoryId ? next : (grouped.map.get(category.id) ?? [])
      orderedIds.push(...bucket.map((i) => i.id))
    }
    orderedIds.push(...grouped.orphan.map((i) => i.id))

    setBusyId(moved.id)
    await run(() => reorderMenuItems(orderedIds), 'Menu order updated')
    setBusyId(null)
  }

  function openEditCategory(category: MenuCategory) {
    setActiveCategory(category)
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      description: category.description,
      sortOrder: category.sortOrder,
    })
    setSlugTouched(true)
    setDialog('editCategory')
  }

  function openNewCategory() {
    setActiveCategory(null)
    setCategoryForm({ ...EMPTY_CATEGORY_FORM, sortOrder: categories.length })
    setSlugTouched(false)
    setDialog('newCategory')
  }

  async function saveCategory() {
    if (!categoryFormValid) return
    const payload = {
      name: categoryForm.name.trim(),
      slug: categoryForm.slug.trim(),
      description: categoryForm.description.trim(),
      sortOrder: Math.round(categoryForm.sortOrder),
    }
    const ok = activeCategory
      ? await run(() => updateCategory(activeCategory.id, payload), 'Category updated')
      : await run(() => createCategory(payload), 'Category added')
    if (ok) setDialog(null)
  }

  function requestDeleteCategory(category: MenuCategory) {
    const count = (grouped.map.get(category.id) ?? []).length
    if (count > 0) {
      toast(`Move the ${count} ${count === 1 ? 'dish' : 'dishes'} out of “${category.name}” first.`, 'info')
      return
    }
    setActiveCategory(category)
    setDialog('deleteCategory')
  }

  async function confirmDeleteCategory() {
    if (!activeCategory) return
    setConfirmLoading(true)
    const ok = await run(() => deleteCategory(activeCategory.id), `“${activeCategory.name}” deleted`)
    setConfirmLoading(false)
    if (ok) {
      setDialog(null)
      setActiveCategory(null)
    }
  }

  async function confirmDeleteItem() {
    if (!activeItem) return
    setConfirmLoading(true)
    const ok = await run(() => deleteMenuItem(activeItem.id), `“${activeItem.name}” deleted`)
    setConfirmLoading(false)
    if (ok) {
      setDialog(null)
      setActiveItem(null)
    }
  }

  const header = (
    <PageHead
      title="Menu"
      subtitle="Categories, dishes and daily availability for the public menu."
      actions={
        <>
          <LinkButton to="/menu" variant="secondary" target="_blank" rel="noreferrer">
            View public menu
            <ExternalLink className="size-4" aria-hidden />
          </LinkButton>
          <LinkButton to="/admin/menu/new">Add dish</LinkButton>
        </>
      }
    />
  )

  if (error) {
    return (
      <>
        {header}
        <EmptyState
          title="Couldn’t load the menu"
          description={errorMessage(error)}
          action={
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Try again
            </Button>
          }
        />
      </>
    )
  }

  if (loading) {
    return (
      <>
        {header}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="mt-6 space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      </>
    )
  }

  const isEmpty = categories.length === 0 && items.length === 0

  return (
    <>
      {header}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Dishes" value={String(items.length)} hint={`${categories.length} categories`} />
        <KpiCard
          label="Sold out today"
          value={String(soldOutCount)}
          hint={items.length === 0 ? 'Nothing marked yet' : `of ${items.length} dishes`}
          tone={soldOutCount > 0 ? 'error' : undefined}
        />
        <KpiCard label="Featured" value={String(featuredCount)} hint="Shown on the home page" />
        <KpiCard label="Categories" value={String(categories.length)} hint="Sections on the public menu" />
      </div>

      {isEmpty ? (
        <EmptyState
          className="mt-6"
          title="No menu yet"
          description="Add your first category, then start adding dishes to it."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={openNewCategory}>
                <Plus className="size-4" aria-hidden />
                Add category
              </Button>
              <LinkButton to="/admin/menu/new" variant="secondary">
                Add dish
              </LinkButton>
            </div>
          }
        />
      ) : (
        <div className="mt-6 space-y-6">
          {categories.map((category) => {
            const catItems = grouped.map.get(category.id) ?? []
            return (
              <Card key={category.id} className="p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-card">{category.name}</h2>
                      <span className="text-support text-stone">
                        {catItems.length} {catItems.length === 1 ? 'dish' : 'dishes'}
                      </span>
                    </div>
                    {category.description && <p className="mt-1 text-support text-stone">{category.description}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openEditCategory(category)}>
                      <Pencil className="size-3.5" aria-hidden />
                      Edit category
                    </Button>
                    <LinkButton to={`/admin/menu/new?category=${category.id}`} size="sm">
                      <Plus className="size-3.5" aria-hidden />
                      Add dish
                    </LinkButton>
                  </div>
                </div>

                {catItems.length === 0 ? (
                  <p className="px-5 py-6 text-support text-stone sm:px-6">No dishes in this category yet.</p>
                ) : (
                  <ul className="px-2 sm:px-3">
                    {catItems.map((item, index) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-4 border-b border-line px-3 py-3 last:border-b-0 sm:flex-nowrap sm:gap-y-0"
                      >
                        <img
                          src={item.imageUrl}
                          alt=""
                          loading="lazy"
                          width={112}
                          height={112}
                          className="size-14 shrink-0 rounded-xl bg-line/40 object-cover"
                        />
                        <div className="min-w-0 flex-1 basis-40">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[15px] font-medium text-ink">{item.name}</p>
                            {item.featured && (
                              <Badge tone="champagne">
                                <Star className="size-3" aria-hidden />
                                Featured
                              </Badge>
                            )}
                            {!item.available && <Badge tone="error">Sold out</Badge>}
                          </div>
                          <p className="truncate text-support text-stone">{item.description}</p>
                          {item.tags.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {item.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag}>{DIETARY_LABELS[tag]}</Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <span className="whitespace-nowrap text-[15px] font-medium tabular-nums text-ink sm:ml-auto">
                          {formatKes(item.priceKes)}
                        </span>

                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'hidden w-20 text-right text-support lg:block',
                              item.available ? 'text-success' : 'text-stone',
                            )}
                          >
                            {item.available ? 'Available' : 'Sold out'}
                          </span>
                          <AvailabilitySwitch
                            checked={item.available}
                            disabled={busyId === item.id}
                            onChange={() => void toggleAvailability(item)}
                            label={`Mark ${item.name} as ${item.available ? 'sold out' : 'available'}`}
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <RowIconButton
                            label={`Move ${item.name} up`}
                            disabled={index === 0 || busyId === item.id}
                            onClick={() => void moveItem(category.id, index, -1)}
                          >
                            <ArrowUp className="size-4" aria-hidden />
                          </RowIconButton>
                          <RowIconButton
                            label={`Move ${item.name} down`}
                            disabled={index === catItems.length - 1 || busyId === item.id}
                            onClick={() => void moveItem(category.id, index, 1)}
                          >
                            <ArrowDown className="size-4" aria-hidden />
                          </RowIconButton>
                          <Link
                            to={`/admin/menu/${item.id}`}
                            aria-label={`Edit ${item.name}`}
                            title={`Edit ${item.name}`}
                            className="inline-flex size-10 items-center justify-center rounded-xl border border-line text-stone transition-colors hover:border-ink/30 hover:bg-ivory hover:text-ink"
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Link>
                          <RowIconButton
                            label={`Delete ${item.name}`}
                            tone="danger"
                            onClick={() => {
                              setActiveItem(item)
                              setDialog('deleteItem')
                            }}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </RowIconButton>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )
          })}

          {grouped.orphan.length > 0 && (
            <Card className="p-0">
              <div className="border-b border-line px-5 py-4 sm:px-6">
                <h2 className="text-card">Uncategorised</h2>
                <p className="mt-1 text-support text-stone">
                  These dishes point at a category that no longer exists.
                </p>
              </div>
              <ul className="px-2 sm:px-3">
                {grouped.orphan.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 border-b border-line px-3 py-3 last:border-b-0"
                  >
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      width={112}
                      height={112}
                      className="size-14 shrink-0 rounded-xl bg-line/40 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{item.name}</p>
                      <p className="truncate text-support text-stone">{formatKes(item.priceKes)}</p>
                    </div>
                    <LinkButton to={`/admin/menu/${item.id}`} variant="secondary" size="sm">
                      Fix category
                    </LinkButton>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-card">Categories</h2>
            <p className="mt-1 text-support text-stone">
              Categories order the public menu. A category can only be deleted once it is empty.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={openNewCategory}>
            <Plus className="size-3.5" aria-hidden />
            Add category
          </Button>
        </div>

        {categories.length === 0 ? (
          <p className="mt-5 text-support text-stone">No categories yet.</p>
        ) : (
          <ul className="mt-5 border-t border-line">
            {categories.map((category) => {
              const count = (grouped.map.get(category.id) ?? []).length
              return (
                <li key={category.id} className="flex flex-wrap items-center gap-3 border-b border-line py-3 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-ink">{category.name}</p>
                    <p className="truncate text-support text-stone">
                      {category.description || `/${category.slug}`}
                    </p>
                  </div>
                  <span className="text-support tabular-nums text-stone">
                    {count} {count === 1 ? 'dish' : 'dishes'}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => openEditCategory(category)}>
                    <Pencil className="size-3.5" aria-hidden />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => requestDeleteCategory(category)}>
                    <Trash2 className="size-3.5" aria-hidden />
                    Delete
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={dialog === 'editCategory' || dialog === 'newCategory'}
        onClose={() => setDialog(null)}
        title={activeCategory ? 'Edit category' : 'New category'}
      >
        <div className="space-y-4">
          <Field label="Name" required hint="2–60 characters">
            {(id) => (
              <Input
                id={id}
                value={categoryForm.name}
                maxLength={60}
                onChange={(e) => {
                  const name = e.target.value
                  setCategoryForm((prev) => ({
                    ...prev,
                    name,
                    slug: slugTouched ? prev.slug : slugify(name),
                  }))
                }}
              />
            )}
          </Field>
          <Field label="Slug" required hint="Used in URLs, e.g. small-plates">
            {(id) => (
              <Input
                id={id}
                value={categoryForm.slug}
                maxLength={60}
                onChange={(e) => {
                  setSlugTouched(true)
                  setCategoryForm((prev) => ({ ...prev, slug: e.target.value }))
                }}
              />
            )}
          </Field>
          <Field label="Description" hint="Optional — shown under the category heading">
            {(id) => (
              <Textarea
                id={id}
                rows={3}
                maxLength={200}
                value={categoryForm.description}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            )}
          </Field>
          <Field label="Sort order" required hint="Lower numbers appear first">
            {(id) => (
              <Input
                id={id}
                type="number"
                step={1}
                value={String(categoryForm.sortOrder)}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  setCategoryForm((prev) => ({
                    ...prev,
                    sortOrder: Number.isFinite(next) ? Math.trunc(next) : 0,
                  }))
                }}
              />
            )}
          </Field>
          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveCategory()} disabled={!categoryFormValid}>
              Save category
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={dialog === 'deleteItem'}
        title="Delete dish?"
        message={
          activeItem
            ? `“${activeItem.name}” will be removed from the menu permanently.`
            : 'This dish will be removed from the menu permanently.'
        }
        confirmLabel="Delete dish"
        destructive
        loading={confirmLoading}
        onConfirm={() => void confirmDeleteItem()}
        onClose={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog === 'deleteCategory'}
        title="Delete category?"
        message={
          activeCategory
            ? `“${activeCategory.name}” will be deleted. This cannot be undone.`
            : 'This category will be deleted.'
        }
        confirmLabel="Delete category"
        destructive
        loading={confirmLoading}
        onConfirm={() => void confirmDeleteCategory()}
        onClose={() => setDialog(null)}
      />
    </>
  )
}
