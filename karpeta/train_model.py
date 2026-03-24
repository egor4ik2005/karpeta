import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

def train_and_save_model(data_path='insurance.csv', model_path='insurance_pipeline.pkl'):
    try:
        logging.info("Загрузка данных...")
        df = pd.read_csv(data_path)
    except FileNotFoundError:
        logging.error(f"Файл {data_path} не найден.")
        return

    X = df.drop('charges', axis=1)
    y = df['charges']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Определение признаков
    numeric_features = ['age', 'bmi', 'children']
    categorical_features = ['sex', 'smoker', 'region']

    # Создание препроцессора
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ])

    # Создание конвейера
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42))
    ])

    logging.info("Обучение конвейера...")
    pipeline.fit(X_train, y_train)

    # Оценка
    predictions = pipeline.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    
    logging.info(f"Точность (R2): {r2:.2f}")
    logging.info(f"Средняя ошибка (MAE): ±${mae:.2f}")

    # --- НОВОЕ: Извлечение названий признаков после кодирования ---
    # Получаем имена числовых признаков
    num_names = numeric_features
    # Получаем имена категориальных признаков после OneHotEncoder
    cat_names = pipeline.named_steps['preprocessor'].named_transformers_['cat'].get_feature_names_out(categorical_features)
    # Объединяем все имена
    feature_names = np.r_[num_names, cat_names]
    # Получаем важность признаков из модели
    feature_importances = pipeline.named_steps['regressor'].feature_importances_

    # Сохраняем расширенный набор данных
    model_data = {
        'pipeline': pipeline,
        'mae': mae,
        'r2': r2,
        'feature_names': feature_names,
        'feature_importances': feature_importances
    }

    joblib.dump(model_data, model_path)
    logging.info(f"Система сохранена: {model_path}")

if __name__ == "__main__":
    train_and_save_model()