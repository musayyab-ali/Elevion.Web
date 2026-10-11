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
import { SEARCH_RESULT_LIMIT, searchCatalog, searchCatalogAll } from '@/lib/product-search'
import {
    DEFAULT_REFINEMENT,
    SORT_OPTIONS,
    categoryFacets,
    refineProducts,
    type Refinement,
    type SortKey,
} from '@/lib/search-refine'
import { getApiErrorMessage } from '@/lib/api'

const PRODUCTS_PER_PAGE = 8

/** Empty or non-numeric price boxes mean "no limit". */
const toPrice = (value: string): number | undefined => {
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? n : undefined
}

const SearchResult = () => {
    const [searchKeyword, setSearchKeyword] = useState('')
    const [currentPage, setCurrentPage] = useState(0)
    const [products, setProducts] = useState<ProductType[]>([])
    const [totalMatches, setTotalMatches] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [refinement, setRefinement] = useState<Refinement>(DEFAULT_REFINEMENT)
    const [minPrice, setMinPrice] = useState('')
    const [maxPrice, setMaxPrice] = useState('')
    const [appliedPrice, setAppliedPrice] = useState<{ from?: number; to?: number }>({})
    const [popular, setPopular] = useState<ProductType[]>([])

    const router = useRouter()
    const searchParams = useSearchParams()
    const query = searchParams.get('query')?.trim() ?? ''

    useEffect(() => {
        setSearchKeyword(query)
        setCurrentPage(0)
        // A new search starts with a clean set of filters.
        setRefinement(DEFAULT_REFINEMENT)
        setMinPrice('')
        setMaxPrice('')
        setAppliedPrice({})
    }, [query])

    // One request brings the matches (inside the price range, which the API filters itself);
    // sorting and the other filters then work on them instantly in the browser.
    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(null)

        searchCatalogAll(query, appliedPrice)
            .then((result) => {
                if (cancelled) return
                setProducts(result.products)
                setTotalMatches(result.total)
            })
            .catch((err) => {
                if (!cancelled) setError(getApiErrorMessage(err, 'Failed to load products.'))
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [query, appliedPrice])

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

    const applyPrice = () => {
        const from = toPrice(minPrice)
        const to = toPrice(maxPrice)
        // A reversed range (min above max) is swapped instead of silently returning nothing.
        setAppliedPrice(from && to && from > to ? { from: to, to: from } : { from, to })
        setCurrentPage(0)
    }

    const update = (patch: Partial<Refinement>) => {
        setRefinement((current) => ({ ...current, ...patch }))
        setCurrentPage(0)
    }

    const clearFilters = () => {
        setRefinement(DEFAULT_REFINEMENT)
        setMinPrice('')
        setMaxPrice('')
        setAppliedPrice({})
        setCurrentPage(0)
    }

    const activeQuery = searchKeyword.trim()
    const facets = useMemo(() => categoryFacets(products), [products])
    const visible = useMemo(() => refineProducts(products, refinement, query), [products, refinement, query])
    const pageCount = Math.ceil(visible.length / PRODUCTS_PER_PAGE)
    const currentProducts = visible.slice(currentPage * PRODUCTS_PER_PAGE, (currentPage + 1) * PRODUCTS_PER_PAGE)

    const filtersActive =
        Boolean(refinement.category) ||
        refinement.inStockOnly ||
        refinement.onSaleOnly ||
        Boolean(appliedPrice.from) ||
        Boolean(appliedPrice.to)

    // When nothing matches, offer popular products instead of a dead end.
    useEffect(() => {
        if (loading || error || visible.length > 0) return
        let cancelled = false
        searchCatalog('', 1, 4)
            .then((page) => {
                if (!cancelled) setPopular(page.products)
            })
            .catch(() => undefined)
        return () => {
            cancelled = true
        }
    }, [loading, error, visible.length])

    const handlePageChange = (selected: number) => {
        setCurrentPage(selected)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return (
        <>
            <TopNavOne props="style-one bg-black" />
            <div id="header" className='relative w-full'>
                <MenuOne props="bg-transparent" />
                <Breadcrumb heading='Search Result' subHeading='Search Result' />
            </div>
            <div className="shop-product breadcrumb1 lg:py-20 md:py-14 py-10">
                <div className="container">
                    <div className="heading flex flex-col items-center">
                        <div className="heading4 text-center" aria-live="polite">
                            {loading ? (
                                <>Searching...</>
                            ) : activeQuery ? (
                                <>Found {visible.length} results for {String.raw`"`}{activeQuery}{String.raw`"`}</>
                            ) : (
                                <>Showing {visible.length} products</>
                            )}
                        </div>
                        <div className="input-block lg:w-1/2 sm:w-3/5 w-full md:h-[52px] h-[44px] sm:mt-8 mt-5">
                            <div className='w-full h-full relative'>
                                <input
                                    type="text"
                                    placeholder='Search products...'
                                    aria-label='Search products'
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

                    {/* Filters */}
                    {!error && (products.length > 0 || filtersActive) && (
                        <div className="mt-8 rounded-2xl border border-line p-4 md:p-5 flex flex-col gap-4">
                            <div className="flex flex-wrap items-end gap-4">
                                <label className="flex flex-col gap-1 caption1 text-secondary">
                                    Sort by
                                    <select
                                        className="h-10 rounded-lg border border-line px-3 text-black bg-white"
                                        value={refinement.sort}
                                        onChange={(e) => update({ sort: e.target.value as SortKey })}
                                    >
                                        {SORT_OPTIONS.map((option) => (
                                            <option key={option.key} value={option.key}>{option.label}</option>
                                        ))}
                                    </select>
                                </label>

                                <form
                                    className="flex items-end gap-2"
                                    onSubmit={(e) => {
                                        e.preventDefault()
                                        applyPrice()
                                    }}
                                >
                                    <label className="flex flex-col gap-1 caption1 text-secondary">
                                        Min price (Rs.)
                                        <input
                                            type="number"
                                            min={0}
                                            inputMode="numeric"
                                            className="h-10 w-28 rounded-lg border border-line px-3 text-black"
                                            value={minPrice}
                                            onChange={(e) => setMinPrice(e.target.value)}
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1 caption1 text-secondary">
                                        Max price (Rs.)
                                        <input
                                            type="number"
                                            min={0}
                                            inputMode="numeric"
                                            className="h-10 w-28 rounded-lg border border-line px-3 text-black"
                                            value={maxPrice}
                                            onChange={(e) => setMaxPrice(e.target.value)}
                                        />
                                    </label>
                                    <button type="submit" className="h-10 px-4 rounded-lg border border-black text-button hover:bg-black hover:text-white duration-300">
                                        Apply
                                    </button>
                                </form>

                                <label className="flex items-center gap-2 caption1 h-10 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={refinement.inStockOnly}
                                        onChange={(e) => update({ inStockOnly: e.target.checked })}
                                    />
                                    In stock only
                                </label>
                                <label className="flex items-center gap-2 caption1 h-10 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={refinement.onSaleOnly}
                                        onChange={(e) => update({ onSaleOnly: e.target.checked })}
                                    />
                                    On sale
                                </label>

                                {filtersActive && (
                                    <button type="button" className="h-10 caption1 underline text-secondary" onClick={clearFilters}>
                                        Clear filters
                                    </button>
                                )}
                            </div>

                            {facets.length > 1 && (
                                <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
                                    <button
                                        type="button"
                                        className={`caption1 px-4 py-1.5 rounded-full border duration-300 ${!refinement.category ? 'bg-black text-white border-black' : 'border-line hover:border-black'}`}
                                        onClick={() => update({ category: '' })}
                                    >
                                        All
                                    </button>
                                    {facets.map((facet) => (
                                        <button
                                            key={facet.name}
                                            type="button"
                                            aria-pressed={refinement.category === facet.name}
                                            className={`caption1 px-4 py-1.5 rounded-full border duration-300 ${refinement.category === facet.name ? 'bg-black text-white border-black' : 'border-line hover:border-black'}`}
                                            onClick={() => update({ category: refinement.category === facet.name ? '' : facet.name })}
                                        >
                                            {facet.name} ({facet.count})
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="list-product-block relative md:pt-10 pt-6">
                        <div className="heading6">
                            {activeQuery ? `Product Search: ${activeQuery}` : 'All Products'}
                        </div>

                        {!loading && !error && totalMatches > SEARCH_RESULT_LIMIT && (
                            <p className="caption1 text-secondary mt-2">
                                Showing the first {SEARCH_RESULT_LIMIT} of {totalMatches} matches. Add words to your search or set a price range to narrow it down.
                            </p>
                        )}

                        {loading ? (
                            <div className="mt-5">
                                <ProductSkeleton variant="grid" count={8} />
                            </div>
                        ) : error ? (
                            <div className="text-center py-10 rounded-2xl bg-surface mt-5">
                                <p className="text-red">{error}</p>
                            </div>
                        ) : currentProducts.length === 0 ? (
                            <>
                                <div className="text-center py-12 rounded-2xl bg-surface mt-5">
                                    <div className="heading5">No products found</div>
                                    <p className="body1 text-secondary mt-2">
                                        {filtersActive
                                            ? 'No products match these filters.'
                                            : activeQuery
                                                ? `No products match "${activeQuery}". Check the spelling or try a different keyword.`
                                                : 'No products are available right now.'}
                                    </p>
                                    {filtersActive && (
                                        <button type="button" className="button-main mt-4" onClick={clearFilters}>
                                            Clear filters
                                        </button>
                                    )}
                                </div>
                                {popular.length > 0 && (
                                    <div className="mt-10">
                                        <div className="heading6">You may like these</div>
                                        <div className="list-product hide-product-sold grid lg:grid-cols-4 sm:grid-cols-3 grid-cols-2 sm:gap-[30px] gap-[20px] mt-5">
                                            {popular.map((item) => (
                                                <Product
                                                    key={`${item.id}-${item.productDetailId ?? 'default'}`}
                                                    data={item}
                                                    type='grid'
                                                    style='style-1'
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
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
