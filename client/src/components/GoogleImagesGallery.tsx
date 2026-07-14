import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoogleImagesGalleryProps {
  structureType: "roof" | "ground" | "balcony" | "wall" | null;
  systemSizeKw: number;
}

const SOLAR_IMAGES: Record<string, string[]> = {
  roof: [
    "https://images.unsplash.com/photo-1509391366360-2e938d440dbb?w=500&h=400&fit=crop",
    "https://images.unsplash.com/photo-1473341304170-971dccb5ac1d?w=500&h=400&fit=crop",
    "https://images.unsplash.com/photo-1560807707-e5b570bb34f0?w=500&h=400&fit=crop",
  ],
  ground: [
    "https://images.unsplash.com/photo-1497440871519-89386b1bfc75?w=500&h=400&fit=crop",
    "https://images.unsplash.com/photo-1613665813671-333d01d980c1?w=500&h=400&fit=crop",
    "https://images.unsplash.com/photo-1537878441592-c814b5203d26?w=500&h=400&fit=crop",
  ],
  balcony: [
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=400&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=400&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=400&fit=crop",
  ],
  wall: [
    "https://images.unsplash.com/photo-1559302504-64aae6ca6338?w=500&h=400&fit=crop",
    "https://images.unsplash.com/photo-1559302504-64aae6ca6338?w=500&h=400&fit=crop",
    "https://images.unsplash.com/photo-1559302504-64aae6ca6338?w=500&h=400&fit=crop",
  ],
};

export function GoogleImagesGallery({ structureType, systemSizeKw }: GoogleImagesGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!structureType) return null;

  const images = SOLAR_IMAGES[structureType] || [];
  const currentImage = images[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="space-y-3">
      <div className="relative w-full h-64 rounded-lg overflow-hidden border border-white/10 bg-white/5">
        <img
          src={currentImage}
          alt={`${structureType} solar installation`}
          className="w-full h-full object-cover"
        />
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-2 rounded-full transition"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-2 rounded-full transition"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition ${
                    idx === currentIndex ? "bg-orange-500" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <p className="text-sm text-gray-400 text-center">
        {systemSizeKw} kW system on {structureType} - {currentIndex + 1} of {images.length}
      </p>
    </div>
  );
}
