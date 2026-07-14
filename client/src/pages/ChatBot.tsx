import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Sun, Zap, ArrowDown, Download } from "lucide-react";
import { Streamdown } from "streamdown";
import { nanoid } from "nanoid";
// ROI and 3D visualization removed - using simple text display

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
  
  // Extract referrer code from URL path (e.g., /refer/REF_ABC123)
  const pathParts = window.location.pathname.split("/");
  const referrerCode = pathParts.includes("refer") ? pathParts[pathParts.indexOf("refer") + 1] : undefined;
  
  const [isClosed, setIsClosed] = useState(false);

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
                onClick={() => {
                  // Extract conversation data for estimate
                  const lastBotMsg = messages.filter(m => m.role === 'bot').pop();
                  const metadata = lastBotMsg?.metadata || {};
                  
                  // Use real data from metadata
                  const systemSize = metadata.systemSizeKw ? `${metadata.systemSizeKw}` : '';
                  const estimatedCost = metadata.estimatedCost ? `${metadata.estimatedCost}` : '';
                  const monthlyBill = metadata.monthlyBill ? `${metadata.monthlyBill}` : '';
                  const monthlySavings = metadata.estimatedSavingsMonthly ? `${metadata.estimatedSavingsMonthly}` : '';
                  const paybackPeriod = metadata.paybackYears ? `${metadata.paybackYears}` : '';
                  const savings25Year = metadata.estimatedSavings25Year ? `${metadata.estimatedSavings25Year}` : '';
                  const subsidy = metadata.subsidyAmount ? `${metadata.subsidyAmount}` : '';
                  const netCost = metadata.netCost ? `${metadata.netCost}` : '';
                  const customerName = metadata.customerName ? `${metadata.customerName}` : '';
                  const customerCity = metadata.customerCity ? `${metadata.customerCity}` : '';
                  const customerState = metadata.customerState ? `${metadata.customerState}` : '';
                  
                  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Solar Estimate - Sales Squad</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8f9fa; color: #333; }
    .container { max-width: 900px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { font-size: 32px; margin-bottom: 5px; }
    .header p { font-size: 14px; opacity: 0.9; }
    .customer-info { background: #f8f9fa; padding: 20px 30px; border-bottom: 1px solid #e9ecef; }
    .customer-info p { margin: 5px 0; font-size: 14px; }
    .section { padding: 30px; border-bottom: 1px solid #e9ecef; }
    .section h2 { color: #F97316; font-size: 20px; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #F97316; }
    .card-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
    .card-value { font-size: 24px; font-weight: bold; color: #F97316; }
    .card-unit { font-size: 12px; color: #999; margin-top: 3px; }
    .highlight { background: #fff3e0; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #F97316; }
    .highlight p { margin: 8px 0; font-size: 14px; }
    .benefits { list-style: none; }
    .benefits li { padding: 8px 0; padding-left: 25px; position: relative; font-size: 14px; }
    .benefits li:before { content: '✓'; position: absolute; left: 0; color: #F97316; font-weight: bold; }
    .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; font-size: 12px; color: #666; }
    .footer p { margin: 5px 0; }
    .chart-placeholder { background: #f0f0f0; height: 200px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999; margin: 15px 0; }
    .chart-section { margin: 20px 0; }
    .chart-section h3 { font-size: 16px; font-weight: bold; color: #333; margin-bottom: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>☀️ Solar Estimate</h1>
      <p>Powered by Sales Squad Agent</p>
    </div>
    
    <!-- Customer Info -->
    <div class="customer-info">
      <p><strong>Customer:</strong> ${customerName}</p>
      <p><strong>Location:</strong> ${customerCity}, ${customerState}</p>
      <p><strong>Current Monthly Bill:</strong> ₹${monthlyBill}</p>
    </div>
    
    <!-- System Recommendation -->
    <div class="section">
      <h2>System Recommendation</h2>
      <div class="grid">
        <div class="card">
          <div class="card-label">System Size</div>
          <div class="card-value">Approx ${systemSize}</div>
          <div class="card-unit">kW</div>
        </div>
        <div class="card">
          <div class="card-label">Estimated Cost</div>
          <div class="card-value">Approx ₹${estimatedCost}</div>
          <div class="card-unit">Before Subsidy</div>
        </div>
      </div>
      <div class="highlight">
        <p><strong>Government Subsidy:</strong> Approx ₹${subsidy}</p>
        <p><strong>Net Cost After Subsidy:</strong> Approx ₹${netCost}</p>
      </div>
    </div>
    
    <!-- Financial Benefits -->
    <div class="section">
      <h2>Financial Benefits</h2>
      <div class="grid">
        <div class="card">
          <div class="card-label">Monthly Savings</div>
          <div class="card-value">Approx ₹${monthlySavings}</div>
          <div class="card-unit">Per Month</div>
        </div>
        <div class="card">
          <div class="card-label">Payback Period</div>
          <div class="card-value">Approx ${paybackPeriod}</div>
          <div class="card-unit">Years</div>
        </div>
      </div>
      <div class="highlight">
        <p><strong>25-Year Total Savings:</strong> Approx ₹${savings25Year}</p>
        <p style="font-size: 12px; margin-top: 10px; color: #666;">Based on current electricity rates with 1.3% annual increase</p>
      </div>
    </div>
    
    <!-- Charts Section -->
    <div class="section">
      <h2>📊 Visual Breakdown</h2>
      
      <!-- Cost Breakdown Chart -->
      <div class="chart-section">
        <h3>💰 System Cost Breakdown</h3>
        <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" style="max-width: 100%; border: 1px solid #e9ecef; border-radius: 8px;">
          <rect width="400" height="200" fill="#f8f9fa"/>
          <!-- Original Cost Bar -->
          <rect x="30" y="30" width="340" height="35" fill="#F97316" rx="5"/>
          <text x="40" y="55" font-size="13" fill="white" font-weight="bold">Original Cost: ₹${estimatedCost}</text>
          <!-- Subsidy Bar -->
          <rect x="30" y="80" width="170" height="35" fill="#22c55e" rx="5"/>
          <text x="40" y="105" font-size="13" fill="white" font-weight="bold">Subsidy: ₹${subsidy}</text>
          <!-- Net Cost Bar -->
          <rect x="30" y="130" width="200" height="35" fill="#3b82f6" rx="5"/>
          <text x="40" y="155" font-size="13" fill="white" font-weight="bold">Your Cost: ₹${netCost}</text>
        </svg>
      </div>
      
      <!-- Payback Timeline -->
      <div class="chart-section">
        <h3>📈 Payback Period: ${paybackPeriod} Years</h3>
        <svg viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg" style="max-width: 100%; border: 1px solid #e9ecef; border-radius: 8px;">
          <rect width="400" height="150" fill="#f8f9fa"/>
          <!-- Timeline line -->
          <line x1="40" y1="75" x2="360" y2="75" stroke="#ddd" stroke-width="3"/>
          <!-- Start marker -->
          <circle cx="40" cy="75" r="8" fill="#F97316"/>
          <text x="40" y="110" font-size="12" text-anchor="middle" fill="#333">Now</text>
          <!-- Payback marker -->
          <circle cx="200" cy="75" r="8" fill="#22c55e"/>
          <text x="200" y="110" font-size="12" text-anchor="middle" fill="#333" font-weight="bold">Year ${paybackPeriod}</text>
          <text x="200" y="125" font-size="11" text-anchor="middle" fill="#666">System Paid Off</text>
          <!-- End marker -->
          <circle cx="360" cy="75" r="8" fill="#3b82f6"/>
          <text x="360" y="110" font-size="12" text-anchor="middle" fill="#333">Year 25</text>
        </svg>
      </div>
      
      <!-- 25-Year Savings -->
      <div class="chart-section">
        <h3>💵 25-Year Total Savings: ₹${savings25Year}</h3>
        <svg viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg" style="max-width: 100%; border: 1px solid #e9ecef; border-radius: 8px;">
          <rect width="400" height="150" fill="#f8f9fa"/>
          <!-- Savings bar -->
          <rect x="50" y="30" width="300" height="80" fill="#22c55e" opacity="0.8" rx="5"/>
          <text x="200" y="80" font-size="18" font-weight="bold" text-anchor="middle" fill="white">₹${savings25Year}</text>
          <text x="200" y="110" font-size="12" text-anchor="middle" fill="#666">Total savings over 25 years with 1.3% annual rate increase</text>
        </svg>
      </div>
      
      <!-- Monthly Savings -->
      <div class="chart-section">
        <h3>📅 Monthly Savings: ₹${monthlySavings}</h3>
        <svg viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg" style="max-width: 100%; border: 1px solid #e9ecef; border-radius: 8px;">
          <rect width="400" height="120" fill="#f8f9fa"/>
          <!-- Monthly bars (12 months representation) -->
          <rect x="25" y="50" width="12" height="50" fill="#F97316" opacity="0.8"/>
          <rect x="42" y="50" width="12" height="50" fill="#F97316" opacity="0.8"/>
          <rect x="59" y="50" width="12" height="50" fill="#F97316" opacity="0.8"/>
          <rect x="76" y="50" width="12" height="50" fill="#F97316" opacity="0.8"/>
          <rect x="93" y="50" width="12" height="50" fill="#F97316" opacity="0.8"/>
          <rect x="110" y="50" width="12" height="50" fill="#F97316" opacity="0.8"/>
          <rect x="127" y="50" width="12" height="50" fill="#F97316" opacity="0.8"/>
          <rect x="144" y="50" width="12" height="50" fill="#F97316" opacity="0.8"/>
          <rect x="161" y="50" width="12" height="50" fill="#F97316" opacity="0.8"/>
          <rect x="178" y="50" width="12" height="50" fill="#F97316" opacity="0.8"/>
          <rect x="195" y="50" width="12" height="50" fill="#F97316" opacity="0.8"/>
          <rect x="212" y="50" width="12" height="50" fill="#F97316" opacity="0.8"/>
          <text x="200" y="115" font-size="11" text-anchor="middle" fill="#666">Each bar = Monthly savings (12 months shown)</text>
        </svg>
      </div>
    </div>
    
    <!-- Why Solar -->
    <div class="section">
      <h2>Why Go Solar?</h2>
      <ul class="benefits">
        <li>Lock in electricity costs for 25 years</li>
        <li>Reduce your carbon footprint</li>
        <li>Increase property value</li>
        <li>Government incentives and subsidies available</li>
        <li>Minimal maintenance required</li>
        <li>25-year warranty on panels</li>
      </ul>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p><strong>This estimate is approximate.</strong> Actual costs and savings may vary based on site conditions, local rates, and system configuration.</p>
      <p>For a detailed site survey and accurate quote, please contact us.</p>
      <p style="margin-top: 15px; font-size: 11px; color: #999;">Generated by Sales Squad Agent | ${new Date().toLocaleDateString('en-IN')}</p>
    </div>
  </div>
</body>
</html>`;
                  const blob = new Blob([html], { type: 'text/html' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `solar-estimate-${new Date().getTime()}.html`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Estimate
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
            Powered by AB SOLAR AI · Your data is secure
          </p>
        </div>
      </div>
    </div>
  );
}
