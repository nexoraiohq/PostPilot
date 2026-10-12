/**
 * Collins Reserve — demo seed for MAISON NOIR.
 *
 * Creates (idempotently):
 *   - admin auth account + users/{uid} profile
 *   - restaurant, settings, tables, experiences
 *   - menu categories + dishes
 *   - a few real sample orders & reservations so the dashboard has recorded data
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.collins-reserve/service-account.json node scripts/seed.mjs
 */
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

const PROJECT_ID = 'collins-reserve-demo-42b6'
const RESTAURANT_ID = 'maison-noir'
const ADMIN_EMAIL = 'admin@maisonnoir.demo'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'MaisonNoir2026!'

const keyPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(homedir(), '.collins-reserve', 'service-account.json')

initializeApp(
  existsSync(keyPath)
    ? { credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) }
    : { credential: applicationDefault(), projectId: PROJECT_ID },
)

const db = getFirestore()
const auth = getAuth()

const img = (id, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`

const categories = [
  { id: 'starters', name: 'Starters', slug: 'starters', description: 'Small beginnings, bright flavours.', sortOrder: 0 },
  { id: 'mains', name: 'Mains', slug: 'mains', description: 'From the charcoal grill and the oven.', sortOrder: 1 },
  { id: 'pasta', name: 'Pasta', slug: 'pasta', description: 'Rolled and cut in-house each morning.', sortOrder: 2 },
  { id: 'desserts', name: 'Desserts', slug: 'desserts', description: 'A gentle finish to the evening.', sortOrder: 3 },
  { id: 'drinks', name: 'Drinks', slug: 'drinks', description: 'Coffee, cold press and the bar list.', sortOrder: 4 },
]

const items = [
  // Starters
  {
    id: 'starter-veloute',
    categoryId: 'starters',
    name: 'Chilled Avocado & Cucumber Velouté',
    description: 'Green herbs, buttermilk pearls and cold-pressed olive oil.',
    priceKes: 1150,
    imageUrl: img('photo-1540189549336-e6e99c3679fe', 900),
    tags: ['vegetarian', 'gluten_free'],
    available: true,
    featured: false,
    sortOrder: 0,
    variants: [],
    addons: [],
    allergenNoteSample: true,
  },
  {
    id: 'starter-tartare',
    categoryId: 'starters',
    name: 'Yellowfin Tuna Tartare',
    description: 'Sesame, avocado, ponzo and crisp shallot.',
    priceKes: 1650,
    imageUrl: img('photo-1499028344343-cd173ffc68a9', 900),
    tags: ['gluten_free'],
    available: true,
    featured: false,
    sortOrder: 1,
    variants: [],
    addons: [{ id: 'add-roe', name: 'Salmon roe', priceKes: 350 }],
    allergenNoteSample: true,
  },
  {
    id: 'starter-burrata',
    categoryId: 'starters',
    name: 'Burrata, Heirloom Tomato & Basil Oil',
    description: 'Creamy burrata, market tomatoes, aged balsamic.',
    priceKes: 1450,
    imageUrl: img('photo-1546069901-ba9599a7e63c', 900),
    tags: ['vegetarian', 'gluten_free'],
    available: true,
    featured: false,
    sortOrder: 2,
    variants: [],
    addons: [],
    allergenNoteSample: true,
  },
  {
    id: 'starter-asparagus',
    categoryId: 'starters',
    name: 'Charred Asparagus & Hazelnut',
    description: 'Brown butter, aged parmesan, lemon zest.',
    priceKes: 1350,
    imageUrl: img('photo-1466637574441-749b8f19452f', 900),
    tags: ['vegetarian', 'nuts'],
    available: true,
    featured: false,
    sortOrder: 3,
    variants: [],
    addons: [],
    allergenNoteSample: true,
  },
  // Mains
  {
    id: 'main-sirloin',
    categoryId: 'mains',
    name: 'Dry-Aged Sirloin, Bone Marrow Jus',
    description: 'Thirty-day aged sirloin, confit garlic, hand-cut chips.',
    priceKes: 3850,
    imageUrl: img('photo-1600891964092-4316c288032e', 900),
    tags: ['gluten_free'],
    available: true,
    featured: true,
    sortOrder: 0,
    variants: [
      { id: 'var-sirloin-250', name: '250g', priceDeltaKes: 0 },
      { id: 'var-sirloin-400', name: '400g', priceDeltaKes: 1400 },
    ],
    addons: [
      { id: 'add-pepper', name: 'Peppercorn sauce', priceKes: 250 },
      { id: 'add-prawns', name: 'Garlic butter prawns', priceKes: 650 },
    ],
    allergenNoteSample: true,
  },
  {
    id: 'main-salmon',
    categoryId: 'mains',
    name: 'Pan-Seared Salmon & Beurre Blanc',
    description: 'Crisp skin salmon, seasonal greens, dill oil.',
    priceKes: 3200,
    imageUrl: img('photo-1467003909585-2f8a72700288', 900),
    tags: ['dairy', 'gluten_free'],
    available: true,
    featured: true,
    sortOrder: 1,
    variants: [],
    addons: [],
    allergenNoteSample: true,
  },
  {
    id: 'main-lamb',
    categoryId: 'mains',
    name: 'Slow-Braised Lamb Shank',
    description: 'Red wine jus, whipped potato, gremolata.',
    priceKes: 3450,
    imageUrl: img('photo-1544025162-d76694265947', 900),
    tags: ['gluten_free'],
    available: true,
    featured: false,
    sortOrder: 2,
    variants: [],
    addons: [],
    allergenNoteSample: true,
  },
  {
    id: 'main-cauliflower',
    categoryId: 'mains',
    name: 'Roasted Cauliflower Steak',
    description: 'Romesco, toasted almonds, herb salad.',
    priceKes: 2450,
    imageUrl: img('photo-1432139555190-58524dae6a55', 900),
    tags: ['vegan', 'nuts', 'gluten_free'],
    available: true,
    featured: false,
    sortOrder: 3,
    variants: [],
    addons: [],
    allergenNoteSample: true,
  },
  {
    id: 'main-chicken',
    categoryId: 'mains',
    name: 'Charcoal-Grilled Chicken Supreme',
    description: 'Lemon thyme butter, summer vegetables.',
    priceKes: 2650,
    imageUrl: img('photo-1504674900247-0877df9cc836', 900),
    tags: ['gluten_free'],
    available: true,
    featured: false,
    sortOrder: 4,
    variants: [],
    addons: [],
    allergenNoteSample: true,
  },
  // Pasta
  {
    id: 'pasta-tagliatelle',
    categoryId: 'pasta',
    name: 'Handmade Tagliatelle & Wild Mushroom',
    description: 'Porcini cream, thyme, parmesan.',
    priceKes: 2150,
    imageUrl: img('photo-1473093295043-cdd812d0e601', 900),
    tags: ['vegetarian'],
    available: true,
    featured: false,
    sortOrder: 0,
    variants: [],
    addons: [{ id: 'add-truffle', name: 'Shaved black truffle', priceKes: 900 }],
    allergenNoteSample: true,
  },
  {
    id: 'pasta-linguine',
    categoryId: 'pasta',
    name: 'Lobster Linguine',
    description: 'Half lobster, chilli, garlic, cherry tomato.',
    priceKes: 2950,
    imageUrl: img('photo-1592861956120-e524fc739696', 900),
    tags: ['shellfish', 'dairy'],
    available: true,
    featured: true,
    sortOrder: 1,
    variants: [],
    addons: [],
    allergenNoteSample: true,
  },
  {
    id: 'pasta-pappardelle',
    categoryId: 'pasta',
    name: 'Pappardelle & Beef Ragù',
    description: 'Six-hour braise, pecorino, soft herbs.',
    priceKes: 2450,
    imageUrl: img('photo-1476224203421-9ac39bcb3327', 900),
    tags: [],
    available: false,
    featured: false,
    sortOrder: 2,
    variants: [],
    addons: [],
    allergenNoteSample: true,
  },
  // Desserts
  {
    id: 'dessert-fondant',
    categoryId: 'desserts',
    name: 'Valrhona Dark Chocolate Fondant',
    description: 'Salted caramel centre, vanilla gelato.',
    priceKes: 1250,
    imageUrl: img('photo-1578985545062-69928b1d9587', 900),
    tags: ['vegetarian'],
    available: true,
    featured: true,
    sortOrder: 0,
    variants: [],
    addons: [],
    allergenNoteSample: true,
  },
  {
    id: 'dessert-brulee',
    categoryId: 'desserts',
    name: 'Vanilla Bean Crème Brûlée',
    description: 'Tahitian vanilla, caramelised sugar.',
    priceKes: 1050,
    imageUrl: img('photo-1551024709-8f23befc6f87', 900),
    tags: ['vegetarian', 'gluten_free'],
    available: true,
    featured: false,
    sortOrder: 1,
    variants: [],
    addons: [],
    allergenNoteSample: true,
  },
  {
    id: 'dessert-mango',
    categoryId: 'desserts',
    name: 'Mango & Coconut Cheesecake',
    description: 'Digestive crumb, passion fruit gel.',
    priceKes: 1150,
    imageUrl: img('photo-1563805042-7684c019e1cb', 900),
    tags: ['vegetarian'],
    available: true,
    featured: false,
    sortOrder: 2,
    variants: [],
    addons: [],
    allergenNoteSample: true,
  },
  // Drinks
  {
    id: 'drink-spritz',
    categoryId: 'drinks',
    name: 'Hibiscus & Rose Spritz',
    description: 'Zero-proof, citrus, soda, hibiscus syrup.',
    priceKes: 850,
    imageUrl: img('photo-1514362545857-3bc16c4c7d1b', 900),
    tags: ['vegan'],
    available: true,
    featured: false,
    sortOrder: 0,
    variants: [],
    addons: [],
    allergenNoteSample: false,
  },
  {
    id: 'drink-espresso',
    categoryId: 'drinks',
    name: 'Single-Origin Kenyan Espresso',
    description: 'Nyeri AA, roasted in Nairobi.',
    priceKes: 450,
    imageUrl: img('photo-1470337458703-46ad1756a187', 900),
    tags: ['vegan'],
    available: true,
    featured: false,
    sortOrder: 1,
    variants: [],
    addons: [],
    allergenNoteSample: false,
  },
  {
    id: 'drink-juice',
    categoryId: 'drinks',
    name: 'House Cold-Press Juice',
    description: 'Seasonal fruit and greens, pressed daily.',
    priceKes: 750,
    imageUrl: img('photo-1544145945-f90425340c7e', 900),
    tags: ['vegan', 'gluten_free'],
    available: true,
    featured: false,
    sortOrder: 2,
    variants: [
      { id: 'var-juice-glass', name: 'Glass', priceDeltaKes: 0 },
      { id: 'var-juice-pitcher', name: 'Pitcher', priceDeltaKes: 900 },
    ],
    addons: [],
    allergenNoteSample: false,
  },
  {
    id: 'drink-french75',
    categoryId: 'drinks',
    name: 'French 75',
    description: 'Gin, lemon, sparkling wine — the classic.',
    priceKes: 1450,
    imageUrl: img('photo-1481931098730-318b6f776db0', 900),
    tags: [],
    available: true,
    featured: false,
    sortOrder: 3,
    variants: [],
    addons: [],
    allergenNoteSample: false,
  },
]

const experiences = [
  {
    id: 'exp-tasting',
    name: "Chef's Tasting Menu",
    slug: 'chefs-tasting',
    description:
      'Six seasonal courses served to the whole table, with an optional wine pairing selected by our sommelier.',
    imageUrl: img('photo-1414235077428-338989a2e8c0'),
    priceFromKes: 7500,
    highlights: ['Six courses', 'Optional wine pairing', 'Thursday–Saturday evenings'],
    sortOrder: 0,
  },
  {
    id: 'exp-private',
    name: 'Private Dining Room',
    slug: 'private-dining',
    description:
      'Our first-floor room seats up to fourteen guests, with a dedicated server and a menu written for your table.',
    imageUrl: img('photo-1552566626-52f8b828add9'),
    priceFromKes: 9500,
    highlights: ['Up to 14 guests', 'Dedicated server', 'Bespoke menus'],
    sortOrder: 1,
  },
  {
    id: 'exp-sunday',
    name: 'Sunday Long Lunch',
    slug: 'sunday-lunch',
    description: 'A slow four-course lunch with bread, roasts and shared plates for the table.',
    imageUrl: img('photo-1551218808-94e220e084d2'),
    priceFromKes: 4850,
    highlights: ['Four courses', 'Sundays 12:00–15:00', 'Family style'],
    sortOrder: 2,
  },
  {
    id: 'exp-market',
    name: 'Seasonal Market Menu',
    slug: 'seasonal-market',
    description: 'Three courses that change weekly based on what our growers and the market bring in.',
    imageUrl: img('photo-1559847844-5315695dadae'),
    priceFromKes: 3950,
    highlights: ['Changes weekly', 'Three courses', 'Lunch & dinner'],
    sortOrder: 3,
  },
]

const tables = [
  { id: 't-1', name: 'Table 1', seats: 2, area: 'indoor', active: true },
  { id: 't-2', name: 'Table 2', seats: 2, area: 'indoor', active: true },
  { id: 't-3', name: 'Table 3', seats: 4, area: 'indoor', active: true },
  { id: 't-4', name: 'Table 4', seats: 4, area: 'indoor', active: true },
  { id: 't-5', name: 'Table 5', seats: 4, area: 'indoor', active: true },
  { id: 't-6', name: 'Table 6', seats: 6, area: 'indoor', active: true },
  { id: 't-7', name: 'Table 7', seats: 4, area: 'indoor', active: true },
  { id: 't-8', name: 'Table 8', seats: 2, area: 'indoor', active: true },
  { id: 't-p1', name: 'Terrace 1', seats: 4, area: 'terrace', active: true },
  { id: 't-p2', name: 'Terrace 2', seats: 4, area: 'terrace', active: true },
  { id: 't-p3', name: 'Terrace 3', seats: 6, area: 'terrace', active: true },
  { id: 't-p4', name: 'Terrace 4', seats: 2, area: 'terrace', active: false },
  { id: 't-r1', name: 'Private Room', seats: 14, area: 'private', active: true },
]

const openingHours = [
  { day: 1, label: 'Monday', closed: true, open: '12:00', close: '15:00' },
  { day: 2, label: 'Tuesday', closed: false, open: '12:00', close: '22:30' },
  { day: 3, label: 'Wednesday', closed: false, open: '12:00', close: '22:30' },
  { day: 4, label: 'Thursday', closed: false, open: '12:00', close: '22:30' },
  { day: 5, label: 'Friday', closed: false, open: '12:00', close: '23:00' },
  { day: 6, label: 'Saturday', closed: false, open: '12:00', close: '23:00' },
  { day: 0, label: 'Sunday', closed: false, open: '12:00', close: '16:00' },
]

const settings = {
  id: RESTAURANT_ID,
  restaurantId: RESTAURANT_ID,
  seatsPerSlot: 40,
  slotTimes: ['12:30', '13:00', '13:30', '14:00', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'],
  slotDurationMinutes: 30,
  daysAhead: 60,
  minPartySize: 1,
  maxPartySize: 12,
  openingHours,
  blockedDates: [],
  acceptPickup: true,
  acceptDelivery: true,
  deliveryFeeKes: 350,
  freeDeliveryOverKes: 5000,
  serviceChargePercent: 5,
  paymentMethods: ['pay_on_collection'],
  cancellationPolicy:
    'Reservations may be cancelled free of charge up to 4 hours before the seating time. Parties larger than 8 guests are held with a call from our team.',
  reservationNote:
    'Requests are held as pending until our team confirms them. We will call or text to confirm within opening hours.',
  maxItemsPerOrder: 10,
}

const restaurant = {
  id: RESTAURANT_ID,
  name: 'MAISON NOIR',
  wordmark: 'M A I S O N   N O I R',
  established: 2026,
  tagline: 'A slower kind of dining.',
  positioning: 'Seasonal ingredients. Thoughtful cooking. An evening worth remembering.',
  storyIntro:
    'MAISON NOIR is a small dining room in Kilimani built around one idea: cook what the season gives us, and give every table time.',
  addressLines: ['12 Riverside Lane', 'Kilimani'],
  city: 'Nairobi',
  country: 'Kenya',
  phone: '+254 700 512 846',
  email: 'hello@maisonnoir.demo',
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=Kilimani%2C%20Nairobi',
  instagramUrl: 'https://www.instagram.com/maisonnoir.demo',
  timezone: 'Africa/Nairobi',
  currency: 'KES',
  demoNotice: 'MAISON NOIR is a fictional restaurant created for the Collins Reserve demo. Details are illustrative.',
}

async function setDoc(ref, data) {
  await ref.set({ ...data, updatedAt: Date.now(), createdAtTs: FieldValue.serverTimestamp() }, { merge: true })
}

async function seedAuth() {
  let user
  try {
    user = await auth.getUserByEmail(ADMIN_EMAIL)
    console.log(`• admin auth user exists: ${ADMIN_EMAIL}`)
  } catch {
    user = await auth.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      displayName: 'Maison Noir Admin',
      emailVerified: true,
    })
    console.log(`• created admin auth user: ${ADMIN_EMAIL}`)
  }
  await setDoc(db.doc(`users/${user.uid}`), {
    uid: user.uid,
    email: ADMIN_EMAIL,
    displayName: 'Maison Noir Admin',
    role: 'admin',
    restaurantId: RESTAURANT_ID,
  })
  return user.uid
}

async function seedStatic() {
  await setDoc(db.doc(`restaurants/${RESTAURANT_ID}`), restaurant)
  await setDoc(db.doc(`settings/${RESTAURANT_ID}`), settings)

  for (const c of categories) {
    await setDoc(db.doc(`menuCategories/${c.id}`), { ...c, restaurantId: RESTAURANT_ID })
  }
  for (const item of items) {
    await setDoc(db.doc(`menuItems/${item.id}`), {
      ...item,
      restaurantId: RESTAURANT_ID,
      createdAt: Date.now(),
    })
  }
  for (const exp of experiences) {
    await setDoc(db.doc(`services/${exp.id}`), { ...exp, restaurantId: RESTAURANT_ID })
  }
  for (const t of tables) {
    await setDoc(db.doc(`tables/${t.id}`), { ...t, restaurantId: RESTAURANT_ID })
  }
  console.log(
    `• restaurant, settings, ${categories.length} categories, ${items.length} dishes, ${experiences.length} experiences, ${tables.length} tables`,
  )
}

function localDate(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })
}

async function seedSampleOrders() {
  const existing = await db.doc('orders/MN-100241').get()
  if (existing.exists) {
    console.log('• sample orders already seeded')
    return
  }
  const now = Date.now()

  const mkLine = (item, qty) => ({
    itemId: item.id,
    name: item.name,
    unitPriceKes: item.priceKes,
    quantity: qty,
    variantName: null,
    addons: [],
    lineTotalKes: item.priceKes * qty,
  })

  const byId = Object.fromEntries(items.map((i) => [i.id, i]))
  const subtotal = (lines) => lines.reduce((s, l) => s + l.lineTotalKes, 0)

  const samples = [
    {
      id: 'MN-100241',
      type: 'pickup',
      status: 'completed',
      customer: { name: 'Amara Njeri', phone: '0712340111', email: 'amara@example.com' },
      items: [mkLine(byId['main-sirloin'], 1), mkLine(byId['drink-espresso'], 2)],
      createdAt: now - 1000 * 60 * 60 * 4,
      delivery: null,
    },
    {
      id: 'MN-100242',
      type: 'delivery',
      status: 'preparing',
      customer: { name: 'David Otieno', phone: '0722340222', email: 'david@example.com' },
      items: [mkLine(byId['pasta-linguine'], 2), mkLine(byId['dessert-fondant'], 1)],
      createdAt: now - 1000 * 60 * 26,
      delivery: { address: '48 Ring Road, Kilimani', area: 'Kilimani', notes: 'Gate code 4432' },
    },
    {
      id: 'MN-100243',
      type: 'pickup',
      status: 'received',
      customer: { name: 'Faith Kamau', phone: '0733340333', email: 'faith@example.com' },
      items: [mkLine(byId['main-salmon'], 1), mkLine(byId['starter-burrata'], 1)],
      createdAt: now - 1000 * 60 * 4,
      delivery: null,
    },
  ]

  for (const s of samples) {
    const sub = subtotal(s.items)
    const deliveryFee = s.type === 'delivery' ? (sub >= 5000 ? 0 : 350) : 0
    const serviceCharge = Math.round((sub * 5) / 100)
    const timeline =
      s.status === 'completed'
        ? [
            { status: 'received', at: s.createdAt },
            { status: 'accepted', at: s.createdAt + 120000 },
            { status: 'preparing', at: s.createdAt + 300000 },
            { status: 'ready', at: s.createdAt + 1500000 },
            { status: 'completed', at: s.createdAt + 1800000 },
          ]
        : s.status === 'preparing'
          ? [
              { status: 'received', at: s.createdAt },
              { status: 'accepted', at: s.createdAt + 90000 },
              { status: 'preparing', at: s.createdAt + 360000 },
            ]
          : [{ status: 'received', at: s.createdAt }]

    await db.doc(`orders/${s.id}`).set({
      id: s.id,
      restaurantId: RESTAURANT_ID,
      reference: s.id,
      type: s.type,
      items: s.items,
      itemCount: s.items.reduce((n, l) => n + l.quantity, 0),
      subtotalKes: sub,
      deliveryFeeKes: deliveryFee,
      serviceChargeKes: serviceCharge,
      totalKes: sub + deliveryFee + serviceCharge,
      customer: s.customer,
      delivery: s.delivery,
      paymentMethod: 'pay_on_collection',
      status: s.status,
      cancelReason: null,
      timeline,
      statusUpdatedAt: timeline[timeline.length - 1].at,
      createdAt: s.createdAt,
      updatedAt: timeline[timeline.length - 1].at,
      createdAtTs: FieldValue.serverTimestamp(),
    })
  }
  console.log(`• ${samples.length} sample orders`)
}

async function seedSampleReservations() {
  const existing = await db.doc('reservations/MN-R700001').get()
  if (existing.exists) {
    console.log('• sample reservations already seeded')
    return
  }
  const now = Date.now()
  const samples = [
    {
      id: 'MN-R700001',
      date: localDate(0),
      time: '19:00',
      partySize: 2,
      guestName: 'Wanjiku Mwangi',
      guestPhone: '0711110001',
      guestEmail: 'wanjiku@example.com',
      seatingPreference: 'window',
      status: 'confirmed',
      notes: 'Anniversary dinner.',
      createdAt: now - 1000 * 60 * 60 * 30,
    },
    {
      id: 'MN-R700002',
      date: localDate(0),
      time: '19:30',
      partySize: 4,
      guestName: 'Brian Kiprotich',
      guestPhone: '0711110002',
      guestEmail: 'brian@example.com',
      seatingPreference: 'terrace',
      status: 'pending',
      notes: '',
      createdAt: now - 1000 * 60 * 60 * 5,
    },
    {
      id: 'MN-R700003',
      date: localDate(1),
      time: '13:00',
      partySize: 2,
      guestName: 'Aisha Abdallah',
      guestPhone: '0711110003',
      guestEmail: 'aisha@example.com',
      seatingPreference: 'any',
      status: 'confirmed',
      notes: 'One vegetarian guest.',
      createdAt: now - 1000 * 60 * 60 * 12,
    },
  ]

  for (const r of samples) {
    const slotId = `${r.date}--${r.time}`
    await db.doc(`reservations/${r.id}`).set({
      ...r,
      restaurantId: RESTAURANT_ID,
      reference: r.id,
      slotId,
      termsAccepted: true,
      updatedAt: r.createdAt,
      createdAtTs: FieldValue.serverTimestamp(),
    })
    const slotRef = db.doc(`reservationSlots/${slotId}`)
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(slotRef)
      const taken = snap.exists ? Number(snap.data().taken ?? 0) : 0
      if (snap.exists) tx.update(slotRef, { taken: taken + r.partySize, updatedAt: Date.now() })
      else
        tx.set(slotRef, {
          id: slotId,
          restaurantId: RESTAURANT_ID,
          date: r.date,
          time: r.time,
          capacity: settings.seatsPerSlot,
          taken: r.partySize,
          updatedAt: Date.now(),
        })
    })
  }
  console.log(`• ${samples.length} sample reservations + slots`)
}

await seedAuth()
await seedStatic()
await seedSampleOrders()
await seedSampleReservations()
console.log(`\nSeed complete. Admin sign-in: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
process.exit(0)
