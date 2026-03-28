import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Zap, Sun, DollarSign, TrendingUp, Send, X, MessageCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Home() {
  const [visitorId] = useState(() => `visitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [showChat, setShowChat] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getOrCreateConversation = trpc.chat.getOrCreate.useMutation();
  const sendMessage = trpc.chat.sendMessage.useMutation();

  // Initialize chat
  useEffect(() => {
    if (showChat && !conversationId) {
      getOrCreateConversation.mutate({ visitorId }, {
        onSuccess: (data) => {
          setConversationId(data.conversation.id);
          setMessages(data.messages.map((m: any) => ({ role: m.role, content: m.content })));
          
          // Send initial greeting
          if (data.messages.length === 0) {
            sendInitialGreeting(data.conversation.id);
          }
        },
      });
    }
  }, [showChat]);

  const sendInitialGreeting = (convId: number) => {
    setIsLoading(true);
    sendMessage.mutate(
      {
        conversationId: convId,
        visitorId,
        message: "Hi, I'm interested in learning about solar energy for my home.",
      },
      {
        onSuccess: (data) => {
          setMessages((prev) => [
            ...prev,
            { role: "user", content: "Hi, I'm interested in learning about solar energy for my home." },
            { role: "assistant", content: data.message },
          ]);
          setIsLoading(false);
        },
      }
    );
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || !conversationId) return;

    const userMessage = inputValue;
    setInputValue("");
    setIsLoading(true);

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    sendMessage.mutate(
      {
        conversationId,
        visitorId,
        message: userMessage,
      },
      {
        onSuccess: (data) => {
          setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
          setIsLoading(false);
        },
        onError: () => {
          toast.error("Failed to send message");
          setIsLoading(false);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="w-8 h-8 text-orange-500" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              AB SOLAR
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium hover:text-primary transition">Features</a>
            <a href="#benefits" className="text-sm font-medium hover:text-primary transition">Benefits</a>
            <a href="#faq" className="text-sm font-medium hover:text-primary transition">FAQ</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Go <span className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">Solar</span> Today
              </h1>
              <p className="text-xl text-muted-foreground">
                Join thousands of homeowners saving money with solar energy. Get your personalized quote in minutes and discover how much you can save.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-lg font-medium">Free solar assessment</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-lg font-medium">No installation costs</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-lg font-medium">Save up to 30% on energy</span>
              </div>
            </div>

            <Button
              onClick={() => setShowChat(true)}
              size="lg"
              className="btn-primary gap-2 text-lg h-14 px-8"
            >
              <MessageCircle className="w-5 h-5" />
              Chat with AI Agent
            </Button>
          </div>

          {/* Hero Visual */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-orange-200 rounded-3xl blur-3xl opacity-30"></div>
            <Card className="card-elevated p-8 relative backdrop-blur-sm border-2 border-blue-100">
              <div className="flex flex-col items-center justify-center py-16 space-y-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-orange-400 flex items-center justify-center animate-pulse">
                  <Sun className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-center">Clean Energy For Your Home</h3>
                <p className="text-center text-muted-foreground">Powered by advanced solar technology</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">Why Choose AB SOLAR?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: "Instant Assessment",
                description: "Get a personalized solar assessment in minutes using our AI agent",
              },
              {
                icon: DollarSign,
                title: "Maximum Savings",
                description: "Save up to 30% on your annual energy costs with solar",
              },
              {
                icon: TrendingUp,
                title: "Expert Support",
                description: "Our team guides you through every step of the process",
              },
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card key={idx} className="card-elevated p-8">
                  <Icon className="w-12 h-12 text-orange-500 mb-4" />
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Chat Widget */}
      {showChat && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-border flex flex-col z-50 animate-in fade-in slide-in-from-bottom-4">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-blue-600 to-orange-500 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <div>
                <h3 className="font-bold">AB SOLAR Agent</h3>
                <p className="text-sm opacity-90">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="hover:bg-white/20 p-1 rounded transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-gray-100 text-gray-900 rounded-bl-none"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-lg rounded-bl-none">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-4 rounded-b-2xl flex gap-2">
            <Input
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              size="sm"
              className="btn-primary"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-orange-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-40 animate-pulse"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">© 2026 AB SOLAR. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
