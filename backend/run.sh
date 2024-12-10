cd ../frontend;
npm run build;
if [ -d "../backend/dist" ]; then
  rm -r ../backend/dist;
fi
mv dist/ ../backend/;
cd ../backend/;
uvicorn main:app --port 8000 --reload
