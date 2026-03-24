import sys
import json
import joblib
import pandas as pd
import os

def main():
    try:
        # Read JSON directly from standard input
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        
        # Load the ML pipeline
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, 'insurance_pipeline.pkl')
        
        system_data = joblib.load(model_path)
        pipeline = system_data['pipeline']
        
        # Create a DataFrame for the prediction
        df = pd.DataFrame([data])
        
        # Predict
        prediction = pipeline.predict(df)[0]
        
        # Output as JSON
        print(json.dumps({"success": True, "prediction": float(prediction)}))
        
    except Exception as e:
        # Avoid printing python errors directly to stdout if it breaks JSON parsing in node
        # But we can print a JSON error
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
