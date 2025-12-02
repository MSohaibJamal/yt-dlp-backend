#!/bin/bash

BASE_URL="http://localhost:3000"
VIDEO_URL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
PLAYLIST_URL="https://www.youtube.com/playlist?list=PL4fGSI1pDJn6puJdseH2t9tTbvnQQrayg"

echo "========================================"
echo "🧪 Testing ALL Endpoints"
echo "========================================"

check_endpoint() {
    url=$1
    name=$2
    echo -n "Testing $name ($url)... "
    status=$(curl -o /dev/null -s -w "%{http_code}\n" "$url")
    if [[ "$status" == "200" ]] || [[ "$status" == "302" ]]; then
        echo "✅ OK ($status)"
    else
        echo "❌ FAILED ($status)"
    fi
}

check_download() {
    url=$1
    name=$2
    echo -n "Testing $name ($url)... "
    # Check for Content-Disposition header
    header=$(curl -s -I "$url" | grep "Content-Disposition")
    if [[ -n "$header" ]]; then
        echo "✅ OK (Header found)"
    else
        echo "❌ FAILED (No download header)"
    fi
}

# 1. Root
check_endpoint "$BASE_URL/" "Root"

# 2. Health
check_endpoint "$BASE_URL/api/health" "API Health"
check_endpoint "$BASE_URL/health" "Root Health"

# 3. Info
check_endpoint "$BASE_URL/api/info?url=$VIDEO_URL" "API Info"
check_endpoint "$BASE_URL/info?url=$VIDEO_URL" "Root Info"

# 4. Formats
check_endpoint "$BASE_URL/api/formats?url=$VIDEO_URL" "API Formats"
check_endpoint "$BASE_URL/formats?url=$VIDEO_URL" "Root Formats"

# 5. Playlist Info
check_endpoint "$BASE_URL/api/playlist?url=$PLAYLIST_URL" "API Playlist Info"
check_endpoint "$BASE_URL/playlist?url=$PLAYLIST_URL" "Root Playlist Info"

# 6. Download (Video)
check_download "$BASE_URL/api/download?url=$VIDEO_URL" "API Download"
check_download "$BASE_URL/download?url=$VIDEO_URL" "Root Download"

# 7. Download (Playlist) - Just check if it starts (might take time so we just check reachability)
# Note: Playlist download takes time to zip, so curl -I might timeout or wait. 
# We'll skip full download test here to avoid hanging, but check if endpoint exists (not 404).
echo -n "Testing API Playlist Download... "
status=$(curl -o /dev/null -s -w "%{http_code}\n" "$BASE_URL/api/playlist/download?url=$PLAYLIST_URL")
if [[ "$status" != "404" ]]; then echo "✅ OK (Not 404)"; else echo "❌ FAILED (404)"; fi

echo -n "Testing Root Playlist Download... "
status=$(curl -o /dev/null -s -w "%{http_code}\n" "$BASE_URL/playlist/download?url=$PLAYLIST_URL")
if [[ "$status" != "404" ]]; then echo "✅ OK (Not 404)"; else echo "❌ FAILED (404)"; fi

echo "========================================"
echo "Done."
