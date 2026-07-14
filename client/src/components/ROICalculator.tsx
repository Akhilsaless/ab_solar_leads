import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Calendar, Zap } from "lucide-react";

interface ROICalculatorProps {
  monthlyBill: number;
  systemSizeKw: number;
  totalCost: number;
  subsidyAmount: number;
  netCost: number;
  monthlyElectricitySavings: number;
  paybackYears: number;
  futureElectricityRate?: number;
  currentRate?: number;
  rateIncreasePercentage?: number;
}

export function ROICalculator({
  monthlyBill,
  systemSizeKw,
  totalCost,
  subsidyAmount,
  netCost,
  monthlyElectricitySavings,
  paybackYears,
  futureElectricityRate,
  currentRate,
  rateIncreasePercentage,
}: ROICalculatorProps) {
  // Calculate 25-year savings
  const annualSavings = monthlyElectricitySavings * 12;
  let savings25Year = 0;

  if (futureElectricityRate && currentRate && rateIncreasePercentage) {
    // Calculate with increasing electricity rates
    for (let year = 1; year <= 25; year++) {
      const rateForYear = currentRate * Math.pow(1 + rateIncreasePercentage / 100, year - 1);
      const systemGeneration = systemSizeKw * 365 * 4.5; // kWh per year (avg 4.5 sun hours)
      const yearSavings = systemGeneration * rateForYear;
      savings25Year += yearSavings;
    }
  } else {
    savings25Year = annualSavings * 25;
  }

  const roi = ((savings25Year - netCost) / netCost) * 100;
  const breakEvenYear = Math.ceil(paybackYears);

  return (
    <div className="space-y-4">
      {/* Main ROI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Payback Period */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Payback Period</p>
                <p className="text-2xl font-bold text-blue-400">{paybackYears.toFixed(1)} years</p>
                <p className="text-xs text-gray-500 mt-1">Break even by year {breakEvenYear}</p>
              </div>
              <Calendar className="w-5 h-5 text-blue-400 mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* Monthly Savings */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Monthly Savings</p>
                <p className="text-2xl font-bold text-green-400">₹{monthlyElectricitySavings.toFixed(0)}</p>
                <p className="text-xs text-gray-500 mt-1">₹{annualSavings.toFixed(0)}/year</p>
              </div>
              <Zap className="w-5 h-5 text-green-400 mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* Net Cost */}
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Net Cost After Subsidy</p>
                <p className="text-2xl font-bold text-orange-400">₹{netCost.toFixed(0)}</p>
                <p className="text-xs text-gray-500 mt-1">Subsidy: ₹{subsidyAmount.toFixed(0)}</p>
              </div>
              <DollarSign className="w-5 h-5 text-orange-400 mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* 25-Year Savings */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">25-Year Total Savings</p>
                <p className="text-2xl font-bold text-purple-400">₹{savings25Year.toFixed(0)}</p>
                <p className="text-xs text-gray-500 mt-1">ROI: {roi.toFixed(0)}%</p>
              </div>
              <TrendingUp className="w-5 h-5 text-purple-400 mt-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total System Cost</span>
            <span className="font-semibold">₹{totalCost.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Government Subsidy</span>
            <span className="font-semibold text-green-400">-₹{subsidyAmount.toFixed(0)}</span>
          </div>
          <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold">
            <span>Your Cost</span>
            <span className="text-orange-400">₹{netCost.toFixed(0)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Electricity Rate Prediction */}
      {futureElectricityRate && currentRate && rateIncreasePercentage && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Electricity Rate Prediction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Current Rate</span>
              <span className="font-semibold">₹{currentRate.toFixed(2)}/unit</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Predicted Rate (Year 10)</span>
              <span className="font-semibold">₹{(currentRate * Math.pow(1 + rateIncreasePercentage / 100, 10)).toFixed(2)}/unit</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Yearly Increase</span>
              <span className="font-semibold text-red-400">{rateIncreasePercentage.toFixed(1)}%</span>
            </div>
            <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-white/10">
              💡 With increasing electricity rates, your savings will be even higher! Installing now protects you from future rate hikes.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Key Insights */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="p-4">
          <p className="text-sm text-gray-300">
            ✨ <span className="font-semibold">Your Savings Story:</span> After {breakEvenYear} years, your system becomes completely free. 
            Over 25 years, you'll save <span className="text-green-400 font-bold">₹{savings25Year.toFixed(0)}</span> on electricity bills!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
