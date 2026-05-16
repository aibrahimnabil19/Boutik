import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const BUCKET = 'desktop-releases'

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
}

if (!serviceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function listFiles(dir) {
  const output = []

  if (!(await fileExists(dir))) return output

  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      output.push(...await listFiles(fullPath))
    } else {
      output.push(fullPath)
    }
  }

  return output
}

async function uploadFile(localPath, storagePath) {
  const buffer = await fs.readFile(localPath)

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      upsert: true,
      contentType: 'application/octet-stream',
    })

  if (error) throw error

  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath)

  return data.publicUrl
}

const tauriConfPath = path.join(ROOT, 'apps/desktop/src-tauri/tauri.conf.json')
const tauriConf = JSON.parse(await fs.readFile(tauriConfPath, 'utf8'))

const version = tauriConf.version
const productName = tauriConf.productName || 'Boutik'

const bundleDir = path.join(ROOT, 'apps/desktop/src-tauri/target/release/bundle')
const files = await listFiles(bundleDir)

const exePath = files.find(f => f.endsWith('.exe') && f.includes(`${version}`))
const msiPath = files.find(f => f.endsWith('.msi') && f.includes(`${version}`))

if (!exePath && !msiPath) {
  throw new Error(`No .exe or .msi found for version ${version} inside ${bundleDir}`)
}

const baseStoragePath = `windows/${version}`

let exeUrl = null
let msiUrl = null
let exeStoragePath = null
let msiStoragePath = null

if (exePath) {
  exeStoragePath = `${baseStoragePath}/${path.basename(exePath)}`
  exeUrl = await uploadFile(exePath, exeStoragePath)
  console.log('Uploaded EXE:', exeUrl)
}

if (msiPath) {
  msiStoragePath = `${baseStoragePath}/${path.basename(msiPath)}`
  msiUrl = await uploadFile(msiPath, msiStoragePath)
  console.log('Uploaded MSI:', msiUrl)
}

const downloadUrl = exeUrl || msiUrl

const { error: releaseError } = await supabase
  .from('app_releases')
  .upsert({
    version,
    platform: 'windows',
    title: `${productName} ${version}`,
    notes: process.env.RELEASE_NOTES || `Nouvelle version ${version} disponible.`,
    download_url: downloadUrl,
    exe_url: exeUrl,
    msi_url: msiUrl,
    exe_path: exeStoragePath,
    msi_path: msiStoragePath,
    mandatory: process.env.RELEASE_MANDATORY === 'true',
  }, {
    onConflict: 'platform,version',
  })

if (releaseError) throw releaseError

console.log(`Release ${version} published to app_releases.`)