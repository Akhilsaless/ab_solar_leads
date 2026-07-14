import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

interface PanelComparisonProps {
  systemSizeKw: number;
  totalCost: number;
  onPanelSelect: (panelType: "monocrystalline" | "polycrystalline", cost: number) => void;
}

export function PanelComparison({ systemSizeKw, totalCost, onPanelSelect }: PanelComparisonProps) {
  const [selectedPanel, setSelectedPanel] = useState<"monocrystalline" | "polycrystalline" | null>(null);

  const panels = {
    monocrystalline: {
      name: "Monocrystalline",
      efficiency: "18-22%",
      costMultiplier: 1.15,
      appearance: "Sleek Black",
      pros: ["Highest efficiency", "Better in low light", "Longer lifespan"],
      color: "from-gray-900 to-gray-800",
      badge: "Premium",
    },
    polycrystalline: {
      name: "Polycrystalline",
      efficiency: "15-17%",
      costMultiplier: 1.0,
      appearance: "Blue Speckled",
      pros: ["Budget-friendly", "Proven technology", "Great durability"],
      color: "from-blue-900 to-blue-800",
      badge: "Popular",
    },
  };

  const handleSelect = (panelType: "monocrystalline" | "polycrystalline") => {
    setSelectedPanel(panelType);
    const cost = totalCost * panels[panelType].costMultiplier;
    onPanelSelect(panelType, cost);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-300">Choose Your Panel Type</p>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(panels).map(([key, panel]) => {
          const panelType = key as "monocrystalline" | "polycrystalline";
          const cost = totalCost * panel.costMultiplier;
          const isSelected = selectedPanel === panelType;

          return (
            <button
              key={key}
              onClick={() => handleSelect(panelType)}
              className={`relative p-3 rounded-lg border-2 transition-all ${
                isSelected
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              {/* Badge */}
              <div className="text-xs font-semibold text-orange-400 mb-2">{panel.badge}</div>

              {/* Panel name */}
              <p className="font-bold text-sm text-white mb-1">{panel.name}</p>

              {/* Efficiency */}
              <p className="text-xs text-gray-400 mb-2">{panel.efficiency} Efficient</p>

              {/* Appearance */}
              <div className={`w-full h-8 rounded bg-gradient-to-r ${panel.color} mb-2 border border-white/10`} />

              {/* Cost */}
              <p className="text-sm font-bold text-green-400">₹{cost.toFixed(0)}</p>
              <p className="text-xs text-gray-500">for {systemSizeKw} kW</p>
            </button>
          );
        })}
      </div>

      {/* Selected panel details */}
      {selectedPanel && (
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-gray-300 mb-2">Why {panels[selectedPanel].name}?</p>
            <ul className="space-y-1">
              {panels[selectedPanel].pros.map((pro, i) => (
                <li key={i} className="text-xs text-gray-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  {pro}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
