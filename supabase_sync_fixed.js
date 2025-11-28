// ============ SUPABASE SYNC LAYER - WITH DEBUG ============
// Real-time sync dengan Supabase database

const SUPABASE_URL = https://omkovtlvabwblgijodxe.supabase.co
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ta292dGx2YWJ3YmxnaWpvZHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3OTA2MzgsImV4cCI6MjA3OTM2NjYzOH0._9CRzqxKd450pX5ZgVAaocCUfWh5vV2GJXIFK3XAGKc

let supabase = null
let isCloudAvailable = false
let currentUserId = null
let realtimeChannels = []

// ============ INITIALIZATION ============

async function supabaseInit() {
  try {
    console.log('🔧 Starting Supabase initialization...')
    console.log('📍 Supabase URL:', SUPABASE_URL)
    
    // Check if already initialized
    if (supabase && isCloudAvailable) {
      console.log('✅ Supabase already initialized')
      return true
    }

    // Test network connectivity first
    console.log('🌐 Testing network connectivity...')
    try {
      const testResponse = await fetch('https://www.google.com/favicon.ico', { 
        mode: 'no-cors',
        cache: 'no-cache'
      })
      console.log('✅ Network is available')
    } catch (netErr) {
      console.error('❌ Network connectivity issue:', netErr)
      throw new Error('No network connection')
    }

    // Test Supabase URL accessibility
    console.log('🔍 Testing Supabase URL accessibility...')
    try {
      const urlTest = await fetch(SUPABASE_URL + '/rest/v1/', {
        method: 'HEAD',
        headers: {
          'apikey': SUPABASE_KEY
        }
      })
      console.log('✅ Supabase URL is accessible:', urlTest.status)
    } catch (urlErr) {
      console.error('❌ Cannot reach Supabase URL:', urlErr)
      throw new Error('Supabase URL not accessible')
    }

    // Lazy load Supabase SDK
    if (!window.supabase) {
      console.log('📦 Loading Supabase SDK...')
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
      
      await new Promise((resolve, reject) => {
        script.onload = () => {
          console.log('✅ Supabase SDK loaded')
          resolve()
        }
        script.onerror = (err) => {
          console.error('❌ Failed to load Supabase SDK:', err)
          reject(new Error('Failed to load Supabase SDK'))
        }
        document.head.appendChild(script)
      })
    }

    console.log('🔨 Creating Supabase client...')
    const { createClient } = window.supabase
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
    
    console.log('✅ Supabase client created')
    
    // Test connection with a simple query
    console.log('🧪 Testing database connection...')
    const { data, error } = await supabase
      .from('machines')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Database test failed:', error)
      throw error
    }
    
    isCloudAvailable = true
    console.log('✅ Supabase initialized successfully')
    console.log('📡 Real-time enabled')
    console.log('🎉 Cloud status: AVAILABLE')
    
    return true
  } catch (e) {
    console.error('❌ Supabase init error:', e.message)
    console.error('Full error:', e)
    isCloudAvailable = false
    
    // Show user-friendly error
    if (e.message.includes('network') || e.message.includes('Network')) {
      console.warn('⚠️ Network issue detected - using offline mode')
    } else if (e.message.includes('not accessible')) {
      console.warn('⚠️ Supabase server not accessible - check firewall/proxy')
    } else {
      console.warn('⚠️ Cloud unavailable - using local storage only')
    }
    
    return false
  }
}

// ============ AUTHENTICATION ============

async function supabaseSignIn(email, password) {
  console.log('🔐 Attempting sign in:', email)
  
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
      console.error('❌ Database error:', error)
      throw error
    }

    if (data && data.length > 0) {
      console.log(`✅ Loaded ${data.length} machines from Supabase`)
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
      console.error('❌ Machine upsert error:', machineError)
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
      console.warn('⚠️ History insert warning:', historyError)
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

// ============ REAL-TIME LISTENERS ============

async function setupRealtimeListeners(onMachinesChange, onConstructionsChange, onHistoryChange) {
  if (!isCloudAvailable || !supabase) {
    console.log('⚠️ Supabase not available, skipping real-time setup')
    return
  }

  try {
    console.log('🔌 Setting up real-time listeners...')

    cleanupListeners()

    // Listen to machines
    const machinesChannel = supabase
      .channel('public:machines:' + Date.now())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'machines' },
        async (payload) => {
          console.log('🔄 Machine update received:', payload.eventType, payload.new?.id)
          if (onMachinesChange) {
            const machines = await loadMachinesFromCloud()
            if (machines) onMachinesChange(machines)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Machines channel:', status)
      })

    realtimeChannels.push(machinesChannel)

    // Listen to constructions
    const constructionsChannel = supabase
      .channel('public:constructions:' + Date.now())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'constructions' },
        async (payload) => {
          console.log('🔄 Construction update received:', payload.eventType)
          if (onConstructionsChange) {
            const constructions = await loadConstructionsFromCloud()
            if (constructions) onConstructionsChange(constructions)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Constructions channel:', status)
      })

    realtimeChannels.push(constructionsChannel)

    // Listen to history
    const historyChannel = supabase
      .channel('public:history:' + Date.now())
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'history' },
        async (payload) => {
          console.log('🔄 New history entry received')
          if (onHistoryChange) {
            const history = await loadHistoryFromCloud()
            if (history) onHistoryChange(history)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 History channel:', status)
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  cleanupListeners()
})

console.log('📦 Supabase sync module loaded')
