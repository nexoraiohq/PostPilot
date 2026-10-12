import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  return (
    <article className="editorial-width section-y">
      <div className="reading-width mx-auto">
        <header>
          <p className="label-caps mb-5 text-stone">
            Legal
            <span className="mx-3 text-champagne">·</span>
            Privacy
          </p>
          <h1 className="text-page">Privacy policy</h1>
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
            <h2 className="border-t border-line pt-6 text-card">1. Who this policy covers</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                This policy explains how MAISON NOIR — a fictional Nairobi restaurant built for this demonstration —
                would handle personal information when you browse the site, reserve a table, place an order or contact
                us. MAISON NOIR is not a registered business; its staff, address and contact details are illustrative,
                and this demo keeps no live customer database.
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">2. Information we collect</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>Information you give to us directly would include:</p>
              <ul className="list-disc space-y-2 pl-5 marker:text-champagne">
                <li>
                  <span className="font-medium text-ink">Reservation details</span> — your name, phone number, email
                  address, date and time of booking, party size, seating preference and any notes you add.
                </li>
                <li>
                  <span className="font-medium text-ink">Order details</span> — the dishes you order, whether you are
                  collecting or taking delivery, the delivery address, and your chosen payment method.
                </li>
                <li>
                  <span className="font-medium text-ink">Messages and dietary notes</span> — enquiries sent through the
                  contact form, feedback, and any allergy or accessibility information you choose to share.
                </li>
              </ul>
              <p>
                A real site would also receive technical information in the ordinary course of running a website:
                device and browser type, approximate location from an IP address, and pages visited. Analytics in this
                demo are placeholders only — no tracking script is loaded and no profile of you is built.
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">3. How we would use it</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                Your information would be used to manage reservations and orders, reach you about a change to either,
                answer enquiries, prepare for dietary and accessibility needs, and keep simple purchase records for
                accounting. If you opted in, we would also send occasional notes about seasonal menus or events. We
                would not use it for automated decision-making, and we would never sell or rent it to anyone.
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">4. Legal grounds and your rights</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                Kenya&apos;s Data Protection Act, 2019 sets out how personal data should be collected, stored and used,
                and gives individuals rights over their own data. Under that framework you may ask for a copy of what
                we hold, ask for it to be corrected or deleted, withdraw consent where consent was the basis for
                processing, and raise a concern with the Office of the Data Protection Commissioner.
              </p>
              <p>
                We would ask for proof of identity first. Because this is a demo, there is no live dataset to access —
                nothing you type is stored beyond this browser session.
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">5. How long we would keep it</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                Reservation and order records would be kept for the current financial year, plus any longer period
                required for tax records. Enquiry messages would be kept for up to twelve months after the
                conversation ends, and dietary notes only while they remain relevant to bookings you make. Anything no
                longer needed would be deleted or irreversibly anonymised.
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">6. When information is shared</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                To run the service, information would be shared with a few providers acting on our instructions — the
                booking and ordering platform, delivery partners, payment providers taking payment on collection, and
                hosting providers — each given only what they need. We would also disclose it where the law requires,
                or where it is necessary to protect guests or staff. In this demo none of that happens: no backend
                sends your details anywhere.
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">7. Cookies and local storage</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                This site uses browser storage rather than advertising cookies. Your cart is saved in{' '}
                <span className="font-medium text-ink">localStorage</span> so it survives a refresh, and a small{' '}
                <span className="font-medium text-ink">sessionStorage</span> flag remembers whether you dismissed the
                announcement strip. Both stay on your device and are not sent to a server.
              </p>
              <p>
                You can clear either through your browser settings, which empties your cart and restores the
                announcement. We do not use cross-site tracking cookies, and we would not place analytics cookies
                without asking first.
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">8. Security and changes</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                A real service of this kind would use access controls, encryption in transit and regular backups —
                though no transmission can promise absolute safety. The site is aimed at adults, and we would not
                knowingly collect the information of children under 18. Updates to this policy change the date at the
                top of the page.
              </p>
            </div>
          </section>

          <section>
            <h2 className="border-t border-line pt-6 text-card">9. Contact</h2>
            <div className="mt-4 space-y-4 text-body text-ink/80">
              <p>
                Questions about this policy can be sent through the{' '}
                <Link to="/contact" className="font-medium text-ink underline underline-offset-4">
                  contact page
                </Link>{' '}
                or by email to hello@maisonnoir.demo. A real product should also name a data protection contact for
                formal requests.
              </p>
            </div>
          </section>
        </div>
      </div>
    </article>
  )
}
