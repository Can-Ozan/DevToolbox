import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import {
  Braces,
  Binary,
  Fingerprint,
  KeyRound,
  Link,
  Clock3,
  Hash,
  Regex,
  LockKeyhole,
  Palette,
  AlignLeft,
  GitCompareArrows,
  FileJson2,
  FileText,
  CalendarClock,
  QrCode,
  CaseSensitive,
  Calculator,
  Contrast,
  ScanLine,
  type LucideIcon,
} from 'lucide-react'

export const categories = [
  'Encoders',
  'Generators',
  'Developer',
  'Converters',
  'Utilities',
] as const
export type ToolCategory = (typeof categories)[number]
export interface ToolDefinition {
  id: string
  name: string
  description: string
  category: ToolCategory
  path: string
  icon: LucideIcon
  keywords: string[]
  color: string
  component: LazyExoticComponent<ComponentType>
}

const definitions = [
  {
    id: 'json',
    name: 'JSON Formatter',
    description: 'Format, validate, and minify your JSON with ease.',
    category: 'Developer',
    icon: Braces,
    keywords: ['beautify', 'validator', 'pretty', 'object'],
    color: 'amber',
    component: lazy(() => import('../tools/json/JsonTool')),
  },
  {
    id: 'base64',
    name: 'Base64 Encoder / Decoder',
    description: 'Encode and decode text in Base64 format.',
    category: 'Encoders',
    icon: Binary,
    keywords: ['unicode', 'encode', 'decode'],
    color: 'blue',
    component: lazy(() => import('../tools/base64/Base64Tool')),
  },
  {
    id: 'uuid',
    name: 'UUID Generator',
    description: 'Generate unique, cryptographically secure UUIDs.',
    category: 'Generators',
    icon: Fingerprint,
    keywords: ['guid', 'random', 'identifier', 'v4'],
    color: 'purple',
    component: lazy(() => import('../tools/uuid/UuidTool')),
  },
  {
    id: 'jwt',
    name: 'JWT Decoder',
    description: 'Inspect the header and payload of a JWT token.',
    category: 'Developer',
    icon: KeyRound,
    keywords: ['token', 'claims', 'authentication'],
    color: 'rose',
    component: lazy(() => import('../tools/jwt/JwtTool')),
  },
  {
    id: 'regex',
    name: 'Regex Tester',
    description: 'Test patterns and explore matches in real time.',
    category: 'Developer',
    icon: Regex,
    keywords: ['regular expression', 'pattern', 'match'],
    color: 'teal',
    component: lazy(() => import('../tools/regex/RegexTool')),
  },
  {
    id: 'password',
    name: 'Password Generator',
    description: 'Create strong, secure passwords in a click.',
    category: 'Generators',
    icon: LockKeyhole,
    keywords: ['random', 'secure', 'credentials'],
    color: 'green',
    component: lazy(() => import('../tools/password/PasswordTool')),
  },
  {
    id: 'url',
    name: 'URL Encoder / Decoder',
    description: 'Encode or decode URLs and query components.',
    category: 'Encoders',
    icon: Link,
    keywords: ['uri', 'percent', 'encode', 'decode'],
    color: 'blue',
    component: lazy(() => import('../tools/url/UrlTool')),
  },
  {
    id: 'timestamp',
    name: 'Unix Timestamp Converter',
    description: 'Convert timestamps into readable dates and back.',
    category: 'Converters',
    icon: Clock3,
    keywords: ['epoch', 'time', 'date', 'seconds', 'milliseconds'],
    color: 'amber',
    component: lazy(() => import('../tools/timestamp/TimestampTool')),
  },
  {
    id: 'hash',
    name: 'Hash Generator',
    description: 'Generate SHA hashes using native Web Crypto.',
    category: 'Generators',
    icon: Hash,
    keywords: ['sha1', 'sha256', 'sha384', 'sha512', 'digest'],
    color: 'purple',
    component: lazy(() => import('../tools/hash/HashTool')),
  },
  {
    id: 'color',
    name: 'Color Converter',
    description: 'Move effortlessly between HEX, RGB, and HSL.',
    category: 'Converters',
    icon: Palette,
    keywords: ['hex', 'rgb', 'hsl', 'picker'],
    color: 'rose',
    component: lazy(() => import('../tools/color/ColorTool')),
  },
  {
    id: 'lorem',
    name: 'Lorem Ipsum Generator',
    description: 'Create placeholder text for your next project.',
    category: 'Utilities',
    icon: AlignLeft,
    keywords: ['placeholder', 'paragraph', 'sentence', 'words'],
    color: 'teal',
    component: lazy(() => import('../tools/lorem/LoremTool')),
  },
  {
    id: 'diff',
    name: 'Text Diff Checker',
    description: 'Compare texts and see exactly what changed.',
    category: 'Utilities',
    icon: GitCompareArrows,
    keywords: ['compare', 'difference', 'lines', 'merge'],
    color: 'green',
    component: lazy(() => import('../tools/diff/DiffTool')),
  },
  {
    id: 'json-yaml',
    name: 'JSON ↔ YAML Converter',
    description: 'Convert structured data between JSON and YAML.',
    category: 'Converters',
    icon: FileJson2,
    keywords: ['yaml', 'yml', 'json', 'serialize'],
    color: 'amber',
    component: lazy(() => import('../tools/json-yaml/JsonYamlTool')),
  },
  {
    id: 'markdown',
    name: 'Markdown Previewer',
    description: 'Write Markdown with a live GitHub-style preview.',
    category: 'Developer',
    icon: FileText,
    keywords: ['md', 'preview', 'gfm', 'tables', 'documentation'],
    color: 'blue',
    component: lazy(() => import('../tools/markdown/MarkdownTool')),
  },
  {
    id: 'cron',
    name: 'Cron Expression Builder',
    description: 'Build five-field cron expressions visually.',
    category: 'Developer',
    icon: CalendarClock,
    keywords: ['schedule', 'interval', 'crontab', 'time'],
    color: 'purple',
    component: lazy(() => import('../tools/cron/CronTool')),
  },
  {
    id: 'qr',
    name: 'QR Code Generator',
    description: 'Create downloadable QR codes for text and URLs.',
    category: 'Generators',
    icon: QrCode,
    keywords: ['barcode', 'png', 'scan', 'qrcode'],
    color: 'teal',
    component: lazy(() => import('../tools/qr/QrTool')),
  },
  {
    id: 'case',
    name: 'Case Converter',
    description: 'Transform text into ten common case formats.',
    category: 'Converters',
    icon: CaseSensitive,
    keywords: ['camel', 'snake', 'kebab', 'pascal', 'uppercase', 'lowercase'],
    color: 'rose',
    component: lazy(() => import('../tools/case/CaseTool')),
  },
  {
    id: 'number-base',
    name: 'Number Base Converter',
    description: 'Convert binary, octal, decimal, and hexadecimal exactly.',
    category: 'Converters',
    icon: Calculator,
    keywords: ['bigint', 'radix', 'integer', 'hex', 'binary'],
    color: 'green',
    component: lazy(() => import('../tools/number-base/NumberBaseTool')),
  },
  {
    id: 'contrast',
    name: 'Color Contrast Checker',
    description: 'Check foreground and background colors against WCAG.',
    category: 'Utilities',
    icon: Contrast,
    keywords: ['accessibility', 'a11y', 'aa', 'aaa', 'ratio'],
    color: 'purple',
    component: lazy(() => import('../tools/contrast/ContrastTool')),
  },
  {
    id: 'url-parser',
    name: 'URL Parser',
    description: 'Inspect URL components and query parameters.',
    category: 'Developer',
    icon: ScanLine,
    keywords: ['uri', 'host', 'port', 'query', 'fragment', 'origin'],
    color: 'blue',
    component: lazy(() => import('../tools/url-parser/UrlParserTool')),
  },
] satisfies Omit<ToolDefinition, 'path'>[]
export const tools: ToolDefinition[] = definitions.map((tool) => ({
  ...tool,
  path: `/tools/${tool.id}`,
}))

export function searchTools(query: string, category?: string) {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/)
  return tools.filter(
    (tool) =>
      (!category || category === tool.category) &&
      terms.every((term) =>
        `${tool.name} ${tool.category} ${tool.description} ${tool.keywords.join(' ')}`
          .toLocaleLowerCase()
          .includes(term),
      ),
  )
}
