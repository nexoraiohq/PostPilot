import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Accessibility, ArrowUpRight, Check, ChevronDown, Clock, Mail, MapPin, Phone } from 'lucide-react'
import { useRestaurantData } from '@/hooks/data'
import { Button, LinkButton } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/States'
import { formatTime12h } from '@/utils/format'
import { cn } from '@/utils/cn'

const SUBJECTS = [
  { value: 'general', label: 'General enquiry' },
  { value: 'private_dining', label: 'Private dining' },
  { value: 'press', label: 'Press & partnerships' },
  { value: 'feedback', label: 'Feedback' },
] as const

const contactSchema = z.object({
  name: z.string().min(2, 'Please tell us your name'),
  email: z.email('Please enter a valid email address'),
  phone: z.string().optional(),
  subject: z.enum(['general', 'private_dining', 'press', 'feedback']),
  message: z.string().min(10, 'Please write at least 10 characters so we can help'),
  consent: z.boolean().refine((value) => value, 'Please confirm we may use your details to reply'),
})

type ContactFormValues = z.infer<typeof contactSchema>

export default function ContactPage() {
  const { restaurant, settings } = useRestaurantData()
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', phone: '', subject: 'general', message: '', consent: false },
  })
  const consentValue = useWatch({ control, name: 'consent' })

  const onSubmit = () => setSubmitted(true)
  const onReset = () => {
    reset()
    setSubmitted(false)
  }

  const hours = settings?.openingHours ?? []
  const closedDays = hours.filter((h) => h.closed).map((h) => h.label)
  const phone = restaurant?.phone ?? '+254 700 512 846'
  const email = restaurant?.email ?? 'hello@maisonnoir.demo'
  const mapUrl =
    restaurant?.mapUrl ?? 'https://www.google.com/maps/search/?api=1&query=Kilimani%2C%20Nairobi'

  return (
    <>
      {/* Header */}
      <section aria-label="Contact and visit" className="editorial-width pt-12 md:pt-16 lg:pt-20">
        <p className="label-caps mb-6 text-stone">
          Contact &amp; visit
          <span className="mx-3 text-champagne-text">·</span>
          Kilimani, Nairobi
        </p>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h1 className="text-page max-w-3xl">
            Come and
            <br />
            find us<span className="text-champagne-text">.</span>
          </h1>
          <p className="max-w-sm shrink-0 text-support text-stone md:pb-3">
            Address, hours and the fastest ways to reach the team — or send a message and we will come back to you.
          </p>
        </div>
      </section>

      <section aria-label="Contact details and enquiry form" className="editorial-width section-y">
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
          {/* Left — visit details */}
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-2xl border border-line bg-paper p-7">
              <MapPin className="size-5 text-champagne-text" aria-hidden />
              <h2 className="mt-4 text-card">Find us</h2>
              <address className="mt-3 space-y-0.5 text-support text-stone not-italic">
                {(restaurant?.addressLines ?? ['12 Riverside Lane', 'Kilimani']).map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <p>
                  {restaurant?.city ?? 'Nairobi'}, {restaurant?.country ?? 'Kenya'}
                </p>
              </address>
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex h-10 items-center gap-2 text-[13px] font-medium underline-offset-4 hover:underline"
              >
                Open in Maps
                <ArrowUpRight className="size-3.5" aria-hidden />
              </a>
              <p className="mt-3 rounded-xl bg-ivory p-3 text-[12px] leading-relaxed text-stone">
                MAISON NOIR is a fictional restaurant for this demo — this address is illustrative.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-paper p-7">
              <Clock className="size-5 text-champagne-text" aria-hidden />
              <h2 className="mt-4 text-card">Opening hours</h2>
              <ul className="mt-3 space-y-1.5">
                {hours.map((h) => (
                  <li key={h.day} className="flex items-baseline justify-between gap-3 text-support">
                    <span className={cn(h.closed ? 'text-stone/60' : 'text-ink')}>{h.label}</span>
                    <span className="tabular-nums text-stone">
                      {h.closed ? 'Closed' : `${formatTime12h(h.open)} – ${formatTime12h(h.close)}`}
                    </span>
                  </li>
                ))}
                {!settings && <Skeleton className="h-36 w-full" />}
              </ul>
              {settings && hours.length === 0 && (
                <p className="mt-3 text-support text-stone">Opening hours are being confirmed.</p>
              )}
              {closedDays.length > 0 && (
                <p className="mt-4 text-support text-stone">Closed {closedDays.join(', ')}.</p>
              )}
            </div>

            <div className="rounded-2xl border border-line bg-paper p-7">
              <Phone className="size-5 text-champagne-text" aria-hidden />
              <h2 className="mt-4 text-card">Talk to us</h2>
              <div className="mt-3 space-y-1">
                <p>
                  <a
                    href={`tel:${phone.replace(/\s/g, '')}`}
                    className="inline-flex h-10 items-center gap-2.5 text-support font-medium text-ink underline-offset-4 hover:underline"
                  >
                    <Phone className="size-4 text-stone" aria-hidden />
                    {phone}
                  </a>
                </p>
                <p>
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex h-10 items-center gap-2.5 text-support font-medium text-ink underline-offset-4 hover:underline"
                  >
                    <Mail className="size-4 text-stone" aria-hidden />
                    {email}
                  </a>
                </p>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-stone">
                Lines are answered during service hours. Contact details are illustrative for this demo.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-paper p-7">
              <Accessibility className="size-5 text-champagne-text" aria-hidden />
              <h2 className="mt-4 text-card">Accessibility</h2>
              <ul className="mt-3 space-y-2 text-support text-stone">
                <li>Step-free entrance from the pavement, with a portable ramp available on request.</li>
                <li>One-level dining room and terrace, plus an accessible restroom on the ground floor.</li>
                <li>Service animals are welcome throughout the restaurant.</li>
                <li>
                  Please tell us about allergies, dietary needs or seating requirements when you book, so the kitchen
                  and the floor team can plan properly.
                </li>
              </ul>
            </div>
          </div>

          {/* Right — enquiry form */}
          <div className="lg:col-span-7">
            {submitted ? (
              <div
                role="status"
                className="rounded-3xl border border-line bg-paper p-7 md:p-10"
                aria-live="polite"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-full bg-success-soft text-success">
                  <Check className="size-5" aria-hidden />
                </span>
                <h2 className="mt-6 text-section">Demo submission received</h2>
                <p className="mt-4 max-w-lg text-body text-stone">
                  Your message has been recorded for this demo. Nothing was emailed anywhere — this form is not
                  connected to a backend, so please do not expect an automated reply.
                </p>
                <p className="mt-4 max-w-lg text-support text-stone">
                  For a real conversation, call{' '}
                  <a href={`tel:${phone.replace(/\s/g, '')}`} className="font-medium text-ink underline-offset-4 hover:underline">
                    {phone}
                  </a>{' '}
                  or write to{' '}
                  <a href={`mailto:${email}`} className="font-medium text-ink underline-offset-4 hover:underline">
                    {email}
                  </a>
                  .
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button variant="secondary" size="md" onClick={onReset}>
                    Write another message
                  </Button>
                  <LinkButton to="/reserve" variant="ghost" size="md">
                    Reserve a table
                    <ArrowUpRight className="size-4" aria-hidden />
                  </LinkButton>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-line bg-paper p-7 md:p-10">
                <h2 className="text-card">Send us a message</h2>
                <p className="mt-2 max-w-lg text-support text-stone">
                  Enquiries about private dining, press or the restaurant in general. Fields marked{' '}
                  <span className="text-error">*</span> are required.
                </p>

                <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-7 space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Name" required error={errors.name?.message}>
                      {(id) => (
                        <Input
                          id={id}
                          autoComplete="name"
                          placeholder="Your full name"
                          invalid={!!errors.name}
                          {...register('name')}
                        />
                      )}
                    </Field>

                    <Field label="Email" required error={errors.email?.message}>
                      {(id) => (
                        <Input
                          id={id}
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          invalid={!!errors.email}
                          {...register('email')}
                        />
                      )}
                    </Field>

                    <Field label="Phone" hint="Optional — only if you would like a call back" error={errors.phone?.message}>
                      {(id) => (
                        <Input
                          id={id}
                          type="tel"
                          autoComplete="tel"
                          placeholder="+254 …"
                          invalid={!!errors.phone}
                          {...register('phone')}
                        />
                      )}
                    </Field>

                    <Field label="Subject" required error={errors.subject?.message}>
                      {(id) => (
                        <div className="relative">
                          <Select id={id} invalid={!!errors.subject} {...register('subject')}>
                            {SUBJECTS.map((subject) => (
                              <option key={subject.value} value={subject.value}>
                                {subject.label}
                              </option>
                            ))}
                          </Select>
                          <ChevronDown
                            className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-stone"
                            aria-hidden
                          />
                        </div>
                      )}
                    </Field>
                  </div>

                  <Field label="Message" required error={errors.message?.message}>
                    {(id) => (
                      <Textarea
                        id={id}
                        rows={6}
                        placeholder="Tell us a little about your enquiry — dates, party size, anything we should know."
                        invalid={!!errors.message}
                        {...register('message')}
                      />
                    )}
                  </Field>

                  <div className="space-y-1.5">
                    <Checkbox
                      label={
                        <>
                          I agree that MAISON NOIR may use these details to respond to my enquiry.
                          <span className="text-error"> *</span>
                        </>
                      }
                      checked={consentValue}
                      {...register('consent')}
                    />
                    {errors.consent && (
                      <p role="alert" className="text-support text-error">
                        {errors.consent.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
                    <Button type="submit" size="md">
                      Send message
                    </Button>
                    <p className="text-[12px] leading-relaxed text-stone">
                      Demo form — submissions stay in this session and are not emailed.
                    </p>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
