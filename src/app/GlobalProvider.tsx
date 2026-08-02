import React from 'react'
import AuthSessionWatcher from '@/components/Auth/AuthSessionWatcher'
import OrderFlowStorageCleanup from '@/components/Order/OrderFlowStorageCleanup'
import { CartProvider } from '@/context/CartContext'
import { ModalCartProvider } from '@/context/ModalCartContext'
import { WishlistProvider } from '@/context/WishlistContext'
import { ModalWishlistProvider } from '@/context/ModalWishlistContext'
import { CompareProvider } from '@/context/CompareContext'
import { ModalCompareProvider } from '@/context/ModalCompareContext'
import { ModalSearchProvider } from '@/context/ModalSearchContext'
import { ModalQuickviewProvider } from '@/context/ModalQuickviewContext'
import { LandingPageProvider } from '@/context/LandingPageContext'

const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <LandingPageProvider>
        <CartProvider>
            <ModalCartProvider>
                <WishlistProvider>
                    <ModalWishlistProvider>
                        <CompareProvider>
                            <ModalCompareProvider>
                                <ModalSearchProvider>
                                    <ModalQuickviewProvider>
                                        <AuthSessionWatcher />
                                        <OrderFlowStorageCleanup />
                                        {children}
                                    </ModalQuickviewProvider>
                                </ModalSearchProvider>
                            </ModalCompareProvider>
                        </CompareProvider>
                    </ModalWishlistProvider>
                </WishlistProvider>
            </ModalCartProvider>
        </CartProvider>
        </LandingPageProvider>
    )
}

export default GlobalProvider