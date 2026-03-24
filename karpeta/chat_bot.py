import streamlit as st
import requests

def medical_ai_consultant():
    st.markdown("### ИИ-консультант HealthGuard")
    st.caption("Задайте вопрос нашему ИИ о здоровье и рисках.")

    # Инициализация истории сообщений в session_state
    if "messages" not in st.session_state:
        st.session_state.messages = []

    # Отображение истории сообщений
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    # Ввод нового сообщения
    if prompt := st.chat_input("Напишите ваш вопрос..."):
        # Добавляем сообщение пользователя в историю
        st.session_state.messages.append({"role": "user", "content": prompt})
        
        with st.chat_message("user"):
            st.markdown(prompt)

        # Отправляем запрос к Next.js API
        with st.chat_message("assistant"):
            with st.spinner("Анализирую..."):
                try:
                    # Обращаемся к запущенному рядом Next.js серверу
                    # Убедитесь, что Next.js запущен на порту 3000
                    response = requests.post(
                        "http://localhost:3000/api/chat",
                        json={"message": prompt},
                        timeout=30
                    )
                    
                    if response.ok:
                        data = response.json()
                        reply = data.get("reply", "Ошибка: Пустой ответ от сервера")
                    else:
                        reply = f"Ошибка API: {response.status_code} {response.text}"
                except requests.exceptions.ConnectionError:
                    reply = "⚠️ Не удалось подключиться к серверу бота. Убедитесь, что Next.js (`npm run dev`) запущен."
                except Exception as e:
                    reply = f"Внутренняя ошибка: {e}"

                # Отображаем и сохраняем ответ
                st.markdown(reply)
                st.session_state.messages.append({"role": "assistant", "content": reply})
