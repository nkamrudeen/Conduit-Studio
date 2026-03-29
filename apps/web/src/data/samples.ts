import type { PipelineDAG } from '@ai-ide/types'

// ─── ML SAMPLES ──────────────────────────────────────────────────────────────

/** 1. Iris Classification (Random Forest) */
export const mlIrisClassification: PipelineDAG = {
  id: 'sample-ml-iris',
  name: 'Iris Classification — Random Forest',
  pipeline: 'ml',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'ml.ingest.csv', position: { x: 60, y: 240 }, config: { file_path: 'iris.csv', separator: ',', encoding: 'utf-8', header: 0 }, status: 'idle' },
    { id: 'n2', definitionId: 'ml.transform.missing_values', position: { x: 300, y: 240 }, config: { strategy: 'drop_rows' }, status: 'idle' },
    { id: 'n3', definitionId: 'ml.transform.train_test_split', position: { x: 540, y: 240 }, config: { target_column: 'species', test_size: 0.2, random_state: 42, stratify: true }, status: 'idle' },
    { id: 'n4', definitionId: 'ml.train.sklearn.random_forest', position: { x: 800, y: 140 }, config: { target_column: 'species', task: 'classification', n_estimators: 100, max_depth: 0, random_state: 42 }, status: 'idle' },
    { id: 'n5', definitionId: 'ml.evaluate.classification', position: { x: 1060, y: 240 }, config: { target_column: 'species', output_report: true, plot_confusion_matrix: true }, status: 'idle' },
    { id: 'n6', definitionId: 'ml.deploy.mlflow', position: { x: 1320, y: 240 }, config: { experiment_name: 'iris-classification', model_name: 'iris-rf', mlflow_tracking_uri: 'http://localhost:5000' }, status: 'idle' },
    { id: 'n7', definitionId: 'ml.monitor.evidently_drift', position: { x: 1580, y: 240 }, config: { drift_share_threshold: 0.15, report_path: 'iris_drift.html' }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'df', target: 'n2', targetHandle: 'df_in' },
    { id: 'e2', source: 'n2', sourceHandle: 'df_out', target: 'n3', targetHandle: 'df_in' },
    { id: 'e3', source: 'n3', sourceHandle: 'df_train', target: 'n4', targetHandle: 'df_train' },
    { id: 'e4', source: 'n3', sourceHandle: 'df_test', target: 'n5', targetHandle: 'df_test' },
    { id: 'e5', source: 'n4', sourceHandle: 'model', target: 'n5', targetHandle: 'model' },
    { id: 'e6', source: 'n4', sourceHandle: 'model', target: 'n6', targetHandle: 'model' },
    { id: 'e7', source: 'n5', sourceHandle: 'metrics', target: 'n6', targetHandle: 'metrics' },
    { id: 'e8', source: 'n3', sourceHandle: 'df_train', target: 'n7', targetHandle: 'df_reference' },
    { id: 'e9', source: 'n3', sourceHandle: 'df_test', target: 'n7', targetHandle: 'df_current' },
  ],
}

/** 2. House Price Regression (Gradient Boosting) */
export const mlHousePriceRegression: PipelineDAG = {
  id: 'sample-ml-house-price',
  name: 'House Price Regression — XGBoost',
  pipeline: 'ml',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'ml.ingest.csv', position: { x: 60, y: 200 }, config: { file_path: 'house_prices.csv', separator: ',', encoding: 'utf-8', header: 0 }, status: 'idle' },
    { id: 'n2', definitionId: 'ml.transform.missing_values', position: { x: 300, y: 200 }, config: { strategy: 'median' }, status: 'idle' },
    { id: 'n3', definitionId: 'ml.transform.scaler', position: { x: 540, y: 200 }, config: { method: 'standard', exclude_columns: ['SalePrice'] }, status: 'idle' },
    { id: 'n4', definitionId: 'ml.transform.train_test_split', position: { x: 780, y: 200 }, config: { target_column: 'SalePrice', test_size: 0.2, random_state: 0, stratify: false }, status: 'idle' },
    { id: 'n5', definitionId: 'ml.train.sklearn.xgboost', position: { x: 1020, y: 100 }, config: { target_column: 'SalePrice', task: 'regression', n_estimators: 500, learning_rate: 0.05, max_depth: 6, random_state: 42 }, status: 'idle' },
    { id: 'n6', definitionId: 'ml.evaluate.regression', position: { x: 1260, y: 200 }, config: { target_column: 'SalePrice', plot_residuals: true }, status: 'idle' },
    { id: 'n7', definitionId: 'ml.deploy.mlflow', position: { x: 1500, y: 200 }, config: { experiment_name: 'house-price', model_name: 'xgb-house-price', mlflow_tracking_uri: 'http://localhost:5000' }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'df', target: 'n2', targetHandle: 'df_in' },
    { id: 'e2', source: 'n2', sourceHandle: 'df_out', target: 'n3', targetHandle: 'df_in' },
    { id: 'e3', source: 'n3', sourceHandle: 'df_out', target: 'n4', targetHandle: 'df_in' },
    { id: 'e4', source: 'n4', sourceHandle: 'df_train', target: 'n5', targetHandle: 'df_train' },
    { id: 'e5', source: 'n4', sourceHandle: 'df_test', target: 'n6', targetHandle: 'df_test' },
    { id: 'e6', source: 'n5', sourceHandle: 'model', target: 'n6', targetHandle: 'model' },
    { id: 'e7', source: 'n5', sourceHandle: 'model', target: 'n7', targetHandle: 'model' },
    { id: 'e8', source: 'n6', sourceHandle: 'metrics', target: 'n7', targetHandle: 'metrics' },
  ],
}

/** 3. Customer Churn — Logistic Regression + Drift Monitoring */
export const mlCustomerChurn: PipelineDAG = {
  id: 'sample-ml-churn',
  name: 'Customer Churn — Logistic Regression',
  pipeline: 'ml',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'ml.ingest.csv', position: { x: 60, y: 200 }, config: { file_path: 'churn.csv', separator: ',', encoding: 'utf-8', header: 0 }, status: 'idle' },
    { id: 'n2', definitionId: 'ml.transform.missing_values', position: { x: 300, y: 200 }, config: { strategy: 'mode' }, status: 'idle' },
    { id: 'n3', definitionId: 'ml.transform.encoder', position: { x: 540, y: 200 }, config: { method: 'onehot', columns: ['gender', 'contract', 'payment_method'] }, status: 'idle' },
    { id: 'n4', definitionId: 'ml.transform.scaler', position: { x: 780, y: 200 }, config: { method: 'minmax', exclude_columns: ['Churn'] }, status: 'idle' },
    { id: 'n5', definitionId: 'ml.transform.train_test_split', position: { x: 1020, y: 200 }, config: { target_column: 'Churn', test_size: 0.25, random_state: 7, stratify: true }, status: 'idle' },
    { id: 'n6', definitionId: 'ml.train.sklearn.logistic_regression', position: { x: 1260, y: 100 }, config: { target_column: 'Churn', task: 'classification', max_iter: 1000, C: 1.0, random_state: 7 }, status: 'idle' },
    { id: 'n7', definitionId: 'ml.evaluate.classification', position: { x: 1500, y: 200 }, config: { target_column: 'Churn', output_report: true, plot_confusion_matrix: true }, status: 'idle' },
    { id: 'n8', definitionId: 'ml.monitor.evidently_drift', position: { x: 1740, y: 200 }, config: { drift_share_threshold: 0.1, report_path: 'churn_drift.html' }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'df', target: 'n2', targetHandle: 'df_in' },
    { id: 'e2', source: 'n2', sourceHandle: 'df_out', target: 'n3', targetHandle: 'df_in' },
    { id: 'e3', source: 'n3', sourceHandle: 'df_out', target: 'n4', targetHandle: 'df_in' },
    { id: 'e4', source: 'n4', sourceHandle: 'df_out', target: 'n5', targetHandle: 'df_in' },
    { id: 'e5', source: 'n5', sourceHandle: 'df_train', target: 'n6', targetHandle: 'df_train' },
    { id: 'e6', source: 'n5', sourceHandle: 'df_test', target: 'n7', targetHandle: 'df_test' },
    { id: 'e7', source: 'n6', sourceHandle: 'model', target: 'n7', targetHandle: 'model' },
    { id: 'e8', source: 'n7', sourceHandle: 'metrics', target: 'n8', targetHandle: 'df_reference' },
  ],
}

