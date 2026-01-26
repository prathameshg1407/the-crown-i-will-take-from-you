// components/home/ImageGallery.tsx
"use client";

import Image from "next/image";
import { useState, useCallback, memo } from "react";

// Pre-generate blur placeholders or use static ones
const BLUR_DATA_URL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAQMDBAMBAAAAAAAAAAAAAQIDBQAEEQYSITFBUWFx/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAaEQACAgMAAAAAAAAAAAAAAAABAgADBBEh/9oADAMBEQCEAPwCpqG5tbyVuXNtJXLJJb2hRCUjjgAkD3+1mWoyom3cR3eeakKS0CQAD0AB0B9UpVJbkPk2bQuz/9k=";

const INITIAL_IMAGES = [
  { 
    src: "/img1.jpg", 
    alt: "The Crown I Will Take From You - Main Cover featuring Medea",
    width: 800,
    height: 1067,
  },
  { 
    src: "/img2.png", 
    alt: "Character illustration by artist Pilyeon",
    width: 600,
    height: 800,
  },
  { 
    src: "/img3.png", 
    alt: "Fantasy kingdom artwork",
    width: 600,
    height: 800,
  },
];

const ImageGallery = memo(function ImageGallery() {
  const [images, setImages] = useState(INITIAL_IMAGES);

  const handleSwap = useCallback((index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const next = [...prev];
      [next[0], next[index]] = [next[index], next[0]];
      return next;
    });
  }, []);

  return (
    <section 
      className="max-w-7xl mx-auto px-6 md:px-8 mb-20 lg:mb-40"
      aria-labelledby="cover-art-heading"
    >
      <h2 id="cover-art-heading" className="sr-only">
        Novel Cover Art and Illustrations
      </h2>
      
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 md:gap-8">
        {/* Main Cover - LCP candidate */}
        <figure className="lg:col-span-2">
          <button
            type="button"
            onClick={() => handleSwap(0)}
            className="w-full cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#881337] rounded-xl"
            aria-label="View main cover image"
          >
            <div className="relative aspect-[3/4] w-full max-h-[80vh] rounded-xl overflow-hidden border border-[#881337]/30 group-hover:border-[#881337]/60 transition-colors duration-300">
              <Image
                src={images[0].src}
                alt={images[0].alt}
                fill
                className="object-contain"
                priority
                sizes="(min-width: 1024px) 66vw, 100vw"
                quality={75}
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
              />
            </div>
          </button>
        </figure>

        {/* Side Images */}
        <div className="grid grid-cols-2 lg:grid-cols-1 lg:grid-rows-2 gap-6 md:gap-8">
          {[1, 2].map((index) => (
            <figure key={images[index].src}>
              <button
                type="button"
                onClick={() => handleSwap(index)}
                className="w-full cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#881337] rounded-xl"
                aria-label={`View image ${index + 1}`}
              >
                <div className="relative aspect-[3/4] lg:max-h-[38vh] rounded-xl overflow-hidden border border-[#881337]/20 group-hover:border-[#881337]/50 transition-colors duration-300">
                  <Image
                    src={images[index].src}
                    alt={images[index].alt}
                    fill
                    className="object-contain"
                    sizes="(min-width: 1024px) 33vw, 50vw"
                    loading="lazy"
                    quality={75}
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                  />
                </div>
              </button>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
});

export default ImageGallery;