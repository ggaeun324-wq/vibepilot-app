targetScope = 'resourceGroup'

@description('Deployment location for all Azure resources.')
param location string = resourceGroup().location

@description('Existing Container Apps managed environment resource ID. When provided, deployment reuses it instead of creating a new environment.')
param existingManagedEnvironmentResourceId string = ''

@description('PostgreSQL administrator login name.')
param postgresAdminUser string = 'vibeadmin'

@description('PostgreSQL administrator password. Provided as a secure parameter (never stored in code).')
@secure()
param postgresAdminPassword string

@description('Object ID of the principal running the deployment. Used to grant Key Vault data-plane access so the deployment can write secrets. azd fills this automatically.')
param principalId string = ''

@description('Container image for the web app. Defaults to a placeholder; pass the real image when applying so a running deployment is not reverted.')
param containerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

var databaseName = 'vibepilot'

var unique = uniqueString(resourceGroup().id)
var prefix = toLower('vp${substring(unique, 0, 8)}')
var appName = '${prefix}-web'
var envName = '${prefix}-env'
var acrName = toLower(replace('${prefix}acr', '-', ''))
var identityName = '${prefix}-uami'
var postgresName = '${prefix}-pg'
var keyVaultName = '${prefix}kv'
var openAiName = '${prefix}-openai'
var embeddingDeploymentName = 'text-embedding-3-large'
var embeddingDimensions = 1536
var useExistingManagedEnvironment = !empty(existingManagedEnvironmentResourceId)
var managedEnvironmentId = useExistingManagedEnvironment ? existingManagedEnvironmentResourceId : containerAppEnvironment.id

// Shared logging workspace. Container Apps requires a Log Analytics workspace.
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = if (!useExistingManagedEnvironment) {
  name: '${prefix}-law'
  location: location
  tags: {
    'azd-service-name': 'observability'
  }
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  tags: {
    'azd-service-name': 'registry'
  }
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

resource userAssignedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: identityName
  location: location
  tags: {
    'azd-service-name': 'identity'
  }
}

resource containerAppEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = if (!useExistingManagedEnvironment) {
  name: envName
  location: location
  tags: {
    'azd-service-name': 'containerappenv'
  }
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: listKeys(logAnalytics.id, '2023-09-01').primarySharedKey
      }
    }
  }
}

var acrPullRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')

resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerRegistry.id, userAssignedIdentity.id, acrPullRoleId)
  scope: containerRegistry
  properties: {
    principalId: userAssignedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: acrPullRoleId
  }
}

// ── PostgreSQL Flexible Server (운영 DB) ───────────────────────────────
// 어제 az 명령으로 손수 만든 DB를 이제 코드로 선언한다.
// Burstable B1ms = 가장 저렴한 등급(개발용). 비밀번호는 secure 파라미터로 주입.
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: postgresName
  location: location
  tags: {
    'azd-service-name': 'database'
  }
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: postgresAdminUser
    administratorLoginPassword: postgresAdminPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    authConfig: {
      activeDirectoryAuth: 'Disabled'
      passwordAuth: 'Enabled'
    }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// Azure 내부 서비스(우리 Container App 포함)가 DB에 접속하도록 허용하는 규칙.
// 0.0.0.0~0.0.0.0 은 "모든 Azure 서비스 허용"이라는 특수 의미다.
resource allowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgres
  name: 'AllowAllAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// pgvector 확장 허용. Flexible Server는 보안상 확장을 기본 차단하므로
// azure.extensions 에 VECTOR 를 등록해야 마이그레이션에서 CREATE EXTENSION vector 가 가능.
resource postgresVectorConfig 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  parent: postgres
  name: 'azure.extensions'
  properties: {
    value: 'VECTOR'
    source: 'user-override'
  }
}

// ── Key Vault (비밀번호 금고) ──────────────────────────────────────────
// DB 접속 문자열을 평문 env 대신 금고에 보관한다. RBAC로 접근을 통제.
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: {
    'azd-service-name': 'vault'
  }
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    publicNetworkAccess: 'Enabled'
  }
}

// 역할 정의 ID (Azure 내장 역할):
// - Key Vault Secrets User: 시크릿 읽기 (앱이 사용)
// - Key Vault Secrets Officer: 시크릿 읽기/쓰기 (배포자가 시크릿을 만들 때 필요)
var kvSecretsUserRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
var kvSecretsOfficerRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7')