/** 4. Image Classification — Keras CNN (from S3) */
export const mlImageClassification: PipelineDAG = {
  id: 'sample-ml-image-cnn',
  name: 'Image Classification — Keras CNN',
  pipeline: 'ml',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'ml.ingest.s3', position: { x: 60, y: 200 }, config: { bucket: 'my-ml-data', prefix: 'images/', region: 'us-east-1', file_format: 'parquet' }, status: 'idle' },
    { id: 'n2', definitionId: 'ml.transform.missing_values', position: { x: 300, y: 200 }, config: { strategy: 'drop_rows' }, status: 'idle' },
    { id: 'n3', definitionId: 'ml.transform.scaler', position: { x: 540, y: 200 }, config: { method: 'standard', exclude_columns: ['label'] }, status: 'idle' },
    { id: 'n4', definitionId: 'ml.transform.train_test_split', position: { x: 780, y: 200 }, config: { target_column: 'label', test_size: 0.2, random_state: 99, stratify: true }, status: 'idle' },
    { id: 'n5', definitionId: 'ml.train.keras.sequential', position: { x: 1020, y: 100 }, config: { target_column: 'label', task: 'classification', epochs: 20, batch_size: 32, learning_rate: 0.001, optimizer: 'adam', loss: 'sparse_categorical_crossentropy' }, status: 'idle' },
    { id: 'n6', definitionId: 'ml.evaluate.classification', position: { x: 1260, y: 200 }, config: { target_column: 'label', output_report: true, plot_confusion_matrix: true }, status: 'idle' },
    { id: 'n7', definitionId: 'ml.deploy.huggingface_hub', position: { x: 1500, y: 200 }, config: { repo_id: 'my-org/image-classifier', task: 'image-classification', private: false }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'df', target: 'n2', targetHandle: 'df_in' },
    { id: 'e2', source: 'n2', sourceHandle: 'df_out', target: 'n3', targetHandle: 'df_in' },
    { id: 'e3', source: 'n3', sourceHandle: 'df_out', target: 'n4', targetHandle: 'df_in' },
    { id: 'e4', source: 'n4', sourceHandle: 'df_train', target: 'n5', targetHandle: 'df_train' },
    { id: 'e5', source: 'n4', sourceHandle: 'df_test', target: 'n6', targetHandle: 'df_test' },
    { id: 'e6', source: 'n5', sourceHandle: 'model', target: 'n6', targetHandle: 'model' },
    { id: 'e7', source: 'n5', sourceHandle: 'model', target: 'n7', targetHandle: 'model' },
  ],
}

/** 5. Fraud Detection — Gradient Boosting + Cross Validation */
export const mlFraudDetection: PipelineDAG = {
  id: 'sample-ml-fraud',
  name: 'Fraud Detection — Gradient Boosting',
  pipeline: 'ml',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'ml.ingest.postgres', position: { x: 60, y: 200 }, config: { host: 'localhost', port: 5432, database: 'transactions', username: 'analyst', password: '', query: 'SELECT * FROM transactions LIMIT 100000' }, status: 'idle' },
    { id: 'n2', definitionId: 'ml.transform.missing_values', position: { x: 300, y: 200 }, config: { strategy: 'median' }, status: 'idle' },
    { id: 'n3', definitionId: 'ml.transform.outlier_remove', position: { x: 540, y: 200 }, config: { method: 'iqr', columns: ['amount'], threshold: 3.0 }, status: 'idle' },
    { id: 'n4', definitionId: 'ml.transform.scaler', position: { x: 780, y: 200 }, config: { method: 'robust', exclude_columns: ['is_fraud'] }, status: 'idle' },
    { id: 'n5', definitionId: 'ml.transform.train_test_split', position: { x: 1020, y: 200 }, config: { target_column: 'is_fraud', test_size: 0.2, random_state: 42, stratify: true }, status: 'idle' },
    { id: 'n6', definitionId: 'ml.train.sklearn.gradient_boosting', position: { x: 1260, y: 100 }, config: { target_column: 'is_fraud', task: 'classification', n_estimators: 200, learning_rate: 0.1, max_depth: 5, random_state: 42 }, status: 'idle' },
    { id: 'n7', definitionId: 'ml.evaluate.classification', position: { x: 1500, y: 200 }, config: { target_column: 'is_fraud', output_report: true, plot_confusion_matrix: true }, status: 'idle' },
    { id: 'n8', definitionId: 'ml.deploy.fastapi', position: { x: 1740, y: 200 }, config: { host: '0.0.0.0', port: 8080, workers: 2 }, status: 'idle' },
    { id: 'n9', definitionId: 'ml.monitor.model_performance', position: { x: 1980, y: 200 }, config: { threshold_accuracy: 0.95, alert_webhook: '' }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'df', target: 'n2', targetHandle: 'df_in' },
    { id: 'e2', source: 'n2', sourceHandle: 'df_out', target: 'n3', targetHandle: 'df_in' },
    { id: 'e3', source: 'n3', sourceHandle: 'df_out', target: 'n4', targetHandle: 'df_in' },
    { id: 'e4', source: 'n4', sourceHandle: 'df_out', target: 'n5', targetHandle: 'df_in' },
    { id: 'e5', source: 'n5', sourceHandle: 'df_train', target: 'n6', targetHandle: 'df_train' },
    { id: 'e6', source: 'n5', sourceHandle: 'df_test', target: 'n7', targetHandle: 'df_test' },
    { id: 'e7', source: 'n6', sourceHandle: 'model', target: 'n7', targetHandle: 'model' },
    { id: 'e8', source: 'n6', sourceHandle: 'model', target: 'n8', targetHandle: 'model' },
    { id: 'e9', source: 'n7', sourceHandle: 'metrics', target: 'n9', targetHandle: 'metrics' },
  ],
}

/** 6. MLflow Experiment Tracking — full lifecycle with autolog */
export const mlMlflowExperiment: PipelineDAG = {
  id: 'sample-ml-mlflow-experiment',
  name: 'MLflow Experiment Tracking — Sklearn Autolog',
  pipeline: 'ml',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'ml.mlflow.set_experiment', position: { x: 60, y: 200 }, config: { experiment_name: 'sklearn-comparison', run_name: 'rf-baseline', tracking_uri: 'http://localhost:5000' }, status: 'idle' },
    { id: 'n2', definitionId: 'ml.mlflow.autolog', position: { x: 300, y: 200 }, config: { framework: 'sklearn', log_input_examples: true, log_model_signatures: true, log_models: true }, status: 'idle' },
    { id: 'n3', definitionId: 'ml.ingest.csv', position: { x: 540, y: 200 }, config: { file_path: 'data.csv', separator: ',', encoding: 'utf-8', header: 0 }, status: 'idle' },
    { id: 'n4', definitionId: 'ml.transform.missing_values', position: { x: 780, y: 200 }, config: { strategy: 'median' }, status: 'idle' },
    { id: 'n5', definitionId: 'ml.transform.train_test_split', position: { x: 1020, y: 200 }, config: { target_column: 'target', test_size: 0.2, random_state: 42, stratify: false }, status: 'idle' },
    { id: 'n6', definitionId: 'ml.train.sklearn.random_forest', position: { x: 1260, y: 100 }, config: { target_column: 'target', task: 'classification', n_estimators: 100, max_depth: 8, random_state: 42 }, status: 'idle' },
    { id: 'n7', definitionId: 'ml.evaluate.classification', position: { x: 1500, y: 200 }, config: { target_column: 'target', output_report: true, plot_confusion_matrix: true }, status: 'idle' },
    { id: 'n8', definitionId: 'ml.mlflow.log_params', position: { x: 1740, y: 200 }, config: { params: { model_type: 'random_forest', dataset: 'data.csv' } }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'run', target: 'n2', targetHandle: 'run' },
    { id: 'e2', source: 'n3', sourceHandle: 'df', target: 'n4', targetHandle: 'df_in' },
    { id: 'e3', source: 'n4', sourceHandle: 'df_out', target: 'n5', targetHandle: 'df_in' },
    { id: 'e4', source: 'n5', sourceHandle: 'df_train', target: 'n6', targetHandle: 'df_train' },
    { id: 'e5', source: 'n5', sourceHandle: 'df_test', target: 'n7', targetHandle: 'df_test' },
    { id: 'e6', source: 'n6', sourceHandle: 'model', target: 'n7', targetHandle: 'model' },
    { id: 'e7', source: 'n7', sourceHandle: 'metrics', target: 'n8', targetHandle: 'metrics' },
    { id: 'e8', source: 'n2', sourceHandle: 'run', target: 'n8', targetHandle: 'run' },
  ],
}

