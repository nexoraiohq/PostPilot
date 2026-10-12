import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { getDb } from '@/services/firebase'
import { RESTAURANT_ID, type RestaurantTable } from '@/types'

const tablesCol = () => collection(getDb(), 'tables')

function withMeta(data: Record<string, unknown>) {
  return { ...data, restaurantId: RESTAURANT_ID, updatedAt: Date.now() }
}

export interface TableInput {
  name: string
  seats: number
  area: RestaurantTable['area']
  active: boolean
}

export async function createTable(input: TableInput): Promise<string> {
  const ref = await addDoc(
    tablesCol(),
    withMeta({
      name: input.name.trim(),
      seats: Math.round(input.seats),
      area: input.area,
      active: input.active,
    }),
  )
  return ref.id
}

export async function updateTable(id: string, patch: Partial<RestaurantTable>): Promise<void> {
  const { id: _id, restaurantId: _r, ...rest } = patch as RestaurantTable & Record<string, unknown>
  await updateDoc(doc(tablesCol(), id), withMeta(rest as Record<string, unknown>))
}

export async function deleteTable(id: string): Promise<void> {
  await deleteDoc(doc(tablesCol(), id))
}

export { subscribeToTables } from '@/services/restaurant.service'
