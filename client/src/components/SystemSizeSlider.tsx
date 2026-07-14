import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Zap } from "lucide-react";

interface SystemSizeSliderProps {
  monthlyBill: number;
  onSystemSizeChange: (sizeKw: number, panelCount: number, monthlySavings: number) => void;
  currentRate: number;
}

export function SystemSizeSlider({ monthlyBill, onSystemSizeChange, currentRate }: SystemSizeSliderProps) {
  // Calculate initial system size based on bill (rough estimate: 1kW per ₹1000 monthly bill)
  const initialSystemSize = Math.max(2, Math.round((monthlyBill / 1000) * 10) / 10);
  const [systemSizeKw, setSystemSizeKw] = useState(initialSystemSize);

  // Calculate panel count (each panel ~400W)
  const panelCount = Math.ceil((systemSizeKw * 1000) / 400);

  // Calculate monthly savings (assuming 4.5 sun hours per day, 365 days/year)
  const annualGeneration = systemSizeKw * 365 * 4.5; // kWh
  const monthlySavings = (annualGeneration / 12) * currentRate;

  useEffect(() => {
    onSystemSizeChange(systemSizeKw, panelCount, monthlySavings);
  }, [systemSizeKw, panelCount, monthlySavings, onSystemSizeChange]);

  return (
    <Card className="border-white/10 bg-white/5">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-300">System Size</label>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-400">{systemSizeKw} kW</p>
              <p className="text-xs text-gray-500">{panelCount} panels</p>
            </div>
          </div>

          {/* Slider */}
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={systemSizeKw}
            onChange={(e) => setSystemSizeKw(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />

          {/* Quick preset buttons */}
          <div className="flex gap-2 flex-wrap">
            {[2, 3, 5, 8].map((size) => (
              <button
                key={size}
                onClick={() => setSystemSizeKw(size)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  systemSizeKw === size
                    ? "bg-orange-500 text-black"
                    : "bg-white/10 text-gray-300 hover:bg-white/20"
                }`}
              >
                {size} kW
              </button>
            ))}
          </div>

          {/* Monthly savings display */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-xs text-gray-400">Monthly Savings</p>
                <p className="text-lg font-bold text-green-400">₹{monthlySavings.toFixed(0)}</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500">Adjust the slider to see how system size affects your savings</p>
        </div>
      </CardContent>
    </Card>
  );
}
