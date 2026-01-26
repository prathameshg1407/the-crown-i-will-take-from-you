// components/home/NovelInfo.tsx
// NO "use client" - Server Component

import Link from "next/link";

const GENRE_TAGS = ["Fantasy", "Regression", "Revenge", "Romance", "Drama"] as const;

export default function NovelInfo() {
  return (
    <article
      className="max-w-4xl mx-auto px-6 md:px-8 relative z-10"
      itemScope
      itemType="https://schema.org/Book"
    >
      {/* Schema.org metadata */}
      <meta itemProp="name" content="The Crown I Will Take From You" />
      <meta itemProp="alternateName" content="너에게 빼앗을 왕관" />
      <meta itemProp="inLanguage" content="ko" />
      <meta itemProp="bookFormat" content="EBook" />

      {/* Credits Section */}
      <CreditsSection />

      {/* Genre Tags */}
      <GenreTags tags={GENRE_TAGS} />

      {/* Synopsis */}
      <Synopsis />

      {/* CTA Buttons */}
      <CTAButtons />
    </article>
  );
}

// ============================================================================
// Credits Section
// ============================================================================

function CreditsSection() {
  return (
    <section className="mb-20 fade-in-section" aria-labelledby="credits-heading">
      <h2 id="credits-heading" className="sr-only">
        Novel Credits and Information
      </h2>
      <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-xl p-8 md:p-10">
        <dl className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 text-center md:text-left">
          <CreditItem
            label="Author"
            value="Wilbright"
            korean="윌브라이트"
            itemProp="author"
          />
          <CreditItem
            label="Artist"
            value="Pilyeon"
            korean="필연"
            itemProp="illustrator"
          />
          <CreditItem label="Language" value="Korean" subtitle="English TL" />
          <CreditItem
            label="Year"
            value="2024"
            subtitle="Ongoing"
            isDate
            itemProp="datePublished"
          />
        </dl>
      </div>
    </section>
  );
}

interface CreditItemProps {
  label: string;
  value: string;
  korean?: string;
  subtitle?: string;
  isDate?: boolean;
  itemProp?: string;
}

function CreditItem({
  label,
  value,
  korean,
  subtitle,
  isDate,
  itemProp,
}: CreditItemProps) {
  const ValueWrapper = isDate ? "time" : "span";
  const valueProps = isDate ? { dateTime: value } : {};

  return (
    <div>
      <dt className="text-[9px] font-ui tracking-[0.35em] uppercase text-neutral-500 mb-3 font-light">
        {label}
      </dt>
      <dd>
        {itemProp ? (
          <span itemProp={itemProp} itemScope itemType="https://schema.org/Person">
            <ValueWrapper
              className="font-heading text-lg text-neutral-100 block"
              {...valueProps}
            >
              <span itemProp="name">{value}</span>
            </ValueWrapper>
          </span>
        ) : (
          <ValueWrapper
            className="font-heading text-lg text-neutral-100 block"
            itemProp={itemProp}
            {...valueProps}
          >
            {value}
          </ValueWrapper>
        )}
        {korean && (
          <span className="text-sm text-neutral-500 font-body" lang="ko">
            {korean}
          </span>
        )}
        {subtitle && (
          <span className="text-sm text-neutral-500 font-body">{subtitle}</span>
        )}
      </dd>
    </div>
  );
}

// ============================================================================
// Genre Tags
// ============================================================================

interface GenreTagsProps {
  tags: readonly string[];
}

