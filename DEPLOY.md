# Deployment Guide - Google Cloud Run

This guide explains how to deploy API Weaver to Google Cloud Run.

## Prerequisites

1. Google Cloud account with billing enabled
2. Google Cloud SDK (gcloud) installed
3. Docker installed (optional, for local testing)

## Quick Deploy with gcloud

### 1. Set up Google Cloud Project

```bash
# Login to Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### 2. Set Environment Variables

Create secrets in Google Cloud Secret Manager:

```bash
# Create API_KEY secret
echo -n "your-secure-api-key" | gcloud secrets create API_KEY --data-file=-

# Create SESSION_SECRET secret
echo -n "your-session-secret" | gcloud secrets create SESSION_SECRET --data-file=-
```

### 3. Deploy to Cloud Run

```bash
# Deploy directly from source (recommended)
gcloud run deploy api-weaver \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 5000 \
  --set-secrets="API_KEY=API_KEY:latest,SESSION_SECRET=SESSION_SECRET:latest" \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 10
```

### 4. Get Your Service URL

After deployment, you'll receive a URL like:
```
https://api-weaver-xxxxx-uc.a.run.app
```

## Manual Docker Build & Deploy

### 1. Build Docker Image

```bash
# Build the image
docker build -t api-weaver .

# Test locally
docker run -p 5000:5000 \
  -e API_KEY=your-api-key \
  -e SESSION_SECRET=your-session-secret \
  api-weaver
```

### 2. Push to Google Container Registry

```bash
# Tag the image
docker tag api-weaver gcr.io/YOUR_PROJECT_ID/api-weaver

# Push to GCR
docker push gcr.io/YOUR_PROJECT_ID/api-weaver
```

### 3. Deploy from Container Registry

```bash
gcloud run deploy api-weaver \
  --image gcr.io/YOUR_PROJECT_ID/api-weaver \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 5000 \
  --set-secrets="API_KEY=API_KEY:latest,SESSION_SECRET=SESSION_SECRET:latest"
```

## Configuration Options

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `API_KEY` | Yes | API key for authentication |
| `SESSION_SECRET` | Yes | Secret for session encryption |
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | Environment mode (default: production) |

### Cloud Run Settings

| Setting | Recommended Value | Description |
|---------|------------------|-------------|
| Memory | 512Mi - 1Gi | Memory allocation |
| CPU | 1 | CPU cores |
| Min instances | 0 | For cost savings (cold start ~2s) |
| Max instances | 10 | Maximum concurrent instances |
| Request timeout | 300s | Request timeout |

## Accessing the Deployed API

### Dashboard
```
https://your-service-url.run.app/
```

### Swagger Documentation
```
https://your-service-url.run.app/docs
```

### API Endpoints (require X-API-KEY header)
```bash
# Get API stats
curl https://your-service-url.run.app/api/stats

# Read file (authenticated)
curl -H "X-API-KEY: your-api-key" \
  https://your-service-url.run.app/api/files/package.json
```

## Continuous Deployment with GitHub

### Connect GitHub to Cloud Build

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click "Connect Repository"
3. Select your GitHub repository
4. Create a trigger with:
   - Event: Push to branch `main`
   - Build configuration: `Dockerfile`

### cloudbuild.yaml (Optional)

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/api-weaver', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/api-weaver']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'api-weaver'
      - '--image'
      - 'gcr.io/$PROJECT_ID/api-weaver'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'

images:
  - 'gcr.io/$PROJECT_ID/api-weaver'
```

## Troubleshooting

### Cold Start Issues
- Increase `min-instances` to 1 for always-on behavior
- Reduce Docker image size by using Alpine base

### Memory Issues
- Increase memory allocation if you see OOM errors
- Monitor memory usage in Cloud Run console

### Authentication Errors
- Verify API_KEY secret is properly configured
- Check Cloud Run service account has Secret Manager access

## Cost Estimation

Cloud Run pricing (as of 2024):
- Free tier: 2 million requests/month
- CPU: $0.00002400/vCPU-second
- Memory: $0.00000250/GiB-second
- Requests: $0.40/million requests

For a typical API server with moderate traffic:
- ~$5-20/month for low traffic
- ~$50-100/month for medium traffic
