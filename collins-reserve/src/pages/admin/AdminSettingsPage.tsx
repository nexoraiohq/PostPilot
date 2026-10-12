import { useEffect, useState } from 'react'
import { Info, ShieldAlert } from 'lucide-react'
import { useToast } from '@/context/toast'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { EmptyState, Skeleton } from '@/components/ui/States'
import { subscribeToRestaurant, updateRestaurant } from '@/services/restaurant.service'
import type { Restaurant } from '@/types'
import { Card, PageHead } from '@/pages/admin/_adminui'

interface ProfileForm {
  tagline: string
  positioning: string
  addressLine1: string
  addressLine2: string
  city: string
  country: string
  phone: string
  email: string
  mapUrl: string
  instagramUrl: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/.test(value.trim())
}

function toForm(restaurant: Restaurant): ProfileForm {
  return {
    tagline: restaurant.tagline ?? '',
    positioning: restaurant.positioning ?? '',
    addressLine1: restaurant.addressLines?.[0] ?? '',
    addressLine2: restaurant.addressLines?.[1] ?? '',
    city: restaurant.city ?? '',
    country: restaurant.country ?? '',
    phone: restaurant.phone ?? '',
    email: restaurant.email ?? '',
    mapUrl: restaurant.mapUrl ?? '',
    instagramUrl: restaurant.instagramUrl ?? '',
  }
}

function describeError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  if (raw.includes('permission-denied') || raw.includes('Permissions')) {
    return 'You do not have permission to change the restaurant profile.'
  }
  return raw.replace(/^Firebase:\s*/g, '') || 'Something went wrong.'
}

function SectionCard({
  title,
  description,
  dirty,
  valid,
  saving,
  saveLabel,
  onSave,
  children,
}: {
  title: string
  description?: string
  dirty: boolean
  valid: boolean
  saving: boolean
  saveLabel: string
  onSave: () => void
  children: React.ReactNode
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-card">{title}</h2>
          {description && <p className="mt-1 max-w-2xl text-support text-stone">{description}</p>}
        </div>
        {dirty && <Badge tone="champagne">Unsaved changes</Badge>}
      </div>
      <div className="mt-5">{children}</div>
      <div className="mt-5 flex justify-end border-t border-line pt-4">
        <Button onClick={onSave} loading={saving} disabled={!dirty || !valid || saving}>
          {saveLabel}
        </Button>
      </div>
    </Card>
  )
}