/** 7. MLflow A/B Model Comparison */
export const mlMlflowABComparison: PipelineDAG = {
  id: 'sample-ml-mlflow-ab',
  name: 'MLflow A/B Model Comparison — Random Forest vs XGBoost',
  pipeline: 'ml',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'ml.ingest.csv', position: { x: 60, y: 200 }, config: { file_path: 'dataset.csv', separator: ',', encoding: 'utf-8', header: 0 }, status: 'idle' },
    { id: 'n2', definitionId: 'ml.transform.scaler', position: { x: 300, y: 200 }, config: { method: 'standard', exclude_columns: ['label'] }, status: 'idle' },
    { id: 'n3', definitionId: 'ml.transform.train_test_split', position: { x: 540, y: 200 }, config: { target_column: 'label', test_size: 0.2, random_state: 0, stratify: true }, status: 'idle' },
    { id: 'n4', definitionId: 'ml.train.sklearn.random_forest', position: { x: 780, y: 80 }, config: { target_column: 'label', task: 'classification', n_estimators: 200, max_depth: 10, random_state: 1 }, status: 'idle' },
    { id: 'n5', definitionId: 'ml.train.sklearn.xgboost', position: { x: 780, y: 320 }, config: { target_column: 'label', task: 'classification', n_estimators: 200, learning_rate: 0.1, max_depth: 6, random_state: 1 }, status: 'idle' },
    { id: 'n6', definitionId: 'ml.evaluate.classification', position: { x: 1040, y: 80 }, config: { target_column: 'label', output_report: true, plot_confusion_matrix: false }, status: 'idle' },
    { id: 'n7', definitionId: 'ml.evaluate.classification', position: { x: 1040, y: 320 }, config: { target_column: 'label', output_report: true, plot_confusion_matrix: false }, status: 'idle' },
    { id: 'n8', definitionId: 'ml.deploy.mlflow', position: { x: 1300, y: 80 }, config: { experiment_name: 'ab-comparison', model_name: 'rf-model', mlflow_tracking_uri: 'http://localhost:5000' }, status: 'idle' },
    { id: 'n9', definitionId: 'ml.deploy.mlflow', position: { x: 1300, y: 320 }, config: { experiment_name: 'ab-comparison', model_name: 'xgb-model', mlflow_tracking_uri: 'http://localhost:5000' }, status: 'idle' },
    { id: 'n10', definitionId: 'ml.mlflow.compare_runs', position: { x: 1560, y: 200 }, config: { experiment_name: 'ab-comparison', tracking_uri: 'http://localhost:5000', sort_metric: 'f1', max_results: 10 }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'df', target: 'n2', targetHandle: 'df_in' },
    { id: 'e2', source: 'n2', sourceHandle: 'df_out', target: 'n3', targetHandle: 'df_in' },
    { id: 'e3', source: 'n3', sourceHandle: 'df_train', target: 'n4', targetHandle: 'df_train' },
    { id: 'e4', source: 'n3', sourceHandle: 'df_train', target: 'n5', targetHandle: 'df_train' },
    { id: 'e5', source: 'n3', sourceHandle: 'df_test', target: 'n6', targetHandle: 'df_test' },
    { id: 'e6', source: 'n3', sourceHandle: 'df_test', target: 'n7', targetHandle: 'df_test' },
    { id: 'e7', source: 'n4', sourceHandle: 'model', target: 'n6', targetHandle: 'model' },
    { id: 'e8', source: 'n5', sourceHandle: 'model', target: 'n7', targetHandle: 'model' },
    { id: 'e9', source: 'n4', sourceHandle: 'model', target: 'n8', targetHandle: 'model' },
    { id: 'e10', source: 'n5', sourceHandle: 'model', target: 'n9', targetHandle: 'model' },
    { id: 'e11', source: 'n6', sourceHandle: 'metrics', target: 'n8', targetHandle: 'metrics' },
    { id: 'e12', source: 'n7', sourceHandle: 'metrics', target: 'n9', targetHandle: 'metrics' },
  ],
}

/** 8. MLflow Load + Serve registered model */
export const mlMlflowLoadServe: PipelineDAG = {
  id: 'sample-ml-mlflow-load-serve',
  name: 'MLflow Load Model — Registry → FastAPI Inference',
  pipeline: 'ml',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'ml.mlflow.load_model', position: { x: 60, y: 200 }, config: { model_name: 'iris-rf', model_version: 'Production', tracking_uri: 'http://localhost:5000' }, status: 'idle' },
    { id: 'n2', definitionId: 'ml.ingest.csv', position: { x: 300, y: 200 }, config: { file_path: 'new_data.csv', separator: ',', encoding: 'utf-8', header: 0 }, status: 'idle' },
    { id: 'n3', definitionId: 'ml.evaluate.classification', position: { x: 540, y: 200 }, config: { target_column: 'species', output_report: true, plot_confusion_matrix: true }, status: 'idle' },
    { id: 'n4', definitionId: 'ml.deploy.fastapi', position: { x: 780, y: 200 }, config: { model_path: 'production_model', host: '0.0.0.0', port: 8080, route_prefix: '/predict' }, status: 'idle' },
    { id: 'n5', definitionId: 'ml.monitor.model_performance', position: { x: 1020, y: 200 }, config: { threshold_accuracy: 0.90, alert_webhook: '' }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'model', target: 'n3', targetHandle: 'model' },
    { id: 'e2', source: 'n2', sourceHandle: 'df', target: 'n3', targetHandle: 'df_test' },
    { id: 'e3', source: 'n1', sourceHandle: 'model', target: 'n4', targetHandle: 'model' },
    { id: 'e4', source: 'n3', sourceHandle: 'metrics', target: 'n5', targetHandle: 'metrics' },
  ],
}

// ─── LLM SAMPLES ─────────────────────────────────────────────────────────────

/** 1. PDF RAG — OpenAI + Chroma */
export const llmPdfRag: PipelineDAG = {
  id: 'sample-llm-pdf-rag',
  name: 'PDF RAG — OpenAI + Chroma',
  pipeline: 'llm',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'llm.ingest.pdf', position: { x: 60, y: 200 }, config: { file_path: 'documents/', recursive: true, extract_images: false }, status: 'idle' },
    { id: 'n2', definitionId: 'llm.chunk.recursive', position: { x: 300, y: 200 }, config: { chunk_size: 1000, chunk_overlap: 200, separators: ['\n\n', '\n', ' '] }, status: 'idle' },
    { id: 'n3', definitionId: 'llm.embed.openai', position: { x: 540, y: 200 }, config: { model: 'text-embedding-3-small', batch_size: 100 }, status: 'idle' },
    { id: 'n4', definitionId: 'llm.vectorstore.chroma', position: { x: 780, y: 200 }, config: { collection_name: 'pdf-docs', persist_directory: './chroma_db', distance_metric: 'cosine' }, status: 'idle' },
    { id: 'n5', definitionId: 'llm.model.openai', position: { x: 1020, y: 200 }, config: { model: 'gpt-4o-mini', temperature: 0.0, max_tokens: 1024 }, status: 'idle' },
    { id: 'n6', definitionId: 'llm.chain.rag', position: { x: 1260, y: 200 }, config: { top_k: 5, prompt_template: 'Answer based on context:\n{context}\n\nQuestion: {question}', return_source_documents: true }, status: 'idle' },
    { id: 'n7', definitionId: 'llm.deploy.langserve', position: { x: 1500, y: 200 }, config: { host: '0.0.0.0', port: 8080, path: '/rag', enable_playground: true }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'docs', target: 'n2', targetHandle: 'docs' },
    { id: 'e2', source: 'n2', sourceHandle: 'chunks', target: 'n3', targetHandle: 'chunks' },
    { id: 'e3', source: 'n3', sourceHandle: 'embeddings', target: 'n4', targetHandle: 'embeddings' },
    { id: 'e4', source: 'n4', sourceHandle: 'vectorstore', target: 'n5', targetHandle: 'vectorstore' },
    { id: 'e5', source: 'n4', sourceHandle: 'vectorstore', target: 'n6', targetHandle: 'vectorstore' },
    { id: 'e6', source: 'n5', sourceHandle: 'llm', target: 'n6', targetHandle: 'llm' },
    { id: 'e7', source: 'n6', sourceHandle: 'chain', target: 'n7', targetHandle: 'chain' },
  ],
}

/** 2. Web Scraper RAG — Anthropic Claude + FAISS */
export const llmWebRagClaude: PipelineDAG = {
  id: 'sample-llm-web-rag-claude',
  name: 'Web Scraper RAG — Claude + FAISS',
  pipeline: 'llm',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'llm.ingest.web', position: { x: 60, y: 200 }, config: { urls: ['https://docs.example.com'], max_depth: 2, follow_links: true }, status: 'idle' },
    { id: 'n2', definitionId: 'llm.chunk.markdown', position: { x: 300, y: 200 }, config: { chunk_size: 800, chunk_overlap: 100 }, status: 'idle' },
    { id: 'n3', definitionId: 'llm.embed.huggingface', position: { x: 540, y: 200 }, config: { model: 'BAAI/bge-small-en-v1.5', device: 'cpu', normalize_embeddings: true }, status: 'idle' },
    { id: 'n4', definitionId: 'llm.vectorstore.faiss', position: { x: 780, y: 200 }, config: { index_type: 'Flat', metric: 'L2', save_local: './faiss_index' }, status: 'idle' },
    { id: 'n5', definitionId: 'llm.model.anthropic', position: { x: 1020, y: 200 }, config: { model: 'claude-sonnet-4-6', temperature: 0.2, max_tokens: 2048 }, status: 'idle' },
    { id: 'n6', definitionId: 'llm.chain.rag', position: { x: 1260, y: 200 }, config: { top_k: 4, prompt_template: 'Use the docs:\n{context}\n\nAnswer: {question}', return_source_documents: true }, status: 'idle' },
    { id: 'n7', definitionId: 'llm.deploy.fastapi', position: { x: 1500, y: 200 }, config: { host: '0.0.0.0', port: 8000, cors_origins: ['*'] }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'docs', target: 'n2', targetHandle: 'docs' },
    { id: 'e2', source: 'n2', sourceHandle: 'chunks', target: 'n3', targetHandle: 'chunks' },
    { id: 'e3', source: 'n3', sourceHandle: 'embeddings', target: 'n4', targetHandle: 'embeddings' },
    { id: 'e4', source: 'n4', sourceHandle: 'vectorstore', target: 'n5', targetHandle: 'vectorstore' },
    { id: 'e5', source: 'n4', sourceHandle: 'vectorstore', target: 'n6', targetHandle: 'vectorstore' },
    { id: 'e6', source: 'n5', sourceHandle: 'llm', target: 'n6', targetHandle: 'llm' },
    { id: 'e7', source: 'n6', sourceHandle: 'chain', target: 'n7', targetHandle: 'chain' },
  ],
}

