export interface ArtifactPosition {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}

export interface BodyPart {
  id: string
  filename: string
  label: string
  imageUrl: string
  metObjectId?: number
  position: ArtifactPosition
}

export interface AgentConfig {
  files: { [filename: string]: string }
  layout?: { [partId: string]: BodyPart }
}

// Default body parts
export const DEFAULT_BODY_PARTS: BodyPart[] = [
  {
    id: 'head',
    filename: 'IDENTITY.md',
    label: 'Identity',
    imageUrl: '/identity.png',
    position: { x: 57.51, y: 49.39, width: 100, height: 100 }
  },
  {
    id: 'soul-left',
    filename: 'SOUL.md',
    label: 'Soul',
    imageUrl: '/soul.png',
    position: { x: 32.07, y: 38.26, width: 100, height: 100 }
  },
  {
    id: 'soul-right',
    filename: 'MEMORY.md',
    label: 'Memory',
    imageUrl: '/memory.png',
    position: { x: 55.81, y: 34.40, width: 100, height: 100 }
  },
  {
    id: 'heart',
    filename: 'HEARTBEAT.md',
    label: 'Heartbeat',
    imageUrl: '/heart.png',
    position: { x: 42.65, y: 43.89, width: 100, height: 100 }
  },
  {
    id: 'body',
    filename: 'AGENTS.md',
    label: 'Agents',
    imageUrl: '/agent.png',
    position: { x: 45.09, y: 52.56, width: 100, height: 100 }
  },
  {
    id: 'tools',
    filename: 'TOOLS.md',
    label: 'Tools',
    imageUrl: '/tool.png',
    position: { x: 71.78, y: 29.24, width: 100, height: 100 }
  },
  {
    id: 'reference',
    filename: 'REFERENCE.md',
    label: 'Reference',
    imageUrl: '/references.png',
    position: { x: 33.56, y: 70.55, width: 100, height: 100 }
  },
  {
    id: 'user',
    filename: 'USER.md',
    label: 'User',
    imageUrl: '/user.png',
    position: { x: 21.21, y: 40.64, width: 100, height: 100 }
  }
]
