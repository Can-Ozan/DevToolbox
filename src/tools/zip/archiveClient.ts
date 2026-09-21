import { runWorkerJob } from '../../lib/workerJob'
import type { ArchiveRequest } from '../../lib/archiveTypes'
export const runArchive = <T,>(request: ArchiveRequest, signal: AbortSignal) => runWorkerJob<T>(() => new Worker(new URL('./archive.worker.ts', import.meta.url), {type:'module'}), request, signal)