/** 3. Local Private RAG — Ollama + FAISS (no cloud) */
export const llmLocalOllamaRag: PipelineDAG = {
  id: 'sample-llm-local-ollama',
  name: 'Local Private RAG — Ollama + FAISS',
  pipeline: 'llm',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'llm.ingest.pdf', position: { x: 60, y: 200 }, config: { file_path: 'private_docs/', recursive: true, extract_images: false }, status: 'idle' },
    { id: 'n2', definitionId: 'llm.chunk.recursive', position: { x: 300, y: 200 }, config: { chunk_size: 512, chunk_overlap: 64, separators: ['\n\n', '\n'] }, status: 'idle' },
    { id: 'n3', definitionId: 'llm.embed.ollama', position: { x: 540, y: 200 }, config: { model: 'nomic-embed-text', base_url: 'http://localhost:11434' }, status: 'idle' },
    { id: 'n4', definitionId: 'llm.vectorstore.faiss', position: { x: 780, y: 200 }, config: { index_type: 'Flat', metric: 'L2', save_local: './local_index' }, status: 'idle' },
    { id: 'n5', definitionId: 'llm.model.ollama', position: { x: 1020, y: 200 }, config: { model: 'llama3', base_url: 'http://localhost:11434', temperature: 0.1, num_ctx: 4096 }, status: 'idle' },
    { id: 'n6', definitionId: 'llm.chain.rag', position: { x: 1260, y: 200 }, config: { top_k: 3, prompt_template: 'Context:\n{context}\n\nQuestion: {question}\nAnswer:', return_source_documents: false }, status: 'idle' },
    { id: 'n7', definitionId: 'llm.deploy.langserve', position: { x: 1500, y: 200 }, config: { host: '127.0.0.1', port: 8080, path: '/local-rag', enable_playground: true }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'docs', target: 'n2', targetHandle: 'docs' },
    { id: 'e2', source: 'n2', sourceHandle: 'chunks', target: 'n3', targetHandle: 'chunks' },
    { id: 'e3', source: 'n3', sourceHandle: 'embeddings', target: 'n4', targetHandle: 'embeddings' },
    { id: 'e4', source: 'n4', sourceHandle: 'vectorstore', target: 'n5', targetHandle: 'vectorstore' },
    { id: 'e5', source: 'n4', sourceHandle: 'vectorstore', target: 'n6', targetHandle: 'vectorstore' },
    { id: 'e6', source: 'n5', sourceHandle: 'llm', target: 'n6', targetHandle: 'llm' },
    { id: 'e7', source: 'n6', sourceHandle: 'chain', target: 'n7', targetHandle: 'chain' },
  ],
}

/** 4. ReAct Agent — OpenAI + Tool Use */
export const llmReactAgent: PipelineDAG = {
  id: 'sample-llm-react-agent',
  name: 'ReAct Agent — OpenAI Tool Use',
  pipeline: 'llm',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'llm.model.openai', position: { x: 60, y: 200 }, config: { model: 'gpt-4o', temperature: 0.0, max_tokens: 4096 }, status: 'idle' },
    { id: 'n2', definitionId: 'llm.chain.react_agent', position: { x: 300, y: 200 }, config: { tools: ['web_search', 'calculator', 'python_repl'], max_iterations: 10, verbose: true }, status: 'idle' },
    { id: 'n3', definitionId: 'llm.monitor.usage', position: { x: 540, y: 200 }, config: { log_prompts: true, log_completions: true, export_format: 'jsonl' }, status: 'idle' },
    { id: 'n4', definitionId: 'llm.deploy.fastapi', position: { x: 780, y: 200 }, config: { host: '0.0.0.0', port: 8000, cors_origins: ['http://localhost:3000'] }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'llm', target: 'n2', targetHandle: 'llm' },
    { id: 'e2', source: 'n2', sourceHandle: 'agent', target: 'n3', targetHandle: 'chain' },
    { id: 'e3', source: 'n2', sourceHandle: 'agent', target: 'n4', targetHandle: 'chain' },
  ],
}

/** 5. S3 Docs → Pinecone → Claude Enterprise RAG */
export const llmS3PineconeEnterprise: PipelineDAG = {
  id: 'sample-llm-enterprise-rag',
  name: 'Enterprise RAG — S3 + Pinecone + Claude',
  pipeline: 'llm',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'llm.ingest.s3_docs', position: { x: 60, y: 200 }, config: { bucket: 'company-knowledge-base', prefix: 'docs/', region: 'us-east-1', file_types: ['pdf', 'docx', 'txt'] }, status: 'idle' },
    { id: 'n2', definitionId: 'llm.chunk.recursive', position: { x: 300, y: 200 }, config: { chunk_size: 1500, chunk_overlap: 300, separators: ['\n\n', '\n', '. '] }, status: 'idle' },
    { id: 'n3', definitionId: 'llm.embed.openai', position: { x: 540, y: 200 }, config: { model: 'text-embedding-3-large', batch_size: 50 }, status: 'idle' },
    { id: 'n4', definitionId: 'llm.vectorstore.pinecone', position: { x: 780, y: 200 }, config: { index_name: 'enterprise-kb', environment: 'us-east-1-aws', namespace: 'prod', metric: 'cosine' }, status: 'idle' },
    { id: 'n5', definitionId: 'llm.model.anthropic', position: { x: 1020, y: 200 }, config: { model: 'claude-opus-4-6', temperature: 0.0, max_tokens: 4096 }, status: 'idle' },
    { id: 'n6', definitionId: 'llm.chain.rag', position: { x: 1260, y: 200 }, config: { top_k: 8, prompt_template: 'You are an enterprise assistant. Use only verified documents.\n\nContext: {context}\n\nQuery: {question}', return_source_documents: true }, status: 'idle' },
    { id: 'n7', definitionId: 'llm.monitor.usage', position: { x: 1500, y: 100 }, config: { log_prompts: false, log_completions: false, export_format: 'jsonl' }, status: 'idle' },
    { id: 'n8', definitionId: 'llm.deploy.langserve', position: { x: 1500, y: 300 }, config: { host: '0.0.0.0', port: 8080, path: '/enterprise-rag', enable_playground: false }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'docs', target: 'n2', targetHandle: 'docs' },
    { id: 'e2', source: 'n2', sourceHandle: 'chunks', target: 'n3', targetHandle: 'chunks' },
    { id: 'e3', source: 'n3', sourceHandle: 'embeddings', target: 'n4', targetHandle: 'embeddings' },
    { id: 'e4', source: 'n4', sourceHandle: 'vectorstore', target: 'n5', targetHandle: 'vectorstore' },
    { id: 'e5', source: 'n4', sourceHandle: 'vectorstore', target: 'n6', targetHandle: 'vectorstore' },
    { id: 'e6', source: 'n5', sourceHandle: 'llm', target: 'n6', targetHandle: 'llm' },
    { id: 'e7', source: 'n6', sourceHandle: 'chain', target: 'n7', targetHandle: 'chain' },
    { id: 'e8', source: 'n6', sourceHandle: 'chain', target: 'n8', targetHandle: 'chain' },
  ],
}

/** 6. LoRA Fine-Tuning — Llama 3.2 1B on Alpaca */
export const llmLoraFinetune: PipelineDAG = {
  id: 'sample-llm-lora-finetune',
  name: 'LoRA Fine-Tuning — Llama 3.2 1B on Alpaca',
  pipeline: 'llm',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'llm.finetune.dataset_prep', position: { x: 60, y: 200 }, config: { source_type: 'huggingface', dataset_name: 'tatsu-lab/alpaca', format: 'alpaca', max_samples: 5000, train_split: 0.95 }, status: 'idle' },
    { id: 'n2', definitionId: 'llm.finetune.lora_config', position: { x: 320, y: 200 }, config: { base_model: 'meta-llama/Llama-3.2-1B-Instruct', r: 16, lora_alpha: 32, lora_dropout: 0.05, target_modules: ['q_proj', 'v_proj', 'k_proj', 'o_proj'], bias: 'none', task_type: 'CAUSAL_LM' }, status: 'idle' },
    { id: 'n3', definitionId: 'llm.finetune.sft_trainer', position: { x: 600, y: 200 }, config: { output_dir: './lora_llama_alpaca', num_train_epochs: 3, per_device_train_batch_size: 4, gradient_accumulation_steps: 4, learning_rate: 0.0002, lr_scheduler_type: 'cosine', warmup_ratio: 0.03, max_seq_length: 2048, bf16: true, fp16: false, packing: false }, status: 'idle' },
    { id: 'n4', definitionId: 'llm.finetune.merge_push', position: { x: 880, y: 200 }, config: { repo_id: 'my-org/llama-3.2-1b-alpaca-lora', push_to_hub: true, private: false, save_merged_local: true, merged_output_dir: './merged_llama_alpaca', token_env: 'HF_TOKEN' }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'dataset', target: 'n3', targetHandle: 'dataset' },
    { id: 'e2', source: 'n2', sourceHandle: 'config', target: 'n3', targetHandle: 'config' },
    { id: 'e3', source: 'n3', sourceHandle: 'model', target: 'n4', targetHandle: 'model' },
  ],
}

