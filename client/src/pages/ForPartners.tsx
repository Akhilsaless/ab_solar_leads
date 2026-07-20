import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Zap, Users, TrendingUp, CheckCircle, ArrowRight,
  MessageSquare, Star, Phone, Mail, MapPin, FileText, Wrench
} from "lucide-react";

// Replace with your actual WhatsApp number
const SALES_SQUAD_WHATSAPP = "919133731003";

export default function ForPartners() {
  const [, setLocation] = useLocation();

  const openWhatsApp = () => {
    const msg = encodeURIComponent("Hi Sales Squad! I'm interested in partnering with you to receive solar leads. Can we discuss the commission rate?");
    window.open(`https://wa.me/${SALES_SQUAD_WHATSAPP}?text=${msg}`, "_blank");
  };

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
                desc: "You get the lead's full details — call them, visit their site, and close the installation. A commission per kW is paid to Sales Squad upon successful installation."
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
              "Commission per kW paid to Sales Squad only on successful installations",
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

      {/* Commission Agreement */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Commission Agreement</h2>
          <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
            Transparent, milestone-based payouts. Commission rate is finalized individually upon agreement with Sales Squad.
          </p>

          {/* Payout Milestones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {/* Milestone 1 */}
            <div className="bg-slate-800/60 border border-orange-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-orange-300 font-medium uppercase tracking-wide">Milestone 1</p>
                  <h3 className="font-bold text-white">Subsidy Application</h3>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                50% of the agreed commission is due when the customer signs up and successfully applies for the PM Surya Ghar subsidy.
              </p>
              <div className="bg-slate-700/50 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-300">Payout</span>
                <span className="text-lg font-bold text-orange-400">50% of agreed rate</span>
              </div>
            </div>

            {/* Milestone 2 */}
            <div className="bg-slate-800/60 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center shrink-0">
                  <Wrench className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-green-300 font-medium uppercase tracking-wide">Milestone 2</p>
                  <h3 className="font-bold text-white">Installation Complete</h3>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Remaining 50% of the agreed commission is due after the solar system is fully installed at the customer's premises.
              </p>
              <div className="bg-slate-700/50 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-300">Payout</span>
                <span className="text-lg font-bold text-green-400">50% of agreed rate</span>
              </div>
            </div>
          </div>

          {/* Rate note */}
          <div className="bg-slate-700/40 border border-slate-600 rounded-xl p-6 text-center">
            <p className="text-gray-300 text-sm mb-1">
              <span className="font-semibold text-white">Commission rate per kW:</span> Finalized individually upon agreement with Sales Squad.
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Contact us on WhatsApp to discuss your rate before signing up.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center bg-slate-800/30">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-6">Ready to Receive Qualified Solar Leads?</h2>
          <p className="text-gray-400 text-lg mb-10">Sign up in 2 minutes. No upfront cost. Start receiving leads as soon as you're approved.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => setLocation("/partner-signup")}
              className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-7 text-xl font-bold rounded-xl shadow-lg shadow-orange-500/20"
            >
              Sign Up as Partner — It's Free <ArrowRight className="w-6 h-6 ml-2" />
            </Button>
            <Button
              onClick={openWhatsApp}
              className="bg-green-600 hover:bg-green-700 text-white px-10 py-7 text-xl font-bold rounded-xl shadow-lg shadow-green-600/20"
            >
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Chat with Us on WhatsApp
            </Button>
          </div>
          <p className="text-gray-500 text-sm mt-6">We'll get back to you within the hour.</p>
        </div>
      </section>

    </div>
  );
}
