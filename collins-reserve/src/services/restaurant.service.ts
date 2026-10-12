import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  type Unsubscribe,
} from 'firebase/firestore'
import { getDb } from '@/services/firebase'
import {
  RESTAURANT_ID,
  type DiningExperience,
  type Restaurant,
  type RestaurantSettings,
  type RestaurantTable,
  type RestaurantUser,
} from '@/types'

export function subscribeToRestaurant(
  cb: (restaurant: Restaurant | null) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getDb(), 'restaurants', RESTAURANT_ID),
    (snap) => cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Restaurant) : null),
    onError,
  )
}

export function subscribeToSettings(
  cb: (settings: RestaurantSettings | null) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getDb(), 'settings', RESTAURANT_ID),
    (snap) => cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as RestaurantSettings) : null),
    onError,
  )
}

export async function updateSettings(patch: Partial<RestaurantSettings>): Promise<void> {
  const { id: _id, restaurantId: _r, ...rest } = patch as RestaurantSettings & Record<string, unknown>
  await updateDoc(doc(getDb(), 'settings', RESTAURANT_ID), {
    ...rest,
    restaurantId: RESTAURANT_ID,
    updatedAt: Date.now(),
  })
}

/** Updates the public restaurant profile (brand, contact, links). */
export async function updateRestaurant(patch: Partial<Restaurant>): Promise<void> {
  const { id: _id, ...rest } = patch as Restaurant & Record<string, unknown>
  await updateDoc(doc(getDb(), 'restaurants', RESTAURANT_ID), {
    ...rest,
    updatedAt: Date.now(),
  })
}

export function subscribeToExperiences(
  cb: (items: DiningExperience[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(getDb(), 'services'), where('restaurantId', '==', RESTAURANT_ID), orderBy('sortOrder')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DiningExperience)),
    onError,
  )
}

export function subscribeToTables(
  cb: (tables: RestaurantTable[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(getDb(), 'tables'), where('restaurantId', '==', RESTAURANT_ID), orderBy('name')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RestaurantTable)),
    onError,
  )
}

export function subscribeToCurrentUserProfile(
  uid: string,
  cb: (user: RestaurantUser | null) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getDb(), 'users', uid),
    (snap) => cb(snap.exists() ? ({ uid: snap.id, ...snap.data() } as RestaurantUser) : null),
    onError,
  )
}
