export interface WorkspaceFileInfo {
  id: string
  name: string
  mimeType: string
  size: number
  createdAt: number
  sourceTool?: string
  originalName?: string
  pinned: boolean
}

export interface WorkspaceFile extends WorkspaceFileInfo {
  blob: Blob
}

export interface FileInput {
  name: string
  blob: Blob
  originalName?: string
  sourceTool?: string
}

export interface FileOutput extends FileInput {
  detail?: string
}
