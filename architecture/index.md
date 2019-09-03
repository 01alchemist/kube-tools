# Architecture

## Config yaml
```yaml
# package.json
package: ${file(../package.json)}

# App(service) name
name: ${self:package.name}
# App version
version: ${self:package.version}
# semVer: ${semVer(self:version)}

# Istio subset name
subset: v${replace(${self:version},/\./gi,-)}

deploymentName: ${self:name}-${self:subset}

description: ${self:package.description}

env: ${global:env}

values:
  # Service name
  name: ${self:name}
  # Subset name
  subset: ${self:subset}
  # Deployment name
  deploymentName: ${self:deploymentName}

  # Service port
  port: 80
  containerPort: 80
  # App port
  targetPort: ${self:package.port}
  replicas: 1
  # App docker image configuration
  image:
    # Name of the docker repository
    repository: ${self:package.dockerRepository}
    # Setting tasg as git commit hash
    tag: ${git:sha1}
    pullPolicy: Always
  serviceAccount: ${self:deployment}-service-account

# Service configuration
service:
  deploymentName: ${self:deploymentName}

  # Helm minifests output folder 
  output: .build/helm
  
  # Aggregated helm values. Following array will be reduced to an object
  values:
    - ${self:values}
    - ${global:values}

  # Helm chart
  chart:
    - ${file(./helm-config/chart.yml)}
  
  # Service templates
  templates: ${file(./helm-config/templates/index.yml)}
```
