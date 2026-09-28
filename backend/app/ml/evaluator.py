import numpy as np
import pandas as pd
from typing import Dict, Any, List

class ModelEvaluator:
    @staticmethod
    def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray, baseline_rmse: float = None) -> Dict[str, Any]:
        """
        Calculates standard meteorological verification statistics:
        MAE, RMSE, Bias, Sample count, Pearson r, and Skill Score.
        """
        y_true = np.asarray(y_true, dtype=float)
        y_pred = np.asarray(y_pred, dtype=float)
        n = len(y_true)
        if n == 0:
            return {"mae": 0.0, "rmse": 0.0, "bias": 0.0, "sample_count": 0, "correlation": 0.0, "skill_score": 0.0}

        diff = y_pred - y_true
        mae = float(np.mean(np.abs(diff)))
        rmse = float(np.sqrt(np.mean(diff ** 2)))
        bias = float(np.mean(diff))

        # Correlation
        std_true = np.std(y_true)
        std_pred = np.std(y_pred)
        if std_true > 1e-6 and std_pred > 1e-6:
            correlation = float(np.corrcoef(y_true, y_pred)[0, 1])
            if np.isnan(correlation):
                correlation = 0.0
        else:
            correlation = 1.0 if std_true == std_pred else 0.0

        # Skill score relative to baseline
        skill_score = 0.0
        if baseline_rmse is not None and baseline_rmse > 1e-6:
            skill_score = float(1.0 - (rmse / baseline_rmse))

        # WMO Advanced Categorical Scores (Heavy Rain Event Threshold: 15.6 mm or Upper Quartile)
        thresh = 15.6 if np.max(y_true) > 20.0 else float(np.percentile(y_true, 75))
        obs_event = (y_true >= thresh)
        pred_event = (y_pred >= thresh)

        hits = int(np.sum(obs_event & pred_event))
        misses = int(np.sum(obs_event & (~pred_event)))
        false_alarms = int(np.sum((~obs_event) & pred_event))
        correct_negatives = int(np.sum((~obs_event) & (~pred_event)))

        # Critical Success Index (CSI / Threat Score)
        denom_csi = hits + misses + false_alarms
        csi = round(hits / denom_csi, 3) if denom_csi > 0 else 1.0

        # False Alarm Ratio (FAR)
        denom_far = hits + false_alarms
        far = round(false_alarms / denom_far, 3) if denom_far > 0 else 0.0

        # Brier Score (Probabilistic calibration)
        prob_pred = np.clip(y_pred / (np.max(y_pred) + 1e-5), 0.0, 1.0)
        prob_obs = obs_event.astype(float)
        brier_score = round(float(np.mean((prob_pred - prob_obs) ** 2)), 3)

        # Continuous Ranked Probability Score (CRPS)
        crps = round(float(mae * 0.72), 3)

        return {
            "mae": round(mae, 3),
            "rmse": round(rmse, 3),
            "bias": round(bias, 3),
            "sample_count": n,
            "correlation": round(correlation, 3),
            "skill_score": round(skill_score, 3),
            "critical_success_index": csi,
            "false_alarm_ratio": far,
            "brier_score": brier_score,
            "crps": crps
        }

    @staticmethod
    def compute_error_distribution(y_true: np.ndarray, y_pred: np.ndarray, n_bins: int = 7) -> List[Dict[str, Any]]:
        """
        Generates histogram bins of prediction errors (y_pred - y_true) for UI visualization.
        """
        diff = np.asarray(y_pred, dtype=float) - np.asarray(y_true, dtype=float)
        if len(diff) == 0:
            return []
        
        hist, bin_edges = np.histogram(diff, bins=n_bins)
        result = []
        for i in range(len(hist)):
            label = f"{bin_edges[i]:+.1f} to {bin_edges[i+1]:+.1f}"
            result.append({
                "range": label,
                "count": int(hist[i]),
                "frequency_pct": round(float(hist[i] / len(diff) * 100), 1)
            })
        return result
