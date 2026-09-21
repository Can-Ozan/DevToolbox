import { test, expect } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'
import { readFile } from 'node:fs/promises'

async function image(page: import('@playwright/test').Page) {
  const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=40;const ctx=c.getContext('2d')!;ctx.fillStyle='#8765dc';ctx.fillRect(0,0,80,40);return c.toDataURL().split(',')[1]})
  return {name:'cross.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')}
}
test('cross-browser routing, keyboard search, responsive layout and optional PWA status',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto('/');await expect(page.getByRole('heading',{level:1})).toBeVisible()
  await page.keyboard.press('Control+k');await page.getByRole('combobox',{name:'Search tools, files and actions'}).fill('xml');await page.keyboard.press('Enter');await expect(page).toHaveURL('/tools/xml')
  await page.reload();await expect(page.getByRole('button',{name:'Format XML',exact:true})).toBeVisible()
  for(const width of [320,375,768,1024,1440,1920]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}
  await page.goto('/settings');await expect(page.getByRole('heading',{name:'Install & offline'})).toBeVisible()
  await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{value:false,configurable:true});window.dispatchEvent(new Event('offline'))})
  await expect(page.locator('.connection-status')).toContainText('Offline')
  await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{value:true,configurable:true});window.dispatchEvent(new Event('online'))})
  await expect(page.locator('.connection-status')).toContainText('Online');expect(errors).toEqual([])
})
test('cross-browser Workspace persistence, preview and crop release object URLs',async({page})=>{
  await page.addInitScript(()=>{const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL),live=new Set<string>();Object.assign(window,{liveURLs:live});URL.createObjectURL=value=>{const url=create(value);live.add(url);return url};URL.revokeObjectURL=url=>{live.delete(url);revoke(url)}})
  await page.goto('/workspace');await page.locator('input[type=file]').setInputFiles(await image(page));await expect(page.locator('.workspace-file')).toHaveCount(1)
  await page.reload();await expect(page.locator('.workspace-file')).toContainText('cross.png');await page.getByRole('button',{name:'Preview cross.png',exact:true}).click();await expect(page.getByAltText('Preview of cross.png')).toBeVisible();await page.keyboard.press('Escape')
  await page.goto('/tools/image-cropper');await page.getByRole('button',{name:'Choose from Workspace'}).click();await page.getByRole('button',{name:/Use cross.png/}).click();await expect(page.getByAltText('Input preview')).toBeVisible()
  await page.getByLabel('Crop width',{exact:true}).fill('40');await page.getByRole('button',{name:'Crop image',exact:true}).click();await expect(page.getByAltText('Output preview')).toBeVisible();await expect.poll(()=>page.getByAltText('Output preview').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBe(40)
  await page.keyboard.press('Control+k');await page.getByRole('combobox',{name:'Search tools, files and actions'}).fill('open settings');await page.keyboard.press('Enter');await expect(page).toHaveURL('/settings');await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'liveURLs').size)).toBe(0)
})
test('cross-browser PDF rendering uses the bundled local worker',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
  const pdf=await PDFDocument.create();pdf.addPage([200,100]).drawText('Local PDF',{x:10,y:40,size:15})
  await page.goto('/tools/pdf-to-images');await page.locator('input[type=file]').setInputFiles({name:'cross.pdf',mimeType:'application/pdf',buffer:Buffer.from(await pdf.save())});await page.getByRole('button',{name:'Render images'}).click();await expect(page.getByAltText('Output preview')).toBeVisible();await expect.poll(()=>page.getByAltText('Output preview').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBe(200);expect(errors).toEqual([])
})
test('cross-browser native XML and local formatter workers',async({page})=>{
  await page.goto('/tools/xml');await page.getByLabel('XML input').fill('<a><b/></a>');await page.getByRole('button',{name:'Format XML',exact:true}).click();await expect(page.getByLabel('XML output')).toContainText('  <b/>')
  await page.getByLabel('XML input').fill('<a><b></a>');await page.getByRole('button',{name:'Validate XML'}).click();await expect(page.getByRole('alert')).toBeVisible()
  await page.goto('/tools/code-formatter');await page.getByRole('button',{name:'JavaScript',exact:true}).click();await page.getByLabel('Code input').fill('const a={value:1};');await page.getByRole('button',{name:'Format code'}).click();await expect(page.getByLabel('Formatted code')).toContainText('value: 1')
})
test('cross-browser ZIP creation, download and explicit extraction',async({page})=>{
  await page.goto('/tools/zip');await page.locator('input[type=file]').setInputFiles([{name:'a.txt',mimeType:'text/plain',buffer:Buffer.from('local archive')}]);await page.getByRole('button',{name:'Generate ZIP'}).click();await expect(page.getByRole('region',{name:'File output'})).toBeVisible()
  const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Download',exact:true}).click();const download=await downloading;expect(download.suggestedFilename()).toBe('archive.zip')
  const path=await download.path();await page.getByRole('button',{name:'Extract ZIP',exact:true}).click();await page.locator('input[type=file]').setInputFiles({name:'archive.zip',mimeType:'application/zip',buffer:await readFile(path!)});await page.getByRole('button',{name:'Inspect ZIP'}).click();await page.getByRole('checkbox',{name:'Extract a.txt',exact:true}).check();await page.getByRole('button',{name:'Extract selected (1)',exact:true}).click();await expect(page.getByRole('region',{name:'File output'})).toContainText('a.txt')
})
