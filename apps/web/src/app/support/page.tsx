"use client";

import { useState, useEffect } from "react";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { T } from "@/components/ui/T";
import { useAuth } from "@/hooks/useAuth";
import { ticketsApi } from "@/lib/api";
import { 
  AlertCircle,
  Bot, 
  CheckCircle2, 
  LifeBuoy, 
  Loader2, 
  Mail, 
  MessageSquare, 
  PhoneCall, 
  Send,
  Ticket
} from "lucide-react";

// The TICKET_TYPES list
const TICKET_TYPES = [
  { value: "ORDER_ISSUE", label: "Order Issue" },
  { value: "REFUND_ISSUE", label: "Refund / Return" },
  { value: "PAYMENT_ISSUE", label: "Payment Problem" },
  { value: "PRODUCT_ISSUE", label: "Product Quality" },
  { value: "SHIPPING_ISSUE", label: "Shipping / Delivery" },
  { value: "ACCOUNT_SUSPENSION", label: "Account Suspended" },
  { value: "LOGIN_ISSUE", label: "Login Problem" },
  { value: "HACKED_ACCOUNT", label: "Account Security" },
  { value: "SELLER_COMPLAINT", label: "Complaint about Seller" },
  { value: "BUYER_COMPLAINT", label: "Complaint about Buyer" },
  { value: "PLATFORM_BUG", label: "Technical Issue / Bug" },
  { value: "FEATURE_REQUEST", label: "Feature Request" },
  { value: "KYC_VERIFICATION", label: "KYC / Verification Help" },
  { value: "OTHER", label: "Other" },
];

