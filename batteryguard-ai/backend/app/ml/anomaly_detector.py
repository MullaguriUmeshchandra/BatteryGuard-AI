import numpy as np
from typing import Dict, Any, List
try:
    from sklearn.ensemble import IsolationForest
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

class ExperimentalMLDetector:
    """
    Experimental Machine Learning Anomaly Detection Module using Isolation Forest.
    Analyzes multi-dimensional features (Sag %, Temp Delta, Voltage Std, IR).
    NOTE: Designed for exploratory multi-variate outlier screening alongside deterministic rules.
    """

    _model = None

    @classmethod
    def _initialize_model(cls):
        if not SKLEARN_AVAILABLE:
            return
        # Train baseline IsolationForest on nominal operational boundaries
        # Features: [voltage_sag_percent, temp_change_c, internal_resistance_m_ohm, voltage_stability_std]
        # Generate nominal baseline sample cluster
        np.random.seed(42)
        n_samples = 150
        baseline_sag = np.random.normal(loc=4.5, scale=1.5, size=n_samples)
        baseline_temp = np.random.normal(loc=2.8, scale=0.8, size=n_samples)
        baseline_ir = np.random.normal(loc=45.0, scale=10.0, size=n_samples)
        baseline_std = np.random.normal(loc=0.08, scale=0.03, size=n_samples)

        X_train = np.column_stack([
            np.clip(baseline_sag, 0.5, 9.0),
            np.clip(baseline_temp, 0.5, 6.0),
            np.clip(baseline_ir, 20.0, 90.0),
            np.clip(baseline_std, 0.01, 0.25)
        ])

        cls._model = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            random_state=42
        )
        cls._model.fit(X_train)

    @classmethod
    def evaluate(
        cls,
        voltage_sag_percent: float,
        temp_change_c: float,
        internal_resistance_m_ohm: float,
        voltage_stability_std: float
    ) -> Dict[str, Any]:
        """
        Evaluate single test session metrics using the trained Isolation Forest model.
        Returns:
          - ml_anomaly_score: float (-1.0 to 1.0, lower means more anomalous)
          - ml_is_anomaly: bool
          - experimental_note: clarification that ML is assistive and non-definitive
        """
        if not SKLEARN_AVAILABLE:
            return {
                "ml_anomaly_score": 0.5,
                "ml_is_anomaly": False,
                "status": "scikit-learn not available"
            }

        if cls._model is None:
            cls._initialize_model()

        try:
            features = np.array([[
                float(voltage_sag_percent),
                float(temp_change_c),
                float(internal_resistance_m_ohm),
                float(voltage_stability_std)
            ]])
            # decision_function gives anomaly score (positive = normal, negative = anomaly)
            score = float(cls._model.decision_function(features)[0])
            prediction = int(cls._model.predict(features)[0])
            is_anomaly = bool(prediction == -1)

            return {
                "ml_anomaly_score": round(score, 4),
                "ml_is_anomaly": is_anomaly,
                "model_type": "Isolation Forest (Unsupervised)",
                "note": "Experimental ML outlier detection; secondary to deterministic physics rules."
            }
        except Exception as e:
            return {
                "ml_anomaly_score": 0.0,
                "ml_is_anomaly": False,
                "error": str(e)
            }
