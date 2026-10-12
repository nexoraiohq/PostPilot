import type { ReactNode } from 'react'
import { AuthProvider } from '@/context/auth'
import { CartProvider } from '@/context/cart'
import { ToastProvider } from '@/context/toast'
import { MenuDataProvider, RestaurantDataProvider } from '@/hooks/data'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <RestaurantDataProvider>
          <MenuDataProvider>
            <CartProvider>{children}</CartProvider>
          </MenuDataProvider>
        </RestaurantDataProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