/** 7. QLoRA Fine-Tuning — Llama 3.1 8B on custom JSONL */
export const llmQloraFinetune: PipelineDAG = {
  id: 'sample-llm-qlora-finetune',
  name: 'QLoRA Fine-Tuning — Llama 3.1 8B (4-bit NF4)',
  pipeline: 'llm',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'llm.finetune.dataset_prep', position: { x: 60, y: 200 }, config: { source_type: 'jsonl', file_path: 'training_data.jsonl', format: 'chatml', instruction_col: 'instruction', output_col: 'response', max_samples: 0, train_split: 0.9 }, status: 'idle' },
    { id: 'n2', definitionId: 'llm.finetune.qlora_config', position: { x: 320, y: 200 }, config: { base_model: 'meta-llama/Llama-3.1-8B-Instruct', load_in_4bit: true, bnb_4bit_quant_type: 'nf4', bnb_4bit_compute_dtype: 'bfloat16', use_nested_quant: true, r: 64, lora_alpha: 16, lora_dropout: 0.1, target_modules: ['q_proj', 'v_proj', 'k_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj'] }, status: 'idle' },
    { id: 'n3', definitionId: 'llm.finetune.sft_trainer', position: { x: 600, y: 200 }, config: { output_dir: './qlora_llama_custom', num_train_epochs: 2, per_device_train_batch_size: 2, gradient_accumulation_steps: 8, learning_rate: 0.0001, lr_scheduler_type: 'cosine', warmup_ratio: 0.05, max_seq_length: 4096, bf16: true, fp16: false, packing: true }, status: 'idle' },
    { id: 'n4', definitionId: 'llm.finetune.merge_push', position: { x: 880, y: 200 }, config: { repo_id: 'my-org/llama-3.1-8b-custom-qlora', push_to_hub: true, private: true, save_merged_local: true, merged_output_dir: './merged_llama_8b', token_env: 'HF_TOKEN' }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'dataset', target: 'n3', targetHandle: 'dataset' },
    { id: 'e2', source: 'n2', sourceHandle: 'config', target: 'n3', targetHandle: 'config' },
    { id: 'e3', source: 'n3', sourceHandle: 'model', target: 'n4', targetHandle: 'model' },
  ],
}

/** 8. Document Summarization — Claude + LangChain Map-Reduce */
export const llmDocSummarization: PipelineDAG = {
  id: 'sample-llm-doc-summarize',
  name: 'Document Summarization — Claude Map-Reduce',
  pipeline: 'llm',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'llm.ingest.pdf', position: { x: 60, y: 200 }, config: { file_path: 'reports/', recursive: true, extract_images: false }, status: 'idle' },
    { id: 'n2', definitionId: 'llm.chunk.recursive', position: { x: 300, y: 200 }, config: { chunk_size: 4000, chunk_overlap: 200, separators: ['\n\n', '\n'] }, status: 'idle' },
    { id: 'n3', definitionId: 'llm.model.anthropic', position: { x: 540, y: 200 }, config: { model: 'claude-sonnet-4-6', temperature: 0.3, max_tokens: 2048 }, status: 'idle' },
    { id: 'n4', definitionId: 'llm.chain.langgraph_workflow', position: { x: 780, y: 200 }, config: { workflow_type: 'map_reduce', map_prompt: 'Summarize this excerpt:\n{text}', reduce_prompt: 'Combine these summaries into one:\n{summaries}', verbose: false }, status: 'idle' },
    { id: 'n5', definitionId: 'llm.deploy.fastapi', position: { x: 1020, y: 200 }, config: { host: '0.0.0.0', port: 8000, cors_origins: ['*'] }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'docs', target: 'n2', targetHandle: 'docs' },
    { id: 'e2', source: 'n2', sourceHandle: 'chunks', target: 'n4', targetHandle: 'docs' },
    { id: 'e3', source: 'n3', sourceHandle: 'llm', target: 'n4', targetHandle: 'llm' },
    { id: 'e4', source: 'n4', sourceHandle: 'chain', target: 'n5', targetHandle: 'chain' },
  ],
}

/** 7. Code Assistant RAG — S3 Codebase + GPT-4o */
export const llmCodeAssistantRag: PipelineDAG = {
  id: 'sample-llm-code-assistant',
  name: 'Code Assistant RAG — S3 Codebase + GPT-4o',
  pipeline: 'llm',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'llm.ingest.s3_docs', position: { x: 60, y: 200 }, config: { bucket: 'code-repos', prefix: 'src/', region: 'us-east-1', file_types: ['py', 'ts', 'md'] }, status: 'idle' },
    { id: 'n2', definitionId: 'llm.chunk.markdown', position: { x: 300, y: 200 }, config: { chunk_size: 600, chunk_overlap: 100 }, status: 'idle' },
    { id: 'n3', definitionId: 'llm.embed.openai', position: { x: 540, y: 200 }, config: { model: 'text-embedding-3-small', batch_size: 100 }, status: 'idle' },
    { id: 'n4', definitionId: 'llm.vectorstore.chroma', position: { x: 780, y: 200 }, config: { collection_name: 'codebase', persist_directory: './code_db', distance_metric: 'cosine' }, status: 'idle' },
    { id: 'n5', definitionId: 'llm.model.openai', position: { x: 1020, y: 200 }, config: { model: 'gpt-4o', temperature: 0.0, max_tokens: 2048 }, status: 'idle' },
    { id: 'n6', definitionId: 'llm.chain.rag', position: { x: 1260, y: 200 }, config: { top_k: 6, prompt_template: 'You are a code assistant. Use the code context below to answer questions.\n\nCode context:\n{context}\n\nQuestion: {question}', return_source_documents: true }, status: 'idle' },
    { id: 'n7', definitionId: 'llm.monitor.usage', position: { x: 1500, y: 100 }, config: { log_prompts: true, log_completions: false, export_format: 'jsonl' }, status: 'idle' },
    { id: 'n8', definitionId: 'llm.deploy.langserve', position: { x: 1500, y: 300 }, config: { host: '0.0.0.0', port: 8080, path: '/code-assist', enable_playground: true }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'docs', target: 'n2', targetHandle: 'docs' },
    { id: 'e2', source: 'n2', sourceHandle: 'chunks', target: 'n3', targetHandle: 'chunks' },
    { id: 'e3', source: 'n3', sourceHandle: 'embeddings', target: 'n4', targetHandle: 'embeddings' },
    { id: 'e4', source: 'n4', sourceHandle: 'vectorstore', target: 'n5', targetHandle: 'vectorstore' },
    { id: 'e5', source: 'n4', sourceHandle: 'vectorstore', target: 'n6', targetHandle: 'vectorstore' },
    { id: 'e6', source: 'n5', sourceHandle: 'llm', target: 'n6', targetHandle: 'llm' },
    { id: 'e7', source: 'n6', sourceHandle: 'chain', target: 'n7', targetHandle: 'chain' },
    { id: 'e8', source: 'n6', sourceHandle: 'chain', target: 'n8', targetHandle: 'chain' },
  ],
}

/** 8. LangGraph Multi-Agent — Researcher + Writer */
export const llmLangGraphMultiAgent: PipelineDAG = {
  id: 'sample-llm-langgraph-multi-agent',
  name: 'LangGraph Multi-Agent — Researcher + Writer',
  pipeline: 'llm',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'llm.model.openai', position: { x: 60, y: 120 }, config: { model: 'gpt-4o', temperature: 0.0, max_tokens: 4096 }, status: 'idle' },
    { id: 'n2', definitionId: 'llm.model.anthropic', position: { x: 60, y: 320 }, config: { model: 'claude-sonnet-4-6', temperature: 0.5, max_tokens: 4096 }, status: 'idle' },
    { id: 'n3', definitionId: 'llm.vectorstore.faiss', position: { x: 300, y: 200 }, config: { index_type: 'Flat', metric: 'L2', save_local: './research_index' }, status: 'idle' },
    { id: 'n4', definitionId: 'llm.chain.langgraph_workflow', position: { x: 560, y: 200 }, config: { workflow_type: 'supervisor', agents: ['researcher', 'writer', 'critic'], max_iterations: 5, verbose: true }, status: 'idle' },
    { id: 'n5', definitionId: 'llm.monitor.usage', position: { x: 800, y: 120 }, config: { log_prompts: false, log_completions: false, export_format: 'jsonl' }, status: 'idle' },
    { id: 'n6', definitionId: 'llm.deploy.fastapi', position: { x: 800, y: 320 }, config: { host: '0.0.0.0', port: 8000, cors_origins: ['*'] }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'llm', target: 'n4', targetHandle: 'llm' },
    { id: 'e2', source: 'n2', sourceHandle: 'llm', target: 'n4', targetHandle: 'llm' },
    { id: 'e3', source: 'n3', sourceHandle: 'vectorstore', target: 'n4', targetHandle: 'vectorstore' },
    { id: 'e4', source: 'n4', sourceHandle: 'chain', target: 'n5', targetHandle: 'chain' },
    { id: 'e5', source: 'n4', sourceHandle: 'chain', target: 'n6', targetHandle: 'chain' },
  ],
}

// ─── MLflow Complete Examples ─────────────────────────────────────────────────

