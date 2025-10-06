import { CurrentUser } from '../hooks/useCurrentUser'
import { getCurrentUserId } from '../lib/getCurrentUserId'

export interface UpdateLanguageResponse {
  updatedUser: CurrentUser
}

export const updateUserLanguage = async (
  token: string,
  chosenLanguage: string
): Promise<UpdateLanguageResponse> => {
  const userId = await getCurrentUserId()

  const result = await window.api.settings.update({
    userId,
    settings: { language: chosenLanguage }
  })

  if (!result.success) {
    throw new Error(result.error || 'Failed to update language')
  }

  return { updatedUser: result.data }
}
