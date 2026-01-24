// app/chapters/page.tsx
"use client"

import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { chapters, PRICING, isChapterLocked } from '@/data/chapters'
import { Lock, Check, Crown, Search, ArrowLeft, BookOpen } from 'lucide-react'
import Link from 'next/link'

type FilterType = 'all' | 'free' | 'locked' | 'owned'

export default function ChaptersPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')

  // User tier and owned chapters
  const userTier = user?.tier || 'free'
  const ownedChapters = useMemo(() => {
    if (!user?.ownedChapters) return []
    if (!Array.isArray(user.ownedChapters)) return []
    return user.ownedChapters
  }, [user?.ownedChapters])

  const hasCompletePack = userTier === 'complete'

  // Check if chapter is accessible (use the helper function)
  const isChapterAccessible = (chapterId: number) => {
    return !isChapterLocked(chapterId, userTier, ownedChapters)
  }

  // Filter and search chapters
  const filteredChapters = useMemo(() => {
    return chapters.filter(chapter => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = chapter.title.toLowerCase().includes(query)
        const matchesNumber = chapter.number.toLowerCase().includes(query)
        const matchesId = chapter.id.toString().includes(query)
        
        if (!matchesTitle && !matchesNumber && !matchesId) {
          return false
        }
      }

      // Type filter
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
  }, [searchQuery, filter, userTier, ownedChapters])

  // Stats
  const stats = useMemo(() => {
    const totalChapters = chapters.length
    const freeChapters = PRICING.FREE_CHAPTERS + 1 // 0 to FREE_CHAPTERS inclusive
    const accessibleChapters = chapters.filter(ch => isChapterAccessible(ch.id)).length
    const lockedChapters = totalChapters - accessibleChapters

    return {
      total: totalChapters,
      free: freeChapters,
      accessible: accessibleChapters,
      locked: lockedChapters,
    }
  }, [userTier, ownedChapters])

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
      {/* Background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-black to-black -z-10" />
      
      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-12 pb-24">
        {/* Header */}
        <div className="mb-12">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-ui">Back to Home</span>
          </Link>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-[#9f1239]/10 border border-[#9f1239]/30 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#9f1239]" />
            </div>
            <div>
              <h1 className="text-4xl md:text-6xl font-heading text-neutral-100 tracking-tight">
                All Chapters
              </h1>
              <p className="text-neutral-400 font-body mt-2">
                Browse and read all available chapters
              </p>
            </div>
          </div>

          {/* User Access Status */}
          {isAuthenticated && user && (
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-800/50 rounded-full">
              <div className="relative">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping" />
              </div>
              <span className="text-sm text-green-400 font-ui uppercase tracking-wider">
                {hasCompletePack ? (
                  <>✓ Complete Pack Active</>
                ) : ownedChapters.length > 0 ? (
                  <>{ownedChapters.length} Custom Chapters Owned</>
                ) : (
                  <>Free Tier - {stats.free} Chapters</>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-4">
            <div className="text-2xl font-heading text-neutral-100 mb-1">
              {stats.total}
            </div>
            <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">
              Total Chapters
            </div>
          </div>
          
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-4">
            <div className="text-2xl font-heading text-green-400 mb-1">
              {stats.accessible}
            </div>
            <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">
              Accessible
            </div>
          </div>
          
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-4">
            <div className="text-2xl font-heading text-amber-400 mb-1">
              {stats.free}
            </div>
            <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">
              Free Chapters
            </div>
          </div>
          
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-lg p-4">
            <div className="text-2xl font-heading text-red-400 mb-1">
              {stats.locked}
            </div>
            <div className="text-xs text-neutral-500 font-ui uppercase tracking-wider">
              Locked
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-8 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              placeholder="Search chapters by title or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-neutral-900/40 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-[#9f1239] focus:ring-1 focus:ring-[#9f1239] transition-all font-body"
            />
          </div>

          {/* Filter buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-ui text-sm uppercase tracking-wider transition-all ${
                filter === 'all'
                  ? 'bg-[#9f1239] text-white'
                  : 'bg-neutral-900/40 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilter('free')}
              className={`px-4 py-2 rounded-lg font-ui text-sm uppercase tracking-wider transition-all ${
                filter === 'free'
                  ? 'bg-[#9f1239] text-white'
                  : 'bg-neutral-900/40 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              Free ({stats.free})
            </button>
            <button
              onClick={() => setFilter('owned')}
              className={`px-4 py-2 rounded-lg font-ui text-sm uppercase tracking-wider transition-all ${
                filter === 'owned'
                  ? 'bg-[#9f1239] text-white'
                  : 'bg-neutral-900/40 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              Accessible ({stats.accessible})
            </button>
            <button
              onClick={() => setFilter('locked')}
              className={`px-4 py-2 rounded-lg font-ui text-sm uppercase tracking-wider transition-all ${
                filter === 'locked'
                  ? 'bg-[#9f1239] text-white'
                  : 'bg-neutral-900/40 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              Locked ({stats.locked})
            </button>
          </div>
        </div>

        {/* Chapters List */}
        <div className="space-y-3">
          {filteredChapters.map((chapter) => {
            const isAccessible = isChapterAccessible(chapter.id)
            const isFree = chapter.id <= PRICING.FREE_CHAPTERS
            const isOwnedCustom = ownedChapters.includes(chapter.id) && !isFree
            const isPrologue = chapter.id === 0

            return (
              <Link
                key={chapter.id}
                href={isAccessible ? `/read/${chapter.slug}` : '/#pricing'}
                className={`block p-5 rounded-xl border transition-all group ${
                  isAccessible
                    ? 'bg-neutral-900/40 border-neutral-800/60 hover:border-[#9f1239]/50 hover:bg-neutral-900/60'
                    : 'bg-neutral-900/20 border-neutral-800/30 opacity-60 hover:opacity-80'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Chapter Number Badge */}
                  <div className={`flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center font-heading text-lg transition-transform group-hover:scale-105 ${
                    isAccessible
                      ? 'bg-[#9f1239]/10 border border-[#9f1239]/30 text-[#9f1239]'
                      : 'bg-neutral-800/30 border border-neutral-700/30 text-neutral-600'
                  }`}>
                    {isPrologue ? 'P' : chapter.id}
                  </div>

                  {/* Chapter Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-ui tracking-[0.3em] uppercase text-neutral-500 mb-1">
                          {chapter.number}
                        </div>
                        <h3 className={`text-lg font-heading line-clamp-2 transition-colors ${
                          isAccessible 
                            ? 'text-neutral-100 group-hover:text-white' 
                            : 'text-neutral-400'
                        }`}>
                          {chapter.title}
                        </h3>
                      </div>
                      
                      {/* Access Badge */}
                      <div className="flex-shrink-0">
                        {hasCompletePack && !isFree ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-600/20 to-yellow-600/20 border border-amber-500/30 rounded-full">
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span className="text-xs text-amber-300 font-ui uppercase tracking-wider">Complete</span>
                          </span>
                        ) : isFree ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-900/20 border border-green-800/30 rounded-full">
                            <Check className="w-3 h-3 text-green-400" />
                            <span className="text-xs text-green-300 font-ui uppercase tracking-wider">Free</span>
                          </span>
                        ) : isOwnedCustom ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-900/20 border border-blue-800/30 rounded-full">
                            <Check className="w-3 h-3 text-blue-400" />
                            <span className="text-xs text-blue-300 font-ui uppercase tracking-wider">Owned</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-800/30 border border-neutral-700/30 rounded-full">
                            <Lock className="w-3 h-3 text-neutral-500" />
                            <span className="text-xs text-neutral-400 font-ui uppercase tracking-wider">Locked</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
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
                </div>
              </Link>
            )
          })}
        </div>

        {/* No Results */}
        {filteredChapters.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-neutral-900/40 border border-neutral-800/60 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-neutral-600" />
            </div>
            <h3 className="text-xl font-heading text-neutral-300 mb-2">No chapters found</h3>
            <p className="text-neutral-500 font-body">
              {searchQuery ? `No chapters match "${searchQuery}"` : 'No chapters in this category'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setFilter('all')
              }}
              className="mt-4 px-6 py-2 bg-neutral-800 text-neutral-300 rounded-lg font-ui text-sm hover:bg-neutral-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Unlock CTA for locked chapters */}
        {!hasCompletePack && stats.locked > 0 && (
          <div className="mt-12 p-8 bg-gradient-to-br from-[#9f1239]/10 to-transparent border border-[#9f1239]/30 rounded-2xl text-center">
            <Lock className="w-12 h-12 text-[#9f1239] mx-auto mb-4" />
            <h3 className="text-2xl font-heading text-neutral-100 mb-3">
              Unlock {stats.locked} More Chapters
            </h3>
            <p className="text-neutral-400 font-body mb-6 max-w-md mx-auto">
              Get access to all premium chapters with the Complete Story Pack - one-time payment, lifetime access.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/#pricing"
                className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-heading text-sm tracking-[0.2em] uppercase hover:from-red-500 hover:to-red-700 transition-all shadow-lg hover:shadow-red-900/20"
              >
                View Pricing
              </Link>
              <Link
                href="/custom-selection"
                className="px-8 py-3 bg-neutral-800 text-neutral-300 rounded-lg font-heading text-sm tracking-[0.2em] uppercase hover:bg-neutral-700 transition-all border border-neutral-700"
              >
                Custom Selection
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}