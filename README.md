# Kubernetes toolbox 🐬 ☸  ️ 
The tollbox contains utilies to deploy kubernetes services

## Commands

### `kube-deploy` command
`kube-deploy` will take a yml configuration file under `--config` argument and deploy your service to default kubernetes cluster

#### config file
Config file can be written in `yaml` file. it support serverless framework style extensions using [sls-yaml]

##### Sample config
```yaml
# common.yml
version: 1
name: awesome-service

# context: ${global:env}-context # Optional
image.tag: ${env:GIT_COMMIT_SHA1}
values: ../helm/values-${global:env}.yml
chart: ../helm/chart
```
```yaml
# prod.yml
env: prod
app: ${file(./common.yml)}
```
```yaml
# stage.yml
env: stage
app: ${file(./common.yml)}
```

### Deployment
```bash
kube-deploy --config=.kube/config/prod.yml
```
#### Options
|  Argument    | Description             |
|--------------|-------------------------|
| `--context`  | Set kubernetes context  |
| `--name`     | Service name            |
| `--chart`    | Chart path              | 
| `--values`   | Values path             |
| `--dryRun`   | Simulate deployment     |
| `--image.tag`| Docker image tag        |

[sls-yaml]: https://github.com/01alchemist/sls-yaml

