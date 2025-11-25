#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "Checking Health..."
curl -s "$BASE_URL/health" | grep "ok" && echo "✅ Health Check Passed" || echo "❌ Health Check Failed"

echo "Fetching Video Info..."
# Example: Rick Roll
curl -s "$BASE_URL/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ" > info.json
if [ -s info.json ]; then
    echo "✅ Info Fetch Passed"
else
    echo "❌ Info Fetch Failed"
fi

echo "Fetching Formats..."
curl -s "$BASE_URL/formats?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ" > formats.json
if [ -s formats.json ]; then
    echo "✅ Formats Fetch Passed"
else
    echo "❌ Formats Fetch Failed"
fi

echo "Testing Download (Header check only)..."
curl -I "$BASE_URL/download?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ" | grep "Content-Disposition" && echo "✅ Download Endpoint Reachable" || echo "❌ Download Endpoint Failed"

echo "Done. Check info.json and formats.json for details."
