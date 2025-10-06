import { CurrentUser } from '../hooks/useCurrentUser'

export interface UpdateLanguageResponse {
  updatedUser: CurrentUser
}

export const updateUserLanguage = async (
  token: string,
  chosenLanguage: string
): Promise<UpdateLanguageResponse> => {
  // TODO: Get userId from auth context or storage
  const userId = 'current-user-id'

  const result = await window.api.settings.update({
    userId,
    settings: { language: chosenLanguage }
  })

  if (!result.success) {
    throw new Error(result.error || 'Failed to update language')
  }

  return { updatedUser: result.data }
}
