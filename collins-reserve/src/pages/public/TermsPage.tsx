import { Link } from 'react-router-dom'

export default function TermsPage() {
  return (
    <article className="editorial-width section-y">
      <div className="reading-width mx-auto">
        <header>
          <p className="label-caps mb-5 text-stone">
            Legal
            <span className="mx-3 text-champagne">·</span>
            Terms
          </p>
          <h1 className="text-page">Terms of use</h1>
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
            <h2 className="border-t border-line pt-6 text-card">1. The demo nature of this site</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                MAISON NOIR is a fictional restaurant in Nairobi, and this website is a demonstration project. Nothing
                here is an offer to buy real food, book a real table or contract with a real business — the
                restaurant, its address, its team and its menu exist only for the demo. Using the site means
                accepting that it exists to show how a restaurant platform behaves.
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">2. The service we describe</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                The site presents menus, prices in Kenyan Shillings, opening hours, dining experiences and booking
                availability; these may change without notice, and photographs are indicative rather than guaranteed.
                We aim to keep the site accurate and available, but do not promise it will always be online or
                error-free.
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">3. Reservations</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                A booking request made through the site is a request, not a confirmed table. A reservation becomes
                confirmed only when the restaurant accepts it and sends confirmation through the channels you provided.
                Times, party sizes and seating preferences are subject to capacity, and we may ask to move a booking to
                a nearby time or decline it where the room is full.
              </p>
              <p>
                You are responsible for accurate contact details and for telling us about allergies, accessibility
                needs and celebrations that affect how we prepare for you. Cancellations, late arrivals and no-shows
                are handled under the separate{' '}
                <Link to="/cancellation-policy" className="font-medium text-ink underline underline-offset-4">
                  cancellation policy
                </Link>
                .
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">4. Ordering and payment</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                Orders are for pickup or delivery, priced in Kenyan Shillings and shown with any service charge.
                Payment would be collected when the order is picked up or delivered, using one of the methods listed
                at checkout — no card details are taken through this demo, and the site processes no payment itself.
              </p>
              <p>
                An order is accepted only when the kitchen confirms it. We may decline or cancel an order if an item
                is unavailable, if the address is outside the delivery area, or if the request appears to be a mistake
                or misuse; anything already paid would be refunded in full.
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">5. Acceptable use</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>You agree not to misuse the site. In particular, you will not:</p>
              <ul className="list-disc space-y-2 pl-5 marker:text-champagne">
                <li>use automated tools to scrape menu, pricing or availability data at volume;</li>
                <li>submit false or unlawful content through the forms, or impersonate another person;</li>
                <li>attempt to probe, disrupt or gain unauthorised access to the site or its data;</li>
                <li>use the site for any unlawful purpose, or transmit malicious code; or</li>
                <li>interfere with reservations or ordering for other guests.</li>
              </ul>
              <p>We may restrict or end access where we reasonably believe these rules have been broken.</p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">6. Content and intellectual property</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                The design, wording, branding and layout belong to the project author, except where photographs are
                licensed from their owners. You may view and print pages for your own reference, but may not republish
                them or present the MAISON NOIR identity as your own.
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">7. Disclaimers and liability</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                The site is provided on an &quot;as is&quot; basis. To the fullest extent the law allows, we exclude
                implied warranties about accuracy, availability and fitness for purpose, and we are not liable for
                indirect or consequential loss arising from use of the site — including loss of data or disappointment
                suffered in reliance on information that turned out to be out of date.
              </p>
              <p>
                Because this is a demo with no real commercial relationship behind it, nothing on the site creates any
                liability beyond what the law will not allow to be excluded — including liability for fraud, or for
                death or personal injury caused by negligence.
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">8. Governing law</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                These terms are governed by the laws of Kenya, and its courts would have jurisdiction over any dispute
                — subject, of course, to the fact that the restaurant itself is fictional. If any part of these terms
                is found unenforceable, the remaining parts continue to apply.
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">9. Changes and contact</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                We may revise these terms from time to time; the date at the top of the page shows when they last
                changed. Questions can be sent through the{' '}
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
