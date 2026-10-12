import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { getDb } from '@/services/firebase'
import { RESTAURANT_ID, type MenuCategory, type MenuItem } from '@/types'

const categoriesCol = () => collection(getDb(), 'menuCategories')
const itemsCol = () => collection(getDb(), 'menuItems')

function withMeta(data: Record<string, unknown>) {
  return { ...data, restaurantId: RESTAURANT_ID, updatedAt: Date.now() }
}

export function subscribeToCategories(cb: (categories: MenuCategory[]) => void, onError?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    query(categoriesCol(), where('restaurantId', '==', RESTAURANT_ID), orderBy('sortOrder')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MenuCategory)),
    onError,
  )
}

export function subscribeToMenuItems(cb: (items: MenuItem[]) => void, onError?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    query(itemsCol(), where('restaurantId', '==', RESTAURANT_ID), orderBy('sortOrder')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MenuItem)),
    onError,
  )
}

export async function getMenuItem(id: string): Promise<MenuItem | null> {
  const snap = await getDoc(doc(itemsCol(), id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as MenuItem) : null
}

export async function getMenuItemsByIds(ids: string[]): Promise<MenuItem[]> {
  if (ids.length === 0) return []
  const results = await Promise.all(ids.map((id) => getDoc(doc(itemsCol(), id))))
  return results
    .filter((s) => s.exists())
    .map((s) => ({ id: s.id, ...s.data() }) as MenuItem)
}

export async function createMenuItem(input: Omit<MenuItem, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(itemsCol(), {
    ...withMeta(input),
    createdAt: Date.now(),
    _ts: serverTimestamp(),
  })
  return ref.id
}

export async function updateMenuItem(id: string, patch: Partial<MenuItem>): Promise<void> {
  const { id: _id, restaurantId: _r, createdAt: _c, ...rest } = patch as MenuItem & Record<string, unknown>
  await updateDoc(doc(itemsCol(), id), withMeta(rest as Record<string, unknown>))
}

export async function deleteMenuItem(id: string): Promise<void> {
  await deleteDoc(doc(itemsCol(), id))
}

export async function createCategory(input: Omit<MenuCategory, 'id' | 'restaurantId'>): Promise<string> {
  const ref = await addDoc(categoriesCol(), withMeta(input as Record<string, unknown>))
  return ref.id
}

export async function updateCategory(id: string, patch: Partial<MenuCategory>): Promise<void> {
  const { id: _id, restaurantId: _r, ...rest } = patch as MenuCategory & Record<string, unknown>
  await updateDoc(doc(categoriesCol(), id), withMeta(rest as Record<string, unknown>))
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(categoriesCol(), id))
}

/** Batch-reorders items. `orderedIds` is the desired order. */
export async function reorderMenuItems(orderedIds: string[]): Promise<void> {
  const batch = writeBatch(getDb())
  orderedIds.forEach((id, index) => {
    batch.update(doc(itemsCol(), id), { sortOrder: index, updatedAt: Date.now() })
  })
  await batch.commit()
}

export async function countMenuItems(): Promise<number> {
  const snap = await getDocs(query(itemsCol(), where('restaurantId', '==', RESTAURANT_ID)))
  return snap.size
}
