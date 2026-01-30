# Heroku Package.json Configuration

Since Lovable manages `package.json`, you'll need to manually update it for Heroku deployment.

## Required package.json changes:

Add/update these fields in your `package.json`:

```json
{
  "type": "module",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build", 
    "start": "node server/index.js",
    "preview": "vite preview",
    "heroku-postbuild": "npm run build"
  }
}
```

## How to apply:

1. Export your project from Lovable
2. Edit `package.json` to add the above configuration
3. Push to GitHub
4. Deploy to Heroku from GitHub

Or use the Heroku CLI:
```bash
heroku config:set NPM_CONFIG_PRODUCTION=false
```

This ensures devDependencies are installed for the build step.
