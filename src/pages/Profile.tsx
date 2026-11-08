import { useState, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User,
  Mail,
  Calendar,
  Shield,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Key,
  Trash2,
} from 'lucide-react';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cloudinaryPhotoUrl, setCloudinaryPhotoUrl] = useState<string | null>(
    currentUser?.photoURL || null
  );
  const cloudinaryPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

  // Password change states
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Delete account states
  const [deletePassword, setDeletePassword] = useState('');

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isGoogleUser = currentUser?.providerData.some(
    (provider) => provider.providerId === 'google.com'
  );

  const handleUpdateProfile = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      await updateProfile(currentUser, { displayName });
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    if (!cloudinaryPreset) {
      toast({
        title: 'Missing preset',
        description: 'Configure VITE_CLOUDINARY_UPLOAD_PRESET in .env (unsigned).',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploadingPhoto(true);
      
      // Upload to Cloudinary using FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', cloudinaryPreset); // Cloudinary unsigned preset
      formData.append('folder', 'carbotrack-profiles'); // Organize uploads in a folder
      formData.append('public_id', `profile_${currentUser.uid}`); // Unique public ID

      const response = await fetch(
        'https://api.cloudinary.com/v1_1/dl53or9kc/image/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const message = data?.error?.message || 'Failed to upload image to Cloudinary';
        throw new Error(message);
      }
      const photoUrl = data.secure_url; // Full URL from Cloudinary

      // Store the secure URL in Firebase Auth photoURL field
      await updateProfile(currentUser, { photoURL: photoUrl });
      setCloudinaryPhotoUrl(photoUrl);

      toast({
        title: 'Photo Updated',
        description: 'Your profile photo has been successfully uploaded to Cloudinary',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload photo',
        variant: 'destructive',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentUser || !currentUser.email) return;

    if (newPassword !== confirmNewPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      
      // Update password
      await updatePassword(currentUser, newPassword);
      
      toast({
        title: 'Password Changed',
        description: 'Your password has been updated successfully',
      });
      
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      let message = 'Failed to change password';
      if (error.code === 'auth/wrong-password') {
        message = 'Current password is incorrect';
      }
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser || !currentUser.email) return;

    try {
      setLoading(true);

      // Re-authenticate if email/password user
      if (!isGoogleUser) {
        const credential = EmailAuthProvider.credential(currentUser.email, deletePassword);
        await reauthenticateWithCredential(currentUser, credential);
      }

      await deleteUser(currentUser);
      
      toast({
        title: 'Account Deleted',
        description: 'Your account has been permanently deleted',
      });
      
      navigate('/login');
    } catch (error: any) {
      let message = 'Failed to delete account';
      if (error.code === 'auth/wrong-password') {
        message = 'Password is incorrect';
      } else if (error.code === 'auth/requires-recent-login') {
        message = 'Please log out and log back in before deleting your account';
      }
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!currentUser) {
    return (
      <Layout title="Profile" subtitle="Manage your account information">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">User not found. Please log in again.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Profile" subtitle="Manage your account information">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <div className="glass-card p-8 rounded-xl border border-border">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Profile Photo */}
            <div className="relative group">
              <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-primary/20 bg-muted flex items-center justify-center flex-shrink-0">
                {cloudinaryPhotoUrl ? (
                  <img 
                    src={cloudinaryPhotoUrl} 
                    alt={currentUser?.displayName || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="bg-primary/10 text-primary text-3xl font-semibold flex items-center justify-center w-full h-full">
                    {getInitials(currentUser?.displayName || currentUser?.email)}
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploadingPhoto ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <Camera className="h-8 w-8 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {/* Basic Info */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-foreground">
                {currentUser?.displayName || 'User'}
              </h2>
              <p className="text-muted-foreground">{currentUser?.email}</p>
              <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                {currentUser?.emailVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                    Email Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full">
                    <AlertCircle className="h-3 w-3" />
                    Email Not Verified
                  </span>
                )}
                {isGoogleUser && (
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full">
                    <svg className="h-3 w-3" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google Account
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="glass-card p-6 rounded-xl border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Account Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={currentUser?.email || ''}
                  disabled
                  className="pl-10 bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label>User ID</Label>
              <Input value={currentUser?.uid || ''} disabled className="bg-muted font-mono text-xs" />
            </div>

            <div className="space-y-2">
              <Label>Account Created</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={formatDate(currentUser?.metadata.creationTime)}
                  disabled
                  className="pl-10 bg-muted"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Last Sign In</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={formatDate(currentUser?.metadata.lastSignInTime)}
                  disabled
                  className="pl-10 bg-muted"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Authentication Provider</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={isGoogleUser ? 'Google' : 'Email/Password'}
                  disabled
                  className="pl-10 bg-muted"
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Button onClick={handleUpdateProfile} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>

        {/* Security Section - Only for Email/Password users */}
        {!isGoogleUser && (
          <div className="glass-card p-6 rounded-xl border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Security
            </h3>

            {!showPasswordChange ? (
              <Button variant="outline" onClick={() => setShowPasswordChange(true)}>
                Change Password
              </Button>
            ) : (
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handlePasswordChange} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmNewPassword('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Danger Zone */}
        <div className="glass-card p-6 rounded-xl border border-destructive/30 bg-destructive/5">
          <h3 className="text-lg font-semibold text-destructive mb-4 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </h3>
          <p className="text-muted-foreground mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account
                  and remove your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              {!isGoogleUser && (
                <div className="space-y-2 py-4">
                  <Label htmlFor="deletePassword">Enter your password to confirm</Label>
                  <Input
                    id="deletePassword"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Your password"
                  />
                </div>
              )}

              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Account'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Layout>
  );
}
