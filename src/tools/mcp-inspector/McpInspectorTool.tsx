import { useMemo, useState } from 'react'
import { CopyButton, Editor, Message } from '../../components/ui'

type ServerSummary = {
  name: string
  transport: string
  command: string
  issues: string[]
}

export default function McpInspectorTool() {
  const [input, setInput] = useState('{\n  "mcpServers": {\n    "filesystem": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./workspace"]\n    }\n  }\n}')

  const result = useMemo(() => {
    try {
      const parsed = JSON.parse(input) as { mcpServers?: Record<string, Record<string, unknown>> }
      if (!parsed.mcpServers || typeof parsed.mcpServers !== 'object') {
        return { error: 'Expected a top-level "mcpServers" object.', servers: [] as ServerSummary[] }
      }
      const servers = Object.entries(parsed.mcpServers).map(([name, config]) => {
        const issues: string[] = []
        const command = typeof config.command === 'string' ? config.command : ''
        const url = typeof config.url === 'string' ? config.url : ''
        if (!command && !url) issues.push('Missing command or url')
        if (config.args !== undefined && !Array.isArray(config.args)) issues.push('args should be an array')
        if (config.env !== undefined && (typeof config.env !== 'object' || config.env === null || Array.isArray(config.env))) {
          issues.push('env should be an object')
        }
        return {
          name,
          transport: url ? 'HTTP / remote' : 'stdio / local',
          command: url || command || '—',
          issues,
        }
      })
      return { error: '', servers }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Invalid JSON', servers: [] as ServerSummary[] }
    }
  }, [input])

  return (
    <>
      <Message kind="info">
        Validate and inspect common MCP client configuration locally before adding it to your editor or agent.
      </Message>
      <Editor label="MCP configuration" value={input} onChange={setInput} minHeight={280} />
      {result.error ? (
        <Message kind="error">{result.error}</Message>
      ) : (
        <Message kind={result.servers.some((server) => server.issues.length) ? 'warning' : 'success'}>
          {result.servers.length} server{result.servers.length === 1 ? '' : 's'} detected.
        </Message>
      )}
      {result.servers.length > 0 && (
        <table className="matches-table">
          <thead><tr><th>Server</th><th>Transport</th><th>Command / URL</th><th>Validation</th></tr></thead>
          <tbody>
            {result.servers.map((server) => (
              <tr key={server.name}>
                <td><code>{server.name}</code></td>
                <td>{server.transport}</td>
                <td><code>{server.command}</code></td>
                <td>{server.issues.length ? server.issues.join(', ') : '✓ Looks valid'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="output-title">
        <h2>Normalized config</h2>
        <CopyButton text={input} label="Copy MCP config" />
      </div>
      <p className="helper-text">
        This checks configuration shape only. It does not start servers or test credentials.
      </p>
    </>
  )
}
