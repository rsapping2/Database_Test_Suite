# Database Test Suite - User Tests

## Overview
This project contains a suite of database tests focused on user-related functionality. Recently, one of the tests began failing unexpectedly, despite no reported changes from the development team. This repository contains the necessary files to reproduce and fix the issue.

## Issues Resolved
The project originally had two critical database issues that have been fixed:

### 1. Missing Required Field
**Problem**: First test case was missing the required `password_hash` field.
**Error**: `User validation failed: security requirements not met (code: USR-102)`

**Solution**: Added the missing `password_hash` field to the test case with proper validation.

### 2. Dockerfile Infrastructure Updates (Not Part of Original Exercise)
**Note**: The original exercise prompt stated "you should assume you don't need to change anything in the DB" and focused on test code fixes. However, the Dockerfile required infrastructure updates to work properly:

**Problem**: The original Dockerfile used outdated Debian Buster (node:14) which no longer has PostgreSQL packages available in its repositories.

**Solution**: Updated Dockerfile with:
- Upgraded base image from `node:14` to `node:14-bullseye` (Debian 11)
- Added manual PostgreSQL repository setup
- Updated PostgreSQL configuration paths from version 11 to 13
- These changes were necessary for the container to build and run successfully

**Why This Wasn't Part of the Original Exercise**: The prompt focused on database test logic fixes, not infrastructure maintenance. The Dockerfile updates were required to make the project runnable but weren't related to the core test failures the Junior engineer was experiencing.

## Project Structure
- `test_database.js` - Contains the database test suite with fixes
- `setup_db.sql.b64` - Base64 encoded database initialization script (for Docker)
- `Dockerfile` - Container configuration with PostgreSQL 13
- `run_test.sh` - Shell script to execute the test suite
- `package.json` - Node.js dependencies (Mocha, Chai, pg)

## Quick Start

### Prerequisites
- Docker installed on your system
- No additional setup required

### Easiest Way to Run
```bash
# Build the Docker container
docker build -t qa-db-debug-test .

# Run the tests
docker run --rm qa-db-debug-test
```

### Expected Output
```
Starting PostgreSQL 13 database server: main.

  Database Test
    ✔ should create a user with valid credentials
    ✔ should reject duplicate usernames  
    ✔ should reject users younger than 13 years old

  3 passing (274ms)
```

## Docker Changes Made

The Dockerfile was updated due to infrastructure changes:
- Upgraded from Debian Buster to Bullseye
- Added manual PostgreSQL repository setup
- Updated configuration paths for PostgreSQL 13

## Troubleshooting

If you encounter issues:

1. **Docker Build Fails**: Ensure Docker is running and you have internet access
2. **Permission Errors**: Make sure Docker has proper permissions
3. **Port Conflicts**: The container uses internal PostgreSQL, no port conflicts expected

