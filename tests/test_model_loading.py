
from pathlib import Path
import sys
import warnings

import joblib
import sklearn

ROOT = Path(__file__).resolve().parents[1]

models = {
    "Parcel Review": ROOT / "models/parcel_review/logistic_regression_v2.joblib",
    "Query Router V4": ROOT / "models/query_router/landsure_feature_router_v4.joblib",
    "Safety Gate V2": ROOT / "models/safety_gate/landsure_safety_gate_v2.joblib",
}

def test_all_models_load_successfully():
    for name, path in models.items():
        assert path.exists(), f"Model file not found: {path}"
        model = joblib.load(path)
        assert model is not None, f"Failed to load model {name}"

if __name__ == "__main__":
    print("=" * 60)
    print("LANDSURE AI - MODEL LOADING TEST")
    print("=" * 60)
    print("Python:", sys.version.split()[0])
    print("Scikit-learn:", sklearn.__version__)
    print("Joblib:", joblib.__version__)

    passed = 0
    for name, path in models.items():
        print(f"\nTesting: {name}")
        if not path.exists():
            print("FAILED - File not found:", path)
            continue
        try:
            model = joblib.load(path)
            print("PASS - Model loaded")
            print("Model type:", type(model).__name__)
            passed += 1
        except Exception as error:
            print("FAILED:", type(error).__name__)
            print("Reason:", str(error)[:500])

    print("\n" + "=" * 60)
    print(f"RESULT: {passed}/{len(models)} models loaded")
    print("=" * 60)
    if passed != len(models):
        sys.exit(1)
