/* Shared domain types for Collins Reserve.
 * All monetary values are whole Kenyan Shillings (integers).
 * All dates use the restaurant's local timezone (Africa/Nairobi). */

export const RESTAURANT_ID = import.meta.env.VITE_RESTAURANT_ID ?? 'maison-noir'

export type OrderStatus =
  | 'received'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'rejected'
  | 'cancelled'

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

export type FulfillmentMethod = 'pickup' | 'delivery'

export type DietaryTag =
  | 'vegetarian'
  | 'vegan'
  | 'gluten_free'
  | 'spicy'
  | 'nuts'
  | 'dairy'
  | 'shellfish'

export type SeatingPreference = 'any' | 'indoor' | 'terrace' | 'window'

export interface Restaurant {
  id: string
  name: string
  wordmark: string
  established: number
  tagline: string
  positioning: string
  storyIntro: string
  addressLines: string[]
  city: string
  country: string
  phone: string
  email: string
  mapUrl: string
  instagramUrl: string
  timezone: string
  currency: 'KES'
  demoNotice: string
}

export interface OpeningHoursDay {
  /** 0 = Sunday … 6 = Saturday */
  day: number
  label: string
  closed: boolean
  open: string
  close: string
}

export interface RestaurantSettings {
  id: string
  restaurantId: string
  seatsPerSlot: number
  slotTimes: string[]
  slotDurationMinutes: number
  daysAhead: number
  minPartySize: number
  maxPartySize: number
  openingHours: OpeningHoursDay[]
  blockedDates: string[]
  acceptPickup: boolean
  acceptDelivery: boolean
  deliveryFeeKes: number
  freeDeliveryOverKes: number | null
  serviceChargePercent: number
  paymentMethods: string[]
  cancellationPolicy: string
  reservationNote: string
  maxItemsPerOrder: number
}

export interface MenuCategory {
  id: string
  restaurantId: string
  name: string
  slug: string
  description: string
  sortOrder: number
}

export interface MenuItemVariant {
  id: string
  name: string
  priceDeltaKes: number
}

export interface MenuItemAddon {
  id: string
  name: string
  priceKes: number
}

export interface MenuItem {
  id: string
  restaurantId: string
  categoryId: string
  name: string
  description: string
  priceKes: number
  imageUrl: string
  tags: DietaryTag[]
  available: boolean
  featured: boolean
  sortOrder: number
  variants: MenuItemVariant[]
  addons: MenuItemAddon[]
  allergenNoteSample: boolean
  createdAt?: number
  updatedAt?: number
}

export interface DiningExperience {
  id: string
  restaurantId: string
  name: string
  slug: string
  description: string
  imageUrl: string
  priceFromKes: number | null
  highlights: string[]
  sortOrder: number
}

export interface RestaurantTable {
  id: string
  restaurantId: string
  name: string
  seats: number
  area: 'indoor' | 'terrace' | 'private'
  active: boolean
}

export interface OrderAddon {
  id: string
  name: string
  priceKes: number
}

export interface OrderLine {
  itemId: string
  name: string
  unitPriceKes: number
  quantity: number
  variantId: string | null
  variantName: string | null
  addons: OrderAddon[]
  lineTotalKes: number
}

export interface OrderCustomer {
  name: string
  phone: string
  email: string
}

export interface OrderDelivery {
  address: string
  area: string
  notes: string
}

export interface OrderStatusEvent {
  status: OrderStatus
  at: number
  note?: string
}

export interface Order {
  id: string
  restaurantId: string
  reference: string
  type: FulfillmentMethod
  items: OrderLine[]
  itemCount: number
  subtotalKes: number
  deliveryFeeKes: number
  serviceChargeKes: number
  totalKes: number
  customer: OrderCustomer
  delivery: OrderDelivery | null
  paymentMethod: string
  status: OrderStatus
  cancelReason: string | null
  timeline: OrderStatusEvent[]
  statusUpdatedAt: number
  createdAt: number
  updatedAt: number
}

export interface Reservation {
  id: string
  restaurantId: string
  reference: string
  guestName: string
  guestPhone: string
  guestEmail: string
  date: string
  time: string
  partySize: number
  seatingPreference: SeatingPreference
  notes: string
  status: ReservationStatus
  slotId: string
  termsAccepted: boolean
  createdAt: number
  updatedAt: number
}

export interface ReservationSlot {
  id: string
  restaurantId: string
  date: string
  time: string
  capacity: number
  taken: number
}

export interface RestaurantUser {
  uid: string
  email: string
  displayName: string
  role: 'admin' | 'manager' | 'staff'
  restaurantId: string
}

export interface CustomerRecord {
  id: string
  restaurantId: string
  name: string
  phone: string
  email: string
  orderCount: number
  totalSpentKes: number
  lastOrderAt: number
  firstOrderAt: number
}

/* ---------------------------- helpers ----------------------------- */

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'received',
  'accepted',
  'preparing',
  'ready',
  'completed',
]

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  received: ['accepted', 'rejected', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed'],
  completed: [],
  rejected: [],
  cancelled: [],
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'Received',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show: 'No show',
}

export const DIETARY_LABELS: Record<DietaryTag, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  gluten_free: 'Gluten free',
  spicy: 'Spicy',
  nuts: 'Contains nuts',
  dairy: 'Contains dairy',
  shellfish: 'Contains shellfish',
}

export const DINNER_SLOT_TIMES = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00']
