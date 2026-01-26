// components/home/HeroSection.tsx
// NO "use client" - This is a Server Component

export default function HeroSection() {
  return (
    <header className="min-h-[90vh] lg:min-h-screen flex flex-col items-center justify-center relative px-6 py-16 lg:py-20">
      <div className="flex flex-col items-center max-w-6xl mx-auto hero-animate">
        {/* Badge */}
        <div className="mb-8 px-5 py-2 border border-[#881337]/40 rounded-full bg-[#4c0519]/20">
          <span className="text-[#ffe4e6] text-[9px] font-ui tracking-[0.45em] uppercase font-light">
            Korean Web Novel • 2024
          </span>
        </div>

        {/* Main Title - SEO optimized */}
        <h1 className="text-[clamp(3rem,12vw,10rem)] font-heading text-center leading-[0.9] tracking-[-0.02em] mb-10 text-neutral-100">
          <span className="sr-only">
            The Crown I Will Take From You - Korean Fantasy Regression Revenge Web Novel
          </span>
          <span aria-hidden="true">
            The Crown <br />
            <span className="gradient-text italic font-bold">I Will Take</span>
            <br />
            <span className="gradient-text italic font-bold">From You</span>
          </span>
        </h1>

        {/* Subtitle */}
        <p className="font-body text-[clamp(1.125rem,2.5vw,1.5rem)] text-neutral-400 italic max-w-3xl text-center mb-6 leading-relaxed px-4">
          &quot;I&apos;m back... and this time, the crown you desired will be
          torn from your grasp.&quot;
        </p>

        {/* Korean Title */}
        <p
          className="text-[#f43f5e] text-base md:text-lg font-body tracking-[0.3em] font-light"
          lang="ko"
        >
          너에게 빼앗을 왕관
        </p>
      </div>

      {/* Scroll Indicator - Static, no animation to reduce paint */}
      <div className="absolute bottom-12 text-neutral-600 scroll-indicator" aria-hidden="true">
        <svg
          width="20"
          height="20"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </header>
  );
}