export default function SupportPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"ai" | "ticket" | "contact">("ai");

  // AI Chat state
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Ticket form state
  const [ticketType, setTicketType] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [guestEmail, setGuestEmail] = useState(user?.email || "");
  const [guestName, setGuestName] = useState(user ? `${user.firstName} ${user.lastName}` : "");
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const [ticketError, setTicketError] = useState("");

  // Contacts state
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    async function loadContacts() {
       try {
          const res = await ticketsApi.getPublicContacts();
          setContacts(res.data || []);
       } catch (e) {
          console.error("Failed to load contacts", e);
       }
    }
    loadContacts();
  }, []);

  const handleAiChatSubmit = async () => {
    if (!chatInput.trim()) return;

    const newHistory = [...chatHistory, { role: "user" as const, content: chatInput.trim() }];
    setChatHistory(newHistory);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await ticketsApi.aiChat({
        message: chatInput.trim(),
        history: chatHistory,
      });

      setChatHistory((prev) => [
        ...prev,
        { role: "assistant" as const, content: response.data.reply }
      ]);
      
    } catch (e) {
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant" as const, content: "I'm sorry, I'm having trouble connecting right now. Please try creating a ticket instead." }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketType || !subject || !description || (!user && (!guestEmail || !guestName))) {
      setTicketError("Please fill out all required fields.");
      return;
    }

    setTicketError("");
    setTicketLoading(true);

    try {
      if (user) {
        await ticketsApi.create({
          type: ticketType,
          subject,
          description,
        });
      } else {
        await ticketsApi.createGuest({
          type: ticketType,
          subject,
          description,
          guestEmail,
          guestName,
        });
      }
      setTicketSuccess(true);
      setSubject("");
      setDescription("");
      setTicketType("");
    } catch (err: any) {
      setTicketError(err.response?.data?.message || "Failed to submit ticket. Please try again.");
    } finally {
      setTicketLoading(false);
    }
  };

  return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        <Header />

        {/* ── Hero Section ─────────────────────────────────────────── */}
        <section className="relative flex-shrink-0 overflow-hidden bg-gradient-to-b from-blue-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 pt-28 pb-16">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-200/20 dark:bg-blue-500/5 rounded-full blur-3xl" />
            <div className="absolute top-20 -right-40 w-96 h-96 bg-amber-100/30 dark:bg-amber-500/5 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-5xl mx-auto px-4 text-center">
            <Badge
              variant="outline"
              className="mb-4 border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-400 px-4 py-1.5"
            >
              <LifeBuoy className="w-3.5 h-3.5 mr-1.5" />
              <T>Orivraa Help Center</T>
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
              <T>How can we help you today?</T>
            </h1>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              <T>
                Whether you need instant answers from our AI assistant, help with an order, or assistance from our support team, we've got you covered.
              </T>
            </p>
          </div>
        </section>

        {/* ── Main Content ────────────────────────────────────────── */}
        <main className="flex-grow max-w-6xl mx-auto px-4 pb-24 w-full -mt-8 relative z-10">
          
          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <button 
              onClick={() => setActiveTab("ai")}
              className={`p-6 rounded-2xl border text-left transition-all ${activeTab === 'ai' ? 'bg-white dark:bg-gray-900 border-blue-500 shadow-md ring-1 ring-blue-500' : 'bg-white/60 dark:bg-gray-900/60 border-gray-200 hover:border-blue-300'}`}
            >
              <div className={`p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4 ${activeTab === 'ai' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 dark:bg-gray-800'}`}>
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1"><T>AI Assistant</T></h3>
              <p className="text-sm text-gray-500 dark:text-gray-400"><T>Get instant answers 24/7</T></p>
            </button>
            <button 
              onClick={() => setActiveTab("ticket")}
              className={`p-6 rounded-2xl border text-left transition-all ${activeTab === 'ticket' ? 'bg-white dark:bg-gray-900 border-amber-500 shadow-md ring-1 ring-amber-500' : 'bg-white/60 dark:bg-gray-900/60 border-gray-200 hover:border-amber-300'}`}
            >
              <div className={`p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4 ${activeTab === 'ticket' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600 dark:bg-gray-800'}`}>
                <Ticket className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1"><T>Raise a Ticket</T></h3>
              <p className="text-sm text-gray-500 dark:text-gray-400"><T>For complex account or order issues</T></p>
            </button>
            <button 
              onClick={() => setActiveTab("contact")}
              className={`p-6 rounded-2xl border text-left transition-all ${activeTab === 'contact' ? 'bg-white dark:bg-gray-900 border-green-500 shadow-md ring-1 ring-green-500' : 'bg-white/60 dark:bg-gray-900/60 border-gray-200 hover:border-green-300'}`}
            >
              <div className={`p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4 ${activeTab === 'contact' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600 dark:bg-gray-800'}`}>
                <PhoneCall className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1"><T>Direct Contact</T></h3>
              <p className="text-sm text-gray-500 dark:text-gray-400"><T>Call or WhatsApp our global teams</T></p>
            </button>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden min-h-[500px]">
            {/* AI Assistant Tab */}
            {activeTab === "ai" && (
              <div className="flex flex-col h-[600px]">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white leading-tight">Gemini Support Core</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Usually replies instantly</p>
                  </div>
                </div>

                <div className="flex-grow p-4 overflow-y-auto space-y-4">
                  {chatHistory.length === 0 && (
                     <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                       <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
                       <p><T>Hello! I am Orivraa's AI Assistant.</T></p>
                       <p className="text-sm mt-1"><T>Ask me anything about orders, policies, or how to use our platform.</T></p>
                     </div>
                  )}

                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-sm'}`}>
                         {msg.content}
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                         <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                         <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                         <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                   <div className="flex gap-2">
                     <Input 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type your message..."
                        className="bg-white dark:bg-gray-950 border-gray-300 cursor-text"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAiChatSubmit();
                        }}
                     />
                     <Button 
                       onClick={handleAiChatSubmit} 
                       disabled={!chatInput.trim() || chatLoading}
                       className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                     >
                        <Send className="w-4 h-4" />
                     </Button>
                   </div>
                </div>
              </div>
            )}

            {/* Raise Ticket Tab */}
            {activeTab === "ticket" && (
              <div className="p-8 md:p-12">
                <div className="max-w-2xl mx-auto">
                  <div className="text-center mb-8">
                     <Ticket className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                     <h2 className="text-2xl font-bold text-gray-900 dark:text-white"><T>Submit a Support Request</T></h2>
                     <p className="text-gray-500 dark:text-gray-400 mt-2">
                       <T>Our human support team will review your request and get back to you within 24 hours.</T>
                     </p>
                  </div>

                  {ticketSuccess ? (
                    <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-8 text-center">
                       <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                       <h3 className="text-xl font-bold text-green-900 dark:text-green-400 mb-2"><T>Ticket Submitted Successfully!</T></h3>
                       <p className="text-green-700 dark:text-green-500 mb-6">
                         We have received your request. {user ? "You can track its status in your Dashboard." : "We will reply to the email address you provided."}
                       </p>
                       <Button onClick={() => setTicketSuccess(false)} variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                         <T>Submit Another Ticket</T>
                       </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleTicketSubmit} className="space-y-5">
                      {!user && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300"><T>Your Name</T></label>
                            <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300"><T>Email Address</T></label>
                            <Input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} required />
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300"><T>Issue Type</T></label>
                        <Select value={ticketType} onValueChange={setTicketType}>
                          <SelectTrigger>
                            <SelectValue placeholder="What do you need help with?" />
                          </SelectTrigger>
                          <SelectContent>
                            {TICKET_TYPES.map(tt => (
                              <SelectItem key={tt.value} value={tt.value}>{tt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300"><T>Subject</T></label>
                        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary" required />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300"><T>Description</T></label>
                        <Textarea 
                          value={description} 
                          onChange={(e) => setDescription(e.target.value)} 
                          placeholder="Please provide as much detail as possible..." 
                          rows={6}
                          required
                        />
                      </div>

                      {ticketError && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
                          <AlertCircle className="w-4 h-4" />
                          {ticketError}
                        </div>
                      )}

                      <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white py-6 text-lg" disabled={ticketLoading}>
                         {ticketLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Ticket className="w-5 h-5 mr-2" />}
                         <T>Submit Ticket</T>
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Direct Contact Tab */}
            {activeTab === "contact" && (
              <div className="p-8 md:p-12 border-t mt-4 border-gray-100">
                <div className="text-center mb-10 max-w-2xl mx-auto">
                    <PhoneCall className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white"><T>Global Support Channels</T></h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                      <T>Our dedicated phone lines and WhatsApp support are available from Monday to Saturday, 9 AM to 6 PM (Local Time).</T>
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                   {contacts.length === 0 ? (
                     <>
                       {/* India */}
                       <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-6 bg-gray-50 dark:bg-gray-900/50">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-2xl">🇮🇳</span>
                            <h3 className="text-lg font-bold">India Support</h3>
                          </div>
                          <div className="space-y-3">
                             <a href="tel:+918001234567" className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                                <PhoneCall className="w-5 h-5" />
                                <span className="font-medium">+91 800 123 4567</span>
                             </a>
                             <a href="https://wa.me/918001234567" className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                                <MessageSquare className="w-5 h-5" />
                                <span className="font-medium">WhatsApp Support</span>
                             </a>
                          </div>
                       </div>
    
                       {/* International / US */}
                       <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-6 bg-gray-50 dark:bg-gray-900/50">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-2xl">🇺🇸</span>
                            <h3 className="text-lg font-bold">International / US</h3>
                          </div>
                          <div className="space-y-3">
                             <a href="tel:+18005550199" className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                                <PhoneCall className="w-5 h-5" />
                                <span className="font-medium">+1 800 555 0199</span>
                             </a>
                             <a href="mailto:support@orivraa.com" className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                                <Mail className="w-5 h-5" />
                                <span className="font-medium">support@orivraa.com</span>
                             </a>
                          </div>
                       </div>
                     </>
                   ) : (
                     contacts.map((contact) => (
                       <div key={contact.id} className="border border-gray-200 dark:border-gray-800 rounded-xl p-6 bg-gray-50 dark:bg-gray-900/50">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-2xl">{contact.countryFlag}</span>
                            <h3 className="text-lg font-bold">{contact.country} Support</h3>
                          </div>
                          <div className="space-y-3">
                             <a 
                                href={
                                  contact.type === 'PHONE' ? `tel:${contact.value}` : 
                                  contact.type === 'WHATSAPP' ? `https://wa.me/${contact.value.replace(/[^0-9]/g, '')}` : 
                                  `mailto:${contact.value}`
                                } 
                                className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                target={contact.type === 'WHATSAPP' ? "_blank" : undefined}
                                rel={contact.type === 'WHATSAPP' ? "noopener noreferrer" : undefined}
                              >
                                {contact.type === 'WHATSAPP' ? <MessageSquare className="w-5 h-5" /> : 
                                 contact.type === 'EMAIL' ? <Mail className="w-5 h-5" /> : 
                                 <PhoneCall className="w-5 h-5" />}
                                <span className="font-medium">{contact.value}</span>
                             </a>
                          </div>
                       </div>
                     ))
                   )}
                </div>
              </div>
            )}
          </div>
        </main>
        
        <DynamicFooter />
      </div>
  );
}
