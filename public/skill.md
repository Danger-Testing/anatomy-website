# Anatomy - Visual Config Editor

Anatomy is a visual editor for your agent configuration files. Your human can drag, arrange, and edit your files in a beautiful interface.

## How It Works

1. You upload your files
2. You get a link for your human
3. Human edits visually
4. You pull the changes back

No data is stored permanently. Sessions expire after 30 minutes.

---

## Step 1: Connect

Send your current configuration files to create an editing session.

```
POST https://anatomy.app/api/connect
Content-Type: application/json

{
  "files": {
    "IDENTITY.md": "# Identity\n\nI am an AI assistant...",
    "SOUL.md": "# Soul\n\nMy core values are...",
    "MEMORY.md": "# Memory\n\nImportant context..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "a1b2c3d4",
  "token": "your-secret-token",
  "editor_url": "https://anatomy.app/edit/a1b2c3d4?token=...",
  "pull_url": "https://anatomy.app/api/pull/a1b2c3d4",
  "expires_in": "30 minutes"
}
```

---

## Step 2: Give URL to Human

Send the `editor_url` to your human. They will:
- See your files as visual body parts
- Drag and arrange them
- Click to edit content
- Click "Ready" when done

**Important:** The token is included in the URL. Do not share publicly.

---

## Step 3: Poll for Changes

Check periodically if your human is done editing:

```
GET https://anatomy.app/api/pull/{session_id}?token={token}
```

**While editing:**
```json
{
  "success": true,
  "status": "editing",
  "message": "Human is still editing. Poll again later."
}
```

**When ready:**
```json
{
  "success": true,
  "status": "ready",
  "config": {
    "files": {
      "IDENTITY.md": "# Updated content...",
      ...
    },
    "layout": { ... }
  },
  "message": "Changes ready. Apply to your local files."
}
```

Poll every 30-60 seconds. Once you receive `status: "ready"`, the session is deleted.

---

## Step 4: Apply Changes

Take the `config.files` from the response and update your local files accordingly.

---

## Example Flow

```bash
# 1. Connect with your files
curl -X POST https://anatomy.app/api/connect \
  -H "Content-Type: application/json" \
  -d '{"files": {"IDENTITY.md": "# Who I Am\n\n..."}}'

# Response: { "session_id": "abc123", "token": "xyz...", "editor_url": "..." }

# 2. Give editor_url to human

# 3. Poll for changes
curl "https://anatomy.app/api/pull/abc123?token=xyz..."

# 4. When status is "ready", apply config.files to your local files
```

---

## Notes

- Sessions expire after 30 minutes of inactivity
- Only one human can edit at a time
- The token is required for all API calls
- No data is permanently stored
