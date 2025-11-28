// ============ SUPABASE SYNC LAYER - FIXED ============
// Real-time sync dengan Supabase database

const SUPABASE_URL = 'https://omkqvtlvabwblgijodxhe.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ta292dGx2YWJ3YmxnaWpvZHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3OTA2MzgsImV4cCI6MjA3OTM2NjYzOH0._9CRzqxKd450pX5ZgVAaocCUfWh5vV2GJXIFK3XAGKc'

let supabase = null
let isCloudAvailable = false
let currentUserId = null
let realtimeChannels = []

// ============ INITIALIZATION ============

async function supabaseInit() {
  try {
    // Check if already initialized
    if (supabase && isCloudAvailable) {
      console.log('✅ Supabase already initialized')
      return true
    }

    // Lazy load Supabase SDK
    if (!window.supabase) {
      console.log('📦 Loading Supabase SDK...')
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
      await new Promise((resolve, reject) => {
        script.onload = resolve
        script.onerror = () => reject(new Error('Failed to load Supabase SDK'))
        document.head.appendChild(script)
      })
      console.log('✅ Supabase SDK loaded')
    }

    const { createClient } = window.supabase
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
    
    // Test connection
    const { data, error } = await supabase.from('machines').select('count').limit(1)
    if (error) throw error
    
    isCloudAvailable = true
    console.log('✅ Supabase initialized successfully')
    console.log('📡 Real-time enabled')
    return true
  } catch (e) {
    console.error('❌ Supabase init error:', e)
    isCloudAvailable = false
    return false
  }
}

// ============ AUTHENTICATION ============

async function supabaseSignIn(email, password) {
  const LOCAL_USERS = {
    'didin@company.com': '86532',
    'indra@company.com': '86086',
    'nur@company.com': '80229',
    'desi@company.com': '82847'
  }

  // Validate locally
  if (LOCAL_USERS[email] && LOCAL_USERS[email] === password) {
    currentUserId = email.replace(/[^a-z0-9]/g, '_')
    const user = {
      email: email,
      uid: currentUserId,
      name: email.split('@')[0]
    }
    console.log('✅ Login successful:', email)
    return user
  }

  throw new Error('Email atau password salah')
}

async function supabaseSignOut() {
  currentUserId = null
  cleanupListeners()
  console.log('✅ Signed out')
  return true
}

function getCurrentUserId() {
  return currentUserId || localStorage.getItem('currentUserId') || 'unknown'
}

// ============ MACHINES - LOAD ============

async function loadMachinesFromCloud() {
  if (!isCloudAvailable || !supabase) {
    console.log('⚠️ Cloud not available, using local storage')
    return null
  }

  try {
    console.log('📥 Loading machines from Supabase...')
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    if (data && data.length > 0) {
      console.log(`✅ Loaded ${data.length} machines from Supabase`)
      // Transform to match local format
      return data.map(m => ({
        id: m.id,
        constructId: m.construct_id
      }))
    }

    console.log('ℹ️ No machines found in database')
    return null
  } catch (e) {
    console.error('❌ Load machines error:', e.message)
    return null
  }
}

// ============ MACHINES - SAVE ============

async function saveMachineToCloud(machineId, constructId, userId, oldConstructId) {
  if (!isCloudAvailable || !supabase) {
    console.log('⚠️ Cloud not available for machine save')
    return false
  }

  try {
    const timestamp = new Date().toISOString()
    const user = userId || getCurrentUserId()

    console.log(`💾 Saving machine ${machineId} to cloud...`)

    // Upsert machine
    const { error: machineError } = await supabase
      .from('machines')
      .upsert({
        id: machineId,
        construct_id: constructId || null,
        last_edited_by: user,
        last_edited_at: timestamp
      }, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })

    if (machineError) {
      console.error('Machine upsert error:', machineError)
      throw machineError
    }

    // Add to history
    const { error: historyError } = await supabase
      .from('history')
      .insert({
        timestamp: Date.now(),
        machine_id: machineId,
        from: oldConstructId || null,
        to: constructId || null,
        editor: user,
        action: 'UPDATE_MACHINE',
        type: 'machine_update',
        device_id: getDeviceId(),
        device_name: getDeviceName()
      })

    if (historyError) {
      console.warn('History insert warning:', historyError)
      // Don't fail if history fails
    }

    console.log(`✅ Machine ${machineId} saved to cloud`)
    return true
  } catch (e) {
    console.error('❌ Save machine error:', e.message)
    return false
  }
}

