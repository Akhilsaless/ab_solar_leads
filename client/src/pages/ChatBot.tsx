import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Sun, Zap, ArrowDown } from "lucide-react";
import { Streamdown } from "streamdown";
import { nanoid } from "nanoid";
import { ROICalculator } from "@/components/ROICalculator";
import { RoofVisualization } from "@/components/RoofVisualization";
import { SystemSizeSlider } from "@/components/SystemSizeSlider";
import { PanelComparison } from "@/components/PanelComparison";

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
  const agencyName = agencyInfo?.name || "AB SOLAR";

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
            <h1 className="font-bold text-white truncate">{agencyName}</h1>
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
                  <span>Powered by AB SOLAR AI</span>
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

                {msg.role === "bot" && msg.metadata?.showROI && (
                  <div className="ml-11 mt-4 max-w-[85%] md:max-w-[75%]">
                    <ROICalculator
                      monthlyBill={msg.metadata.monthlyBill || 0}
                      systemSizeKw={msg.metadata.systemSizeKw || 0}
                      totalCost={msg.metadata.totalCost || 0}
                      subsidyAmount={msg.metadata.subsidyAmount || 0}
                      netCost={msg.metadata.netCost || 0}
                      monthlyElectricitySavings={msg.metadata.monthlyElectricitySavings || 0}
                      paybackYears={msg.metadata.paybackYears || 0}
                      futureElectricityRate={msg.metadata.futureElectricityRate}
                      currentRate={msg.metadata.currentRate}
                      rateIncreasePercentage={msg.metadata.rateIncreasePercentage}
                    />
                  </div>
                )}

                {msg.role === "bot" && msg.metadata?.show3D && (
                  <div className="ml-11 mt-4 max-w-[85%] md:max-w-[75%]">
                    <RoofVisualization
                      panelCount={msg.metadata.panelCount || 0}
                      systemSizeKw={msg.metadata.systemSizeKw || 0}
                      panelType={msg.metadata.panelType || "monocrystalline"}
                    />
                  </div>
                )}

                {msg.role === "bot" && msg.metadata?.showSlider && msg.metadata && (
                  <div className="ml-11 mt-4 max-w-[85%] md:max-w-[75%]">
                    <SystemSizeSlider
                      monthlyBill={msg.metadata.monthlyBill || 0}
                      onSystemSizeChange={(size, panels, savings) => {
                        if (msg.metadata) {
                          msg.metadata.systemSizeKw = size;
                          msg.metadata.panelCount = panels;
                          msg.metadata.monthlyElectricitySavings = savings;
                        }
                      }}
                      currentRate={msg.metadata.currentRate || 7.5}
                    />
                  </div>
                )}

                {msg.role === "bot" && msg.metadata?.showPanelComparison && msg.metadata && (
                  <div className="ml-11 mt-4 max-w-[85%] md:max-w-[75%]">
                    <PanelComparison
                      systemSizeKw={msg.metadata.systemSizeKw || 0}
                      totalCost={msg.metadata.totalCost || 0}
                      onPanelSelect={(panelType, cost) => {
                        if (msg.metadata) {
                          msg.metadata.panelType = panelType;
                          msg.metadata.estimatedCost = cost;
                        }
                      }}
                    />
                  </div>
                )}

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