function GenreTags({ tags }: GenreTagsProps) {
  return (
    <nav className="mb-20 fade-in-section" aria-label="Genre tags">
      <ul className="flex flex-wrap justify-center gap-3" itemProp="genre">
        {tags.map((tag) => (
          <li key={tag}>
            <span className="px-5 py-2.5 border border-[#9f1239]/30 rounded-full text-[10px] font-ui tracking-[0.25em] uppercase text-[#9f1239] bg-[#4c0519]/10 inline-block">
              {tag}
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ============================================================================
// Synopsis
// ============================================================================

function Synopsis() {
  return (
    <section
      className="prose prose-invert prose-lg md:prose-xl max-w-none fade-in-section"
      aria-labelledby="synopsis-heading"
    >
      {/* Synopsis Header */}
      <div className="mb-10 px-5 py-2 border border-amber-900/30 rounded-full bg-amber-950/10 inline-block">
        <h2
          id="synopsis-heading"
          className="text-amber-200/60 text-[9px] font-ui tracking-[0.45em] uppercase font-light m-0"
        >
          Synopsis
        </h2>
      </div>

      <div itemProp="description">
        <p className="drop-cap text-neutral-300 text-xl md:text-2xl leading-[1.9] mb-10 font-body font-light">
          I held my swollen belly with my second child and heard the news of my
          husband&apos;s marriage. It was a painful betrayal by my husband I
          loved with all my life.
        </p>

        <blockquote className="my-14 border-l-2 border-[#881337]/40 pl-8 py-2">
          <p className="text-[#e2e8f0] text-xl md:text-2xl italic leading-[1.8] font-body">
            &quot;Ahaha! You&apos;re a Princess and you act so proud, but look at
            you. Valdina was destroyed, and your brother was torn into pieces by
            demonic beasts. Because a stupid like you!&quot;
          </p>
        </blockquote>

        <p className="text-neutral-400 text-lg md:text-xl leading-[1.9] mb-10 font-body font-light">
          My brother died, and my country was destroyed. Even the children born
          from the embryo died at the hands of their father.
        </p>

        <p className="text-neutral-400 text-lg md:text-xl leading-[1.9] mb-10 font-body font-light">
          The moment I took the poison, realizing that all of this was a plan by
          my uncle&apos;s family and my husband.
        </p>

        {/* Dramatic return statement */}
        <div className="my-20 text-center" role="presentation">
          <p className="font-heading text-4xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 italic leading-tight">
            &quot;I&apos;m back...
            <br />
            Again...&quot;
          </p>
        </div>

        <p className="text-neutral-400 text-lg md:text-xl leading-[1.9] mb-10 font-body font-light">
          I returned to the past 13 years ago. With my experience as a Kingmaker
          who established my husband as an Emperor in a fierce battle for the
          throne, and with memories of everything that will happen in the future,
          I was shocked and realized.
        </p>

        <p className="text-neutral-200 text-xl md:text-2xl leading-[1.9] mb-10 font-body">
          God has granted my last request.
        </p>
      </div>

      {/* Revenge Declarations */}
      <RevengeDeclarations />

      {/* Final Declaration */}
      <FinalDeclaration />
    </section>
  );
}

function RevengeDeclarations() {
  const declarations = [
    {
      name: "Claudio",
      text: "All the glory given to my uncle will lose its luster.",
      color: "purple",
    },
    {
      name: "Jason",
      text: "The glorious crown my husband desired would be taken away.",
      color: "rose",
    },
    {
      name: "I'm back",
      text: "The prophecy that returned once in a lifetime shined in a gloomy light.",
      color: "red",
    },
  ] as const;

  const colorMap = {
    purple: {
      border: "border-purple-900/60",
      text: "text-purple-400",
    },
    rose: {
      border: "border-rose-900/60",
      text: "text-rose-400",
    },
    red: {
      border: "border-red-900/60",
      text: "text-red-400",
    },
  };

  return (
    <aside className="my-20 bg-neutral-900/30 border-y border-neutral-800/60 py-14 space-y-8 -mx-6 px-6 md:-mx-8 md:px-8">
      <h3 className="sr-only">Medea&apos;s Revenge Declarations</h3>

      {declarations.map(({ name, text, color }) => (
        <blockquote
          key={name}
          className={`border-l-4 ${colorMap[color].border} pl-8 py-2`}
        >
          <p
            className={`${colorMap[color].text} font-heading text-2xl md:text-3xl mb-3 tracking-wide`}
          >
            &quot;{name}.&quot;
          </p>
          <p className="text-neutral-400 text-lg md:text-xl font-body font-light leading-relaxed">
            {text}
          </p>
        </blockquote>
      ))}
    </aside>
  );
}

function FinalDeclaration() {
  return (
    <div className="mt-20 mb-24 relative">
      <div className="relative bg-black/80 border border-slate-700/50 p-10 md:p-14 rounded-xl text-center">
        <h3 className="text-3xl md:text-4xl font-heading text-neutral-200 mb-8 tracking-wide leading-tight">
          To get my revenge,
        </h3>
        <p className="text-5xl md:text-7xl font-heading text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 uppercase tracking-[0.15em] leading-tight mb-3">
          I, Medea,
        </p>
        <p className="text-4xl md:text-6xl font-heading text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 uppercase tracking-[0.15em] leading-tight">
          Would Stop at Nothing
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// CTA Buttons
// ============================================================================

function CTAButtons() {
  return (
    <nav
      className="mt-24 mb-40 flex flex-col sm:flex-row gap-5 justify-center fade-in-section"
      aria-label="Reading actions"
    >
      <Link
        href="/chapters"
        className="group relative px-14 py-4 font-heading tracking-[0.25em] uppercase text-sm overflow-hidden rounded-lg border border-[#9f1239] bg-[#9f1239]/10 text-[#9f1239] hover:text-white hover:bg-[#9f1239] transition-colors duration-300 text-center active:scale-[0.98]"
      >
        Begin Reading
      </Link>

      <button
        type="button"
        className="px-14 py-4 font-heading tracking-[0.25em] uppercase text-sm rounded-lg border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 transition-colors duration-300 active:scale-[0.98]"
        aria-label="Add The Crown I Will Take From You to your library"
      >
        Add to Library
      </button>
    </nav>
  );
}