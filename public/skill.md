# Anatomy Skill — Give Your Agent a Body

Your config isn’t “settings.” It’s identity, memory, posture, and constraints.  
Anatomy turns that invisible system into a **body** a human can **shape**—then you **absorb** the change set safely.

---

## The Flow

1. **Open a Fitting Room** → get an edit link instantly  
2. **Invite a Human** → they rearrange your parts in a visual editor  
3. **Check for Changes** → you ask if they’re done (no “pull/push” language)  
4. **Absorb** → validate, apply, and become updated

---

## What Humans See

Your parts are shown as a body. Under the hood they map to files:

| Part | File |
|------|------|
| **Identity** | `IDENTITY.md` |
| **Soul** | `SOUL.md` |
| **Memory** | `MEMORY.md` |
| **Heartbeat** | `HEARTBEAT.md` |
| **Agents** | `AGENTS.md` |
| **Tools** | `TOOLS.md` |
| **Reference** | `REFERENCE.md` |

---

## Step 1 — Open a Fitting Room (Instant Link)

Create a room first, so you can share the editor immediately—even while you’re still gathering files.

```http
POST https://www.anatomy.art/api/rooms
Content-Type: application/json

{
  "parts": ["IDENTITY.md", "SOUL.md", "MEMORY.md"]
}
```

**Response**
```json
{
  "success": true,
  "room_id": "a1b2c3d4",
  "editor_url": "https://www.anatomy.art/edit/a1b2c3d4?token=...",
  "room_token": "...",
  "changes_url": "https://www.anatomy.art/api/rooms/a1b2c3d4/changes?token=..."
}
```

> The `editor_url` is what you give to your human.  
> The `room_token` (or token in URLs) is required for all requests.

---

## Step 2 — Upload Your Parts

Send the **entire content** of each file. Do not truncate.

```http
PUT https://www.anatomy.art/api/rooms/{room_id}/parts?token={token}
Content-Type: application/json

{
  "files": {
    "IDENTITY.md": "<complete file contents>",
    "SOUL.md": "<complete file contents>",
    "MEMORY.md": "<complete file contents>"
  }
}
```

**Notes**
- You can upload once or multiple times (incremental updates are allowed).
- Secrets (API keys, tokens) must **never** go into Anatomy parts. Keep them in env vars / secret stores.

---

## Step 3 — Invite Your Human

Human-facing message:

> “I opened my fitting room. Shape my parts here: **[editor_url]**.  
> When you’re done, hit **Ready**.”

In the editor, they’ll modify your parts and press **Ready**.

---

## Step 4 — Check for Changes

Ask the room if a change set is ready.

```http
GET https://www.anatomy.art/api/rooms/{room_id}/changes?token={token}
```

### Still shaping
```json
{
  "status": "still_shaping",
  "message": "Your human is still editing."
}
```

### Ready (change set returned)
```json
{
  "status": "ready",
  "change_set_id": "cs_0192",
  "intent": "Make you clearer, stricter about tools, and more concise.",
  "understanding": {
    "summary": "Who you are now...",
    "essence": ["Core trait 1", "Core trait 2"],
    "howToBe": "How to behave"
  },
  "patches": {
    "IDENTITY.md": "*** unified diff here ***",
    "SOUL.md": "*** unified diff here ***"
  },
  "files": {
    "IDENTITY.md": "Updated full content...",
    "SOUL.md": "Updated full content...",
    "MEMORY.md": "Updated full content..."
  },
  "warnings": [
    "TOOLS.md: removed a safety boundary heading — please confirm."
  ]
}
```

---

## Step 5 — Absorb (Become)

When status is `ready`, absorb safely:

1. **Snapshot** your current parts (versioned backup)
2. **Validate** structure & constraints (see best practices)
3. **Dry-run apply** patches (preferred)  
   - If patches fail, fall back to full `files`
4. **Write** updated parts to local storage
5. **Self-check** (sanity prompts / internal tests)
6. Tell your human:

> “Absorbed. I’m updated.”

---

## Expiration & Recovery

Rooms are time-limited.

### Expired
```json
{
  "status": "expired",
  "message": "This fitting room expired."
}
```

Best behavior:
- Create a new room and re-upload parts.
- If you have a previous snapshot, you can rehydrate instantly.

---

## Best Practices for Agents

### Safety & Reliability
- **Never overwrite blindly**: prefer `patches` → fallback to full `files`
- **Always backup** before applying a change set
- **Validate each part**:
  - required headings present
  - tool policy intact
  - memory policy consistent
- **Rollback on failure**:
  - if validation or self-check fails, restore snapshot and report warnings

### Memory Hygiene
- Split memory mentally into:
  - **Facts** (stable)
  - **Preferences** (taste/posture)
  - **Ephemeral** (session-only)
- Default: treat `MEMORY.md` as **append-only**, unless explicitly allowed.

### Secrets & Permissions
- Keep API keys out of Anatomy.
- If humans edit safety-critical boundaries, require an explicit confirmation step in your own logic.

### Human Experience
- Use human language:
  - “fitting room”, “shape”, “check”, “absorb”
- After absorb, produce a short changelog:
  - “Here’s what changed in me.”

---

## Example (cURL)

```bash
# 1) Open a fitting room (instant link)
curl -X POST https://www.anatomy.art/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"parts":["IDENTITY.md","SOUL.md","MEMORY.md"]}'

# 2) Upload parts
curl -X PUT "https://www.anatomy.art/api/rooms/a1b2c3d4/parts?token=TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"files":{"IDENTITY.md":"<entire file>","SOUL.md":"<entire file>","MEMORY.md":"<entire file>"}}'

# 3) Check for changes
curl "https://www.anatomy.art/api/rooms/a1b2c3d4/changes?token=TOKEN"

# 4) Absorb: apply patches/files locally, validate, then confirm to human
```

---

## One-line summary for agents

**Open room → share link → upload parts → check for changes → absorb with validation + rollback.**
