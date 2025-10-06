/**
 * Gets the current user ID from localStorage or fetches it from the API
 * Uses the selected profile or creates a default Guest profile
 */
export async function getCurrentUserId(): Promise<string> {
  // Try to get the selected profile from localStorage first
  const selectedUserId = localStorage.getItem('selected-profile-id')
  if (selectedUserId) {
    return selectedUserId
  }

  // Otherwise, fetch the default user from the API
  const result = await window.api.settings.getCurrentUser()

  if (!result.success || !result.data) {
    throw new Error('Failed to get current user')
  }

  // Cache it in localStorage for future calls
  localStorage.setItem('selected-profile-id', result.data.id)

  return result.data.id
}

/**
 * Sets the current profile by ID
 */
export function setCurrentProfile(userId: string): void {
  localStorage.setItem('selected-profile-id', userId)
}

/**
 * Clears the current profile selection
 */
export function clearCurrentProfile(): void {
  localStorage.removeItem('selected-profile-id')
}
