#!/bin/bash

# AgentForce Voice Assistant - Heroku Deployment Script
echo "🚀 Deploying AgentForce Voice Assistant to Heroku..."

# Check if logged in to Heroku
echo "📋 Checking Heroku login status..."
if ! heroku auth:whoami > /dev/null 2>&1; then
    echo "❌ Not logged into Heroku. Please run 'heroku login' first."
    exit 1
fi

echo "✅ Heroku login confirmed!"

# Create Heroku app with unique name
APP_NAME="agentforce-voice-$(date +%s)"
echo "🏗️ Creating Heroku app: $APP_NAME"

heroku create $APP_NAME

if [ $? -eq 0 ]; then
    echo "✅ Heroku app '$APP_NAME' created successfully!"
else
    echo "❌ Failed to create Heroku app. Please check your Heroku account."
    exit 1
fi

# Deploy to Heroku
echo "📦 Deploying to Heroku..."
git push heroku main

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🎉 Your AgentForce Voice Assistant is now live!"
    
    # Get the app URL
    APP_URL=$(heroku apps:info $APP_NAME --json | python3 -c "import sys, json; print(json.load(sys.stdin)['app']['web_url'])")
    echo "🌐 App URL: $APP_URL"
    
    # Open the app
    echo "🚀 Opening your app in browser..."
    heroku open
    
    echo ""
    echo "🎯 Next steps:"
    echo "1. Configure your AgentForce settings in the web UI"
    echo "2. Click the '⚙️ Configuration' panel"
    echo "3. Enter your Salesforce details"
    echo "4. Click '🚀 Start Voice Session' to begin!"
    echo ""
    echo "📚 Need help? Check HEROKU_DEPLOY.md for detailed instructions."
    
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