export default function AdminSettingsPage() {
  const { toast } = useToast()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [form, setForm] = useState<ProfileForm | null>(null)
  const [baseline, setBaseline] = useState<ProfileForm | null>(null)
  const [savingSection, setSavingSection] = useState<string | null>(null)

  useEffect(
    () =>
      subscribeToRestaurant(
        (value) => {
          setRestaurant(value)
          setLoaded(true)
        },
        setError,
      ),
    [],
  )

  if (restaurant && !form) {
    const snapshot = toForm(restaurant)
    setForm(snapshot)
    setBaseline(snapshot)
  }

  if (error) {
    return (
      <>
        <PageHead title="Settings" subtitle="Restaurant profile, contact details and public links." />
        <EmptyState
          title="Couldn’t load the profile"
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

  if (loaded && !restaurant) {
    return (
      <>
        <PageHead title="Settings" subtitle="Restaurant profile, contact details and public links." />
        <EmptyState
          title="Restaurant profile not found"
          description="The settings document for this restaurant has not been seeded yet."
        />
      </>
    )
  }

  if (!loaded || !form || !baseline) {
    return (
      <>
        <PageHead title="Settings" subtitle="Restaurant profile, contact details and public links." />
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      </>
    )
  }

  function isDirty(keys: (keyof ProfileForm)[]): boolean {
    if (!form || !baseline) return false
    return keys.some((key) => form[key] !== baseline[key])
  }

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function saveSection(
    section: string,
    keys: (keyof ProfileForm)[],
    build: () => Partial<Restaurant>,
  ) {
    if (!form) return
    setSavingSection(section)
    try {
      await updateRestaurant(build())
      setBaseline((prev) => {
        const next = { ...(prev ?? form) }
        for (const key of keys) Object.assign(next, { [key]: form[key] })
        return next
      })
      toast(`${section} saved`, 'success')
    } catch (e) {
      toast(describeError(e), 'error')
    } finally {
      setSavingSection(null)
    }
  }

  const identityKeys: (keyof ProfileForm)[] = ['tagline', 'positioning']
  const addressKeys: (keyof ProfileForm)[] = ['addressLine1', 'addressLine2', 'city', 'country']
  const contactKeys: (keyof ProfileForm)[] = ['phone', 'email']
  const linkKeys: (keyof ProfileForm)[] = ['mapUrl', 'instagramUrl']

  const identityValid = form.tagline.length <= 200 && form.positioning.length <= 500
  const addressValid =
    form.addressLine1.trim().length >= 2 &&
    form.addressLine1.length <= 120 &&
    form.addressLine2.length <= 120 &&
    form.city.trim().length >= 2 &&
    form.country.trim().length >= 2
  const contactValid =
    form.phone.trim().length >= 7 && form.phone.length <= 40 && EMAIL_RE.test(form.email.trim()) && form.email.length <= 120
  const linksValid = isHttpUrl(form.mapUrl) && (form.instagramUrl.trim() === '' || isHttpUrl(form.instagramUrl))

  return (
    <>
      <PageHead title="Settings" subtitle="Restaurant profile, contact details and public links." />

      <div className="space-y-6">
        {/* Read-only identity */}
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-card">Identity</h2>
              <p className="mt-1 max-w-2xl text-support text-stone">
                The name and wordmark are fixed for this demo restaurant.
              </p>
            </div>
            <Badge tone="champagne">Read only</Badge>
          </div>
          <div className="mt-5 grid gap-4 border-b border-line pb-5 sm:grid-cols-2">
            <div>
              <p className="label-caps text-stone">Name</p>
              <p className="mt-2 font-display text-2xl font-light text-ink">{restaurant?.name ?? '—'}</p>
            </div>
            <div>
              <p className="label-caps text-stone">Wordmark</p>
              <p className="mt-2 font-display text-2xl font-light uppercase tracking-[0.24em] text-ink">
                {restaurant?.wordmark ?? '—'}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Tagline" hint={`${form.tagline.length}/200 characters`}>
              {(id) => (
                <Input
                  id={id}
                  maxLength={200}
                  value={form.tagline}
                  onChange={(e) => update('tagline', e.target.value)}
                />
              )}
            </Field>
            <Field
              label="Positioning"
              hint={`${form.positioning.length}/500 characters — shown on the home page`}
              className="sm:col-span-2"
            >
              {(id) => (
                <Textarea
                  id={id}
                  rows={3}
                  maxLength={500}
                  value={form.positioning}
                  onChange={(e) => update('positioning', e.target.value)}
                />
              )}
            </Field>
          </div>
          <div className="mt-5 flex justify-end border-t border-line pt-4">
            <Button
              loading={savingSection === 'Identity'}
              disabled={!isDirty(identityKeys) || !identityValid || savingSection !== null}
              onClick={() =>
                void saveSection('Identity', identityKeys, () => ({
                  tagline: form.tagline.trim(),
                  positioning: form.positioning.trim(),
                }))
              }
            >
              Save identity
            </Button>
          </div>
        </Card>

        {/* Address */}
        <SectionCard
          title="Address"
          description="Shown in the footer, contact page and map links."
          dirty={isDirty(addressKeys)}
          valid={addressValid}
          saving={savingSection === 'Address'}
          saveLabel="Save address"
          onSave={() =>
            void saveSection('Address', addressKeys, () => ({
              addressLines: [form.addressLine1.trim(), form.addressLine2.trim()].filter((line) => line.length > 0),
              city: form.city.trim(),
              country: form.country.trim(),
            }))
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Address line 1"
              required
              error={form.addressLine1.trim().length < 2 ? 'Enter the street address.' : undefined}
              className="sm:col-span-2"
            >
              {(id) => (
                <Input
                  id={id}
                  maxLength={120}
                  value={form.addressLine1}
                  onChange={(e) => update('addressLine1', e.target.value)}
                />
              )}
            </Field>
            <Field label="Address line 2" hint="Optional" className="sm:col-span-2">
              {(id) => (
                <Input
                  id={id}
                  maxLength={120}
                  value={form.addressLine2}
                  onChange={(e) => update('addressLine2', e.target.value)}
                />
              )}
            </Field>
            <Field label="City" required error={form.city.trim().length < 2 ? 'Enter the city.' : undefined}>
              {(id) => <Input id={id} maxLength={60} value={form.city} onChange={(e) => update('city', e.target.value)} />}
            </Field>
            <Field label="Country" required error={form.country.trim().length < 2 ? 'Enter the country.' : undefined}>
              {(id) => (
                <Input id={id} maxLength={60} value={form.country} onChange={(e) => update('country', e.target.value)} />
              )}
            </Field>
          </div>
        </SectionCard>

        {/* Contact */}
        <SectionCard
          title="Contact"
          description="How guests reach the restaurant."
          dirty={isDirty(contactKeys)}
          valid={contactValid}
          saving={savingSection === 'Contact'}
          saveLabel="Save contact"
          onSave={() =>
            void saveSection('Contact', contactKeys, () => ({
              phone: form.phone.trim(),
              email: form.email.trim().toLowerCase(),
            }))
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Phone"
              required
              error={form.phone.trim().length < 7 ? 'Enter a valid phone number.' : undefined}
            >
              {(id) => (
                <Input
                  id={id}
                  type="tel"
                  maxLength={40}
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                />
              )}
            </Field>
            <Field
              label="Email"
              required
              error={EMAIL_RE.test(form.email.trim()) ? undefined : 'Enter a valid email address.'}
            >
              {(id) => (
                <Input
                  id={id}
                  type="email"
                  maxLength={120}
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
              )}
            </Field>
          </div>
        </SectionCard>

        {/* Links */}
        <SectionCard
          title="Links"
          description="Map and social links used across the public site."
          dirty={isDirty(linkKeys)}
          valid={linksValid}
          saving={savingSection === 'Links'}
          saveLabel="Save links"
          onSave={() =>
            void saveSection('Links', linkKeys, () => ({
              mapUrl: form.mapUrl.trim(),
              instagramUrl: form.instagramUrl.trim(),
            }))
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Map URL"
              required
              hint="Full https:// link to the map listing"
              error={isHttpUrl(form.mapUrl) ? undefined : 'Enter a valid URL starting with https://'}
            >
              {(id) => (
                <Input
                  id={id}
                  type="url"
                  maxLength={400}
                  placeholder="https://…"
                  value={form.mapUrl}
                  onChange={(e) => update('mapUrl', e.target.value)}
                />
              )}
            </Field>
            <Field
              label="Instagram URL"
              hint="Optional"
              error={
                form.instagramUrl.trim() !== '' && !isHttpUrl(form.instagramUrl)
                  ? 'Enter a valid URL starting with https://'
                  : undefined
              }
            >
              {(id) => (
                <Input
                  id={id}
                  type="url"
                  maxLength={400}
                  placeholder="https://instagram.com/…"
                  value={form.instagramUrl}
                  onChange={(e) => update('instagramUrl', e.target.value)}
                />
              )}
            </Field>
          </div>
        </SectionCard>

        {/* Demo notice */}
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-card">Demo notice</h2>
              <p className="mt-1 max-w-2xl text-support text-stone">
                Shown in the footer and on the contact page so visitors know this restaurant is fictional.
              </p>
            </div>
            <Badge tone="champagne">Read only</Badge>
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-line bg-ivory p-4">
            <Info className="mt-0.5 size-4 shrink-0 text-champagne" aria-hidden />
            <p className="text-support text-stone">{restaurant?.demoNotice}</p>
          </div>
        </Card>

        {/* Danger notes */}
        <Card className="border-error/30 bg-error-soft/40">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-error" aria-hidden />
            <div>
              <h2 className="text-card">Danger notes</h2>
              <p className="mt-2 max-w-2xl text-support text-stone">
                This is a demo environment. MAISON NOIR is a fictional restaurant — contact details, map links and
                notices are illustrative. Do not enter real customer data, and keep the fictional notice visible.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
