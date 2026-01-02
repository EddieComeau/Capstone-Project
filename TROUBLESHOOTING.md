# Troubleshooting Guide

## 500 Errors on Admin Endpoints

If you're getting 500 errors when testing admin endpoints (sync, notifications, etc.), follow this guide to diagnose and fix the issue.

### Common Causes and Solutions

#### 1. Missing Ball Don't Lie API Key

**Symptoms:**
- 500 error when calling `/api/sync/players`, `/api/sync/games`, or other sync endpoints
- Server logs show: `BALLDONTLIE_API_KEY is not set in environment variables`

**Solution:**
1. Get an API key from https://www.balldontlie.io/
2. Add it to your `.env` file:
   ```env
   BALLDONTLIE_API_KEY=your_api_key_here
   ```
3. Restart your server

**After Fix:** You should now get a 503 error with a helpful message instead of 500

#### 2. Invalid or Expired API Key

**Symptoms:**
- 500 error when calling sync endpoints
- Server logs show authentication errors (401/403)
- Server logs show: `Ball Don't Lie API authentication failed`

**Solution:**
1. Verify your API key at https://www.balldontlie.io/
2. Generate a new key if needed
3. Update your `.env` file with the new key
4. Restart your server

**After Fix:** You should now get a 503 error with a clear authentication message

#### 3. API Rate Limiting

**Symptoms:**
- 500 error during heavy sync operations
- Server logs show: `Response status: 429`

**Solution:**
1. Wait a few minutes before retrying
2. Reduce the `per_page` parameter in sync requests
3. Add delays between sync operations
4. Consider upgrading your Ball Don't Lie API plan

**After Fix:** You should now get a 429 error with a rate limit message

#### 4. MongoDB Connection Issues

**Symptoms:**
- 500 error on ALL endpoints
- Server won't start or crashes immediately
- Server logs show: `MongooseError` or connection timeouts

**Solution:**
1. Verify MongoDB is running:
   ```bash
   # Check if MongoDB is running
   mongosh --eval "db.adminCommand('ping')"
   ```
2. Check your `MONGO_URI` in `.env`:
   ```env
   MONGO_URI=mongodb://localhost:27017/nfl-cards
   ```
3. For MongoDB Atlas, verify:
   - Network access is configured (add your IP to whitelist)
   - Database user credentials are correct
   - Connection string format is correct

4. Restart your server

#### 5. Missing Environment Variables

**Symptoms:**
- Server starts but returns 500 on specific endpoints
- Logs show `undefined` errors

**Solution:**
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in all required values:
   ```env
   MONGO_URI=mongodb://localhost:27017/nfl-cards
   BALLDONTLIE_API_KEY=your_api_key_here
   PORT=4000
   NODE_ENV=development
   ```
3. Restart your server

### Debug Steps

1. **Check Server Logs:**
   - Look for error messages when the 500 error occurs
   - Common patterns: "not set", "authentication failed", "connection refused"

2. **Test Individual Endpoints:**
   ```bash
   # Health check (should always work)
   curl http://localhost:4000/api/health
   
   # Sync state (requires MongoDB only)
   curl http://localhost:4000/api/syncstate
   
   # Sync players (requires MongoDB + API key)
   curl -X POST http://localhost:4000/api/sync/players
   ```

3. **Verify Environment Variables:**
   ```bash
   # In your server directory
   node -e "require('dotenv').config(); console.log('MONGO_URI:', process.env.MONGO_URI ? 'Set' : 'NOT SET'); console.log('BALLDONTLIE_API_KEY:', process.env.BALLDONTLIE_API_KEY ? 'Set' : 'NOT SET');"
   ```

4. **Test MongoDB Connection:**
   ```bash
   # Try connecting to MongoDB directly
   mongosh "mongodb://localhost:27017/nfl-cards"
   ```

### Expected Error Codes

After fixes, you should see appropriate HTTP status codes:

- **200 OK**: Successful request
- **400 Bad Request**: Invalid parameters in request
- **401 Unauthorized**: Invalid credentials (should be 503 now)
- **403 Forbidden**: API key doesn't have permission (should be 503 now)
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Unexpected server error (should be rare now)
- **503 Service Unavailable**: External service (Ball Don't Lie API) is unavailable or misconfigured

### Still Having Issues?

1. Check the [Ball Don't Lie API Status](https://status.balldontlie.io/)
2. Verify your API key at https://www.balldontlie.io/
3. Review server logs for specific error messages
4. Check MongoDB connection and ensure database is accessible
5. Ensure all required npm packages are installed: `npm install`

### Admin Dashboard Specific Issues

If the admin dashboard shows errors but curl requests work:

1. **Check CORS:** Ensure the backend allows requests from the admin frontend
2. **Check API Base URL:** Verify `REACT_APP_API_BASE_URL` in admin's `.env`
3. **Browser Console:** Check for network errors in browser developer tools
4. **Network Tab:** Verify the request URL and response in browser's network tab

### Quick Test Script

Save this as `test-endpoints.sh` and run it to test all admin endpoints:

```bash
#!/bin/bash
API_URL="http://localhost:4000"

echo "Testing Health..."
curl -s $API_URL/api/health | jq .

echo -e "\nTesting Sync State..."
curl -s $API_URL/api/syncstate | jq .

echo -e "\nTesting Notifications Alerts..."
curl -s $API_URL/api/notifications/alerts | jq .

echo -e "\nTesting Notifications Webhooks..."
curl -s $API_URL/api/notifications/webhooks | jq .

echo -e "\nAll tests complete!"
```

Make it executable and run:
```bash
chmod +x test-endpoints.sh
./test-endpoints.sh
```
