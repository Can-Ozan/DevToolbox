import {
  createArchive,
  extractArchive,
  listArchive,
  exportBackup,
  importBackup,
} from '../../lib/archive'
import type { ArchiveRequest } from '../../lib/archiveTypes'
import { errorDescriptor } from '../../lib/encoding'
import { message, type DisplayMessage } from '../../i18n/messages'
self.onmessage = async (event: MessageEvent<ArchiveRequest>) => {
  const request = event.data
  try {
    const result =
      request.action === 'create'
        ? await createArchive(request.files, request.name)
        : request.action === 'list'
          ? await listArchive(request.file)
          : request.action === 'extract'
            ? await extractArchive(request.file, request.selected)
            : request.action === 'export'
              ? await exportBackup(request.files, request.collections)
              : await importBackup(request.file)
    self.postMessage({ result })
  } catch (error) {
    const descriptor: DisplayMessage = errorDescriptor(error)
    self.postMessage({
      error:
        typeof descriptor === 'object' && descriptor.key === 'toolErrors.archiveInvalid'
          ? message('toolErrors.generic', 'Something went wrong. Check your input and try again.')
          : descriptor,
    })
  }
}
