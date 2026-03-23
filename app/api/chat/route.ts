import { NextResponse } from "next/server";
import crypto from "crypto";

// Отключаем строгую проверку SSL (необходимо для сертификатов Минцифры в Node.js)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

let accessToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt - 60000) {
    return accessToken;
  }

  const rqUid = crypto.randomUUID();
  
  // Создаем Base64 из ID и Secret
  const authCredentials = `${process.env.GIGACHAT_CLIENT_ID}:${process.env.GIGACHAT_CLIENT_SECRET}`;
  const authHeader = "Basic " + Buffer.from(authCredentials).toString("base64");

  // Используем URLSearchParams для корректной кодировки body
  const body = new URLSearchParams();
  body.append("scope", "GIGACHAT_API_PERS");

  const res = await fetch("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "RqUID": rqUid,
      "Authorization": authHeader,
    },
    body: body.toString(),
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    // ВАЖНО: посмотри в терминал, здесь будет причина (например, ошибка в секрете)
    console.error("GigaChat OAuth Full Error:", JSON.stringify(data, null, 2));
    throw new Error(`GigaChat Auth Failed: ${data.error_description || res.statusText}`);
  }

  accessToken = data.access_token;
  tokenExpiresAt = data.expires_at;

  return accessToken;
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { reply: "Сообщение не может быть пустым" },
        { status: 400 }
      );
    }

    const token = await getAccessToken();

    const response = await fetch(
      "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "GigaChat",
          messages: [
            {
              role: "system",
              content: "Ты ИИ-консультант по рискам здоровья. Давай понятные и краткие советы.",
            },
            {
              role: "user",
              content: message,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("GigaChat completion error:", data);
      return NextResponse.json(
        { reply: "Ошибка API GigaChat: " + JSON.stringify(data) },
        { status: response.status }
      );
    }

    return NextResponse.json({
      reply: data.choices?.[0]?.message?.content || "Нет ответа",
    });

  } catch (err: any) {
    console.error("Server error:", err);
    return NextResponse.json(
      { reply: "Внутренняя ошибка сервера: " + err.message },
      { status: 500 }
    );
  }
}