/** 9. MLOps Full Lifecycle — all 5 MLflow nodes + monitoring */
export const mlMlflowFullLifecycle: PipelineDAG = {
  id: 'sample-ml-mlflow-full',
  name: 'MLOps Full Lifecycle — MLflow + Monitor + Serve',
  pipeline: 'ml',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    // MLflow experiment setup
    { id: 'n1',  definitionId: 'ml.mlflow.set_experiment',   position: { x:  60, y: 100 }, config: { experiment_name: 'churn-full-lifecycle', run_name: 'xgb-v1', tracking_uri: 'http://localhost:5000' }, status: 'idle' },
    { id: 'n2',  definitionId: 'ml.mlflow.autolog',          position: { x: 300, y: 100 }, config: { framework: 'sklearn', log_input_examples: true, log_model_signatures: true, log_models: true }, status: 'idle' },
    // Data pipeline
    { id: 'n3',  definitionId: 'ml.ingest.csv',              position: { x:  60, y: 280 }, config: { file_path: 'churn.csv', separator: ',', encoding: 'utf-8', header: 0 }, status: 'idle' },
    { id: 'n4',  definitionId: 'ml.transform.missing_values',position: { x: 300, y: 280 }, config: { strategy: 'median' }, status: 'idle' },
    { id: 'n5',  definitionId: 'ml.transform.encoder',       position: { x: 540, y: 280 }, config: { method: 'onehot', columns: ['gender', 'contract'] }, status: 'idle' },
    { id: 'n6',  definitionId: 'ml.transform.scaler',        position: { x: 780, y: 280 }, config: { method: 'standard', exclude_columns: ['Churn'] }, status: 'idle' },
    { id: 'n7',  definitionId: 'ml.transform.train_test_split', position: { x: 1020, y: 280 }, config: { target_column: 'Churn', test_size: 0.2, random_state: 42, stratify: true }, status: 'idle' },
    // Train & evaluate
    { id: 'n8',  definitionId: 'ml.train.sklearn.xgboost',   position: { x: 1260, y: 160 }, config: { target_column: 'Churn', task: 'classification', n_estimators: 300, learning_rate: 0.05, max_depth: 6, random_state: 42 }, status: 'idle' },
    { id: 'n9',  definitionId: 'ml.evaluate.classification', position: { x: 1500, y: 280 }, config: { target_column: 'Churn', output_report: true, plot_confusion_matrix: true }, status: 'idle' },
    // MLflow logging & registry
    { id: 'n10', definitionId: 'ml.mlflow.log_params',       position: { x: 1740, y: 160 }, config: { params: { model: 'xgboost', dataset: 'churn.csv', version: 'v1' } }, status: 'idle' },
    { id: 'n11', definitionId: 'ml.deploy.mlflow',           position: { x: 1740, y: 380 }, config: { experiment_name: 'churn-full-lifecycle', model_name: 'churn-xgb', mlflow_tracking_uri: 'http://localhost:5000' }, status: 'idle' },
    { id: 'n12', definitionId: 'ml.mlflow.compare_runs',     position: { x: 1980, y: 280 }, config: { experiment_name: 'churn-full-lifecycle', tracking_uri: 'http://localhost:5000', sort_metric: 'f1', max_results: 10 }, status: 'idle' },
    // Load + serve + monitor
    { id: 'n13', definitionId: 'ml.mlflow.load_model',       position: { x: 2220, y: 280 }, config: { model_name: 'churn-xgb', model_version: 'Production', tracking_uri: 'http://localhost:5000' }, status: 'idle' },
    { id: 'n14', definitionId: 'ml.deploy.fastapi',          position: { x: 2460, y: 160 }, config: { host: '0.0.0.0', port: 8080, route_prefix: '/predict' }, status: 'idle' },
    { id: 'n15', definitionId: 'ml.monitor.evidently_drift', position: { x: 2460, y: 380 }, config: { drift_share_threshold: 0.1, report_path: 'churn_drift.html' }, status: 'idle' },
  ],
  edges: [
    { id: 'e1',  source: 'n1',  sourceHandle: 'run',      target: 'n2',  targetHandle: 'run' },
    { id: 'e2',  source: 'n3',  sourceHandle: 'df',       target: 'n4',  targetHandle: 'df_in' },
    { id: 'e3',  source: 'n4',  sourceHandle: 'df_out',   target: 'n5',  targetHandle: 'df_in' },
    { id: 'e4',  source: 'n5',  sourceHandle: 'df_out',   target: 'n6',  targetHandle: 'df_in' },
    { id: 'e5',  source: 'n6',  sourceHandle: 'df_out',   target: 'n7',  targetHandle: 'df_in' },
    { id: 'e6',  source: 'n7',  sourceHandle: 'df_train', target: 'n8',  targetHandle: 'df_train' },
    { id: 'e7',  source: 'n7',  sourceHandle: 'df_test',  target: 'n9',  targetHandle: 'df_test' },
    { id: 'e8',  source: 'n8',  sourceHandle: 'model',    target: 'n9',  targetHandle: 'model' },
    { id: 'e9',  source: 'n2',  sourceHandle: 'run',      target: 'n10', targetHandle: 'run' },
    { id: 'e10', source: 'n9',  sourceHandle: 'metrics',  target: 'n10', targetHandle: 'metrics' },
    { id: 'e11', source: 'n8',  sourceHandle: 'model',    target: 'n11', targetHandle: 'model' },
    { id: 'e12', source: 'n9',  sourceHandle: 'metrics',  target: 'n11', targetHandle: 'metrics' },
    { id: 'e13', source: 'n11', sourceHandle: 'run',      target: 'n12', targetHandle: 'run' },
    { id: 'e14', source: 'n12', sourceHandle: 'df',       target: 'n13', targetHandle: 'run' },
    { id: 'e15', source: 'n13', sourceHandle: 'model',    target: 'n14', targetHandle: 'model' },
    { id: 'e16', source: 'n7',  sourceHandle: 'df_train', target: 'n15', targetHandle: 'df_reference' },
    { id: 'e17', source: 'n7',  sourceHandle: 'df_test',  target: 'n15', targetHandle: 'df_current' },
  ],
}