// 앱의 신원(UAMI)에게 "시크릿 읽기" 권한 부여 → 컨테이너가 금고에서 DATABASE_URL을 꺼냄
resource kvSecretsUserAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, userAssignedIdentity.id, kvSecretsUserRoleId)
  scope: keyVault
  properties: {
    principalId: userAssignedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: kvSecretsUserRoleId
  }
}

// 배포를 실행하는 사람에게 "시크릿 쓰기" 권한 부여 → 아래 database-url 시크릿 생성 가능
resource kvSecretsOfficerAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(principalId)) {
  name: guid(keyVault.id, principalId, kvSecretsOfficerRoleId)
  scope: keyVault
  properties: {
    principalId: principalId
    principalType: 'User'
    roleDefinitionId: kvSecretsOfficerRoleId
  }
}

// DB 접속 문자열(Prisma용)을 금고 시크릿으로 저장.
// 배포자 권한 부여가 끝난 뒤 생성되도록 dependsOn 명시.
resource databaseUrlSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'database-url'
  properties: {
    value: 'postgresql://${postgresAdminUser}:${postgresAdminPassword}@${postgres.properties.fullyQualifiedDomainName}:5432/${databaseName}?sslmode=require'
  }
  dependsOn: [
    kvSecretsOfficerAssignment
  ]
}

// ── Azure OpenAI (임베딩 생성기) ───────────────────────────────────────
// RAG용 임베딩(text-embedding-3-small)을 만든다. API 키를 끄고(disableLocalAuth)
// 오직 Entra ID(관리 ID) 토큰으로만 호출 → 코드/금고 어디에도 키가 없다.
resource openAi 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: openAiName
  location: location
  tags: {
    'azd-service-name': 'openai'
  }
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: openAiName
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: true
  }
}

// 임베딩 모델 배포. Standard(리전) = 무료체험 구독에 쿼터가 있는 등급.
// 3-large 는 기본 3072차원이나, 호출 시 dimensions=1536 로 줄여 pgvector 인덱스 한계 내로 맞춘다.
resource embeddingDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: openAi
  name: embeddingDeploymentName
  sku: {
    name: 'Standard'
    capacity: 10
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'text-embedding-3-large'
      version: '1'
    }
  }
}

// 앱 신원(UAMI)에게 "Cognitive Services OpenAI User" 권한 → 임베딩 호출 가능
var openAiUserRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd')

resource openAiUserAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(openAi.id, userAssignedIdentity.id, openAiUserRoleId)
  scope: openAi
  properties: {
    principalId: userAssignedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: openAiUserRoleId
  }
}

resource webApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  tags: {
    'azd-service-name': 'web'
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: managedEnvironmentId
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          identity: userAssignedIdentity.id
        }
      ]
      // 금고(Key Vault)에 저장된 database-url 시크릿을 앱 신원으로 끌어온다.
      secrets: [
        {
          name: 'database-url'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/database-url'
          identity: userAssignedIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: containerImage
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            // 평문이 아니라 위 시크릿을 참조 → 코드/설정 어디에도 비번 노출 없음
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            // RAG: 임베딩 호출용. 키가 아니라 관리 ID 토큰으로 인증한다.
            {
              name: 'AZURE_OPENAI_ENDPOINT'
              value: openAi.properties.endpoint
            }
            {
              name: 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT'
              value: embeddingDeploymentName
            }
            {
              name: 'AZURE_OPENAI_EMBEDDING_DIMENSIONS'
              value: string(embeddingDimensions)
            }
            // ManagedIdentityCredential 가 여러 신원 중 우리 UAMI 를 고르도록 clientId 지정
            {
              name: 'AZURE_CLIENT_ID'
              value: userAssignedIdentity.properties.clientId
            }
          ]
          resources: {
            cpu: '0.5'
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 2
      }
    }
  }
  dependsOn: [
    kvSecretsUserAssignment
    databaseUrlSecret
  ]
}

output containerRegistryLoginServer string = containerRegistry.properties.loginServer
output webContainerApp string = webApp.name
output webUrl string = 'https://${webApp.properties.configuration.ingress.fqdn}'
output postgresHost string = postgres.properties.fullyQualifiedDomainName
output postgresDatabase string = databaseName
output keyVaultUri string = keyVault.properties.vaultUri
output openAiEndpoint string = openAi.properties.endpoint
output openAiEmbeddingDeployment string = embeddingDeploymentName
output openAiEmbeddingDimensions int = embeddingDimensions
