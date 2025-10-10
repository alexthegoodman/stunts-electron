import React, { useEffect, useState } from 'react'
import { Eye, EyeSlash, Key } from '@phosphor-icons/react'
import toast from 'react-hot-toast'

interface ApiKeys {
  openai?: string
  replicate?: string
}

export function ApiKeySettings() {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({})
  const [showKeys, setShowKeys] = useState<{ openai: boolean; replicate: boolean }>({
    openai: false,
    replicate: false
  })
  const [editingKeys, setEditingKeys] = useState<ApiKeys>({})
  const [isEditing, setIsEditing] = useState<{ openai: boolean; replicate: boolean }>({
    openai: false,
    replicate: false
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    try {
      const result = await window.api.settings.getApiKeys()
      if (result.success) {
        setApiKeys(result.data || {})
      } else {
        toast.error('Failed to load API keys')
      }
    } catch (error) {
      console.error('Error loading API keys:', error)
      toast.error('Error loading API keys')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveKey = async (service: 'openai' | 'replicate') => {
    const newKey = editingKeys[service]
    if (!newKey || !newKey.trim()) {
      toast.error('API key cannot be empty')
      return
    }

    try {
      const result = await window.api.settings.updateApiKey({
        service,
        apiKey: newKey.trim()
      })

      if (result.success) {
        setApiKeys({ ...apiKeys, [service]: newKey.trim() })
        setEditingKeys({ ...editingKeys, [service]: '' })
        setIsEditing({ ...isEditing, [service]: false })
        toast.success(`${service === 'openai' ? 'OpenAI' : 'Replicate'} API key saved`)
      } else {
        toast.error(result.error || 'Failed to save API key')
      }
    } catch (error) {
      console.error('Error saving API key:', error)
      toast.error('Error saving API key')
    }
  }

  const handleDeleteKey = async (service: 'openai' | 'replicate') => {
    if (!confirm(`Are you sure you want to delete your ${service === 'openai' ? 'OpenAI' : 'Replicate'} API key?`)) {
      return
    }

    try {
      const result = await window.api.settings.deleteApiKey(service)

      if (result.success) {
        setApiKeys({ ...apiKeys, [service]: undefined })
        toast.success(`${service === 'openai' ? 'OpenAI' : 'Replicate'} API key deleted`)
      } else {
        toast.error(result.error || 'Failed to delete API key')
      }
    } catch (error) {
      console.error('Error deleting API key:', error)
      toast.error('Error deleting API key')
    }
  }

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '••••••••'
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4)
  }

  const renderKeyInput = (
    service: 'openai' | 'replicate',
    label: string,
    placeholder: string,
    description: string
  ) => {
    const hasKey = !!apiKeys[service]
    const isEditingThis = isEditing[service]
    const showKey = showKeys[service]

    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Key size={20} className="text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">{label}</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{description}</p>

        {hasKey && !isEditingThis ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={showKey ? apiKeys[service] : maskApiKey(apiKeys[service]!)}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
              />
              <button
                onClick={() => setShowKeys({ ...showKeys, [service]: !showKey })}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeSlash size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing({ ...isEditing, [service]: true })
                  setEditingKeys({ ...editingKeys, [service]: apiKeys[service] || '' })
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
              >
                Update
              </button>
              <button
                onClick={() => handleDeleteKey(service)}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="password"
              value={editingKeys[service] || ''}
              onChange={(e) => setEditingKeys({ ...editingKeys, [service]: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveKey(service)}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleSaveKey(service)}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
              >
                Save
              </button>
              {hasKey && (
                <button
                  onClick={() => {
                    setIsEditing({ ...isEditing, [service]: false })
                    setEditingKeys({ ...editingKeys, [service]: '' })
                  }}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 text-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6">
        <div className="text-center text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">API Keys</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Manage your API keys for AI-powered features. Keys are stored securely and encrypted on your
        device.
      </p>

      <div className="space-y-4">
        {renderKeyInput(
          'openai',
          'OpenAI API Key',
          'sk-proj-...',
          'Required for AI animation generation and content summaries'
        )}

        {renderKeyInput(
          'replicate',
          'Replicate API Key',
          'r8_...',
          'Required for AI image generation'
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          How to get API keys:
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>
            • <strong>OpenAI:</strong> Visit{' '}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-600"
            >
              platform.openai.com/api-keys
            </a>
          </li>
          <li>
            • <strong>Replicate:</strong> Visit{' '}
            <a
              href="https://replicate.com/account/api-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-600"
            >
              replicate.com/account/api-tokens
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}
