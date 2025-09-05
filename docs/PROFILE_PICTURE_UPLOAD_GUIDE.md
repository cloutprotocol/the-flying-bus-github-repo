# Profile Picture Upload Guide

## Overview

Users can now upload profile pictures directly from their settings page. This feature is available for both regular users and admin users in their respective settings sections.

## Features

- **Direct Upload**: Users can upload image files directly from their device
- **File Validation**: Only image files are accepted (JPG, PNG, GIF)
- **Size Limit**: Maximum file size of 5MB
- **Automatic Cleanup**: Old profile pictures are automatically deleted when a new one is uploaded
- **Fallback Support**: Users can still paste image URLs manually if preferred
- **Real-time Preview**: Avatar updates immediately after successful upload

## User Experience

### For Regular Users (Main Site Settings)
1. Navigate to Settings → Profile tab
2. Click the "Upload Picture" button next to the avatar
3. Select an image file from your device
4. The avatar updates automatically upon successful upload

### For Admin Users (Admin Dashboard Settings)
1. Navigate to Admin Dashboard → Settings → Profile tab
2. Click the "Upload Picture" button next to the avatar
3. Select an image file from your device
4. The avatar updates automatically upon successful upload

## Technical Implementation

### Components
- `ProfilePictureUpload`: Reusable component for handling profile picture uploads
- `ProfileSettings` (Admin): Updated to use the new upload component
- `UserProfileSettings`: Updated to use the new upload component

### Services
- `profilePictureService`: Handles profile picture upload and cleanup operations
- Uses existing Supabase storage bucket (`media`) with proper security policies

### Storage Structure
Profile pictures are stored in the following path structure:
```
media/
  avatars/
    {userId}/
      {timestamp}.{extension}
```

### Security
- Only authenticated users can upload profile pictures
- Files are validated for type and size on the client side
- Server-side validation through Supabase storage policies
- Users can only access their own profile pictures

## File Requirements

- **Supported Formats**: JPG, PNG, GIF
- **Maximum Size**: 5MB
- **Recommended Dimensions**: Square images work best (e.g., 400x400px)

## Error Handling

The system provides user-friendly error messages for:
- Invalid file types
- Files exceeding size limit
- Network/upload errors
- Authentication issues

## Fallback Options

Users can still:
- Paste direct image URLs in the "Avatar URL" field
- Use external image hosting services
- Keep their existing avatar if they don't want to upload a new one

## Storage Management

- Old profile pictures are automatically deleted when new ones are uploaded
- Only images stored in the `avatars/` folder are subject to automatic cleanup
- External URLs are not affected by cleanup operations

## Browser Compatibility

The upload feature works in all modern browsers that support:
- File API
- FormData
- Fetch API
- HTML5 file input

## Troubleshooting

### Upload Not Working
1. Check file size (must be under 5MB)
2. Verify file type (must be an image)
3. Ensure stable internet connection
4. Try refreshing the page and attempting again

### Avatar Not Updating
1. Clear browser cache
2. Check if the upload completed successfully
3. Verify you're logged in with the correct account

### Permission Errors
1. Ensure you're logged in
2. Check that your session hasn't expired
3. Try logging out and back in

## Future Enhancements

Potential future improvements could include:
- Image cropping/resizing tools
- Multiple image format support
- Bulk upload capabilities
- Integration with external image services
- Advanced image editing features