// app/chapters/ChaptersPageClient.tsx
"use client"

import { useState, useMemo, useCallback, memo } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { chapters, PRICING, isChapterLocked } from '@/data/chapters'
import { Lock, Check, Crown, Search, ArrowLeft, BookOpen, X, Sparkles } from 'lucide-react'
import Link from 'next/link'

// ============================================================================
// Types
// ============================================================================

type FilterType = 'all' | 'free' | 'locked' | 'owned'

interface ChapterItemProps {
  chapter: typeof chapters[number]
  isAccessible: boolean
  isFree: boolean
  isOwnedCustom: boolean
  hasCompletePack: boolean
}

// ============================================================================
// Chapter Item Component (Memoized)
// ============================================================================

const ChapterItem = memo(function ChapterItem({
  chapter,
  isAccessible,
  isFree,
  isOwnedCustom,
  hasCompletePack
}: ChapterItemProps) {
  const isPrologue = chapter.id === 0

  return (
    <li>
      <Link
        href={isAccessible ? `/read/${chapter.slug}` : '/#pricing'}
        className={`block p-5 rounded-xl border transition-all group active:scale-[0.99] ${
          isAccessible
            ? 'bg-neutral-900/40 border-neutral-800/60 hover:border-[#9f1239]/50 hover:bg-neutral-900/60'
            : 'bg-neutral-900/20 border-neutral-800/30 opacity-60 hover:opacity-80'
        }`}
        aria-label={`${chapter.number}: ${chapter.title}${!isAccessible ? ' (Locked)' : ''}`}
      >
        <article className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center font-heading text-lg transition-transform group-hover:scale-105 ${
            isAccessible
              ? 'bg-[#9f1239]/10 border border-[#9f1239]/30 text-[#9f1239]'
              : 'bg-neutral-800/30 border border-neutral-700/30 text-neutral-600'
          }`}>
            {isPrologue ? 'P' : chapter.id}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="min-w-0">
                <div className="text-[10px] font-ui tracking-[0.3em] uppercase text-neutral-500 mb-1">
                  {chapter.number}
                </div>
                <h2 className={`text-lg font-heading line-clamp-2 transition-colors ${
                  isAccessible 
                    ? 'text-neutral-100 group-hover:text-white' 
                    : 'text-neutral-400'
                }`}>
                  {chapter.title}
                </h2>
              </div>
              
              <div className="flex-shrink-0">
                {hasCompletePack && !isFree ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-600/20 to-yellow-600/20 border border-amber-500/30 rounded-full">
                    <Crown className="w-3 h-3 text-amber-400" aria-hidden="true" />
                    <span className="text-xs text-amber-300 font-ui uppercase tracking-wider">Complete</span>
                  </span>
                ) : isFree ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-900/20 border border-green-800/30 rounded-full">
                    <Check className="w-3 h-3 text-green-400" aria-hidden="true" />
                    <span className="text-xs text-green-300 font-ui uppercase tracking-wider">Free</span>
                  </span>
                ) : isOwnedCustom ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-900/20 border border-blue-800/30 rounded-full">
                    <Check className="w-3 h-3 text-blue-400" aria-hidden="true" />
                    <span className="text-xs text-blue-300 font-ui uppercase tracking-wider">Owned</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-800/30 border border-neutral-700/30 rounded-full">
                    <Lock className="w-3 h-3 text-neutral-500" aria-hidden="true" />
                    <span className="text-xs text-neutral-400 font-ui uppercase tracking-wider">Locked</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-neutral-500 font-body">
              {!isAccessible && (
                <span className="text-[#9f1239]">
                  Unlock with Complete Pack or ₹{PRICING.CUSTOM_SELECTION.pricePerChapter}/chapter
                </span>
              )}
              {isAccessible && (
                <span className="text-neutral-600 group-hover:text-neutral-400 transition-colors">
                  Click to read →
                </span>
              )}
            </div>
          </div>
        </article>
      </Link>
    </li>
  )
})

// ============================================================================
// Main Chapters Page Component
// ============================================================================

export default function ChaptersPageClient() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')

  const userTier = user?.tier || 'free'
  const ownedChapters = useMemo(() => {
    if (!user?.ownedChapters) return []
    if (!Array.isArray(user.ownedChapters)) return []
    return user.ownedChapters
  }, [user?.ownedChapters])

  const hasCompletePack = userTier === 'complete'

  const isChapterAccessible = useCallback((chapterId: number) => {
    return !isChapterLocked(chapterId, userTier, ownedChapters)
  }, [userTier, ownedChapters])

  const filteredChapters = useMemo(() => {
    return chapters.filter(chapter => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = chapter.title.toLowerCase().includes(query)
        const matchesNumber = chapter.number.toLowerCase().includes(query)
        const matchesId = chapter.id.toString().includes(query)
        
        if (!matchesTitle && !matchesNumber && !matchesId) {
          return false
        }
      }

      switch (filter) {
        case 'free':
          return chapter.id <= PRICING.FREE_CHAPTERS
        case 'locked':
          return !isChapterAccessible(chapter.id)
        case 'owned':
          return isChapterAccessible(chapter.id)
        default:
          return true
      }
    })
  }, [searchQuery, filter, isChapterAccessible])

  const stats = useMemo(() => {
    const totalChapters = chapters.length
    const freeChapters = PRICING.FREE_CHAPTERS + 1
    const accessibleChapters = chapters.filter(ch => isChapterAccessible(ch.id)).length
    const lockedChapters = totalChapters - accessibleChapters

    return {
      total: totalChapters,
      free: freeChapters,
      accessible: accessibleChapters,
      locked: lockedChapters,
    }
  }, [isChapterAccessible])

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setFilter('all')
  }, [])

  const clearSearch = useCallback(() => setSearchQuery(''), [])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#9f1239] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400 font-body">Loading chapters...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-black to-black -z-10" />
      
      <div className="max-w-7xl mx-auto px-6 py-12 pb-24">
        {/* Header */}
        <header className="mb-12">
          <nav aria-label="Breadcrumb">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-8 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm font-ui">Back to Home</span>
            </Link>
          </nav>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-[#9f1239]/10 border border-[#9f1239]/30 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#9f1239]" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-4xl md:text-6xl font-heading text-neutral-100 tracking-tight">
                All Chapters
              </h1>
              <p className="text-neutral-400 font-body mt-2">
                Browse and read all {chapters.length} available chapters
              </p>
            </div>
          </div>

          {isAuthenticated && user && (
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-800/50 rounded-full">
              <div className="relative">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
              </div>
              <span className="text-sm text-green-400 font-ui uppercase tracking-wider">
                {hasCompletePack ? (
                  <>
                    <Crown className="w-3.5 h-3.5 inline mr-1.5" aria-hidden="true" />
                    Complete Pack Active
                  </>
                ) : ownedChapters.length > 0 ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 inline mr-1.5" aria-hidden="true" />
                    {ownedChapters.length} Custom Chapters Owned
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 inline mr-1.5" aria-hidden="true" />
                    Free Tier - {stats.free} Chapters
                  </>
                )}
              </span>
            </div>
          )}
        </header>

        {/* Stats Bar */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" aria-label="Chapter statistics">
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-4 hover:bg-neutral-900/60 transition-colors">
            <div className="text-2xl font-heading text-neutral-100 mb-1">
              {stats.total}
            </div>
            <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">
              Total Chapters
            </div>
          </div>
          
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-4 hover:bg-neutral-900/60 transition-colors">
            <div className="text-2xl font-heading text-green-400 mb-1">
              {stats.accessible}
            </div>
            <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">
              Accessible
            </div>
          </div>
          
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-4 hover:bg-neutral-900/60 transition-colors">
            <div className="text-2xl font-heading text-amber-400 mb-1">
              {stats.free}
            </div>
            <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">
              Free Chapters
            </div>
          </div>
          
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-4 hover:bg-neutral-900/60 transition-colors">
            <div className="text-2xl font-heading text-red-400 mb-1">
              {stats.locked}
            </div>
            <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">
              Locked
            </div>
          </div>
        </section>

        {/* Filters and Search */}
        <section className="mb-8 space-y-4" aria-label="Search and filter">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search chapters by title or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-11 py-3 bg-neutral-900/40 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-[#9f1239] focus:ring-1 focus:ring-[#9f1239] transition-all font-body"
              aria-label="Search chapters"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-800 rounded transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter chapters">
            {[
              { key: 'all' as const, label: 'All', count: stats.total },
              { key: 'free' as const, label: 'Free', count: stats.free },
              { key: 'owned' as const, label: 'Accessible', count: stats.accessible },
              { key: 'locked' as const, label: 'Locked', count: stats.locked },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`px-4 py-2 rounded-lg font-ui text-sm uppercase tracking-wider transition-all active:scale-95 ${
                  filter === key
                    ? 'bg-[#9f1239] text-white shadow-lg'
                    : 'bg-neutral-900/40 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </section>

        {/* Chapters List */}
        <main>
          {filteredChapters.length > 0 ? (
            <ul className="space-y-3" role="list" aria-label="Chapters list">
              {filteredChapters.map((chapter) => {
                const isAccessible = isChapterAccessible(chapter.id)
                const isFree = chapter.id <= PRICING.FREE_CHAPTERS
                const isOwnedCustom = ownedChapters.includes(chapter.id) && !isFree

                return (
                  <ChapterItem
                    key={chapter.id}
                    chapter={chapter}
                    isAccessible={isAccessible}
                    isFree={isFree}
                    isOwnedCustom={isOwnedCustom}
                    hasCompletePack={hasCompletePack}
                  />
                )
              })}
            </ul>
          ) : (
            <div className="text-center py-16 bg-neutral-900/40 border border-neutral-800/60 rounded-xl">
              <div className="w-16 h-16 bg-neutral-900/40 border border-neutral-800/60 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-neutral-600" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-heading text-neutral-300 mb-2">No chapters found</h3>
              <p className="text-neutral-500 font-body mb-4">
                {searchQuery ? `No chapters match "${searchQuery}"` : 'No chapters in this category'}
              </p>
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-neutral-800 text-neutral-300 rounded-lg font-ui text-sm hover:bg-neutral-700 transition-colors active:scale-95"
              >
                Clear Filters
              </button>
            </div>
          )}
        </main>

        {/* Unlock CTA */}
        {!hasCompletePack && stats.locked > 0 && (
          <aside className="mt-12 p-8 bg-gradient-to-br from-[#9f1239]/10 to-transparent border border-[#9f1239]/30 rounded-2xl text-center">
            <Lock className="w-12 h-12 text-[#9f1239] mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-2xl font-heading text-neutral-100 mb-3">
              Unlock {stats.locked} More Chapters
            </h3>
            <p className="text-neutral-400 font-body mb-6 max-w-md mx-auto">
              Get access to all premium chapters with the Complete Story Pack - one-time payment, lifetime access.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/#pricing"
                className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-heading text-sm tracking-[0.2em] uppercase hover:from-red-500 hover:to-red-700 transition-all shadow-lg hover:shadow-red-900/20 active:scale-95"
              >
                View Pricing
              </Link>
              <Link
                href="/custom-selection"
                className="px-8 py-3 bg-neutral-800 text-neutral-300 rounded-lg font-heading text-sm tracking-[0.2em] uppercase hover:bg-neutral-700 transition-colors border border-neutral-700 active:scale-95"
              >
                Custom Selection
              </Link>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}