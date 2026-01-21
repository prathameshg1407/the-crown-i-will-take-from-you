// data/chapters.ts

export interface Chapter {
  id: number
  number: string
  title: string
  slug: string
  path: string
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

// Pricing configuration
export const PRICING = {
  COMPLETE_PACK: {
    price: 1699,
    chapters: 305,
    startChapter: 82,
    endChapter: 386,
    pricePerChapter: 5.57,
  },
  CUSTOM_SELECTION: {
    pricePerChapter: 8,
    minChapters: 20,
    minAmount: 160,
  },
  FREE_CHAPTERS: 81,
}

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
      'Perfect to try the story'
    ]
  },
  {
    id: 'complete',
    name: 'Complete Story Pack',
    price: 1699,
    chapters: 'All premium chapters',
    chaptersCount: 305,
    chapterRange: 'Chapters 82-386',
    pricePerChapter: 5.57,
    features: [
      'All 305 premium chapters',
      'Complete revenge saga',
      'One-time payment of ₹1,699',
      'Best value at ₹5.57/chapter',
      'Lifetime access',
      'Instant unlock'
    ],
    popular: true
  }
]

// Helper: Check if chapter is locked
export function isChapterLocked(
  chapterNumber: number,
  userTier: 'free' | 'complete' = 'free',
  ownedChapters: number[] = []
): boolean {
  // Free chapters always accessible
  if (chapterNumber <= PRICING.FREE_CHAPTERS) return false
  
  // Complete tier unlocks all
  if (userTier === 'complete') return false
  
  // Check individual ownership
  if (ownedChapters.includes(chapterNumber)) return false
  
  // Otherwise locked
  return true
}

// Helper: Calculate custom selection price
export function calculateCustomPrice(selectedChapters: number[]): {
  totalChapters: number
  totalPrice: number
  pricePerChapter: number
  isValid: boolean
  error?: string
} {
  const validChapters = selectedChapters.filter(
    id => id > PRICING.FREE_CHAPTERS && id <= 386
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
    error
  }
}

// Helper: Get smart recommendation
export function getSmartRecommendation(selectedChapters: number[]): {
  shouldRecommendComplete: boolean
  savings: number
  message: string
} | null {
  const custom = calculateCustomPrice(selectedChapters)
  
  if (!custom.isValid) return null
  
  const completePack = PRICING.COMPLETE_PACK
  
  // If selecting more than 100 chapters
  if (custom.totalChapters >= 100) {
    const savings = custom.totalPrice - completePack.price
    
    if (savings > 0) {
      return {
        shouldRecommendComplete: true,
        savings,
        message: `💡 Complete Pack (${completePack.chapters} chapters) for ₹${completePack.price} saves you ₹${savings}!`
      }
    }
  }
  
  // If custom cost is within ₹500 of complete pack
  if (custom.totalPrice >= completePack.price - 500) {
    const extraChapters = completePack.chapters - custom.totalChapters
    const extraCost = completePack.price - custom.totalPrice
    
    return {
      shouldRecommendComplete: true,
      savings: 0,
      message: `💡 For just ₹${extraCost} more, get ${extraChapters} additional chapters with Complete Pack!`
    }
  }
  
  return null
}

// Generate all chapters
export const chapters: Chapter[] = Array.from({ length: 386 }, (_, i) => {
  const chapterNum = i + 1
  const isPrologue = chapterNum === 1
  
  return {
    id: chapterNum,
    number: isPrologue ? "Prologue" : `Chapter ${chapterNum - 1}`,
    title: isPrologue ? "A Drizzle of Blood" : `Chapter ${chapterNum - 1}`,
    slug: isPrologue 
      ? "a-drizzle-of-blood-prologue" 
      : `chapter-${chapterNum - 1}`,
    path: isPrologue
      ? "/chapters/a-drizzle-of-blood-prologue.html"
      : `/chapters/chapter-${chapterNum - 1}.html`,
    publishedAt: new Date(2024, 0, chapterNum).toISOString(),
    isLocked: chapterNum > PRICING.FREE_CHAPTERS
  }
})