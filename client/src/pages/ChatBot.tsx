import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Sun, Zap, ArrowDown, Download, MapPin, X } from "lucide-react";
import { Streamdown } from "streamdown";
import { nanoid } from "nanoid";
import jsPDF from "jspdf";
import { MapView } from "@/components/Map";

type ChatMessage = {
  role: "bot" | "customer";
  content: string;
  quickReplies?: string[];
  createdAt?: Date | string;
  metadata?: Record<string, any>;
};

export default function ChatBot() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "demo";

  const [sessionId] = useState(() => {
    const stored = sessionStorage.getItem(`ab-solar-session-${slug}`);
    if (stored) return stored;
    const newId = nanoid(24);
    sessionStorage.setItem(`ab-solar-session-${slug}`, newId);
    return newId;
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agencyInfo, setAgencyInfo] = useState<any>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get UTM params from URL
  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get("utm_source") || undefined;
  const utmMedium = urlParams.get("utm_medium") || undefined;
  const utmCampaign = urlParams.get("utm_campaign") || undefined;
  const autoCloseMinutes = urlParams.get("autoClose") ? parseInt(urlParams.get("autoClose")!) : null;
  
  // Extract referrer code from URL path (/refer/REF_ABC123) OR query param (?ref=REF_ABC123)
  const pathParts = window.location.pathname.split("/");
  const referrerCodeFromPath = pathParts.includes("refer") ? pathParts[pathParts.indexOf("refer") + 1] : undefined;
  const referrerCodeFromQuery = urlParams.get("ref") || undefined;
  const referrerCode = referrerCodeFromPath || referrerCodeFromQuery;
  
  const [isClosed, setIsClosed] = useState(false);
  const [showMapPin, setShowMapPin] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [pinMarker, setPinMarker] = useState<google.maps.Marker | null>(null);

  // Generate PDF estimate using jsPDF
  const downloadPDF = () => {
    const lastBotMsg = messages.filter(m => m.role === 'bot').pop();
    const meta = lastBotMsg?.metadata || {};
    const name = meta.customerName || 'Valued Customer';
    const bill = meta.monthlyBill ? `₹${meta.monthlyBill}` : '₹2,500 (default)';
    const systemKw = meta.systemSizeKw ? `~${meta.systemSizeKw} kW` : '~3 kW';
    const cost = meta.estimatedCost ? `₹${Math.round(Number(meta.estimatedCost)).toLocaleString('en-IN')}` : 'On Request';
    const subsidy = meta.subsidyAmount ? `₹${Math.round(Number(meta.subsidyAmount)).toLocaleString('en-IN')}` : '₹78,000';
    const netCost = meta.netCost ? `₹${Math.round(Number(meta.netCost)).toLocaleString('en-IN')}` : 'On Request';
    const savings = meta.estimatedSavingsMonthly ? `₹${Math.round(Number(meta.estimatedSavingsMonthly)).toLocaleString('en-IN')}/month` : 'On Request';
    const payback = meta.paybackYears ? `~${meta.paybackYears} years` : '~4 years';
    const loc = meta.customerCity ? `${meta.customerCity}${meta.customerState ? ', ' + meta.customerState : ''}` : (meta.customerState || '');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const green = [16, 185, 129] as [number, number, number];
    const black = [10, 10, 10] as [number, number, number];
    const gray = [107, 114, 128] as [number, number, number];
    const lightGray = [243, 244, 246] as [number, number, number];
    const white = [255, 255, 255] as [number, number, number];
    const w = 210; const h = 297;

    // Header
    doc.setFillColor(...green);
    doc.rect(0, 0, w, 40, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(22); doc.setFont('helvetica', 'bold');
    doc.text('Solar Estimate', w / 2, 16, { align: 'center' });
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('Sales Squad — Agent Klaus', w / 2, 24, { align: 'center' });
    doc.text(`Prepared for: ${name}${loc ? ' — ' + loc : ''}`, w / 2, 32, { align: 'center' });

    // Date
    doc.setTextColor(...gray);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, w - 14, 46, { align: 'right' });

    // Section helper
    let y = 52;
    const row = (label: string, value: string, highlight = false) => {
      doc.setFillColor(...(highlight ? green : lightGray));
      doc.roundedRect(14, y, w - 28, 10, 2, 2, 'F');
      doc.setTextColor(...(highlight ? white : black));
      doc.setFontSize(10); doc.setFont('helvetica', highlight ? 'bold' : 'normal');
      doc.text(label, 20, y + 7);
      doc.text(value, w - 20, y + 7, { align: 'right' });
      y += 13;
    };
    const section = (title: string) => {
      y += 4;
      doc.setTextColor(...green);
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text(title, 14, y);
      y += 6;
    };

    section('📊 Your Solar Estimate');
    row('Monthly Electricity Bill', bill);
    row('Recommended System Size', systemKw);
    row('Estimated System Cost', cost);
    row('Govt Subsidy (PM Surya Ghar)', `− ${subsidy}`);
    row('Your Net Cost', netCost, true);

    section('💰 Financial Benefits');
    row('Monthly Savings', savings);
    row('Payback Period', payback);
    row('After Payback', 'FREE electricity for 20+ years! 🎉');

    section('🌟 Why Solar Now?');
    const reasons = [
      '• Electricity bills rising 8–10% every year',
      '• PM Surya Ghar Yojana subsidy — limited time offer',
      '• 25-year panel warranty with minimal maintenance',
      '• Increases your property value',
      '• Clean energy — good for the environment',
    ];
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...black);
    reasons.forEach(r => { doc.text(r, 20, y); y += 7; });

    // Footer
    y = h - 20;
    doc.setFillColor(...lightGray);
    doc.rect(0, y - 4, w, 24, 'F');
    doc.setTextColor(...gray);
    doc.setFontSize(8);
    doc.text('This estimate is approximate. Actual costs may vary based on site conditions and local rates.', w / 2, y + 2, { align: 'center' });
    doc.text('Sales Squad — Premium Leads | Contact us to book your FREE site visit', w / 2, y + 8, { align: 'center' });

    doc.save(`solar-estimate-${name.replace(/\s+/g, '-')}.pdf`);

    // Add thank-you message after download
    const thankYouMsg = `Thank you so much${name !== 'Valued Customer' ? ', ' + name : ''} ji! 🙏 Your solar estimate has been downloaded. Our expert will get in touch with you very soon to discuss the next steps. Have a wonderful day! ☀️`;
    setMessages(prev => [
      ...prev,
      { role: 'bot' as const, content: thankYouMsg, createdAt: new Date() }
    ]);
    setDownloaded(true);
  };

  // Start conversation
  const startConv = trpc.chat.startConversation.useMutation({
    onSuccess: (data) => {
      if (data.messages) {
        setMessages(data.messages.map((m: any) => ({
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })));
      }
      if (data.agency) {
        setAgencyInfo(data.agency);
      }
    },
  });

  // Auto-sequence pitch: after pitch_a send continue, after pitch_b send continue
  const autoSequenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Send message
  const sendMsg = trpc.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: data.response,
          quickReplies: data.quickReplies || [],
          createdAt: new Date(),
          metadata: data.estimate || {},
        },
      ]);
      setIsLoading(false);
      // Auto-advance pitch sequence without customer input
      if (data.stage === 'pitch_a' || data.stage === 'pitch_b') {
        autoSequenceRef.current = setTimeout(() => {
          setIsLoading(true);
          sendMsg.mutate({ sessionId, message: '__auto_continue__' });
        }, 1200);
      }
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: "Sorry, I'm having trouble right now. Please try again!",
          quickReplies: ["Try again", "Start over"],
          createdAt: new Date(),
        },
      ]);
      setIsLoading(false);
    },
  });

  // Initialize conversation on mount
  useEffect(() => {
    startConv.mutate({
      agencySlug: slug,
      sessionId,
      utmSource,
      utmMedium,
      utmCampaign,
      referrerCode,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-close timer
  useEffect(() => {
    if (autoCloseMinutes && autoCloseMinutes > 0) {
      const timer = setTimeout(() => {
        setIsClosed(true);
      }, autoCloseMinutes * 60 * 1000);
      return () => clearTimeout(timer);
    }
  }, [autoCloseMinutes]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Detect scroll position for scroll-to-bottom button
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
    if (!viewport) return;
    const isNearBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100;
    setShowScrollBtn(!isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = (text?: string) => {
    const trimmed = (text || input).trim();
    if (!trimmed || isLoading) return;

    // Clear quick replies from the last bot message when user responds
    setMessages((prev) => {
      const updated = [...prev];
      // Remove quick replies from the last bot message since user has responded
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].role === "bot" && updated[i].quickReplies?.length) {
          updated[i] = { ...updated[i], quickReplies: [] };
          break;
        }
      }
      return [...updated, { role: "customer", content: trimmed, createdAt: new Date() }];
    });

    setInput("");
    setIsLoading(true);
    sendMsg.mutate({ sessionId, message: trimmed });
    textareaRef.current?.focus();
  };

  const handleQuickReply = (reply: string) => {
    handleSend(reply);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const brandColor = agencyInfo?.color || "#F97316";
  const agencyName = agencyInfo?.name || "Sales Squad Agent";

  // Initial quick replies shown before first user message
  const initialQuickReplies = messages.length <= 1 && !isLoading ? [
    "I want to reduce my electricity bill",
    "How much does solar cost?",
    "Tell me about government subsidies",
    "I pay ₹3000/month in electricity",
  ] : [];

  // Get the last bot message's quick replies (only show for the very last bot message)
  const lastBotMsgIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "bot") return i;
    }
    return -1;
  })();

  if (isClosed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto">
            <Sun className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Chat Session Closed</h2>
          <p className="text-gray-400">Thank you for chatting with {agencyName}! Your session has ended.</p>
          <p className="text-sm text-gray-500">Feel free to reach out again anytime.</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-6 solar-gradient text-black font-semibold"
          >
            Start New Chat
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)` }}
          >
            <Sun className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white truncate">Sales Squad Agent</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-gray-400">Solar Advisor Online</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Zap className="w-3.5 h-3.5" style={{ color: brandColor }} />
            <span className="text-xs font-medium text-gray-300">Free Consultation</span>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 max-w-3xl mx-auto w-full flex flex-col relative">
        <ScrollArea
          ref={scrollRef}
          className="flex-1"
          onScrollCapture={handleScroll}
          style={{ height: "calc(100vh - 64px - 80px)" }}
        >
          <div className="px-4 py-6 space-y-4">
            {/* Welcome badge */}
            {messages.length <= 1 && (
              <div className="flex justify-center mb-6 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400">
                  <Sun className="w-3.5 h-3.5" style={{ color: brandColor }} />
                  <span>Powered by Sales Squad Agent</span>
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={i}>
                {/* Message bubble */}
                <div
                  className={`flex gap-3 animate-slide-up ${msg.role === "customer" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "bot" && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
                      style={{ background: `${brandColor}20` }}
                    >
                      <Sun className="w-4 h-4" style={{ color: brandColor }} />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.role === "customer"
                        ? "text-white rounded-br-md"
                        : "bg-white/[0.07] text-gray-100 border border-white/10 rounded-bl-md"
                    }`}
                    style={msg.role === "customer" ? {
                      background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)`,
                    } : undefined}
                  >
                    {msg.role === "bot" ? (
                      <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5">
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>

                {/* ROI and 3D visualization removed - using text-based estimates instead */}

                {/* Quick reply buttons - shown below the last bot message only */}
                {msg.role === "bot" && i === lastBotMsgIndex && msg.quickReplies && msg.quickReplies.length > 0 && !isLoading && (
                  <div className="flex flex-wrap gap-2 mt-3 ml-11 animate-fade-in">
                    {msg.quickReplies.map((reply, j) => (
                      <button
                        key={j}
                        onClick={() => handleQuickReply(reply)}
                        className="group relative px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                        style={{
                          background: `linear-gradient(135deg, ${brandColor}15, ${brandColor}08)`,
                          border: `1px solid ${brandColor}40`,
                          color: brandColor,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = `linear-gradient(135deg, ${brandColor}30, ${brandColor}18)`;
                          e.currentTarget.style.borderColor = `${brandColor}70`;
                          e.currentTarget.style.boxShadow = `0 0 20px ${brandColor}15`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = `linear-gradient(135deg, ${brandColor}15, ${brandColor}08)`;
                          e.currentTarget.style.borderColor = `${brandColor}40`;
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 animate-slide-up">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
                  style={{ background: `${brandColor}20` }}
                >
                  <Sun className="w-4 h-4" style={{ color: brandColor }} />
                </div>
                <div className="bg-white/[0.07] border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Initial quick replies - before first user message */}
            {initialQuickReplies.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 ml-11 animate-fade-in">
                {initialQuickReplies.map((reply, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickReply(reply)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                    style={{
                      background: `linear-gradient(135deg, ${brandColor}15, ${brandColor}08)`,
                      border: `1px solid ${brandColor}40`,
                      color: brandColor,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `linear-gradient(135deg, ${brandColor}30, ${brandColor}18)`;
                      e.currentTarget.style.borderColor = `${brandColor}70`;
                      e.currentTarget.style.boxShadow = `0 0 20px ${brandColor}15`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = `linear-gradient(135deg, ${brandColor}15, ${brandColor}08)`;
                      e.currentTarget.style.borderColor = `${brandColor}40`;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Scroll to bottom button */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all z-10"
          >
            <ArrowDown className="w-4 h-4 text-gray-300" />
          </button>
        )}

        {/* Input Area */}
        <div className="border-t border-white/10 bg-gray-950/80 backdrop-blur-xl p-4">
          {messages.length > 2 && (
            <div className="mb-3 flex gap-2">
              <Button
                onClick={downloadPDF}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0">
                  
              <Download className="w-4 h-4 mr-2" />
                Download Estimate PDF
              </Button>
              <Button
                onClick={() => {
                  if (navigator.geolocation) {
                    setIsLoading(true);
                    let timeoutId: NodeJS.Timeout | null = null;
                    
                    // Set 5-second timeout for geolocation
                    timeoutId = setTimeout(() => {
                      setIsLoading(false);
                      setShowMapPin(true);
                      console.warn('[Location] Geolocation timeout - falling back to manual pin drop');
                    }, 5000);
                    
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        if (timeoutId) clearTimeout(timeoutId);
                        const { latitude: lat, longitude: lng } = pos.coords;
                        const geocoder = new google.maps.Geocoder();
                        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                          const address = status === 'OK' && results?.[0] ? results[0].formatted_address : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                          setPinnedLocation({ lat, lng, address });
                          setIsLoading(false);
                          handleSend(`My location: ${address} (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
                        });
                      },
                      (error) => {
                        if (timeoutId) clearTimeout(timeoutId);
                        console.warn('[Location] Geolocation error:', error.message);
                        setIsLoading(false);
                        setShowMapPin(true); // fallback to map pin
                      }
                    );
                  } else {
                    setShowMapPin(true);
                  }
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20">
              <MapPin className="w-4 h-4 mr-2" />
                Share My Location
              </Button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="flex-1 max-h-32 resize-none min-h-[44px] bg-white/[0.06] border-white/10 text-white placeholder:text-gray-500 rounded-xl focus:border-white/20 focus:ring-0"
              rows={1}
              disabled={isLoading || startConv.isPending}
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="h-[44px] w-[44px] rounded-xl shrink-0"
              style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-gray-600 text-center mt-2">
            Agent Klaus · Sales Squad · Your data is secure
          </p>
        </div>
      </div>

      {/* Google Maps Pin Drop Modal */}
      {showMapPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h3 className="text-white font-semibold">Drop Your Location Pin</h3>
                <p className="text-gray-400 text-xs mt-0.5">Tap on the map to mark your home</p>
              </div>
              <button onClick={() => setShowMapPin(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-72">
              <MapView
                onMapReady={(map) => {
                  setMapInstance(map);
                  // Try to center on user's location (with 3-second timeout)
                  if (navigator.geolocation) {
                    let timeoutId: NodeJS.Timeout | null = null;
                    timeoutId = setTimeout(() => {
                      map.setCenter({ lat: 20.5937, lng: 78.9629 }); // India center fallback
                    }, 3000);
                    
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        if (timeoutId) clearTimeout(timeoutId);
                        map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                      },
                      () => {
                        if (timeoutId) clearTimeout(timeoutId);
                        map.setCenter({ lat: 20.5937, lng: 78.9629 }); // India center
                      }
                    );
                  }
                  // Click to drop pin
                  map.addListener('click', (e: google.maps.MapMouseEvent) => {
                    if (!e.latLng) return;
                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();
                    // Remove old marker
                    if (pinMarker) pinMarker.setMap(null);
                    const marker = new google.maps.Marker({
                      position: { lat, lng },
                      map,
                      title: 'Your Location',
                      animation: google.maps.Animation.DROP,
                    });
                    setPinMarker(marker);
                    // Reverse geocode
                    const geocoder = new google.maps.Geocoder();
                    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                      const address = status === 'OK' && results?.[0] ? results[0].formatted_address : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                      setPinnedLocation({ lat, lng, address });
                    });
                  });
                }}
              />
            </div>
            {pinnedLocation && (
              <div className="p-3 bg-emerald-900/30 border-t border-emerald-500/20">
                <p className="text-emerald-400 text-xs font-medium">📍 {pinnedLocation.address}</p>
              </div>
            )}
            <div className="p-4 flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setShowMapPin(false); setPinnedLocation(null); }}
                className="flex-1 border-white/20 text-white bg-transparent hover:bg-white/10"
              >Cancel</Button>
              <Button
                onClick={() => {
                  if (pinnedLocation) {
                    setShowMapPin(false);
                    const msg = `My location: ${pinnedLocation.address} (${pinnedLocation.lat.toFixed(5)}, ${pinnedLocation.lng.toFixed(5)})`;
                    handleSend(msg);
                  }
                }}
                disabled={!pinnedLocation}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
              >Confirm Location</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
