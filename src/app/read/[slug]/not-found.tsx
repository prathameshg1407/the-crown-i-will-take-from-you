// app/read/[slug]/not-found.tsx
import Link from "next/link";
import { BookX, Home, BookOpen } from "lucide-react";

export default function ChapterNotFound() {
  return (
    <main className="min-h-screen bg-[#050505] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-900/20 border border-red-800/50 flex items-center justify-center">
          <BookX className="w-10 h-10 text-red-400" />
        </div>
        
        <h1 className="text-3xl font-heading text-neutral-100 mb-4">
          Chapter Not Found
        </h1>
        
        <p className="text-neutral-400 font-body mb-8">
          The chapter you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#9f1239] text-white rounded-lg font-heading text-sm tracking-wider hover:bg-[#881337] transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          
          <Link
            href="/#chapters"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-800 text-neutral-300 rounded-lg font-heading text-sm tracking-wider hover:bg-neutral-700 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Browse Chapters
          </Link>
        </div>
      </div>
    </main>
  );
}