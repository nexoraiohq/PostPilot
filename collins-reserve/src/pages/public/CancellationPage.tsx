import { Link } from 'react-router-dom'
import { useRestaurantData } from '@/hooks/data'

export default function CancellationPage() {
  const { settings } = useRestaurantData()

  return (
    <article className="editorial-width section-y">
      <div className="reading-width mx-auto">
        <header>
          <p className="label-caps mb-5 text-stone">
            Legal
            <span className="mx-3 text-champagne">·</span>
            Reservations &amp; orders
          </p>
          <h1 className="text-page">Cancellation policy</h1>
          <p className="mt-4 text-support text-stone">Last updated October 2026</p>
        </header>

        <div className="mt-8 rounded-2xl border border-line bg-paper p-5">
          <p className="text-support text-stone">
            These are starter policies written for a demo product — a plain-language starting point, not legal advice.
            They should be reviewed by a qualified lawyer before any real-world use.
          </p>
        </div>

        <div className="mt-12 space-y-10">
          <section>
            <h2 className="border-t border-line pt-6 text-card">1. Cancelling a reservation</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                Reservations may be cancelled free of charge up to <span className="font-medium text-ink">four
                hours</span> before your seating time. Within that window there is nothing to pay — we simply ask that
                you tell us, so the table can be offered to someone else.
              </p>
              {settings?.cancellationPolicy && (
                <blockquote className="rounded-2xl border border-line bg-paper p-5">
                  <p className="label-caps mb-2 text-champagne">Current policy on file</p>
                  <p className="text-support text-stone">{settings.cancellationPolicy}</p>
                </blockquote>
              )}
              <p>
                To cancel or change a booking, use the link in your confirmation message, book again for a different
                time, or call the restaurant during opening hours. A cancellation is complete once you have received
                confirmation from us — please do not assume it has gone through if you only sent a message.
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">2. Late cancellations and no-shows</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                A cancellation made less than four hours before the seating time is a late cancellation. Because the
                kitchen will already have started preparing for your table, a late cancellation or a no-show may be
                recorded against your booking history, and we may ask for a card guarantee or a deposit before taking
                the next reservation from the same details.
              </p>
              <p>
                If you are running late, please call — we hold tables for fifteen minutes past the booked time, after
                which we may release it and seat you at the next suitable moment. Parties that arrive without notice
                and do not take their table are treated as no-shows.
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">3. Cancelling an order</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                <span className="font-medium text-ink">By you:</span> an order can be cancelled while it is still
                marked <span className="font-medium text-ink">received</span> or <span className="font-medium text-ink">accepted</span>{' '}
                — before the kitchen begins preparing it. Once an order is being cooked it can no longer be cancelled,
                because the ingredients have already been committed to your dish.
              </p>
              <p>
                <span className="font-medium text-ink">By us:</span> we may cancel an order if an item is unavailable,
                if we cannot fulfil the order within a reasonable time, if the delivery address is outside our area,
                or if the order appears to be a mistake or a misuse of the service. We will tell you as soon as we can
                and will not ask you to pay for anything we have not prepared.
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">4. Refunds and payments</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                This is a demo: <span className="font-medium text-ink">no real payments are processed anywhere on
                this site.</span> No card details are collected and no money changes hands — in a real service, payment
                for pickup and delivery orders would be collected when the order is handed over, using one of the
                methods shown at checkout.
              </p>
              <p>
                Where an amount had been taken in advance for a real equivalent — for example a deposit on a private
                dining room — a cancellation made more than four hours ahead would be refunded in full, and a refund
                for an order we cancelled would be issued in full to the original payment method. Refunds would follow
                the timing of the payment provider rather than the restaurant itself.
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">5. Experiences and private dining</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                Tastings, chef&apos;s counters and private dining are planned around a fixed number of covers, so they
                follow the same four-hour rule for ordinary bookings, with any deposit terms agreed with you in
                writing before the date. Changing the date of a private booking is subject to availability; where we
                cannot move it, the deposit terms agreed at the time would apply.
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">6. Changes to this policy</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                We may update these terms from time to time, and the date at the top of the page shows when they last
                changed. The version that applies to your booking is the one published on the date you made it.
              </p>
              <p>
                Questions about a cancellation, a refund or a no-show can be sent through the{' '}
                <Link to="/contact" className="font-medium text-ink underline underline-offset-4">
                  contact page
                </Link>{' '}
                or by email to hello@maisonnoir.demo.
              </p>
            </div>
          </section>
        </div>
      </div>
    </article>
  )
}
