export interface MetObject {
  objectID: number
  title: string
  primaryImage: string
  primaryImageSmall: string
  department: string
  objectName: string
  culture: string
  period: string
  artistDisplayName: string
}

export interface MetSearchResult {
  total: number
  objectIDs: number[] | null
}

const MET_API_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1'

export async function searchMetMuseum(query: string): Promise<number[]> {
  const res = await fetch(
    `${MET_API_BASE}/search?hasImages=true&q=${encodeURIComponent(query)}`
  )
  const data: MetSearchResult = await res.json()
  return data.objectIDs?.slice(0, 20) || []
}

export async function getMetObject(objectId: number): Promise<MetObject | null> {
  try {
    const res = await fetch(`${MET_API_BASE}/objects/${objectId}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function searchWithDetails(query: string): Promise<MetObject[]> {
  const ids = await searchMetMuseum(query)
  const objects = await Promise.all(ids.slice(0, 12).map(getMetObject))
  return objects.filter((o): o is MetObject => o !== null && !!o.primaryImage)
}
