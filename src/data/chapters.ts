// data/chapters.ts
// Full chapter data with pricing configuration

import { CHAPTER_TITLES, TOTAL_CHAPTERS, MAX_CHAPTER_ID } from './chapterTitles'

export interface Chapter {
  id: number
  number: string        // display label: "Prologue" or "Chapter X"
  title: string         // human title (e.g. "The Return Begins")
  slug: string          // URL slug (matches file name without .html)
  path: string          // path to static HTML file
  publishedAt: string
  isLocked: boolean
}

export interface PricingPlan {
  id: string
  name: string
  price: number
  chapters: string
  chaptersCount: number
  chapterRange: string
  features: string[]
  popular?: boolean
  pricePerChapter?: number
}

/* -------------------------
   Pricing configuration
   FREE_CHAPTERS = highest free chapter ID
   IDs 0..80 are free (81 items: Prologue + Chapters 1-80)
--------------------------*/
export const PRICING = {
  COMPLETE_PACK: {
    price: 1699,
    chapters: MAX_CHAPTER_ID - 80, // Premium chapters (81-378)
    startChapterId: 81,
    endChapterId: MAX_CHAPTER_ID,
    pricePerChapter: 5.70,
  },
  CUSTOM_SELECTION: {
    pricePerChapter: 8,
    minChapters: 20,
    minAmount: 160,
  },
  FREE_CHAPTERS: 80,
  TOTAL_CHAPTERS: TOTAL_CHAPTERS,
  MAX_CHAPTER_ID: MAX_CHAPTER_ID,
}

/* -------------------------
   Pricing plans (human-facing)
--------------------------*/
export const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free Access',
    price: 0,
    chapters: 'First 81 chapters',
    chaptersCount: 81,
    chapterRange: 'Prologue - Chapter 80',
    features: [
      'Complete prologue & first arc',
      'No payment required',
      'Lifetime access',
      'Perfect to try the story',
    ],
  },
  {
    id: 'complete',
    name: 'Complete Story Pack',
    price: PRICING.COMPLETE_PACK.price,
    chapters: 'All premium chapters',
    chaptersCount: PRICING.COMPLETE_PACK.chapters,
    chapterRange: `Chapters 81-${MAX_CHAPTER_ID}`,
    pricePerChapter: PRICING.COMPLETE_PACK.pricePerChapter,
    features: [
      `All ${PRICING.COMPLETE_PACK.chapters} premium chapters`,
      'Complete revenge saga',
      'One-time payment of ₹1,699',
      `Best value at ₹${PRICING.COMPLETE_PACK.pricePerChapter.toFixed(2)}/chapter`,
      'Lifetime access',
      'Instant unlock',
    ],
    popular: true,
  },
]

/* -------------------------
   Utility: slugify
   Creates URL-safe slugs that match your file naming convention
--------------------------*/
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/* -------------------------
   Helpers
--------------------------*/

/**
 * isChapterLocked
 * @param chapterId - internal chapter id (0..MAX_CHAPTER_ID)
 * @param userTier - 'free' | 'complete'
 * @param ownedChapters - list of owned chapter ids
 */
export function isChapterLocked(
  chapterId: number,
  userTier: 'free' | 'complete' = 'free',
  ownedChapters: number[] = []
): boolean {
  if (chapterId <= PRICING.FREE_CHAPTERS) return false
  if (userTier === 'complete') return false
  if (ownedChapters.includes(chapterId)) return false
  return true
}

/**
 * calculateCustomPrice
 */
export function calculateCustomPrice(selectedChapters: number[]): {
  totalChapters: number
  totalPrice: number
  pricePerChapter: number
  isValid: boolean
  error?: string
} {
  const validChapters = Array.from(new Set(selectedChapters)).filter(
    id => id > PRICING.FREE_CHAPTERS && id <= PRICING.MAX_CHAPTER_ID
  )

  const totalChapters = validChapters.length
  const totalPrice = totalChapters * PRICING.CUSTOM_SELECTION.pricePerChapter

  const isValid = totalChapters >= PRICING.CUSTOM_SELECTION.minChapters
  const error = !isValid
    ? `Minimum ${PRICING.CUSTOM_SELECTION.minChapters} chapters required`
    : undefined

  return {
    totalChapters,
    totalPrice,
    pricePerChapter: PRICING.CUSTOM_SELECTION.pricePerChapter,
    isValid,
    error,
  }
}

/**
 * getSmartRecommendation
 */
export function getSmartRecommendation(selectedChapters: number[]): {
  shouldRecommendComplete: boolean
  savings: number
  message: string
} | null {
  const custom = calculateCustomPrice(selectedChapters)

  if (!custom.isValid) return null

  const completePack = PRICING.COMPLETE_PACK

  if (custom.totalChapters >= 100) {
    const savings = custom.totalPrice - completePack.price

    if (savings > 0) {
      return {
        shouldRecommendComplete: true,
        savings,
        message: `💡 Complete Pack (${completePack.chapters} chapters) for ₹${completePack.price} saves you ₹${savings}!`,
      }
    }
  }

  if (custom.totalPrice >= completePack.price - 500) {
    const extraChapters = completePack.chapters - custom.totalChapters
    const extraCost = Math.max(0, completePack.price - custom.totalPrice)

    return {
      shouldRecommendComplete: true,
      savings: 0,
      message: `💡 For just ₹${extraCost} more, get ${extraChapters} additional chapters with Complete Pack!`,
    }
  }

  return null
}

/* -------------------------
   Generate chapters array
   
   IMPORTANT: Slug format must match your actual file names!
   Your files are named: "{id}-{slugified-title}.html"
   Example: "10-threads-of-treason.html"
   
   So slug = "10-threads-of-treason"
   And path = "/chapters/10-threads-of-treason.html"
--------------------------*/
export const chapters: Chapter[] = Object.entries(CHAPTER_TITLES)
  .map(([idStr, title]) => {
    const id = parseInt(idStr, 10)
    const isPrologue = id === 0

    // Create slug that matches your file naming: {id}-{slugified-title}
    const slugifiedTitle = slugify(title)
    const slug = `${id}-${slugifiedTitle}`
    
    // Path to the actual HTML file
    const path = `/chapters/${slug}.html`

    return {
      id,
      number: isPrologue ? 'Prologue' : `Chapter ${id}`,
      title,
      slug,
      path,
      publishedAt: new Date(2024, 0, id + 1).toISOString(),
      isLocked: id > PRICING.FREE_CHAPTERS,
    }
  })
  .sort((a, b) => a.id - b.id)

/* -------------------------
   Lookup helpers
--------------------------*/
export function getChapterById(id: number): Chapter | undefined {
  return chapters.find(ch => ch.id === id)
}

export function getChapterBySlug(slug: string): Chapter | undefined {
  return chapters.find(ch => ch.slug === slug)
}

export function getNextChapter(currentId: number): Chapter | undefined {
  return chapters.find(ch => ch.id === currentId + 1)
}

export function getPreviousChapter(currentId: number): Chapter | undefined {
  return chapters.find(ch => ch.id === currentId - 1)
}

// Re-export for convenience
export { CHAPTER_TITLES, TOTAL_CHAPTERS, MAX_CHAPTER_ID } from './chapterTitles'