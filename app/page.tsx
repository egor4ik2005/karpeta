"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function Home() {
  // === Chat State ===
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // === Forecast State ===
  const [age, setAge] = useState<number>(30);
  const [sex, setSex] = useState("male");
  const [bmi, setBmi] = useState<number>(24.0);
  const [children, setChildren] = useState<number>(0);
  const [smoker, setSmoker] = useState("no");
  const [region, setRegion] = useState("southwest");
  const [prediction, setPrediction] = useState<number | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState("");
  const [contactOpen, setContactOpen] = useState(false);

  // === Feature 1: History ===
  type HistoryEntry = { age: number; sex: string; bmi: number; children: number; smoker: string; region: string; prediction: number; date: string; };
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history from localStorage only on client
  useEffect(() => {
    try {
      const stored = localStorage.getItem("hg_history");
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }, []);

  // === Feature 5: Animated counter ===
  const [displayedPrediction, setDisplayedPrediction] = useState<number>(0);
  useEffect(() => {
    if (prediction === null) return;
    let start = 0;
    const end = prediction;
    const duration = 1200;
    const step = 16;
    const increment = (end / duration) * step;
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setDisplayedPrediction(end); clearInterval(timer); }
      else setDisplayedPrediction(start);
    }, step);
    return () => clearInterval(timer);
  }, [prediction]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    const content = chatInput;
    setMessages((prev) => [...prev, { role: "user", content }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "Ошибка" }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Ошибка соединения" }]);
    }
    setChatLoading(false);
  };

  const calculateForecast = async () => {
    setForecastLoading(true);
    setPrediction(null);
    setForecastError("");
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ age, sex, bmi, children, smoker, region }),
      });
      const data = await res.json();
      if (data.success) {
        setPrediction(data.prediction);
        // Feature 1: save to history
        const entry: HistoryEntry = { age, sex, bmi, children, smoker, region, prediction: data.prediction, date: new Date().toLocaleString("ru-RU") };
        setHistory(prev => {
          const updated = [entry, ...prev].slice(0, 10);
          localStorage.setItem("hg_history", JSON.stringify(updated));
          return updated;
        });
      } else setForecastError(data.error || "Ошибка расчета");
    } catch (e: any) {
      setForecastError("Ошибка соединения: " + e.message);
    }
    setForecastLoading(false);
  };

  // Feature 3: PDF export via html-to-image (fixes Cyrillic encoding and CSS issues)
  const pdfResultRef = useRef<HTMLDivElement>(null);
  const downloadPDF = async () => {
    if (!pdfResultRef.current) return;
    const { toPng } = await import("html-to-image");
    const { jsPDF } = await import("jspdf");

    const imgData = await toPng(pdfResultRef.current, {
      backgroundColor: "#050508",
      pixelRatio: 2,
    });

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Dark background
    doc.setFillColor(5, 5, 8);
    doc.rect(0, 0, 210, 297, "F");

    // Header text
    doc.setFont("helvetica", "bold");
    doc.setTextColor(165, 180, 252);
    doc.setFontSize(20);
    doc.text("HealthGuard AI - Report", 20, 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 180);
    doc.text(new Date().toLocaleString("ru-RU"), 20, 32);

    // Divider
    doc.setDrawColor(99, 102, 241);
    doc.line(20, 36, 190, 36);

    // Embed screenshot
    const el = pdfResultRef.current;
    const pageWidth = 210;
    const imgWidth = pageWidth - 40;
    const imgHeight = (el.offsetHeight / el.offsetWidth) * imgWidth;
    doc.addImage(imgData, "PNG", 20, 42, imgWidth, imgHeight);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 80);
    doc.text("(c) 2026 HealthGuard AI", 20, 287);

    doc.save("healthguard-report.pdf");
  };


  const isSmoker = smoker === "yes";
  const riskScore = (isSmoker ? 50 : 0) + (bmi > 30 ? 30 : 0) + (age > 50 ? 20 : 0);
  const riskLabel = riskScore < 40 ? "Низкий" : riskScore < 70 ? "Средний" : "Высокий";
  const riskColor = riskLabel === "Высокий" ? "#ef4444" : riskLabel === "Средний" ? "#f97316" : "#22c55e";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
        * { font-family: 'Space Grotesk', 'Inter', sans-serif; box-sizing: border-box; }
        body { margin: 0; background: #000; }

        .app-bg {
          min-height: 100vh;
          background: #050508;
          position: relative;
          overflow: hidden;
        }

        /* Grid background */
        .app-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(99,102,241,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.07) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
          z-index: 0;
        }

        .orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.18;
          pointer-events: none;
          animation: float 12s ease-in-out infinite;
        }
        .orb-1 { width: 700px; height: 700px; background: radial-gradient(circle, #6366f1, #4338ca); top: -300px; left: -250px; animation-delay: 0s; }
        .orb-2 { width: 600px; height: 600px; background: radial-gradient(circle, #a855f7, #7c3aed); bottom: -200px; right: -200px; animation-delay: 4s; }
        .orb-3 { width: 350px; height: 350px; background: radial-gradient(circle, #06b6d4, #0891b2); top: 35%; left: 35%; animation-delay: 8s; }
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -40px) scale(1.08); }
        }

        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          border-radius: 28px;
          box-shadow: 0 0 0 1px rgba(99,102,241,0.05), 0 32px 64px rgba(0,0,0,0.6);
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 100px;
          padding: 8px 20px;
          font-size: 13px;
          color: #a5b4fc;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .hero-badge .dot {
          width: 7px; height: 7px;
          background: #818cf8;
          border-radius: 50%;
          box-shadow: 0 0 10px #818cf8, 0 0 20px #6366f1;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }

        /* GRADIENT TITLE */
        .gradient-title {
          background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 30%, #a5b4fc 60%, #818cf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-size: clamp(48px, 8vw, 90px);
          font-weight: 800;
          line-height: 1.0;
          letter-spacing: -4px;
        }

        /* TABS */
        .cool-tabs [role="tablist"] {
          background: rgba(255,255,255,0.03) !important;
          border: 1px solid rgba(255,255,255,0.07) !important;
          border-radius: 100px !important;
          padding: 6px !important;
        }
        .cool-tabs [role="tab"] {
          border-radius: 100px !important;
          color: rgba(255,255,255,0.4) !important;
          font-size: 15px !important;
          font-weight: 600 !important;
          letter-spacing: 0.3px !important;
          transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }
        .cool-tabs [role="tab"][data-state="active"] {
          background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
          color: white !important;
          box-shadow: 0 4px 24px rgba(79, 70, 229, 0.55), 0 0 0 1px rgba(139,92,246,0.2) !important;
        }

        /* FORM FIELDS */
        .field-label {
          color: rgba(255,255,255,0.35);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 10px;
          display: block;
        }

        /* COOL NATIVE INPUT */
        input[type=number] {
          -moz-appearance: textfield;
        }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        /* SELECT */
        .cool-select [data-radix-select-trigger]{
          background: rgba(255,255,255,0.05) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: white !important;
          border-radius: 14px !important;
          height: 52px !important;
        }
        
        /* RESULT CARD */
        .result-card {
          background: linear-gradient(145deg, rgba(79,70,229,0.12), rgba(109,40,217,0.07));
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 22px;
          padding: 28px;
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }
        .result-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .result-value {
          font-size: 54px;
          font-weight: 800;
          background: linear-gradient(135deg, #ffffff 20%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
          letter-spacing: -2px;
        }

        /* PRIMARY BUTTON */
        .cta-btn {
          background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
          border: none !important;
          border-radius: 16px !important;
          height: 60px !important;
          font-size: 15px !important;
          font-weight: 700 !important;
          letter-spacing: 2px !important;
          text-transform: uppercase !important;
          box-shadow: 0 8px 40px rgba(79, 70, 229, 0.5), 0 0 0 1px rgba(139,92,246,0.15) !important;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
          position: relative !important;
          overflow: hidden !important;
        }
        .cta-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
          pointer-events: none;
        }
        .cta-btn:hover:not(:disabled) {
          transform: translateY(-3px) scale(1.01) !important;
          box-shadow: 0 16px 50px rgba(79, 70, 229, 0.7), 0 0 0 1px rgba(139,92,246,0.3) !important;
        }
        .cta-btn:active:not(:disabled) {
          transform: translateY(0) !important;
        }
        .cta-btn:disabled { opacity: 0.4 !important; }

        /* CHAT BUBBLES */
        .chat-user {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          border-radius: 22px 22px 4px 22px;
          padding: 15px 22px;
          color: white;
          font-size: 15px;
          line-height: 1.65;
          max-width: 78%;
          box-shadow: 0 6px 28px rgba(79,70,229,0.45);
        }
        .chat-ai {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 22px 22px 22px 4px;
          padding: 15px 22px;
          color: rgba(255,255,255,0.82);
          font-size: 15px;
          line-height: 1.65;
          max-width: 78%;
        }

        /* SEND BUTTON */
        .send-btn {
          background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
          border-radius: 14px !important;
          width: 52px !important;
          height: 52px !important;
          padding: 0 !important;
          flex-shrink: 0 !important;
          box-shadow: 0 4px 24px rgba(79,70,229,0.55) !important;
          transition: all 0.2s ease !important;
        }
        .send-btn:hover:not(:disabled) {
          transform: scale(1.08) !important;
          box-shadow: 0 6px 30px rgba(79,70,229,0.7) !important;
        }
        .send-btn:disabled { opacity: 0.4 !important; }

        /* CHAT INPUT AREA */
        .chat-input-wrap {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 10px 10px 10px 18px;
          display: flex;
          gap: 10px;
          align-items: center;
          transition: border-color 0.2s;
        }
        .chat-input-wrap:focus-within {
          border-color: rgba(99,102,241,0.4);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
        }

        /* RADIO GROUP */
        .radio-option {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          color: rgba(255,255,255,0.5);
          font-size: 15px;
          transition: color 0.2s;
        }
        .radio-option:hover { color: rgba(255,255,255,0.9); }

        /* MARKDOWN PROSE inside chat bubbles */
        .chat-ai p { margin: 0 0 8px 0; }
        .chat-ai p:last-child { margin-bottom: 0; }
        .chat-ai strong { color: #c4c4ff; font-weight: 700; }
        .chat-ai ol, .chat-ai ul {
          margin: 8px 0;
          padding-left: 22px;
        }
        .chat-ai li {
          margin-bottom: 6px;
          line-height: 1.6;
        }
        .chat-ai li::marker { color: rgba(165,180,252,0.7); }
        .chat-ai h1,.chat-ai h2,.chat-ai h3 {
          color: white;
          font-weight: 700;
          margin: 12px 0 6px 0;
        }
        .chat-ai code {
          background: rgba(99,102,241,0.15);
          border-radius: 6px;
          padding: 2px 6px;
          font-size: 13px;
          font-family: monospace;
          color: #a5b4fc;
        }

        /* NEON SECTION DIVIDER */
        .neon-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99,102,241,0.5), rgba(139,92,246,0.5), transparent);
          margin: 32px 0;
        }

        /* STAT PILL */
        .stat-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 100px;
          padding: 4px 12px;
          font-size: 12px;
          color: #a5b4fc;
          font-weight: 600;
        }

        /* CUSTOM SCROLLBAR */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #6366f1, #8b5cf6);
          border-radius: 100px;
          border: none;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #818cf8, #a78bfa);
        }
        ::-webkit-scrollbar-corner {
          background: transparent;
        }
        * {
          scrollbar-width: thin;
          scrollbar-color: #6366f1 transparent;
        }
      `}</style>

      <div className="app-bg">
        {/* Background orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        {/* TOP NAVBAR */}
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(5,5,8,0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          padding: "0 32px",
          height: 64,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="logo" style={{ width: 36, height: 36, objectFit: "contain", filter: "brightness(0) invert(1) drop-shadow(0 0 8px rgba(99,102,241,0.8))" }} />
            <span style={{ color: "white", fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px" }}>HealthGuard</span>
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "100px 20px 80px" }}>


          {/* HERO HEADER */}
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ marginBottom: 20 }}>
              <span className="hero-badge">
                <span className="dot" />
                AI-powered • Real-time • Secure
              </span>
            </div>
            <h1 className="gradient-title">HealthGuard AI</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 18, marginTop: 16, maxWidth: 520, margin: "16px auto 0", lineHeight: 1.7 }}>
              Интеллектуальная платформа оценки медицинских рисков нового поколения
            </p>
          </div>

          {/* TABS */}
          <Tabs defaultValue="forecast" className="cool-tabs">
            <TabsList style={{ width: "100%", maxWidth: 440, margin: "0 auto 48px", display: "flex" }}>
              <TabsTrigger value="forecast" style={{ flex: 1, padding: "12px 0" }}>📊 Прогноз премии</TabsTrigger>
              <TabsTrigger value="chat" style={{ flex: 1, padding: "12px 0" }}>🤖 ИИ-Консультант</TabsTrigger>
            </TabsList>

            {/* FORECAST TAB */}
            <TabsContent value="forecast">
              <div className="glass-panel" style={{ padding: 40 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <h2 style={{ color: "white", fontSize: 24, fontWeight: 800, marginBottom: 6, marginTop: 0, letterSpacing: "-0.5px" }}>Анкета рисков</h2>
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, margin: 0 }}>Заполните форму для персонализированного прогноза</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {history.length > 0 && (
                      <button onClick={() => setShowHistory(v => !v)} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 100, padding: "6px 14px", color: "#a5b4fc", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                        📂 История ({history.length})
                      </button>
                    )}
                    <span className="stat-pill">🧬 ML-модель</span>
                  </div>
                </div>



                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

                  <div>
                    <label className="field-label">Возраст</label>
                    <input
                      type="number" min={18} max={100} value={age}
                      onChange={(e) => setAge(Number(e.target.value))}
                      className="cool-input"
                      style={{ width: "100%", padding: "0 16px", outline: "none", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", borderRadius: 14, height: 52, fontSize: 16 }}
                    />
                  </div>

                  <div>
                    <label className="field-label">Пол</label>
                    <Select value={sex} onValueChange={setSex}>
                      <SelectTrigger style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", borderRadius: 14, height: 52, fontSize: 16 }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ background: "#1e1b4b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "white" }}>
                        <SelectItem value="male" style={{ color: "white" }}>Мужской</SelectItem>
                        <SelectItem value="female" style={{ color: "white" }}>Женский</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="field-label">Индекс массы тела (BMI)</label>
                    <input
                      type="number" step="0.1" value={bmi}
                      onChange={(e) => setBmi(Number(e.target.value))}
                      style={{ width: "100%", padding: "0 16px", outline: "none", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", borderRadius: 14, height: 52, fontSize: 16 }}
                    />
                  </div>

                  <div>
                    <label className="field-label">Количество детей</label>
                    <input
                      type="number" min={0} max={10} value={children}
                      onChange={(e) => setChildren(Number(e.target.value))}
                      style={{ width: "100%", padding: "0 16px", outline: "none", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", borderRadius: 14, height: 52, fontSize: 16 }}
                    />
                  </div>

                  <div>
                    <label className="field-label">Статус курения</label>
                    <RadioGroup value={smoker} onValueChange={setSmoker} style={{ display: "flex", gap: 24, marginTop: 8 }}>
                      <label className="radio-option">
                        <RadioGroupItem value="no" id="s-no" />
                        <span>Не курю</span>
                      </label>
                      <label className="radio-option" style={{ color: smoker === "yes" ? "#ef4444" : undefined }}>
                        <RadioGroupItem value="yes" id="s-yes" />
                        <span>Курю</span>
                      </label>
                    </RadioGroup>
                  </div>

                  <div>
                    <label className="field-label">Регион</label>
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", borderRadius: 14, height: 52, fontSize: 16 }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ background: "#1e1b4b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "white" }}>
                        <SelectItem value="southwest" style={{ color: "white" }}>Юго-Запад</SelectItem>
                        <SelectItem value="southeast" style={{ color: "white" }}>Юго-Восток</SelectItem>
                        <SelectItem value="northwest" style={{ color: "white" }}>Северо-Запад</SelectItem>
                        <SelectItem value="northeast" style={{ color: "white" }}>Северо-Восток</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                </div>

                {forecastError && (
                  <div style={{ marginTop: 24, padding: "12px 18px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, color: "#fca5a5", fontSize: 14 }}>
                    {forecastError}
                  </div>
                )}

                <button
                  onClick={calculateForecast}
                  disabled={forecastLoading}
                  className="cta-btn"
                  style={{ width: "100%", marginTop: 32, cursor: forecastLoading ? "not-allowed" : "pointer" }}
                >
                  {forecastLoading ? "⚡ ВЫЧИСЛЯЮ..." : "⚡ РАССЧИТАТЬ РИСКИ"}
                </button>

                {prediction !== null && (
                  <div ref={pdfResultRef} style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: 20, background: "#050508", borderRadius: 20 }}>
                    {/* Feature 5: Animated counter */}
                    <div className="result-card">
                      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600, marginBottom: 12 }}>Страховая Премия</div>
                      <div className="result-value">
                        ${displayedPrediction.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 8 }}>в год</div>
                    </div>

                    {/* Feature 10: Health scale */}
                    <div className="result-card">
                      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600, marginBottom: 14 }}>Шкала риска</div>
                      <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
                        {[0, 1, 2, 3, 4].map(i => {
                          const filled = i < Math.ceil(riskScore / 20);
                          const color = riskScore < 40 ? "#22c55e" : riskScore < 70 ? "#f97316" : "#ef4444";
                          return <div key={i} style={{ flex: 1, height: 12, borderRadius: 99, background: filled ? color : "rgba(255,255,255,0.07)", boxShadow: filled ? `0 0 8px ${color}88` : "none", transition: "all 0.5s ease" }} />;
                        })}
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: riskColor, lineHeight: 1 }}>{riskLabel}</div>
                      <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, marginTop: 6 }}>{riskScore}/100 баллов</div>
                    </div>

                    {isSmoker && (
                      <div style={{ gridColumn: "1 / -1", padding: "14px 18px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, color: "#fca5a5", fontSize: 14, display: "flex", alignItems: "center", gap: 10 }}>
                        🚬 Курение — наиболее критический фактор. Отказ от курения может снизить премию на 30–50%.
                      </div>
                    )}
                    {(() => {
                        const baseFactor = 3000;
                        const ageFactor = age * 50;
                        const smokerFactor = isSmoker ? 12000 : 0;
                        const bmiFactor = bmi > 25 ? (bmi - 25) * 150 : 0;
                        const childrenFactor = children * 200;
                        const totalMock = baseFactor + ageFactor + smokerFactor + bmiFactor + childrenFactor;

                        const baseAmt = prediction * (baseFactor / totalMock);
                        const ageAmt = prediction * (ageFactor / totalMock);
                        const smokerAmt = prediction * (smokerFactor / totalMock);
                        const bmiAmt = prediction * (bmiFactor / totalMock);
                        const childrenAmt = prediction * (childrenFactor / totalMock);

                        return (
                          <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 20, marginTop: 10 }}>
                            {/* Feature: Analytics Breakdown */}
                            <div className="glass-panel" style={{ padding: 24 }}>
                              <h3 style={{ margin: "0 0 16px 0", color: "white", fontSize: 18 }}>Детальная аналитика (Факторы риска)</h3>
                              <div style={{ display: "flex", gap: 2, height: 24, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
                                 <div style={{ width: `${(baseAmt/prediction)*100}%`, background: "#4f46e5" }} title="База" />
                                 <div style={{ width: `${(ageAmt/prediction)*100}%`, background: "#7c3aed" }} title="Возраст" />
                                 {smokerAmt > 0 && <div style={{ width: `${(smokerAmt/prediction)*100}%`, background: "#ef4444" }} title="Курение" />}
                                 {bmiAmt > 0 && <div style={{ width: `${(bmiAmt/prediction)*100}%`, background: "#f97316" }} title="ИМТ" />}
                                 {childrenAmt > 0 && <div style={{ width: `${(childrenAmt/prediction)*100}%`, background: "#06b6d4" }} title="Дети" />}
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                                 <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "#4f46e5" }}/>База: ${baseAmt.toFixed(0)}</div>
                                 <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "#7c3aed" }}/>Возраст: ${ageAmt.toFixed(0)}</div>
                                 {smokerAmt > 0 && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "#ef4444" }}/>Курение: ${smokerAmt.toFixed(0)}</div>}
                                 {bmiAmt > 0 && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "#f97316" }}/>ИМТ: ${bmiAmt.toFixed(0)}</div>}
                                 {childrenAmt > 0 && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "#06b6d4" }}/>Дети: ${childrenAmt.toFixed(0)}</div>}
                              </div>
                            </div>

                            {/* Feature: What If Simulator */}
                            {(isSmoker || bmi > 25) && (
                              <div className="glass-panel" style={{ padding: 24 }}>
                                <h3 style={{ margin: "0 0 16px 0", color: "white", fontSize: 18 }}>💡 Рекомендации по снижению стоимости</h3>
                                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 16, marginTop: 0 }}>Улучшение этих показателей здоровья поможет вам существенно сэкономить на полисе.</p>
                                
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                  {isSmoker && (
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(34,197,94,0.1)", borderRadius: 12, border: "1px solid rgba(34,197,94,0.2)" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div style={{ fontSize: 24 }}>🚭</div>
                                        <div>
                                          <div style={{ color: "#4ade80", fontWeight: 600 }}>Бросить курить</div>
                                          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Радикальное снижение риска</div>
                                        </div>
                                      </div>
                                      <div style={{ color: "#22c55e", fontWeight: 700, fontSize: 16 }}>
                                        Выгода ~${smokerAmt.toFixed(0)}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {bmi > 25 && (
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(14,165,233,0.1)", borderRadius: 12, border: "1px solid rgba(14,165,233,0.2)" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div style={{ fontSize: 24 }}>🥗</div>
                                        <div>
                                          <div style={{ color: "#38bdf8", fontWeight: 600 }}>Снизить ИМТ до нормы</div>
                                          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Полезно для сердца и бюджета</div>
                                        </div>
                                      </div>
                                      <div style={{ color: "#0ea5e9", fontWeight: 700, fontSize: 16 }}>
                                        Выгода ~${bmiAmt.toFixed(0)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Feature 3: PDF download */}
                            <div>
                              <button onClick={downloadPDF} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 12, padding: "12px 24px", color: "#a5b4fc", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}
                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.25)"; e.currentTarget.style.color = "white"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "rgba(99,102,241,0.12)"; e.currentTarget.style.color = "#a5b4fc"; }}
                              >
                                📄 Скачать подробный PDF-отчёт
                              </button>
                            </div>
                          </div>
                        );
                    })()}
                  </div>
                )}

                {/* Feature 1: History panel */}
                {showHistory && history.length > 0 && (
                  <div style={{ marginTop: 28 }}>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600, marginBottom: 12 }}>Предыдущие расчёты</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {history.map((h, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{h.date}</div>
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>• {h.age}л, {h.smoker === "yes" ? "🚬" : ""} {h.region}</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#a5b4fc" }}>${h.prediction.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* CHAT TAB */}
            <TabsContent value="chat">
              <div className="glass-panel" style={{ display: "flex", flexDirection: "column", height: 680 }}>
                {/* Chat header */}
                <div style={{ padding: "28px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 4px 20px rgba(99,102,241,0.5)" }}>
                    🤖
                  </div>
                  <div>
                    <div style={{ color: "white", fontWeight: 700, fontSize: 17 }}>ИИ-Консультант</div>
                    <div style={{ color: "#6366f1", fontSize: 13, display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#6366f1", boxShadow: "0 0 6px #6366f1", animation: "pulse 2s infinite" }} />
                      Онлайн · Консультант AI
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
                  {messages.length === 0 && (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, textAlign: "center" }}>
                      <div style={{ fontSize: 64 }}>🔮</div>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>Задайте любой вопрос</div>
                        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.25)" }}>о здоровье, рисках или страховании</div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 520 }}>
                        {[
                          "Как снизить страховую премию?",
                          "Что такое ИМТ и норма?",
                          "Как курение влияет на здоровье?",
                          "Какие риски у людей после 50?",
                          "Как улучшить показатели здоровья?",
                          "Что включает страховка?",
                        ].map((q) => (
                          <button
                            key={q}
                            onClick={() => { setChatInput(q); setTimeout(() => { const el = document.getElementById('chat-input'); el?.focus(); }, 50); }}
                            style={{
                              background: "rgba(99,102,241,0.08)",
                              border: "1px solid rgba(99,102,241,0.2)",
                              borderRadius: 100,
                              padding: "8px 16px",
                              color: "rgba(165,180,252,0.85)",
                              fontSize: 13,
                              fontWeight: 500,
                              cursor: "pointer",
                              transition: "all 0.2s",
                              fontFamily: "inherit",
                            }}
                            onMouseEnter={e => {
                              (e.target as HTMLButtonElement).style.background = "rgba(99,102,241,0.2)";
                              (e.target as HTMLButtonElement).style.borderColor = "rgba(99,102,241,0.5)";
                              (e.target as HTMLButtonElement).style.color = "white";
                            }}
                            onMouseLeave={e => {
                              (e.target as HTMLButtonElement).style.background = "rgba(99,102,241,0.08)";
                              (e.target as HTMLButtonElement).style.borderColor = "rgba(99,102,241,0.2)";
                              (e.target as HTMLButtonElement).style.color = "rgba(165,180,252,0.85)";
                            }}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                      <div className={msg.role === "user" ? "chat-user" : "chat-ai"}>
                        {msg.role === "user" ? (
                          msg.content
                        ) : (
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        )}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                      <div className="chat-ai" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {[0, 1, 2].map((i) => (
                          <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.4)", animation: `pulse 1.4s ${i * 0.2}s infinite` }} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{ padding: "20px 28px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
                  <div className="chat-input-wrap">
                    <input
                      id="chat-input"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Введите ваш вопрос..."
                      style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "white", fontSize: 15, padding: "4px 8px", alignSelf: "center" }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={chatLoading || !chatInput.trim()}
                      className="send-btn"
                      style={{ cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer", opacity: chatLoading || !chatInput.trim() ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" style={{ width: 20, height: 20 }}>
                        <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div style={{ textAlign: "center", marginTop: 60 }}>

            {/* Contact toggle button */}
            <button
              onClick={() => setContactOpen((v) => !v)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: contactOpen ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.3)",
                borderRadius: 100, padding: "10px 24px",
                color: "#a5b4fc", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.2s ease",
                marginBottom: 24,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.22)"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.background = contactOpen ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.08)"; e.currentTarget.style.color = "#a5b4fc"; }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15 }}>
                <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
              </svg>
              Связаться с нами
              <span style={{ fontSize: 11, opacity: 0.6, transform: contactOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s", display: "inline-block" }}>▼</span>
            </button>

            {/* Contact cards */}
            {contactOpen && (
              <div style={{
                display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap",
                marginBottom: 32,
                animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
              }}>
                {[
                  { name: "Глеб", role: "ML-разработчик", emoji: "👨‍💻", color: "#6366f1" },
                  { name: "Егор", role: "ML-разработчик", emoji: "🧠", color: "#8b5cf6" },
                  { name: "Павел", role: "Специалист в области КАЧКИ", emoji: "🩺", color: "#06b6d4" },
                ].map((person) => (
                  <div key={person.name} style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 20, padding: "24px 32px",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                    minWidth: 180,
                    boxShadow: `0 0 30px ${person.color}22`,
                  }}>
                    <div style={{ fontSize: 40, width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${person.color}33, ${person.color}11)`, border: `1px solid ${person.color}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {person.emoji}
                    </div>
                    <div style={{ color: "white", fontWeight: 700, fontSize: 18 }}>{person.name}</div>
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>{person.role}</div>
                    <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <a href="https://t.me/" target="_blank" rel="noreferrer" style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: `${person.color}22`,
                        border: `1px solid ${person.color}44`,
                        borderRadius: 100, padding: "6px 14px",
                        color: "#a5b4fc", fontSize: 13, fontWeight: 600, textDecoration: "none",
                        transition: "all 0.2s",
                      }}>
                        ✈️ Telegram
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ color: "rgba(255,255,255,0.12)", fontSize: 13 }}>
              © 2026 HealthGuard AI · Все права защищены
            </div>
          </div>
        </div>
      </div>
    </>
  );
}