/** 10. MLflow Hyperparameter Tuning — Parallel A/B + Registry + Promotion */
export const mlMlflowHyperparamTuning: PipelineDAG = {
  id: 'sample-ml-mlflow-hparam',
  name: 'MLflow Hyperparameter Tuning — RF vs XGB A/B + Registry',
  pipeline: 'ml',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    // Shared experiment + autolog
    { id: 'n1',  definitionId: 'ml.mlflow.set_experiment',   position: { x:  60, y: 240 }, config: { experiment_name: 'fraud-hparam-search', run_name: 'sweep-v1', tracking_uri: 'http://localhost:5000' }, status: 'idle' },
    { id: 'n2',  definitionId: 'ml.mlflow.autolog',          position: { x: 300, y: 240 }, config: { framework: 'sklearn', log_input_examples: false, log_model_signatures: true, log_models: true }, status: 'idle' },
    // Data
    { id: 'n3',  definitionId: 'ml.ingest.postgres',         position: { x:  60, y: 440 }, config: { host: 'localhost', port: 5432, database: 'transactions', username: 'analyst', password: '', query: 'SELECT * FROM transactions LIMIT 200000' }, status: 'idle' },
    { id: 'n4',  definitionId: 'ml.transform.missing_values',position: { x: 300, y: 440 }, config: { strategy: 'median' }, status: 'idle' },
    { id: 'n5',  definitionId: 'ml.transform.scaler',        position: { x: 540, y: 440 }, config: { method: 'robust', exclude_columns: ['is_fraud'] }, status: 'idle' },
    { id: 'n6',  definitionId: 'ml.transform.train_test_split', position: { x: 780, y: 440 }, config: { target_column: 'is_fraud', test_size: 0.2, random_state: 0, stratify: true }, status: 'idle' },
    // Model A — Random Forest
    { id: 'n7',  definitionId: 'ml.train.sklearn.random_forest',  position: { x: 1040, y: 280 }, config: { target_column: 'is_fraud', task: 'classification', n_estimators: 500, max_depth: 12, random_state: 1 }, status: 'idle' },
    { id: 'n8',  definitionId: 'ml.evaluate.classification',      position: { x: 1300, y: 280 }, config: { target_column: 'is_fraud', output_report: false, plot_confusion_matrix: false }, status: 'idle' },
    { id: 'n9',  definitionId: 'ml.mlflow.log_params',            position: { x: 1560, y: 180 }, config: { params: { model: 'random_forest', n_estimators: 500, max_depth: 12 } }, status: 'idle' },
    { id: 'n10', definitionId: 'ml.deploy.mlflow',                position: { x: 1560, y: 360 }, config: { experiment_name: 'fraud-hparam-search', model_name: 'fraud-rf', mlflow_tracking_uri: 'http://localhost:5000' }, status: 'idle' },
    // Model B — XGBoost
    { id: 'n11', definitionId: 'ml.train.sklearn.xgboost',        position: { x: 1040, y: 600 }, config: { target_column: 'is_fraud', task: 'classification', n_estimators: 400, learning_rate: 0.05, max_depth: 8, random_state: 1 }, status: 'idle' },
    { id: 'n12', definitionId: 'ml.evaluate.classification',      position: { x: 1300, y: 600 }, config: { target_column: 'is_fraud', output_report: false, plot_confusion_matrix: false }, status: 'idle' },
    { id: 'n13', definitionId: 'ml.mlflow.log_params',            position: { x: 1560, y: 520 }, config: { params: { model: 'xgboost', n_estimators: 400, learning_rate: 0.05 } }, status: 'idle' },
    { id: 'n14', definitionId: 'ml.deploy.mlflow',                position: { x: 1560, y: 700 }, config: { experiment_name: 'fraud-hparam-search', model_name: 'fraud-xgb', mlflow_tracking_uri: 'http://localhost:5000' }, status: 'idle' },
    // Compare + load winner + serve
    { id: 'n15', definitionId: 'ml.mlflow.compare_runs',  position: { x: 1840, y: 440 }, config: { experiment_name: 'fraud-hparam-search', tracking_uri: 'http://localhost:5000', sort_metric: 'f1', max_results: 20 }, status: 'idle' },
    { id: 'n16', definitionId: 'ml.mlflow.load_model',    position: { x: 2080, y: 440 }, config: { model_name: 'fraud-xgb', model_version: 'Production', tracking_uri: 'http://localhost:5000' }, status: 'idle' },
    { id: 'n17', definitionId: 'ml.deploy.fastapi',       position: { x: 2320, y: 340 }, config: { host: '0.0.0.0', port: 8080, route_prefix: '/fraud' }, status: 'idle' },
    { id: 'n18', definitionId: 'ml.monitor.model_performance', position: { x: 2320, y: 540 }, config: { threshold_accuracy: 0.98, alert_webhook: '' }, status: 'idle' },
  ],
  edges: [
    { id: 'e1',  source: 'n1',  sourceHandle: 'run',      target: 'n2',  targetHandle: 'run' },
    { id: 'e2',  source: 'n3',  sourceHandle: 'df',       target: 'n4',  targetHandle: 'df_in' },
    { id: 'e3',  source: 'n4',  sourceHandle: 'df_out',   target: 'n5',  targetHandle: 'df_in' },
    { id: 'e4',  source: 'n5',  sourceHandle: 'df_out',   target: 'n6',  targetHandle: 'df_in' },
    // Branch A
    { id: 'e5',  source: 'n6',  sourceHandle: 'df_train', target: 'n7',  targetHandle: 'df_train' },
    { id: 'e6',  source: 'n6',  sourceHandle: 'df_test',  target: 'n8',  targetHandle: 'df_test' },
    { id: 'e7',  source: 'n7',  sourceHandle: 'model',    target: 'n8',  targetHandle: 'model' },
    { id: 'e8',  source: 'n2',  sourceHandle: 'run',      target: 'n9',  targetHandle: 'run' },
    { id: 'e9',  source: 'n8',  sourceHandle: 'metrics',  target: 'n9',  targetHandle: 'metrics' },
    { id: 'e10', source: 'n7',  sourceHandle: 'model',    target: 'n10', targetHandle: 'model' },
    { id: 'e11', source: 'n8',  sourceHandle: 'metrics',  target: 'n10', targetHandle: 'metrics' },
    // Branch B
    { id: 'e12', source: 'n6',  sourceHandle: 'df_train', target: 'n11', targetHandle: 'df_train' },
    { id: 'e13', source: 'n6',  sourceHandle: 'df_test',  target: 'n12', targetHandle: 'df_test' },
    { id: 'e14', source: 'n11', sourceHandle: 'model',    target: 'n12', targetHandle: 'model' },
    { id: 'e15', source: 'n2',  sourceHandle: 'run',      target: 'n13', targetHandle: 'run' },
    { id: 'e16', source: 'n12', sourceHandle: 'metrics',  target: 'n13', targetHandle: 'metrics' },
    { id: 'e17', source: 'n11', sourceHandle: 'model',    target: 'n14', targetHandle: 'model' },
    { id: 'e18', source: 'n12', sourceHandle: 'metrics',  target: 'n14', targetHandle: 'metrics' },
    // Compare + load + deploy
    { id: 'e19', source: 'n10', sourceHandle: 'run',      target: 'n15', targetHandle: 'run' },
    { id: 'e20', source: 'n14', sourceHandle: 'run',      target: 'n15', targetHandle: 'run' },
    { id: 'e21', source: 'n15', sourceHandle: 'df',       target: 'n16', targetHandle: 'run' },
    { id: 'e22', source: 'n16', sourceHandle: 'model',    target: 'n17', targetHandle: 'model' },
    { id: 'e23', source: 'n16', sourceHandle: 'model',    target: 'n18', targetHandle: 'metrics' },
  ],
}

/** 11. LLM Fine-Tuning + MLflow Tracking → RAG Deployment */
export const llmMlflowFinetuneDeploy: PipelineDAG = {
  id: 'sample-llm-mlflow-finetune',
  name: 'QLoRA Fine-Tune + MLflow Tracking → RAG Deployment',
  pipeline: 'llm',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    // MLflow experiment tracking for fine-tuning
    { id: 'n1',  definitionId: 'ml.mlflow.set_experiment',    position: { x:  60, y: 120 }, config: { experiment_name: 'llm-qlora-finetune', run_name: 'llama3-8b-v1', tracking_uri: 'http://localhost:5000' }, status: 'idle' },
    { id: 'n2',  definitionId: 'ml.mlflow.autolog',           position: { x: 300, y: 120 }, config: { framework: 'pytorch', log_input_examples: false, log_model_signatures: false, log_models: false }, status: 'idle' },
    // Fine-tuning pipeline
    { id: 'n3',  definitionId: 'llm.finetune.dataset_prep',   position: { x:  60, y: 320 }, config: { source_type: 'huggingface', dataset_name: 'HuggingFaceH4/ultrachat_200k', format: 'chatml', max_samples: 10000, train_split: 0.95 }, status: 'idle' },
    { id: 'n4',  definitionId: 'llm.finetune.qlora_config',   position: { x: 360, y: 320 }, config: { base_model: 'meta-llama/Llama-3.1-8B-Instruct', load_in_4bit: true, bnb_4bit_quant_type: 'nf4', bnb_4bit_compute_dtype: 'bfloat16', use_nested_quant: true, r: 32, lora_alpha: 16, lora_dropout: 0.05, target_modules: ['q_proj', 'v_proj', 'k_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj'] }, status: 'idle' },
    { id: 'n5',  definitionId: 'llm.finetune.sft_trainer',    position: { x: 680, y: 320 }, config: { output_dir: './qlora_llama_chat', num_train_epochs: 2, per_device_train_batch_size: 2, gradient_accumulation_steps: 8, learning_rate: 0.0002, lr_scheduler_type: 'cosine', warmup_ratio: 0.03, max_seq_length: 4096, bf16: true, fp16: false, packing: true }, status: 'idle' },
    // MLflow logging of fine-tuning params + compare
    { id: 'n6',  definitionId: 'ml.mlflow.log_params',        position: { x: 1000, y: 180 }, config: { params: { base_model: 'llama-3.1-8b', r: 32, epochs: 2, lr: 0.0002, dataset: 'ultrachat_200k' } }, status: 'idle' },
    { id: 'n7',  definitionId: 'ml.mlflow.compare_runs',      position: { x: 1000, y: 460 }, config: { experiment_name: 'llm-qlora-finetune', tracking_uri: 'http://localhost:5000', sort_metric: 'eval_loss', max_results: 10 }, status: 'idle' },
    // Merge + push fine-tuned model
    { id: 'n8',  definitionId: 'llm.finetune.merge_push',     position: { x: 1280, y: 320 }, config: { repo_id: 'my-org/llama-3.1-8b-ultrachat-qlora', push_to_hub: true, private: true, save_merged_local: true, merged_output_dir: './merged_llama_chat', token_env: 'HF_TOKEN' }, status: 'idle' },
    // Load model from MLflow registry
    { id: 'n9',  definitionId: 'ml.mlflow.load_model',        position: { x: 1560, y: 320 }, config: { model_name: 'llama-3.1-8b-chat', model_version: 'Production', tracking_uri: 'http://localhost:5000' }, status: 'idle' },
    // RAG deployment with fine-tuned model
    { id: 'n10', definitionId: 'llm.ingest.pdf',              position: { x: 1560, y: 540 }, config: { file_path: 'domain_docs/', recursive: true, extract_images: false }, status: 'idle' },
    { id: 'n11', definitionId: 'llm.chunk.recursive',         position: { x: 1800, y: 540 }, config: { chunk_size: 1000, chunk_overlap: 200, separators: ['\n\n', '\n', ' '] }, status: 'idle' },
    { id: 'n12', definitionId: 'llm.embed.openai',            position: { x: 2040, y: 540 }, config: { model: 'text-embedding-3-small', batch_size: 100 }, status: 'idle' },
    { id: 'n13', definitionId: 'llm.vectorstore.chroma',      position: { x: 2280, y: 540 }, config: { collection_name: 'domain-kb', persist_directory: './chroma_db', distance_metric: 'cosine' }, status: 'idle' },
    { id: 'n14', definitionId: 'llm.chain.rag',               position: { x: 2280, y: 320 }, config: { top_k: 5, prompt_template: 'Use the context below to answer with your expertise.\n\nContext: {context}\n\nQuestion: {question}', return_source_documents: true }, status: 'idle' },
    { id: 'n15', definitionId: 'llm.monitor.usage',           position: { x: 2520, y: 200 }, config: { log_prompts: false, log_completions: false, export_format: 'jsonl' }, status: 'idle' },
    { id: 'n16', definitionId: 'llm.deploy.langserve',        position: { x: 2520, y: 420 }, config: { host: '0.0.0.0', port: 8080, path: '/chat-rag', enable_playground: true }, status: 'idle' },
  ],
  edges: [
    // Experiment setup
    { id: 'e1',  source: 'n1',  sourceHandle: 'run',       target: 'n2',  targetHandle: 'run' },
    // Fine-tuning flow
    { id: 'e2',  source: 'n3',  sourceHandle: 'dataset',   target: 'n5',  targetHandle: 'dataset' },
    { id: 'e3',  source: 'n4',  sourceHandle: 'config',    target: 'n5',  targetHandle: 'config' },
    // Log params + compare
    { id: 'e4',  source: 'n2',  sourceHandle: 'run',       target: 'n6',  targetHandle: 'run' },
    { id: 'e5',  source: 'n5',  sourceHandle: 'model',     target: 'n6',  targetHandle: 'metrics' },
    { id: 'e6',  source: 'n2',  sourceHandle: 'run',       target: 'n7',  targetHandle: 'run' },
    // Merge and push
    { id: 'e7',  source: 'n5',  sourceHandle: 'model',     target: 'n8',  targetHandle: 'model' },
    { id: 'e8',  source: 'n7',  sourceHandle: 'df',        target: 'n9',  targetHandle: 'run' },
    // RAG pipeline with fine-tuned model
    { id: 'e9',  source: 'n10', sourceHandle: 'docs',      target: 'n11', targetHandle: 'docs' },
    { id: 'e10', source: 'n11', sourceHandle: 'chunks',    target: 'n12', targetHandle: 'chunks' },
    { id: 'e11', source: 'n12', sourceHandle: 'embeddings',target: 'n13', targetHandle: 'embeddings' },
    { id: 'e12', source: 'n13', sourceHandle: 'vectorstore',target: 'n14',targetHandle: 'vectorstore' },
    { id: 'e13', source: 'n9',  sourceHandle: 'model',     target: 'n14', targetHandle: 'llm' },
    { id: 'e14', source: 'n14', sourceHandle: 'chain',     target: 'n15', targetHandle: 'chain' },
    { id: 'e15', source: 'n14', sourceHandle: 'chain',     target: 'n16', targetHandle: 'chain' },
  ],
}

