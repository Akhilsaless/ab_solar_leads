import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Check, Zap, Crown, Rocket, Star, ArrowRight,
  MessageSquare, Search, BarChart3, Users, Shield,
  Loader2, Sparkles
} from "lucide-react";

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();
  const [yearly, setYearly] = useState(false);

  const plansQuery = trpc.subscription.plans.useQuery();
  const currentSub = trpc.subscription.current.useQuery(undefined, { enabled: isAuthenticated });

  const startTrialMutation = trpc.subscription.startTrial.useMutation({
    onSuccess: () => {
      toast.success("3-day free trial started! Enjoy full access.");
      currentSub.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const checkoutMutation = trpc.subscription.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to payment...");
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const planIcons: Record<string, any> = {
    starter: Zap,
    professional: Crown,
    enterprise: Rocket,
  };

  const planColors: Record<string, string> = {
    starter: "from-blue-500 to-cyan-500",
    professional: "from-orange-500 to-amber-500",
    enterprise: "from-purple-500 to-pink-500",
  };

  const handleSubscribe = (planKey: string) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    // If no subscription, start trial
    if (!currentSub.data) {
      startTrialMutation.mutate({ plan: planKey as any });
      return;
    }

    // If trialing or need to upgrade, go to checkout
    checkoutMutation.mutate({
      plan: planKey as any,
      billingCycle: yearly ? "yearly" : "monthly",
      origin: window.location.origin,
    });
  };

  const plans = plansQuery.data || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <Badge variant="outline" className="mb-4 border-orange-500/30 text-orange-400 bg-orange-500/10 px-4 py-1">
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          Subscription Plans
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Choose Your Plan
        </h1>
        <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
          Start with a 3-day free trial. No credit card required. Upgrade anytime to unlock more features.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Label className={`text-sm ${!yearly ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            Monthly
          </Label>
          <Switch checked={yearly} onCheckedChange={setYearly} />
          <Label className={`text-sm ${yearly ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            Yearly
            <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30 text-xs" variant="outline">
              Save 17%
            </Badge>
          </Label>
        </div>
      </div>

      {/* Current Subscription Banner */}
      {currentSub.data && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Star className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  Current Plan: {currentSub.data.plan.charAt(0).toUpperCase() + currentSub.data.plan.slice(1)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Status: {currentSub.data.status === "trialing" ? "Free Trial" : currentSub.data.status}
                  {currentSub.data.trialEndsAt && currentSub.data.status === "trialing" && (
                    <> (ends {new Date(currentSub.data.trialEndsAt).toLocaleDateString()})</>
                  )}
                </p>
              </div>
            </div>
            {currentSub.data.status === "trialing" && (
              <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 bg-yellow-500/10">
                Trial Active
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan: any) => {
          const Icon = planIcons[plan.key] || Zap;
          const gradient = planColors[plan.key] || "from-blue-500 to-cyan-500";
          const isPopular = plan.popular;
          const price = yearly ? plan.priceYearly : plan.priceMonthly;
          const monthlyPrice = yearly ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;
          const isCurrentPlan = currentSub.data?.plan === plan.key;

          return (
            <Card
              key={plan.key}
              className={`relative border-border/30 bg-card/80 backdrop-blur overflow-hidden transition-all hover:scale-[1.02] ${
                isPopular ? "border-orange-500/50 shadow-lg shadow-orange-500/10" : ""
              } ${isCurrentPlan ? "ring-2 ring-orange-500/50" : ""}`}
            >
              {isPopular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                    MOST POPULAR
                  </div>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Price */}
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">
                      ₹{monthlyPrice.toLocaleString("en-IN")}
                    </span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  {yearly && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ₹{price.toLocaleString("en-IN")} billed yearly
                    </p>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-2.5">
                  {plan.features.map((feature: string, i: number) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Button
                  onClick={() => handleSubscribe(plan.key)}
                  disabled={startTrialMutation.isPending || checkoutMutation.isPending}
                  className={`w-full font-semibold ${
                    isPopular
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                      : "bg-foreground/10 hover:bg-foreground/20 text-foreground"
                  }`}
                >
                  {(startTrialMutation.isPending || checkoutMutation.isPending) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrentPlan ? (
                    "Current Plan"
                  ) : !currentSub.data ? (
                    <>Start Free Trial <ArrowRight className="w-4 h-4 ml-1" /></>
                  ) : (
                    <>Upgrade <ArrowRight className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Features Comparison */}
      <Card className="border-border/30 bg-card/60 max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Why Agencies Choose MAA SOLAR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: MessageSquare, title: "AI Sales Bot", desc: "24/7 automated lead qualification" },
              { icon: Search, title: "Business Scraper", desc: "Find leads from Google Maps" },
              { icon: BarChart3, title: "Smart Analytics", desc: "Track conversions & ROI" },
              { icon: Shield, title: "Indian Subsidies", desc: "All 32 states covered" },
            ].map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mx-auto mb-3">
                  <feature.icon className="w-6 h-6 text-orange-400" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{feature.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
