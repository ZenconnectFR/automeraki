gcloud run deploy automeraki \
    --source=. \
    --project=test-416522 \
    --region=europe-west9 \
    --platform=managed \
    --allow-unauthenticated \
    --execution-environment=gen2 \
    --timeout=300 \
    --cpu-boost