// ─── CATALOG ─────────────────────────────────────────────────────────────────

export interface SampleEntry {
  dag: PipelineDAG
  description: string
  tags: string[]
}

export const ML_SAMPLES: SampleEntry[] = [
  {
    dag: mlIrisClassification,
    description: 'Classic multiclass classification on the Iris dataset using a Random Forest. Includes missing-value handling, train/test split, evaluation report, MLflow registry, and Evidently drift monitoring.',
    tags: ['classification', 'sklearn', 'mlflow', 'drift'],
  },
  {
    dag: mlHousePriceRegression,
    description: 'Predict house sale prices with XGBoost. Pipeline covers imputation, standard scaling, regression evaluation, and logs the model + metrics to MLflow.',
    tags: ['regression', 'xgboost', 'mlflow', 'scaling'],
  },
  {
    dag: mlCustomerChurn,
    description: 'Binary churn prediction using Logistic Regression. Handles categorical encoding (one-hot), MinMax scaling, and monitors feature drift with Evidently.',
    tags: ['classification', 'logistic-regression', 'encoding', 'drift'],
  },
  {
    dag: mlImageClassification,
    description: 'Train a Keras CNN on image data loaded from S3. Deploys the model to HuggingFace Hub for public serving.',
    tags: ['deep-learning', 'keras', 'cnn', 's3', 'huggingface'],
  },
  {
    dag: mlFraudDetection,
    description: 'Detect fraudulent transactions from a PostgreSQL source. Applies IQR outlier removal, robust scaling, and deploys a FastAPI inference endpoint with performance monitoring.',
    tags: ['classification', 'gradient-boosting', 'postgres', 'fastapi', 'monitoring'],
  },
  {
    dag: mlMlflowExperiment,
    description: 'Full MLflow experiment lifecycle using sklearn autologging. Sets up a named experiment, enables autolog, trains a Random Forest, evaluates it, then explicitly logs params and custom metrics.',
    tags: ['mlflow', 'experiment-tracking', 'autolog', 'sklearn'],
  },
  {
    dag: mlMlflowABComparison,
    description: 'Run two models (Random Forest vs XGBoost) under the same MLflow experiment. Both are registered in the Model Registry; the Compare Runs node fetches all runs for side-by-side metric analysis.',
    tags: ['mlflow', 'a/b-testing', 'model-comparison', 'sklearn', 'xgboost'],
  },
  {
    dag: mlMlflowLoadServe,
    description: 'Load the Production-staged version of a model directly from MLflow Model Registry, evaluate it on new data, and serve predictions via a FastAPI endpoint with performance alerting.',
    tags: ['mlflow', 'model-registry', 'inference', 'fastapi', 'monitoring'],
  },
  {
    dag: mlMlflowFullLifecycle,
    description: 'Complete MLOps lifecycle using all 5 MLflow nodes: set experiment → autolog → train XGBoost on churn data → log custom params → register in Model Registry → compare runs → load Production model → serve via FastAPI → drift monitoring.',
    tags: ['mlflow', 'full-lifecycle', 'autolog', 'model-registry', 'xgboost', 'fastapi', 'monitoring'],
  },
  {
    dag: mlMlflowHyperparamTuning,
    description: 'Parallel hyperparameter sweep: Random Forest vs XGBoost both tracked under one MLflow experiment with autolog. Log per-model params, register both to Model Registry, use Compare Runs to select winner, load Production model and serve with performance monitoring.',
    tags: ['mlflow', 'hyperparameter-tuning', 'a/b-testing', 'autolog', 'compare-runs', 'model-registry'],
  },
]

export const LLM_SAMPLES: SampleEntry[] = [
  {
    dag: llmPdfRag,
    description: 'Load PDF documents, chunk with recursive splitter, embed via OpenAI, store in Chroma, and serve a RAG chatbot with LangServe.',
    tags: ['rag', 'pdf', 'openai', 'chroma', 'langserve'],
  },
  {
    dag: llmWebRagClaude,
    description: 'Scrape web documentation, embed with a local HuggingFace model, index in FAISS, and answer questions using Claude Sonnet via a FastAPI endpoint.',
    tags: ['rag', 'web-scraping', 'claude', 'faiss', 'huggingface-embed'],
  },
  {
    dag: llmLocalOllamaRag,
    description: 'Fully local and private RAG pipeline. Uses Ollama for both embeddings (nomic-embed-text) and generation (Llama 3). No cloud APIs required.',
    tags: ['rag', 'ollama', 'local', 'private', 'faiss'],
  },
  {
    dag: llmReactAgent,
    description: 'GPT-4o ReAct agent with web search, calculator, and Python REPL tools. Logs token usage with the monitor node and serves via FastAPI.',
    tags: ['agent', 'react', 'openai', 'tools', 'monitoring'],
  },
  {
    dag: llmS3PineconeEnterprise,
    description: 'Enterprise-grade RAG: ingest company docs from S3, embed with OpenAI large model, index in Pinecone, answer with Claude Opus. Includes usage monitoring.',
    tags: ['rag', 'enterprise', 's3', 'pinecone', 'claude', 'openai'],
  },
  {
    dag: llmLoraFinetune,
    description: 'Fine-tune Llama 3.2 1B on the Alpaca instruction dataset using LoRA (rank 16). Formats data in Alpaca prompt style, trains for 3 epochs with BF16, then merges adapter weights and pushes to HuggingFace Hub.',
    tags: ['fine-tuning', 'lora', 'llama', 'huggingface', 'instruction-tuning'],
  },
  {
    dag: llmQloraFinetune,
    description: 'Fine-tune Llama 3.1 8B on a custom JSONL dataset using QLoRA — 4-bit NF4 quantization (bitsandbytes) with rank-64 LoRA adapters. Uses ChatML format, sample packing, and pushes the merged model as a private HF repo.',
    tags: ['fine-tuning', 'qlora', '4-bit', 'quantization', 'llama', 'bitsandbytes'],
  },
  {
    dag: llmDocSummarization,
    description: 'Map-reduce summarization of long PDF reports using Claude Sonnet. Each chunk is individually summarized (map), then combined into a final executive summary (reduce).',
    tags: ['summarization', 'claude', 'langgraph', 'map-reduce', 'pdf'],
  },
  {
    dag: llmCodeAssistantRag,
    description: 'Index a codebase from S3 into Chroma, then answer developer questions with GPT-4o. Source files and markdown docs are chunked and searchable. Includes usage monitoring and LangServe playground.',
    tags: ['rag', 'code-assistant', 'openai', 'chroma', 's3', 'langserve'],
  },
  {
    dag: llmLangGraphMultiAgent,
    description: 'Supervisor-style multi-agent workflow with a Researcher (GPT-4o) and Writer/Critic (Claude Sonnet). Agents share a FAISS knowledge base and coordinate via LangGraph state machine.',
    tags: ['agent', 'multi-agent', 'langgraph', 'openai', 'claude', 'faiss'],
  },
  {
    dag: llmMlflowFinetuneDeploy,
    description: 'QLoRA fine-tune Llama 3.1 8B on UltraChat with full MLflow experiment tracking: set experiment → PyTorch autolog → SFT trainer → log fine-tuning params → compare runs → merge & push to HuggingFace → load from MLflow registry → deploy as domain-specific RAG chatbot with LangServe.',
    tags: ['fine-tuning', 'qlora', 'mlflow', 'experiment-tracking', 'rag', 'langserve', 'llama'],
  },
]
