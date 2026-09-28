# DisasterIntel Evaluation & Verification Methodology

## 1. Meteorological Verification Metrics

Forecast accuracy is evaluated using standardized World Meteorological Organization (WMO) verification metrics:

### Mean Absolute Error (MAE)
$$\text{MAE} = \frac{1}{N} \sum_{i=1}^N |y_i - \hat{y}_i|$$

### Root Mean Squared Error (RMSE)
$$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N (y_i - \hat{y}_i)^2}$$

### Mean Bias Error (MBE)
$$\text{Bias} = \frac{1}{N} \sum_{i=1}^N (\hat{y}_i - y_i)$$
- Positive value: Model systematically over-predicts.
- Negative value: Model systematically under-predicts.

### Meteorological Skill Score (SS)
Relative improvement over the equal-weight ensemble baseline:
$$\text{SS} = 1 - \frac{\text{RMSE}_{\text{AI Blend}}}{\text{RMSE}_{\text{Baseline}}}$$

## 2. Leakage-Free Validation Strategy
All model training and evaluations strictly adhere to chronological splits:
- **Training Set (70%):** Past contiguous historical records.
- **Validation Set (15%):** Contiguous intermediate window for hyperparameter tuning.
- **Test Set (15%):** Completely held-out recent period.
No future observation or forecast information is ever exposed to training procedures.
