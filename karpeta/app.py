import streamlit as st
import pandas as pd
import joblib

# 1. Конфигурация страницы для минимализма
st.set_page_config(
    page_title="HealthGuard AI",
    page_icon="🛡️",
    layout="centered",
    initial_sidebar_state="collapsed"
)

# 2. Кастомный CSS для минималистичного дизайна
st.markdown("""
    <style>
    /* Прячем дефолтное меню сверху справа */
    #MainMenu {visibility: hidden;}
    header {visibility: hidden;}
    footer {visibility: hidden;}

    /* Чистые стили для табов */
    .stTabs [data-baseweb="tab-list"] {
        gap: 30px;
        border-bottom: 1px solid #e0e0e0;
    }
    .stTabs [data-baseweb="tab"] {
        height: 50px;
        white-space: pre-wrap;
        background-color: transparent;
        border-radius: 0;
        border: none;
        color: #666;
        font-weight: 400;
        font-size: 16px;
        padding-bottom: 10px;
    }
    .stTabs [aria-selected="true"] {
        border-bottom: 2px solid #000;
        color: #000;
        font-weight: 500;
    }
    
    /* Убираем тени и скругляем формы */
    .stMetric [data-testid="stMetricValue"] {
        font-size: 2.2rem;
        font-weight: 600;
        color: #111;
    }
    
    h1 {
        font-weight: 300;
        letter-spacing: -1px;
    }
    </style>
""", unsafe_allow_html=True)

# 3. Инициализация памяти (Session State)
if 'calculated' not in st.session_state:
    st.session_state.calculated = False
    st.session_state.prediction = 0.0
    st.session_state.input_df = None

# Загрузка модели
@st.cache_resource
def load_system():
    try:
        return joblib.load('insurance_pipeline.pkl')
    except:
        return None

system_data = load_system()
if system_data is None:
    st.error("Файл модели insurance_pipeline.pkl не найден.")
    st.stop()

pipeline = system_data['pipeline']

# Заголовок
st.title("HealthGuard")
st.markdown("Сервис оценки рисков здоровья и подбора страховой премии", help="Минималистичная версия")

# Создаем две вкладки
tab_forecast, tab_chat = st.tabs(["Прогноз премии", "ИИ-Консультант"])

# Вкладка 1: Прогноз
with tab_forecast:
    st.write("### Анкета Рисков")
    
    # Колонки для ввода данных
    col1, col2 = st.columns(2)
    
    with col1:
        age = st.number_input('Возраст', 18, 100, 30)
        sex = st.selectbox('Пол', ['Мужской', 'Женский'])
        bmi = st.number_input('Индекс массы тела (BMI)', 15.0, 60.0, 24.0, step=0.1)
        
    with col2:
        children = st.number_input('Количество детей', 0, 10, 0)
        smoker = st.radio('Статус курения', ['Не курю', 'Курю'])
        region = st.selectbox('Регион', ['southwest', 'southeast', 'northwest', 'northeast'])
    
    st.write("") # Отступ
    if st.button("РАССЧИТАТЬ ПРОГНОЗ", type="primary", use_container_width=True):
        st.session_state.input_df = pd.DataFrame([{
            'age': age, 
            'sex': 'male' if sex == 'Мужской' else 'female', 
            'bmi': bmi, 
            'children': children, 
            'smoker': 'yes' if smoker == 'Курю' else 'no', 
            'region': region
        }])
        st.session_state.prediction = pipeline.predict(st.session_state.input_df)[0]
        st.session_state.calculated = True

    # Результат
    if st.session_state.calculated:
        st.divider()
        st.write("### Результат прогноза")
        
        score_col1, score_col2 = st.columns(2)
        with score_col1:
            st.metric("Примерная премия", f"${st.session_state.prediction:,.2f}")
            
        with score_col2:
            is_smoker = smoker == 'Курю'
            risk_score = (50 if is_smoker else 0) + (30 if bmi > 30 else 0) + (20 if age > 50 else 0)
            risk_label = "Низкий" if risk_score < 40 else "Средний" if risk_score < 70 else "Высокий"
            st.metric("Оценка риска", risk_label)
            
        # Минималистичные подсказки
        if is_smoker:
            st.error("Курение является существенным фактором риска.")
        if bmi > 30:
            st.warning("Повышенный ИМТ. Рекомендуется консультация диетолога.")

# Вкладка 2: ИИ-чат
with tab_chat:
    try:
        from chat_bot import medical_ai_consultant
        medical_ai_consultant()
    except Exception as e:
        st.error(f"Не удалось загрузить чат-бота: {e}")