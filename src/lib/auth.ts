import { randomBytes } from 'crypto'

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export function generateSessionId(): string {
  return randomBytes(8).toString('hex')
}
