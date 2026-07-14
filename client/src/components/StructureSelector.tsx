import { Building2, Home, Zap, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StructureSelectorProps {
  onSelect: (structure: "roof" | "ground" | "balcony" | "wall") => void;
  selected?: "roof" | "ground" | "balcony" | "wall" | null;
}

const STRUCTURES = [
  { id: "roof", label: "Roof", icon: Home, description: "Sloped or flat roof" },
  { id: "ground", label: "Ground Mount", icon: Zap, description: "Open space" },
  { id: "balcony", label: "Balcony", icon: Building2, description: "Apartment balcony" },
  { id: "wall", label: "Wall Mount", icon: Lightbulb, description: "Vertical wall" },
];

export function StructureSelector({ onSelect, selected }: StructureSelectorProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-300">Where would you like to place the panels?</p>
      <div className="grid grid-cols-2 gap-2">
        {STRUCTURES.map((structure) => {
          const Icon = structure.icon;
          const isSelected = selected === structure.id;
          return (
            <button
              key={structure.id}
              onClick={() => onSelect(structure.id as any)}
              className={`p-3 rounded-lg border-2 transition text-left ${
                isSelected
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${isSelected ? "text-orange-500" : "text-gray-400"}`} />
              <p className={`text-sm font-medium ${isSelected ? "text-orange-500" : "text-gray-300"}`}>
                {structure.label}
              </p>
              <p className="text-xs text-gray-500">{structure.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
