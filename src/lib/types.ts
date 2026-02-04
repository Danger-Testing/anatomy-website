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

// Default body parts with Met Museum images
export const DEFAULT_BODY_PARTS: BodyPart[] = [
  {
    id: 'head',
    filename: 'IDENTITY.md',
    label: 'Identity',
    imageUrl: 'https://images.metmuseum.org/CRDImages/ao/original/DP231460.jpg', // Benin bronze head
    metObjectId: 318622,
    position: { x: 50, y: 5, width: 120, height: 150 }
  },
  {
    id: 'soul-left',
    filename: 'SOUL.md',
    label: 'Soul',
    imageUrl: 'https://images.metmuseum.org/CRDImages/as/original/DP251139.jpg', // Chinese Buddhist figure
    metObjectId: 39904,
    position: { x: 10, y: 20, width: 80, height: 180 }
  },
  {
    id: 'soul-right',
    filename: 'MEMORY.md',
    label: 'Memory',
    imageUrl: 'https://images.metmuseum.org/CRDImages/as/original/DP251144.jpg', // Japanese figure
    metObjectId: 45428,
    position: { x: 80, y: 20, width: 80, height: 180 }
  },
  {
    id: 'heart',
    filename: 'HEARTBEAT.md',
    label: 'Heartbeat',
    imageUrl: 'https://images.metmuseum.org/CRDImages/ep/original/DT1567.jpg', // Sacred heart
    metObjectId: 436105,
    position: { x: 42, y: 35, width: 100, height: 120 }
  },
  {
    id: 'body',
    filename: 'AGENTS.md',
    label: 'Agents',
    imageUrl: 'https://images.metmuseum.org/CRDImages/eg/original/DT531.jpg', // Egyptian figure
    metObjectId: 545,
    position: { x: 35, y: 45, width: 140, height: 200 }
  },
  {
    id: 'tools',
    filename: 'TOOLS.md',
    label: 'Tools',
    imageUrl: 'https://images.metmuseum.org/CRDImages/as/original/DP-15581-029.jpg', // Chola bronze hand
    metObjectId: 39328,
    position: { x: 75, y: 40, width: 70, height: 100 }
  },
  {
    id: 'reference',
    filename: 'REFERENCE.md',
    label: 'Reference',
    imageUrl: 'https://images.metmuseum.org/CRDImages/ao/original/DP-13440-031.jpg', // Pre-columbian
    metObjectId: 310551,
    position: { x: 15, y: 70, width: 90, height: 120 }
  },
  {
    id: 'user',
    filename: 'USER.md',
    label: 'User',
    imageUrl: 'https://images.metmuseum.org/CRDImages/is/original/DP238067.jpg', // Islamic figure
    metObjectId: 449537,
    position: { x: 70, y: 70, width: 90, height: 120 }
  }
]
