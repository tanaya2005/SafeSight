# MongoDB Setup Guide for SafeSight

## Current Issue
The MongoDB Atlas connection is failing because the cluster DNS cannot be resolved.

## Quick Solutions

### Option 1: Fix MongoDB Atlas Connection (Recommended if you have internet)

1. **Check MongoDB Atlas Dashboard**
   - Go to https://cloud.mongodb.com/
   - Login with credentials: architchitte
   - Verify the cluster "cluster0" exists
   - Check if the cluster is paused (unpause it if needed)

2. **Update Network Access**
   - In Atlas Dashboard, go to "Network Access"
   - Add your current IP address or use `0.0.0.0/0` (allow from anywhere) for testing

3. **Get the correct connection string**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Update `server/.env` with the new MONGO_URI

### Option 2: Use Local MongoDB (For offline development)

#### Install MongoDB Community Edition on Windows:

1. **Download MongoDB**
   ```
   https://www.mongodb.com/try/download/community
   ```
   - Select: Windows, MSI package
   - Download and run the installer

2. **Install MongoDB**
   - Choose "Complete" installation
   - Install MongoDB as a Service (check the box)
   - Install MongoDB Compass (optional GUI tool)

3. **Start MongoDB Service**
   ```powershell
   net start MongoDB
   ```

4. **Update server/.env**
   Replace the MONGO_URI line with:
   ```
   MONGO_URI=mongodb://localhost:27017/safesight
   ```

5. **Restart the backend server**
   - Stop the current server (Ctrl+C in the terminal)
   - Run: `cd server && node server.js`

### Option 3: Use MongoDB Docker Container (If you have Docker)

```bash
# Pull and run MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Update server/.env
MONGO_URI=mongodb://localhost:27017/safesight

# Restart backend
cd server && node server.js
```

## Verify Connection

After setting up MongoDB, you should see:
```
✅ MongoDB Connected: cluster0-shard-00-00.z2jrvlp.mongodb.net
```
or
```
✅ MongoDB Connected: localhost
```

## Seed the Database

Once connected, run:
```bash
cd server
node scripts/seed.js
```

This will populate the database with:
- Sample workers
- PPE configurations
- Test violations
- Zone access data