// ============ CONSTRUCTIONS - LOAD ============

async function loadConstructionsFromCloud() {
  if (!isCloudAvailable || !supabase) {
    console.log('⚠️ Cloud not available for constructions')
    return null
  }

  try {
    console.log('📥 Loading constructions from Supabase...')
    const { data, error } = await supabase
      .from('constructions')
      .select('*')

    if (error) throw error

    if (data && data.length > 0) {
      console.log(`✅ Loaded ${data.length} constructions from Supabase`)
      return data.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        createdBy: c.created_by,
        createdAt: c.created_at
      }))
    }

    console.log('ℹ️ No constructions found in database')
    return null
  } catch (e) {
    console.error('❌ Load constructions error:', e.message)
    return null
  }
}

// ============ CONSTRUCTIONS - SAVE ============

async function saveConstructionToCloud(construction, userId, isNew = false) {
  if (!isCloudAvailable || !supabase) {
    console.log('⚠️ Cloud not available for construction save')
    return false
  }

  try {
    const user = userId || getCurrentUserId()
    console.log(`💾 Saving construction ${construction.id} to cloud...`)

    const { error } = await supabase
      .from('constructions')
      .upsert({
        id: construction.id,
        name: construction.name,
        color: construction.color,
        created_by: construction.createdBy || user,
        created_at: construction.createdAt || new Date().toISOString()
      }, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })

    if (error) throw error

    console.log(`✅ Construction ${construction.id} saved to cloud`)
    return true
  } catch (e) {
    console.error('❌ Save construction error:', e.message)
    return false
  }
}

// ============ CONSTRUCTIONS - DELETE ============

async function deleteConstructionFromCloud(constructionId, userId) {
  if (!isCloudAvailable || !supabase) return false

  try {
    console.log(`🗑️ Deleting construction ${constructionId} from cloud...`)
    
    const { error } = await supabase
      .from('constructions')
      .delete()
      .eq('id', constructionId)

    if (error) throw error

    console.log(`✅ Deleted construction ${constructionId} from cloud`)
    return true
  } catch (e) {
    console.error('❌ Delete construction error:', e.message)
    return false
  }
}

// ============ HISTORY - LOAD ============

async function loadHistoryFromCloud(limit = 1000) {
  if (!isCloudAvailable || !supabase) {
    console.log('⚠️ Cloud not available for history')
    return null
  }

  try {
    console.log('📥 Loading history from Supabase...')
    const { data, error } = await supabase
      .from('history')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) throw error

    if (data && data.length > 0) {
      console.log(`✅ Loaded ${data.length} history entries from Supabase`)
      return data.map(h => ({
        machine: h.machine_id,
        from: h.from,
        to: h.to,
        editor: h.editor,
        date: new Date(h.timestamp).toISOString(),
        action: h.action,
        type: h.type
      }))
    }

    console.log('ℹ️ No history found in database')
    return null
  } catch (e) {
    console.error('❌ Load history error:', e.message)
    return null
  }
}

// ============ HISTORY - SAVE ============

async function saveHistoryToCloud(historyEntry) {
  if (!isCloudAvailable || !supabase) {
    console.log('⚠️ Cloud not available for history save')
    return false
  }

  try {
    const { error } = await supabase
      .from('history')
      .insert({
        timestamp: Date.now(),
        type: historyEntry.type || 'general',
        machine_id: historyEntry.details?.machine || null,
        from: historyEntry.details?.from || null,
        to: historyEntry.details?.to || null,
        action: historyEntry.action || 'update',
        editor: historyEntry.details?.editor || getCurrentUserId(),
        device_id: historyEntry.device_id || getDeviceId(),
        device_name: historyEntry.device_name || getDeviceName()
      })

    if (error) throw error

    console.log('✅ History saved to Supabase')
    return true
  } catch (e) {
    console.error('❌ Save history error:', e.message)
    return false
  }
}

// ============ REAL-TIME LISTENERS - FIXED ============

