CREATE TABLE IF NOT EXISTS klausAiConfig (
  agencyId int NOT NULL PRIMARY KEY,
  provider enum('builtin','openai_compatible') NOT NULL DEFAULT 'builtin',
  externalBaseUrl varchar(500) NULL,
  externalModel varchar(120) NULL,
  updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
