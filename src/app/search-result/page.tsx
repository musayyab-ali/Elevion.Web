'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import TopNavOne from '@/components/Header/TopNav/TopNavOne'
import MenuOne from '@/components/Header/Menu/MenuOne'
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb'
import Footer from '@/components/Footer/Footer'
import { ProductType } from '@/type/ProductType'
import Product from '@/components/Product/Product'
import ProductSkeleton from '@/components/Other/ProductSkeleton'
import HandlePagination from '@/components/Other/HandlePagination'
import {
    filterProductsByQuery,
    getSearchableProducts,
} from '@/lib/product-search'
import { getApiErrorMessage } from '@/lib/api'

const SearchResult = () => {
    const [searchKeyword, setSearchKeyword] = useState('')
    const [currentPage, setCurrentPage] = useState(0)
    const [products, setProducts] = useState<ProductType[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const productsPerPage = 8

    const router = useRouter()
    const searchParams = useSearchParams()
    const query = searchParams.get('query')?.trim() ?? ''

    useEffect(() => {
        let cancelled = false

        const loadProducts = async () => {
            setLoading(true)
            setError(null)

            try {
                const data = await getSearchableProducts()
                if (!cancelled) setProducts(data)
            } catch (err) {
                if (!cancelled) {
                    setError(getApiErrorMessage(err, 'Failed to load products.'))
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        loadProducts()

        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        setSearchKeyword(query)
        setCurrentPage(0)
    }, [query])

    useEffect(() => {
        const trimmed = searchKeyword.trim()
        if (trimmed === query) return

        const timer = window.setTimeout(() => {
            const href = trimmed
                ? `/search-result?query=${encodeURIComponent(trimmed)}`
                : '/search-result'
            router.replace(href, { scroll: false })
        }, 400)

        return () => window.clearTimeout(timer)
    }, [searchKeyword, query, router])

    const handleSearch = (value: string) => {
        const trimmed = value.trim()
        const href = trimmed
            ? `/search-result?query=${encodeURIComponent(trimmed)}`
            : '/search-result'
        router.push(href)
    }

    const activeQuery = searchKeyword.trim()
    const filteredData = useMemo(
        () => filterProductsByQuery(products, activeQuery),
        [products, activeQuery],
    )
    const pageCount = Math.ceil(filteredData.length / productsPerPage)
    const offset = currentPage * productsPerPage
    const currentProducts = filteredData.slice(offset, offset + productsPerPage)

    const handlePageChange = (selected: number) => {
        setCurrentPage(selected)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return (
        <>
            <TopNavOne props="style-one bg-black" slogan="New customers save 10% with the code GET10" />
            <div id="header" className='relative w-full'>
                <MenuOne props="bg-transparent" />
                <Breadcrumb heading='Search Result' subHeading='Search Result' />
            </div>
            <div className="shop-product breadcrumb1 lg:py-20 md:py-14 py-10">
                <div className="container">
                    <div className="heading flex flex-col items-center">
                        <div className="heading4 text-center">
                            {activeQuery ? (
                                <>Found {filteredData.length} results for {String.raw`"`}{activeQuery}{String.raw`"`}</>
                            ) : (
                                <>Showing {filteredData.length} products</>
                            )}
                        </div>
                        <div className="input-block lg:w-1/2 sm:w-3/5 w-full md:h-[52px] h-[44px] sm:mt-8 mt-5">
                            <div className='w-full h-full relative'>
                                <input
                                    type="text"
                                    placeholder='Search products...'
                                    className='caption1 w-full h-full pl-4 md:pr-[150px] pr-32 rounded-xl border border-line'
                                    value={searchKeyword}
                                    onChange={(e) => {
                                        setSearchKeyword(e.target.value)
                                        setCurrentPage(0)
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchKeyword)}
                                />
                                <button
                                    className='button-main absolute top-1 bottom-1 right-1 flex items-center justify-center'
                                    onClick={() => handleSearch(searchKeyword)}
                                >
                                    search
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="list-product-block relative md:pt-10 pt-6">
                        <div className="heading6">
                            {activeQuery ? `Product Search: ${activeQuery}` : 'All Products'}
                        </div>

                        {loading ? (
                            <div className="mt-5">
                                <ProductSkeleton variant="grid" count={8} />
                            </div>
                        ) : error ? (
                            <div className="text-center py-10 rounded-2xl bg-surface mt-5">
                                <p className="text-red">{error}</p>
                            </div>
                        ) : currentProducts.length === 0 ? (
                            <div className="text-center py-12 rounded-2xl bg-surface mt-5">
                                <div className="heading5">No products found</div>
                                <p className="body1 text-secondary mt-2">
                                    {activeQuery
                                        ? `No products match "${activeQuery}". Try a different keyword.`
                                        : 'No products are available right now.'}
                                </p>
                            </div>
                        ) : (
                            <div className="list-product hide-product-sold grid lg:grid-cols-4 sm:grid-cols-3 grid-cols-2 sm:gap-[30px] gap-[20px] mt-5">
                                {currentProducts.map((item) => (
                                    <Product
                                        key={`${item.id}-${item.productDetailId ?? 'default'}`}
                                        data={item}
                                        type='grid'
                                        style='style-1'
                                    />
                                ))}
                            </div>
                        )}

                        {!loading && !error && pageCount > 1 && (
                            <div className="list-pagination flex items-center justify-center md:mt-10 mt-7">
                                <HandlePagination pageCount={pageCount} onPageChange={handlePageChange} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default SearchResult
