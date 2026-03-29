/**
 * Reads saved integration configs from localStorage and provides per-node
 * default config values so nodes are pre-filled when dropped onto the canvas.
 */

const STORAGE_KEY = 'aiide:integrations'

export function loadIntegrationConfigs(): Record<string, Record<string, string>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

/**
 * Returns a flat env-var dict to inject into the pipeline subprocess.
 * Maps saved integration credentials to their conventional env var names.
 */
export function getIntegrationEnvVars(): Record<string, string> {
  const configs = loadIntegrationConfigs()
  const env: Record<string, string> = {}

  const get = (integration: string, key: string): string =>
    configs[integration]?.[key] ?? ''

  const set = (envKey: string, val: string) => { if (val) env[envKey] = val }

  set('OPENAI_API_KEY',                get('OpenAI', 'api_key'))
  set('OPENAI_API_BASE',               get('OpenAI', 'base_url'))
  set('OPENAI_ORG_ID',                 get('OpenAI', 'org_id'))
  set('ANTHROPIC_API_KEY',             get('Anthropic', 'api_key'))
  set('HF_TOKEN',                      get('HuggingFace Hub', 'token'))
  set('HUGGINGFACE_HUB_CACHE',         get('HuggingFace Hub', 'cache_dir'))
  set('AWS_ACCESS_KEY_ID',             get('AWS S3', 'aws_access_key_id'))
  set('AWS_SECRET_ACCESS_KEY',         get('AWS S3', 'aws_secret_access_key'))
  set('AWS_DEFAULT_REGION',            get('AWS S3', 'aws_region'))
  set('MLFLOW_TRACKING_URI',           get('MLflow', 'tracking_uri'))

  return env
}

/**
 * Given a node definitionId, returns any config fields that should be
 * pre-filled from the saved integration settings.
 *
 * Only returns fields that have a non-empty saved value so we never
 * overwrite a node's own defaults with an empty string.
 */
export function getNodeIntegrationDefaults(definitionId: string): Record<string, string> {
  const configs = loadIntegrationConfigs()
  const result: Record<string, string> = {}

  const get = (integration: string, key: string): string =>
    configs[integration]?.[key] ?? ''

  // ── MLflow ───────────────────────────────────────────────────────────────
  const isMlflowNode = definitionId === 'ml.deploy.mlflow' || definitionId.startsWith('ml.mlflow.')
  if (isMlflowNode) {
    const uri = get('MLflow', 'tracking_uri')
    if (uri) {
      // ml.deploy.mlflow uses mlflow_tracking_uri; ml.mlflow.* uses tracking_uri
      if (definitionId === 'ml.deploy.mlflow') result['mlflow_tracking_uri'] = uri
      else result['tracking_uri'] = uri
    }
    // experiment_name populates on all MLflow nodes that have the field
    const exp = get('MLflow', 'experiment_name')
    if (exp) result['experiment_name'] = exp
  }

  // ── HuggingFace Hub ──────────────────────────────────────────────────────
  const isHfNode =
    definitionId === 'ml.ingest.huggingface' ||
    definitionId === 'ml.deploy.huggingface_hub' ||
    definitionId.startsWith('llm.finetune.')

  if (isHfNode) {
    // cache_dir is a direct path value — always safe to pre-fill
    const cache = get('HuggingFace Hub', 'cache_dir')
    if (cache) result['cache_dir'] = cache

    // repo_id: pre-fill with "username/" prefix so the user only has to type the model name
    const username = get('HuggingFace Hub', 'username')
    if (username) result['repo_id'] = `${username}/`

    // token_env: nodes store the name of the env var, not the token itself.
    // Default is already 'HF_TOKEN'; only override if the user has changed it.
    // (The executor passes the actual token as HF_TOKEN env var — see executor.py)
  }

  // ── OpenAI ───────────────────────────────────────────────────────────────
  // Nodes store api_key_env (the env var name). We populate the env var name
  // but not the actual key — credentials flow via the executor's env injection.
  if (definitionId === 'llm.embed.openai' || definitionId === 'llm.model.openai') {
    const base = get('OpenAI', 'base_url')
    if (base) result['base_url'] = base
    const org = get('OpenAI', 'org_id')
    if (org) result['org_id'] = org
    // api_key_env already defaults to OPENAI_API_KEY — no need to set
  }

  // ── Anthropic ────────────────────────────────────────────────────────────
  // api_key_env already defaults to ANTHROPIC_API_KEY — no need to override

  // ── AWS S3 ───────────────────────────────────────────────────────────────
  if (definitionId === 'ml.ingest.s3' || definitionId === 'llm.ingest.s3_docs') {
    const region = get('AWS S3', 'aws_region')
    if (region) result['aws_region'] = region

    const bucket = get('AWS S3', 'default_bucket')
    if (bucket) result['bucket'] = bucket
    // aws_access_key_id / aws_secret_access_key are credentials — not stored
    // directly in node config; they flow via env vars in the executor
  }

  // ── Kubeflow ─────────────────────────────────────────────────────────────
  // Kubeflow nodes don't embed host in config — it's passed at run time
  // via the Kubeflow dialog. No pre-fill needed here.

  return result
}
