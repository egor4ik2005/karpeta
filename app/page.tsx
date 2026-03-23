"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user" as const, content: input };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: input }),
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      { role: "assistant" as const, content: data.reply },
    ]);

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      
      {/* ЧАТ */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-xl p-4 rounded-2xl ${
              msg.role === "user"
                ? "bg-gray-400 ml-auto text-white"
                : "bg-gray-800 mr-auto text-white"
            }`}
          >
            {msg.content}
          </div>
        ))}

        {loading && (
          <div className="bg-zinc-800 p-4 rounded-2xl w-fit">
            Думаю...
          </div>
        )}
      </div>

      {/* INPUT */}
      <div className=" p-4 flex gap-2">
        <Input           
        className="flex-1 p-5 rounded-full bg-white shadow-md border-2 outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Напиши сообщение..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}/>
      </div>
    </div>
  );
}