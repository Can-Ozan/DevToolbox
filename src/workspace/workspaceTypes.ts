export interface WorkspaceFileInfo {
  id: string
  name: string
  mimeType: string
  size: number
  createdAt: number
  sourceTool?: string
  originalName?: string
  pinned: boolean
  collectionId?: string
  lastModified?: number
}

export interface WorkspaceCollection {
  id: string
  name: string
  createdAt: number
}

export interface WorkspaceFile extends WorkspaceFileInfo {
  blob: Blob
}

export interface FileInput {
  name: string
  blob: Blob
  originalName?: string
  sourceTool?: string
  lastModified?: number
}

export interface FileOutput extends FileInput {
  detail?: string
  originalSize?: number
}
