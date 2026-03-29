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
  if (
    definitionId === 'ml.deploy.mlflow' ||
    definitionId.startsWith('ml.mlflow.')
  ) {
    const uri = get('MLflow', 'tracking_uri')
    if (uri) {
      // ml.deploy.mlflow uses mlflow_tracking_uri; ml.mlflow.* uses tracking_uri
      if (definitionId === 'ml.deploy.mlflow') result['mlflow_tracking_uri'] = uri
      else result['tracking_uri'] = uri
    }
  }

  // ── HuggingFace Hub ──────────────────────────────────────────────────────
  if (
    definitionId === 'ml.ingest.huggingface' ||
    definitionId === 'ml.deploy.huggingface_hub' ||
    definitionId.startsWith('llm.finetune.')
  ) {
    const token = get('HuggingFace Hub', 'token')
    if (token) result['hf_token'] = token
    const cache = get('HuggingFace Hub', 'cache_dir')
    if (cache) result['cache_dir'] = cache
  }

  // ── OpenAI ───────────────────────────────────────────────────────────────
  if (
    definitionId === 'llm.embed.openai' ||
    definitionId === 'llm.model.openai'
  ) {
    const key = get('OpenAI', 'api_key')
    if (key) result['api_key'] = key
    const base = get('OpenAI', 'base_url')
    if (base) result['base_url'] = base
    const org = get('OpenAI', 'org_id')
    if (org) result['org_id'] = org
  }

  // ── Anthropic ────────────────────────────────────────────────────────────
  if (definitionId === 'llm.model.anthropic') {
    const key = get('Anthropic', 'api_key')
    if (key) result['api_key'] = key
  }

  // ── AWS S3 ───────────────────────────────────────────────────────────────
  if (
    definitionId === 'ml.ingest.s3' ||
    definitionId === 'llm.ingest.s3_docs'
  ) {
    const keyId = get('AWS S3', 'aws_access_key_id')
    if (keyId) result['aws_access_key_id'] = keyId
    const secret = get('AWS S3', 'aws_secret_access_key')
    if (secret) result['aws_secret_access_key'] = secret
    const region = get('AWS S3', 'aws_region')
    if (region) result['aws_region'] = region
  }

  return result
}
