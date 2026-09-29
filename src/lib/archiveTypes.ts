import type { FileInput, WorkspaceCollection } from '../workspace/workspaceTypes'
export const ZIP_TYPES = ['application/zip', 'application/x-zip-compressed']
export const ZIP_LIMITS = {
  entries: 1000,
  files: 500,
  bytes: 150 * 1024 ** 2,
  archiveBytes: 100 * 1024 ** 2,
  ratio: 200,
}
export interface ArchiveEntry {
  id: number
  path: string
  size: number
  compressedSize: number
  directory: boolean
}
export interface BackupInput extends FileInput {
  pinned: boolean
  createdAt: number
  collectionId?: string
}
export interface WorkspaceBackup {
  files: BackupInput[]
  collections: WorkspaceCollection[]
}
export type ArchiveRequest =
  | { action: 'create'; files: FileInput[]; name: string }
  | { action: 'list'; file: FileInput }
  | { action: 'extract'; file: FileInput; selected: number[] }
  | { action: 'export'; files: BackupInput[]; collections?: WorkspaceCollection[] }
  | { action: 'import'; file: FileInput }
