# Profile System

The Stunts Electron app now has a multi-profile system that allows you to create and switch between different user profiles without passwords.

## Features

- **No Authentication Required**: Profiles are simple named identities without passwords
- **Automatic Guest Profile**: On first launch, a "Guest" profile is automatically created
- **Profile Management**: Create, switch, and delete profiles easily
- **Profile Persistence**: Selected profile is saved in localStorage
- **Profile Isolation**: Each profile has its own projects, settings, and data

## How It Works

### First Launch

1. App starts at `/profiles` route
2. A default "Guest" profile is automatically created if no profiles exist
3. The Guest profile is selected and you're redirected to `/projects`

### Creating New Profiles

1. Click on the profile avatar/name in the Projects page header
2. Or navigate to `/profiles` route
3. Click "+ New Profile" button
4. Enter a profile name
5. Click "Create"

### Switching Profiles

1. Click on the current profile avatar/name in the header
2. Select a different profile from the list
3. You'll be redirected to the Projects page with the new profile's data

### Deleting Profiles

1. Go to the Profiles page
2. Click the "×" button on any profile (except if it's the only one)
3. Confirm deletion
4. The profile and all its data will be removed

## Technical Details

### Storage

- Profiles are stored in `Documents/Stunts/data.json` under the `users` array
- Selected profile ID is stored in `localStorage` as `selected-profile-id`
- Each user has: `id`, `name`, `email` (optional), `role`, `userLanguage`, timestamps

### Key Files

- **Backend**:
  - `src/main/services/storage.ts` - User CRUD operations
  - `src/main/ipc/settings.ts` - IPC handlers for profile management

- **Frontend**:
  - `src/renderer/src/components/ProfileSelector.tsx` - Main profile UI
  - `src/renderer/src/components/ProfileSwitcher.tsx` - Header profile widget
  - `src/renderer/src/stunts-pages/profiles/page.tsx` - Profile selection page
  - `src/renderer/src/lib/getCurrentUserId.ts` - Profile ID utilities

### API Methods

```typescript
// Get all profiles
await window.api.settings.getAllUsers()

// Get specific profile
await window.api.settings.getUser(userId)

// Create new profile
await window.api.settings.createUser({ name: 'John', email: 'john@example.com' })

// Update profile
await window.api.settings.updateUser({ userId, updates: { name: 'Jane' } })

// Delete profile
await window.api.settings.deleteUser(userId)

// Get or create default profile
await window.api.settings.getCurrentUser()
```

### Utility Functions

```typescript
import { getCurrentUserId, setCurrentProfile, clearCurrentProfile } from '@/lib/getCurrentUserId'

// Get current profile ID
const userId = await getCurrentUserId()

// Switch to different profile
setCurrentProfile(userId)

// Clear profile selection (will select default on next call)
clearCurrentProfile()
```

## Use Cases

1. **Personal Projects**: Keep work and personal projects separate
2. **Testing**: Create test profiles to try features without affecting main data
3. **Multiple Users**: Share one computer with family members
4. **Client Work**: Separate profiles for different clients
5. **Learning**: Create a practice profile to experiment safely

## Limitations

- No password protection (profiles are accessible to anyone using the app)
- Cannot delete the last remaining profile
- Profile data is stored locally only
- No cloud sync between devices
