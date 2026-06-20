targetScope = 'resourceGroup'

@description('Deployment location for all Azure resources.')
param location string = resourceGroup().location

@description('Existing Container Apps managed environment resource ID. When provided, deployment reuses it instead of creating a new environment.')
param existingManagedEnvironmentResourceId string = ''

var unique = uniqueString(resourceGroup().id)
var prefix = toLower('vp${substring(unique, 0, 8)}')
var appName = '${prefix}-web'
var envName = '${prefix}-env'
var acrName = toLower(replace('${prefix}acr', '-', ''))
var identityName = '${prefix}-uami'
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
    }
    template: {
      containers: [
        {
          name: 'web'
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
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
}

output containerRegistryLoginServer string = containerRegistry.properties.loginServer
output webContainerApp string = webApp.name
output webUrl string = 'https://${webApp.properties.configuration.ingress.fqdn}'
