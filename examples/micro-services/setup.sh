minikube start --memory=16384 --cpus=4 --kubernetes-version=v1.14.2
istioctl manifest apply --set addonComponents.grafana.enabled=true --set addonComponents.kiali.enabled=true --set addonComponents.prometheus.enabled=true
