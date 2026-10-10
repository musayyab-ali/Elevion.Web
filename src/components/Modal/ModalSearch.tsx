'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import * as Icon from "@phosphor-icons/react/dist/ssr";
import Product from '../Product/Product';
import ProductSkeleton from '@/components/Other/ProductSkeleton'
import { useModalSearchContext } from '@/context/ModalSearchContext'
import { ProductType } from '@/type/ProductType'
import { searchCatalog } from '@/lib/product-search'
import { getProductDetailUrl } from '@/lib/featured-products'

const ModalSearch = () => {
    const { isModalOpen, closeModalSearch } = useModalSearchContext();
    const [searchKeyword, setSearchKeyword] = useState('');
    const [suggestions, setSuggestions] = useState<ProductType[]>([]);
    const [totalMatches, setTotalMatches] = useState(0);
    const [loading, setLoading] = useState(false);
    const router = useRouter()

    const trimmedQuery = searchKeyword.trim();

    useEffect(() => {
        if (!isModalOpen) {
            setSearchKeyword('');
            return;
        }

        // Ask the API for just the few matches that are shown, and only once the customer pauses typing.
        // "cancelled" drops the answer of an older keystroke if a newer one has already been sent.
        let cancelled = false;
        setLoading(true);

        const timer = window.setTimeout(async () => {
            try {
                const page = await searchCatalog(trimmedQuery, 1, 6);
                if (cancelled) return;
                setSuggestions(page.products);
                setTotalMatches(page.total);
            } catch {
                if (cancelled) return;
                setSuggestions([]);
                setTotalMatches(0);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, trimmedQuery ? 250 : 0);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [isModalOpen, trimmedQuery]);

    const handleSearch = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return;
        router.push(`/search-result?query=${encodeURIComponent(trimmed)}`)
        closeModalSearch()
        setSearchKeyword('')
    }

    const openProduct = () => {
        closeModalSearch();
        setSearchKeyword('');
    }

    return (
        <>
            <div className={`modal-search-block`} onClick={closeModalSearch}>
                <div
                    className={`modal-search-main md:p-10 p-6 rounded-[32px] ${isModalOpen ? 'open' : ''}`}
                    onClick={(e) => { e.stopPropagation() }}
                >
                    <div className="form-search relative">
                        <Icon.MagnifyingGlass
                            className='absolute heading5 right-6 top-1/2 -translate-y-1/2 cursor-pointer'
                            onClick={() => handleSearch(searchKeyword)}
                        />
                        <input
                            type="text"
                            placeholder='Search products...'
                            className='text-button-lg h-14 rounded-2xl border border-line w-full pl-6 pr-12'
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchKeyword)}
                            autoFocus={isModalOpen}
                        />
                    </div>

                    {trimmedQuery && totalMatches > suggestions.length && (
                        <button
                            type="button"
                            className="caption1 text-left text-black underline mt-4"
                            onClick={() => handleSearch(trimmedQuery)}
                        >
                            View all {totalMatches} results for &quot;{trimmedQuery}&quot;
                        </button>
                    )}

                    {trimmedQuery && suggestions.length > 0 && (
                        <div className="mt-4 rounded-2xl border border-line overflow-hidden">
                            {suggestions.map((product) => {
                                const image =
                                    product.thumbImage?.[0] ||
                                    product.images?.[0] ||
                                    '/images/product/1000x1000.png';

                                return (
                                    <Link
                                        key={`${product.id}-${product.productDetailId ?? 'default'}`}
                                        href={getProductDetailUrl(product.id, product.productDetailId)}
                                        onClick={openProduct}
                                        className="flex items-center gap-4 px-4 py-3 border-b border-line last:border-b-0 hover:bg-surface duration-300"
                                    >
                                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-surface shrink-0">
                                            <Image
                                                src={image}
                                                alt={product.name}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-button truncate">{product.name}</div>
                                            <div className="caption2 text-secondary truncate">
                                                {product.category}
                                            </div>
                                        </div>
                                        <div className="text-button shrink-0">
                                            ${product.price.toFixed(2)}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    <div className="list-recent mt-8">
                        <div className="heading6">
                            {trimmedQuery ? 'Top matches' : 'Popular products'}
                        </div>
                        <div className="list-product pb-5 hide-product-sold grid xl:grid-cols-4 sm:grid-cols-2 gap-7 mt-4">
                            {loading ? (
                                <ProductSkeleton variant="grid" count={4} className="col-span-full" />
                            ) : suggestions.length > 0 ? (
                                suggestions.slice(0, 4).map((product) => (
                                    <Product
                                        key={`${product.id}-${product.productDetailId ?? 'default'}`}
                                        data={product}
                                        type='grid'
                                        style='style-1'
                                    />
                                ))
                            ) : (
                                <p className="text-secondary col-span-full">
                                    {trimmedQuery
                                        ? `No products found for "${trimmedQuery}".`
                                        : 'No products found.'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default ModalSearch;
