import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ─── Resolve root reliably (works regardless of cwd) ───────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Load envs in priority order (later calls won't override earlier ones)
dotenv.config({ path: path.join(ROOT, '.env') })
dotenv.config({ path: path.join(ROOT, '.env.local') })
dotenv.config({ path: path.join(ROOT, 'apps/web/.env.local') })

// ─── Validate & sanitize env vars ──────────────────────────────────────────
const supabaseUrl = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL
)?.trim()

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!supabaseUrl)     throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
if (!serviceRoleKey)  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

if (serviceRoleKey.length < 100) {
  throw new Error(
    `SUPABASE_SERVICE_ROLE_KEY looks wrong (${serviceRoleKey.length} chars). ` +
    `Make sure you're using the service_role key, not the anon key.`
  )
}

console.log('Supabase URL :', supabaseUrl.slice(0, 40))
console.log('Key prefix   :', serviceRoleKey.slice(0, 20), '...')

// ─── Supabase client ────────────────────────────────────────────────────────
const BUCKET = 'desktop-releases'
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

// ─── Helpers ────────────────────────────────────────────────────────────────
async function fileExists(filePath) {
  try { await fs.access(filePath); return true } catch { return false }
}

async function listFiles(dir) {
  const output = []
  if (!(await fileExists(dir))) return output
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) output.push(...await listFiles(fullPath))
    else output.push(fullPath)
  }
  return output
}

async function uploadFile(localPath, storagePath) {
  const buffer = await fs.readFile(localPath)

  const ext = path.extname(localPath).toLowerCase()
  const contentType =
    ext === '.sig'  ? 'text/plain' :
    ext === '.json' ? 'application/json' :
    'application/octet-stream'

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { upsert: true, contentType })

  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return data.publicUrl
}

// ─── Resolve version & bundle dir ───────────────────────────────────────────
const tauriConfPath = path.join(ROOT, 'apps/desktop/src-tauri/tauri.conf.json')
const tauriConf    = JSON.parse(await fs.readFile(tauriConfPath, 'utf8'))
const version      = tauriConf.version
const productName  = tauriConf.productName || 'Boutik'

console.log(`\nPublishing ${productName} v${version}…\n`)

const bundleDir = path.join(ROOT, 'apps/desktop/src-tauri/target/release/bundle')
const files     = await listFiles(bundleDir)

// ─── Locate installer files ──────────────────────────────────────────────────
const exePath    = files.find(f => f.endsWith('.exe')     && f.includes(version))
const exeSigPath = files.find(f => f.endsWith('.exe.sig') && f.includes(version))
const msiPath    = files.find(f => f.endsWith('.msi')     && f.includes(version))
const msiSigPath = files.find(f => f.endsWith('.msi.sig') && f.includes(version))

if (!exePath && !msiPath) {
  throw new Error(`No .exe or .msi found for v${version} in ${bundleDir}`)
}

// Log what was found
console.log('Found artifacts:')
if (exePath)    console.log('  EXE    :', path.basename(exePath))
if (exeSigPath) console.log('  EXE.sig:', path.basename(exeSigPath))
if (msiPath)    console.log('  MSI    :', path.basename(msiPath))
if (msiSigPath) console.log('  MSI.sig:', path.basename(msiSigPath))
console.log()

// ─── Upload artifacts ────────────────────────────────────────────────────────
const base = `windows/${version}`

let exeUrl = null, exeStoragePath = null
let msiUrl = null, msiStoragePath = null
// ↓ NEW: store signature text so the updater API endpoint can serve it
let exeSigContent = null
let msiSigContent = null

if (exePath) {
  exeStoragePath = `${base}/${path.basename(exePath)}`
  exeUrl = await uploadFile(exePath, exeStoragePath)
  console.log('✓ Uploaded EXE    :', exeUrl)

  if (exeSigPath) {
    await uploadFile(exeSigPath, `${base}/${path.basename(exeSigPath)}`)
    // Read the raw signature text for the DB
    exeSigContent = (await fs.readFile(exeSigPath, 'utf8')).trim()
    console.log('✓ Uploaded EXE.sig')
  } else {
    console.warn('⚠  No .exe.sig found — auto-updater will not work without it')
  }
}

if (msiPath) {
  msiStoragePath = `${base}/${path.basename(msiPath)}`
  msiUrl = await uploadFile(msiPath, msiStoragePath)
  console.log('✓ Uploaded MSI    :', msiUrl)

  if (msiSigPath) {
    await uploadFile(msiSigPath, `${base}/${path.basename(msiSigPath)}`)
    msiSigContent = (await fs.readFile(msiSigPath, 'utf8')).trim()
    console.log('✓ Uploaded MSI.sig')
  } else {
    console.warn('⚠  No .msi.sig found — auto-updater will not work without it')
  }
}

// ─── Insert / update release record ─────────────────────────────────────────
const { error: releaseError } = await supabase
  .from('app_releases')
  .upsert(
    {
      version,
      platform: 'windows',
      title: `${productName} ${version}`,
      notes: process.env.RELEASE_NOTES || `Nouvelle version ${version} disponible.`,
      download_url: exeUrl || msiUrl,
      exe_url: exeUrl,
      msi_url: msiUrl,
      exe_path: exeStoragePath,
      msi_path: msiStoragePath,
      // ↓ NEW: store signature content so the API can build the Tauri manifest
      exe_signature: exeSigContent,
      msi_signature: msiSigContent,
      mandatory: process.env.RELEASE_MANDATORY === 'true',
    },
    { onConflict: 'platform,version' }
  )

if (releaseError) throw releaseError

console.log(`\n✅ Release v${version} published to app_releases.\n`)
console.log(`📡 Updater endpoint: YOUR_DEPLOYED_URL/api/desktop-update`)
console.log(`   → Set this in apps/desktop/src-tauri/tauri.conf.json\n`)
