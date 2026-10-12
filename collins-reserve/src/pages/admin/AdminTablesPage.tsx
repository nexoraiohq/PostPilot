import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/context/toast'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, Skeleton } from '@/components/ui/States'
import { cn } from '@/utils/cn'
import { subscribeToSettings } from '@/services/restaurant.service'
import { createTable, deleteTable, subscribeToTables, updateTable } from '@/services/tables.service'
import type { RestaurantSettings, RestaurantTable } from '@/types'
import { Card, ConfirmDialog, PageHead } from '@/pages/admin/_adminui'

const AREAS: { value: RestaurantTable['area']; label: string }[] = [
  { value: 'indoor', label: 'Indoor' },
  { value: 'terrace', label: 'Terrace' },
  { value: 'private', label: 'Private' },
]

const AREA_TONE: Record<RestaurantTable['area'], 'neutral' | 'champagne' | 'ink'> = {
  indoor: 'neutral',
  terrace: 'champagne',
  private: 'ink',
}

function describeError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  if (raw.includes('permission-denied') || raw.includes('Permissions')) {
    return 'You do not have permission to make this change.'
  }
  return raw.replace(/^Firebase:\s*/g, '') || 'Something went wrong.'
}

function ActiveSwitch({
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

interface TableFormState {
  name: string
  seats: number
  area: RestaurantTable['area']
  active: boolean
}

const EMPTY_FORM: TableFormState = { name: '', seats: 4, area: 'indoor', active: true }

export default function AdminTablesPage() {
  const { toast } = useToast()
  const [tables, setTables] = useState<RestaurantTable[] | null>(null)
  const [settings, setSettings] = useState<RestaurantSettings | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const [dialog, setDialog] = useState<'form' | 'delete' | null>(null)
  const [editing, setEditing] = useState<RestaurantTable | null>(null)
  const [form, setForm] = useState<TableFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    const unsubs = [subscribeToTables(setTables, setError), subscribeToSettings(setSettings, setError)]
    return () => unsubs.forEach((u) => u())
  }, [])

  const loading = tables === null
  const activeTables = tables?.filter((t) => t.active) ?? []
  const totalActiveSeats = activeTables.reduce((sum, t) => sum + t.seats, 0)
  const seatsByArea = AREAS.map((area) => ({
    ...area,
    seats: activeTables.filter((t) => t.area === area.value).reduce((sum, t) => sum + t.seats, 0),
    count: activeTables.filter((t) => t.area === area.value).length,
  }))

  const formValid =
    form.name.trim().length >= 1 &&
    form.name.trim().length <= 40 &&
    Number.isInteger(form.seats) &&
    form.seats >= 1 &&
    form.seats <= 40

  async function run(action: () => Promise<unknown>, success: string): Promise<boolean> {
    try {
      await action()
      toast(success, 'success')
      return true
    } catch (e) {
      toast(describeError(e), 'error')
      return false
    }
  }

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialog('form')
  }

  function openEdit(table: RestaurantTable) {
    setEditing(table)
    setForm({ name: table.name, seats: table.seats, area: table.area, active: table.active })
    setDialog('form')
  }

  async function saveTable() {
    if (!formValid) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      seats: Math.round(form.seats),
      area: form.area,
      active: form.active,
    }
    const ok = editing
      ? await run(() => updateTable(editing.id, payload), 'Table updated')
      : await run(() => createTable(payload), 'Table added')
    setSaving(false)
    if (ok) setDialog(null)
  }

  async function toggleActive(table: RestaurantTable) {
    setBusyId(table.id)
    await run(
      () => updateTable(table.id, { active: !table.active }),
      table.active ? `${table.name} deactivated` : `${table.name} activated`,
    )
    setBusyId(null)
  }

  async function confirmDelete() {
    if (!editing) return
    setSaving(true)
    const ok = await run(() => deleteTable(editing.id), `${editing.name} deleted`)
    setSaving(false)
    if (ok) {
      setDialog(null)
      setEditing(null)
    }
  }

  const header = (
    <PageHead
      title="Tables"
      subtitle="The physical layout used by the floor plan and seating notes."
      actions={
        <Button onClick={openNew}>
          <Plus className="size-4" aria-hidden />
          Add table
        </Button>
      }
    />
  )

  if (error) {
    return (
      <>
        {header}
        <EmptyState
          title="Couldn’t load the tables"
          description={describeError(error)}
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
        <Skeleton className="h-28 rounded-2xl" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      {header}

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-wrap gap-x-10 gap-y-5">
            <div>
              <p className="label-caps text-stone">Active seats</p>
              <p className="mt-2 text-kpi tabular-nums text-ink">{totalActiveSeats}</p>
              <p className="mt-1 text-support text-stone">
                {activeTables.length} of {tables.length} tables in service
              </p>
            </div>
            {seatsByArea.map((area) => (
              <div key={area.value}>
                <p className="label-caps text-stone">{area.label}</p>
                <p className="mt-2 text-xl font-medium tabular-nums text-ink">
                  {area.seats} <span className="text-support font-normal text-stone">seats</span>
                </p>
                <p className="mt-1 text-support text-stone">
                  {area.count} {area.count === 1 ? 'table' : 'tables'}
                </p>
              </div>
            ))}
          </div>
          <Link
            to="/admin/availability"
            className="group flex items-center gap-2 rounded-xl border border-line px-4 py-3 text-support text-stone transition-colors hover:border-ink/30 hover:text-ink"
          >
            <span>
              Capacity per seating slot:{' '}
              <span className="font-medium text-ink">{settings?.seatsPerSlot ?? '—'} seats</span>
            </span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </Card>

      {tables.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No tables yet"
          description="Add your first table — name it, give it a seat count and an area."
          action={
            <Button onClick={openNew}>
              <Plus className="size-4" aria-hidden />
              Add table
            </Button>
          }
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tables.map((table) => (
            <Card key={table.id} className={cn('p-5', !table.active && 'bg-ivory/60')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-card">{table.name}</h3>
                  <p className="mt-1 text-support text-stone">
                    {table.seats} {table.seats === 1 ? 'seat' : 'seats'}
                  </p>
                </div>
                <Badge tone={AREA_TONE[table.area]}>
                  {AREAS.find((a) => a.value === table.area)?.label ?? table.area}
                </Badge>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
                <div className="flex items-center gap-3">
                  <ActiveSwitch
                    checked={table.active}
                    disabled={busyId === table.id}
                    onChange={() => void toggleActive(table)}
                    label={`${table.active ? 'Deactivate' : 'Activate'} ${table.name}`}
                  />
                  <span className={cn('text-support', table.active ? 'text-success' : 'text-stone')}>
                    {table.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={`Edit ${table.name}`}
                    onClick={() => openEdit(table)}
                    className="inline-flex size-10 items-center justify-center rounded-xl border border-line text-stone transition-colors hover:border-ink/30 hover:bg-ivory hover:text-ink"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${table.name}`}
                    onClick={() => {
                      setEditing(table)
                      setDialog('delete')
                    }}
                    className="inline-flex size-10 items-center justify-center rounded-xl border border-line text-stone transition-colors hover:border-error/40 hover:bg-error-soft hover:text-error"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={dialog === 'form'}
        onClose={() => setDialog(null)}
        title={editing ? `Edit ${editing.name}` : 'Add table'}
      >
        <div className="space-y-4">
          <Field label="Name" required hint="1–40 characters, e.g. Terrace 3">
            {(fieldId) => (
              <Input
                id={fieldId}
                maxLength={40}
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            )}
          </Field>
          <Field
            label="Seats"
            required
            hint="1–40 seats"
            error={
              form.seats < 1 || form.seats > 40 || !Number.isInteger(form.seats)
                ? 'Enter between 1 and 40 seats.'
                : undefined
            }
          >
            {(fieldId) => (
              <Input
                id={fieldId}
                type="number"
                inputMode="numeric"
                step={1}
                min={1}
                max={40}
                value={String(form.seats)}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  setForm((prev) => ({ ...prev, seats: Number.isFinite(next) ? Math.trunc(next) : 0 }))
                }}
              />
            )}
          </Field>
          <Field label="Area" required>
            {(fieldId) => (
              <Select
                id={fieldId}
                value={form.area}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, area: e.target.value as RestaurantTable['area'] }))
                }
              >
                {AREAS.map((area) => (
                  <option key={area.value} value={area.value}>
                    {area.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
            <div>
              <p className="text-[14px] font-medium text-ink">Active</p>
              <p className="text-support text-stone">Inactive tables are excluded from seating totals.</p>
            </div>
            <ActiveSwitch
              checked={form.active}
              onChange={() => setForm((prev) => ({ ...prev, active: !prev.active }))}
              label="Table is active"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveTable()} loading={saving} disabled={!formValid || saving}>
              {editing ? 'Save table' : 'Add table'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={dialog === 'delete'}
        title="Delete table?"
        message={
          editing
            ? `“${editing.name}” will be removed from the floor plan. This cannot be undone.`
            : 'This table will be removed.'
        }
        confirmLabel="Delete table"
        destructive
        loading={saving}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDialog(null)}
      />
    </>
  )
}