async function setupRealtimeListeners(onMachinesChange, onConstructionsChange, onHistoryChange) {
  if (!isCloudAvailable || !supabase) {
    console.log('⚠️ Supabase not available, skipping real-time setup')
    return
  }

  try {
    console.log('🔌 Setting up real-time listeners...')

    // Clean up existing channels first
    cleanupListeners()

    // Listen to machines with unique channel name
    const machinesChannel = supabase
      .channel('public:machines:' + Date.now())
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'machines' 
        },
        async (payload) => {
          console.log('🔄 Machine update received:', payload.eventType, payload.new?.id)
          if (onMachinesChange) {
            const machines = await loadMachinesFromCloud()
            if (machines) {
              onMachinesChange(machines)
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Machines channel status:', status)
      })

    realtimeChannels.push(machinesChannel)

    // Listen to constructions
    const constructionsChannel = supabase
      .channel('public:constructions:' + Date.now())
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'constructions' 
        },
        async (payload) => {
          console.log('🔄 Construction update received:', payload.eventType)
          if (onConstructionsChange) {
            const constructions = await loadConstructionsFromCloud()
            if (constructions) {
              onConstructionsChange(constructions)
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Constructions channel status:', status)
      })

    realtimeChannels.push(constructionsChannel)

    // Listen to history
    const historyChannel = supabase
      .channel('public:history:' + Date.now())
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'history' 
        },
        async (payload) => {
          console.log('🔄 New history entry received')
          if (onHistoryChange) {
            const history = await loadHistoryFromCloud()
            if (history) {
              onHistoryChange(history)
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 History channel status:', status)
      })

    realtimeChannels.push(historyChannel)

    console.log('✅ Real-time listeners activated')
    console.log(`📊 Active channels: ${realtimeChannels.length}`)
  } catch (e) {
    console.error('❌ Setup listeners error:', e)
  }
}

function cleanupListeners() {
  if (realtimeChannels.length > 0) {
    console.log(`🧹 Cleaning up ${realtimeChannels.length} channels...`)
    realtimeChannels.forEach(channel => {
      if (supabase && channel) {
        supabase.removeChannel(channel)
      }
    })
    realtimeChannels = []
    console.log('✅ Channels cleaned up')
  }
}

// ============ UTILITY FUNCTIONS ============

function getDeviceId() {
  let deviceId = localStorage.getItem('device_id')
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
    localStorage.setItem('device_id', deviceId)
  }
  return deviceId
}

function getDeviceName() {
  let deviceName = localStorage.getItem('device_name')
  if (!deviceName) {
    const ua = navigator.userAgent
    if (ua.includes('Windows')) deviceName = 'Windows PC'
    else if (ua.includes('Mac')) deviceName = 'Mac'
    else if (ua.includes('iPhone')) deviceName = 'iPhone'
    else if (ua.includes('iPad')) deviceName = 'iPad'
    else if (ua.includes('Android')) deviceName = 'Android'
    else deviceName = 'Unknown Device'
    
    deviceName += ' (' + new Date().toLocaleDateString() + ')'
    localStorage.setItem('device_name', deviceName)
  }
  return deviceName
}

function getMachineBlockFromNumber(machineNum) {
  const BLOCKS = {
    A: [{ start: 1, end: 160 }],
    B: [
      { start: 201, end: 220 }, { start: 261, end: 280 }, { start: 321, end: 340 },
      { start: 381, end: 400 }, { start: 441, end: 460 }, { start: 501, end: 520 },
      { start: 561, end: 580 }, { start: 621, end: 640 }
    ],
    C: [
      { start: 181, end: 200 }, { start: 241, end: 260 }, { start: 301, end: 320 },
      { start: 361, end: 380 }, { start: 421, end: 440 }, { start: 481, end: 500 },
      { start: 541, end: 560 }, { start: 601, end: 620 }
    ],
    D: [
      { start: 161, end: 180 }, { start: 221, end: 240 }, { start: 281, end: 300 },
      { start: 341, end: 360 }, { start: 401, end: 420 }, { start: 461, end: 480 },
      { start: 521, end: 540 }, { start: 581, end: 600 }
    ]
  }

  for (const [blockName, ranges] of Object.entries(BLOCKS)) {
    for (const range of ranges) {
      if (machineNum >= range.start && machineNum <= range.end) {
        return blockName
      }
    }
  }
  return '?'
}

// ============ COMPATIBILITY ALIASES ============

async function firebaseInit() { return await supabaseInit() }
async function firebaseSignIn(email, password) { return await supabaseSignIn(email, password) }
async function firebaseSignOut() { return await supabaseSignOut() }

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  cleanupListeners()
})
