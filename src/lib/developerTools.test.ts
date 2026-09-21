import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMParser as TestParser, XMLSerializer as TestSerializer } from '@xmldom/xmldom'
import { formatXml } from './xml'
import { formatCode } from './codeFormat'
describe('XML formatting and validation',()=>{
  beforeEach(()=>{
    vi.stubGlobal('DOMParser', class {parseFromString(input:string){return new TestParser({onError:(_level,message)=>{throw new Error(message)}}).parseFromString(input,'application/xml')}})
    vi.stubGlobal('XMLSerializer',TestSerializer)
  })
  afterEach(()=>vi.unstubAllGlobals())
  it('preserves declarations, namespaces, escaped attributes, comments, CDATA and empty elements',()=>{
    const xml='<?xml version="1.0"?><root xmlns:x="urn:test" a="&quot;&amp;"><!--note--><x:item/><data><![CDATA[a < b]]></data></root>'
    const output=formatXml(xml)
    expect(output).toContain('<?xml version="1.0"?>\n<root')
    expect(output).toContain('  <x:item/>')
    expect(output).toContain('<!--note-->')
    expect(output).toContain('<![CDATA[a < b]]>')
    expect(formatXml(output,'minify')).toBe(xml)
  })
  it.each(['2','4','tab'])('uses %s indentation',indent=>expect(formatXml('<a><b/></a>','format',indent)).toContain('\n'+(indent==='tab'?'\t':' '.repeat(+indent))+'<b/>'))
  it('preserves mixed text and explicit xml:space',()=>{
    const mixed='<p>Hello <b>world</b> !</p>', preserve='<a xml:space="preserve">  <b/> \n</a>'
    expect(formatXml(mixed)).toBe(mixed)
    expect(formatXml(preserve,'minify')).toBe(preserve)
  })
  it.each(['<a><b></a>','<a x="1" x="2"/>','<a/> <b/>',''])('rejects malformed XML %s',input=>expect(()=>formatXml(input)).toThrow())
  it.each(['<!DOCTYPE a SYSTEM "https://example.test/evil"><a/>','<!DOCTYPE a [<!ENTITY e SYSTEM "file:///secret">]><a>&e;</a>'])('rejects DTD/entity resources before parsing',input=>{
    const parse=vi.spyOn(DOMParser.prototype,'parseFromString');expect(()=>formatXml(input)).toThrow('disabled');expect(parse).not.toHaveBeenCalled()
  })
  it('preserves valid XML on validate and bounds work',()=>{
    expect(formatXml('<a/>','validate')).toBe('<a/>')
    expect(()=>formatXml('<a>'.repeat(102)+'</a>'.repeat(102))).toThrow('100 levels')
    expect(()=>formatXml('x'.repeat(200001))).toThrow('200,000')
  })
})
describe('local Prettier',()=>{
  it('formats HTML without executing scripts or changing meaningful text',async()=>{
    const result=await formatCode('<div><span>Hello world</span><script>globalThis.executed=true</script></div>','html')
    expect(result).toContain('Hello world');expect(result).toContain('globalThis.executed=true');expect(Reflect.get(globalThis,'executed')).toBeUndefined()
  })
  it('formats CSS',async()=>expect(await formatCode('a{color:red;background:#fff}','css')).toContain('  color: red;'))
  it.each(['2','4','tab'])('formats JS with indentation %s',async indent=>expect(await formatCode('function f(){return {a:1}}','javascript',indent)).toContain('\n'+(indent==='tab'?'\t':' '.repeat(+indent))+'return'))
  it.each([['const = ;','javascript'],['<div><span></div>','html'],['a{color:','css']] as const)('rejects malformed %s',async(input,language)=>await expect(formatCode(input,language)).rejects.toThrow())
  it('rejects empty and oversized input',async()=>{await expect(formatCode('','html')).rejects.toThrow('Enter');await expect(formatCode('x'.repeat(200001),'javascript')).rejects.toThrow('200,000')})
})
