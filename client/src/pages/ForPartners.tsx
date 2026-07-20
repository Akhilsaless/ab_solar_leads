import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Zap, Users, TrendingUp, CheckCircle, ArrowRight,
  MessageSquare, Star, Phone, Mail, MapPin
} from "lucide-react";

export default function ForPartners() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-20 text-center">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-yellow-500/10 pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 rounded-full px-4 py-1.5 mb-6 text-sm text-orange-300">
            <Zap className="w-4 h-4" /> For Solar Companies & Installers
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Stop Hunting for Leads.<br />
            <span className="text-orange-400">We Send Them to You.</span>
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Sales Squad's AI chatbot qualifies solar leads 24/7. You get their name, phone, email, monthly bill, and location — ready to close.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => setLocation("/partner-signup")}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-lg font-semibold rounded-xl"
            >
              Sign Up as Partner <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/chat/ab-solar")}
              className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-xl"
            >
              See the Chatbot Live
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 bg-slate-800/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-gray-400 text-center mb-14 max-w-xl mx-auto">Three simple steps from lead to installation</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: <MessageSquare className="w-8 h-8 text-orange-400" />,
                title: "Customer Chats with AI",
                desc: "A property owner visits our chatbot. It asks about their electricity bill, location, and roof. Takes 2 minutes."
              },
              {
                step: "02",
                icon: <Users className="w-8 h-8 text-orange-400" />,
                title: "We Qualify the Lead",
                desc: "AI scores the lead based on bill size, location, and intent. Only high-quality leads are forwarded to you."
              },
              {
                step: "03",
                icon: <TrendingUp className="w-8 h-8 text-orange-400" />,
                title: "You Close the Deal",
                desc: "You get the lead's full details — call them, visit their site, and close the installation. We handle the marketing."
              }
            ].map((item) => (
              <div key={item.step} className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 relative">
                <div className="text-6xl font-black text-slate-700/50 absolute top-4 right-6">{item.step}</div>
                <div className="mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">What Every Lead Includes</h2>
          <p className="text-gray-400 text-center mb-14">No more cold calling. Every lead is pre-qualified and ready to talk.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: <Phone className="w-5 h-5 text-green-400" />, title: "Phone Number", desc: "Direct mobile number, verified during chat" },
              { icon: <Mail className="w-5 h-5 text-blue-400" />, title: "Email Address", desc: "For follow-up and estimate delivery" },
              { icon: <MapPin className="w-5 h-5 text-orange-400" />, title: "Location", desc: "City, state, and GPS coordinates of the property" },
              { icon: <Zap className="w-5 h-5 text-yellow-400" />, title: "Monthly Electricity Bill", desc: "Exact bill amount — you know the ROI before you visit" },
              { icon: <Star className="w-5 h-5 text-purple-400" />, title: "Lead Score", desc: "AI-calculated quality score based on intent and bill size" },
              { icon: <CheckCircle className="w-5 h-5 text-emerald-400" />, title: "Estimate Already Sent", desc: "Customer has seen a solar estimate — they're already interested" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 bg-slate-800/40 border border-slate-700 rounded-xl p-6">
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{item.title}</h4>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Partner */}
      <section className="px-6 py-20 bg-slate-800/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-14">Why Solar Companies Choose Sales Squad</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              "Leads generated 24/7 — even while you sleep",
              "Customers already know their savings estimate",
              "No marketing spend required from your side",
              "Leads come with full contact details",
              "You only pay when you get results",
              "Works across all major Indian cities",
              "AI filters out low-quality leads automatically",
              "Direct WhatsApp quick-call button on every lead",
            ].map((point) => (
              <div key={point} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700 rounded-lg px-5 py-4">
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                <span className="text-gray-200 text-sm">{point}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-6">Ready to Receive Qualified Solar Leads?</h2>
          <p className="text-gray-400 text-lg mb-10">Sign up in 2 minutes. No upfront cost. Start receiving leads as soon as you're approved.</p>
          <Button
            onClick={() => setLocation("/partner-signup")}
            className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-7 text-xl font-bold rounded-xl shadow-lg shadow-orange-500/20"
          >
            Sign Up as Partner — It's Free <ArrowRight className="w-6 h-6 ml-2" />
          </Button>
          <p className="text-gray-500 text-sm mt-6">Questions? WhatsApp us directly and we'll get back to you within the hour.</p>
        </div>
      </section>

    </div>
  );
}
