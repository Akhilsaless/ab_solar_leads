CREATE TABLE IF NOT EXISTS aiGatewaySettings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agencyId INT NOT NULL,
  routingMode ENUM('auto','fastest','free_first','best_quality','manual') NOT NULL DEFAULT 'auto',
  freeModelsOnly BOOLEAN NOT NULL DEFAULT TRUE,
  allowPaidFallback BOOLEAN NOT NULL DEFAULT FALSE,
  monthlyBudgetInr DECIMAL(10,2) NOT NULL DEFAULT 0,
  warningThresholdPercent INT NOT NULL DEFAULT 70,
  criticalThresholdPercent INT NOT NULL DEFAULT 90,
  providerPriority JSON NULL,
  featurePolicies JSON NULL,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY aiGatewaySettings_agency_unique (agencyId)
);

CREATE TABLE IF NOT EXISTS aiProviderConnections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agencyId INT NOT NULL,
  provider VARCHAR(50) NOT NULL,
  connectionType ENUM('api_key','oauth','builtin','custom') NOT NULL DEFAULT 'api_key',
  status ENUM('not_connected','configuration_required','connected','error','rate_limited','unavailable') NOT NULL DEFAULT 'not_connected',
  healthStatus ENUM('unknown','healthy','slow','rate_limited','unavailable','authentication_error') NOT NULL DEFAULT 'unknown',
  encryptedCredential TEXT NULL,
  encryptedExtraCredentials TEXT NULL,
  credentialHint VARCHAR(80) NULL,
  accountId VARCHAR(255) NULL,
  baseUrl VARCHAR(500) NULL,
  defaultModel VARCHAR(255) NULL,
  isEnabled BOOLEAN NOT NULL DEFAULT FALSE,
  isFreeTier BOOLEAN NOT NULL DEFAULT FALSE,
  priority INT NOT NULL DEFAULT 100,
  lastValidatedAt TIMESTAMP NULL,
  lastSuccessfulAt TIMESTAMP NULL,
  averageLatencyMs INT NULL,
  lastErrorCode VARCHAR(100) NULL,
  lastErrorMessage VARCHAR(500) NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY aiProviderConnections_agency_provider_unique (agencyId, provider)
);

CREATE TABLE IF NOT EXISTS aiProviderModels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  providerConnectionId INT NOT NULL,
  modelId VARCHAR(255) NOT NULL,
  displayName VARCHAR(255) NULL,
  categories JSON NULL,
  capabilities JSON NULL,
  isFree BOOLEAN NOT NULL DEFAULT FALSE,
  isAvailable BOOLEAN NOT NULL DEFAULT TRUE,
  discoveredAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY aiProviderModels_connection_model_unique (providerConnectionId, modelId)
);

CREATE TABLE IF NOT EXISTS aiGatewayUsage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agencyId INT NOT NULL,
  providerConnectionId INT NULL,
  provider VARCHAR(50) NOT NULL,
  modelId VARCHAR(255) NULL,
  feature VARCHAR(100) NOT NULL,
  routingMode VARCHAR(50) NOT NULL,
  latencyMs INT NULL,
  inputTokens INT NULL,
  outputTokens INT NULL,
  estimatedCostInr DECIMAL(10,4) NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL,
  usedFallback BOOLEAN NOT NULL DEFAULT FALSE,
  errorCode VARCHAR(100) NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY aiGatewayUsage_agency_created_idx (agencyId, createdAt)
);
