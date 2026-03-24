import pandas as pd
import numpy as np

# Устанавливаем зерно для воспроизводимости
np.random.seed(42)
n_samples = 1338

data = {
    'age': np.random.randint(18, 65, n_samples),
    'sex': np.random.choice(['male', 'female'], n_samples),
    'bmi': np.random.uniform(16, 50, n_samples).round(1),
    'children': np.random.randint(0, 6, n_samples),
    'smoker': np.random.choice(['yes', 'no'], n_samples, p=[0.2, 0.8]),
    'region': np.random.choice(['southwest', 'southeast', 'northwest', 'northeast'], n_samples)
}

df = pd.DataFrame(data)

# Создаем формулу для генерации стоимости (charges)
# Базовая ставка + влияние возраста + сильное влияние курения + влияние BMI
base_charge = 5000
df['charges'] = (
    base_charge + 
    (df['age'] * 250) + 
    (df['bmi'] * 150) + 
    (df['smoker'].apply(lambda x: 20000 if x == 'yes' else 0)) +
    (df['children'] * 500) +
    np.random.normal(0, 1000, n_samples) # Добавляем немного случайного шума
).round(2)

# Сохраняем в CSV
df.to_csv('insurance.csv', index=False)
print("Файл insurance.csv успешно создан!")