import type { PipelineDAG } from '@ai-ide/types'

/**
 * End-to-end Iris classification pipeline:
 *
 *   CSV Ingest → Missing Values → Train/Test Split
 *                                    ├─ df_train → Random Forest → Classification Report → MLflow Registry
 *                                    └─ df_test  ──────────────────────────────────────↗
 *                                                                    ↓
 *                                                          Evidently Drift Monitor
 */
export const sampleMlopsFlow: PipelineDAG = {
  id: 'sample-mlops-iris-flow',
  name: 'Iris Classification Pipeline',
  pipeline: 'ml',
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
  nodes: [
    {
      id: 'node-ingest-csv',
      definitionId: 'ml.ingest.csv',
      position: { x: 60, y: 240 },
      config: {
        file_path: 'iris.csv',
        separator: ',',
        encoding: 'utf-8',
        header: 0,
      },
      status: 'idle',
    },
    {
      id: 'node-missing-values',
      definitionId: 'ml.transform.missing_values',
      position: { x: 300, y: 240 },
      config: {
        strategy: 'drop_rows',
      },
      status: 'idle',
    },
    {
      id: 'node-split',
      definitionId: 'ml.transform.train_test_split',
      position: { x: 540, y: 240 },
      config: {
        target_column: 'species',
        test_size: 0.2,
        random_state: 42,
        stratify: true,
      },
      status: 'idle',
    },
    {
      id: 'node-train-rf',
      definitionId: 'ml.train.sklearn.random_forest',
      position: { x: 800, y: 140 },
      config: {
        target_column: 'species',
        task: 'classification',
        n_estimators: 100,
        max_depth: 0,
        random_state: 42,
      },
      status: 'idle',
    },
    {
      id: 'node-evaluate',
      definitionId: 'ml.evaluate.classification',
      position: { x: 1060, y: 240 },
      config: {
        target_column: 'species',
        output_report: true,
        plot_confusion_matrix: true,
      },
      status: 'idle',
    },
    {
      id: 'node-mlflow',
      definitionId: 'ml.deploy.mlflow',
      position: { x: 1320, y: 240 },
      config: {
        experiment_name: 'iris-classification',
        model_name: 'iris-random-forest',
        mlflow_tracking_uri: 'http://localhost:5000',
      },
      status: 'idle',
    },
    {
      id: 'node-drift-monitor',
      definitionId: 'ml.monitor.evidently_drift',
      position: { x: 1580, y: 240 },
      config: {
        drift_share_threshold: 0.15,
        report_path: 'iris_drift_report.html',
      },
      status: 'idle',
    },
  ],
  edges: [
    // CSV Ingest → Missing Values
    {
      id: 'edge-ingest-to-missing',
      source: 'node-ingest-csv',
      sourceHandle: 'df',
      target: 'node-missing-values',
      targetHandle: 'df_in',
    },
    // Missing Values → Train/Test Split
    {
      id: 'edge-missing-to-split',
      source: 'node-missing-values',
      sourceHandle: 'df_out',
      target: 'node-split',
      targetHandle: 'df_in',
    },
    // Split df_train → Random Forest
    {
      id: 'edge-split-train-to-rf',
      source: 'node-split',
      sourceHandle: 'df_train',
      target: 'node-train-rf',
      targetHandle: 'df_train',
    },
    // Split df_test → Classification Report
    {
      id: 'edge-split-test-to-eval',
      source: 'node-split',
      sourceHandle: 'df_test',
      target: 'node-evaluate',
      targetHandle: 'df_test',
    },
    // Random Forest model → Classification Report
    {
      id: 'edge-rf-to-eval',
      source: 'node-train-rf',
      sourceHandle: 'model',
      target: 'node-evaluate',
      targetHandle: 'model',
    },
    // Random Forest model → MLflow
    {
      id: 'edge-rf-to-mlflow',
      source: 'node-train-rf',
      sourceHandle: 'model',
      target: 'node-mlflow',
      targetHandle: 'model',
    },
    // Classification Report metrics → MLflow
    {
      id: 'edge-eval-to-mlflow',
      source: 'node-evaluate',
      sourceHandle: 'metrics',
      target: 'node-mlflow',
      targetHandle: 'metrics',
    },
    // Split train df → Evidently (reference = training distribution)
    {
      id: 'edge-split-train-to-drift',
      source: 'node-split',
      sourceHandle: 'df_train',
      target: 'node-drift-monitor',
      targetHandle: 'df_reference',
    },
    // Split test df → Evidently (current = new data distribution)
    {
      id: 'edge-split-test-to-drift',
      source: 'node-split',
      sourceHandle: 'df_test',
      target: 'node-drift-monitor',
      targetHandle: 'df_current',
    },
  ],
}
