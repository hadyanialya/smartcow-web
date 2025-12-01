import { useEffect, useState } from 'react';
import DashboardLayout from './DashboardLayout';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../App';
import { 
  findUserByNameRole,
  isUsernameTaken,
  updateUserProfileByNameRole,
  updatePasswordByNameRole,
} from '../utils/auth';
import { 
  loadSettings,
  loadSettingsSync,
  saveSettings,
  UserSettings,
} from '../utils/settings';

export default function Settings() {
  const { userRole, userName, userId: authUserId, updateUserName } = useAuth();
  const settingsUserId = `${userRole}:${userName || 'anonymous'}`;
  const defaultSettings = loadSettingsSync(settingsUserId, userRole);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [name, setName] = useState(defaultSettings.profile.fullName);
  const [username, setUsername] = useState(defaultSettings.profile.username);
  const [email, setEmail] = useState(defaultSettings.profile.email);
  const [phone, setPhone] = useState(defaultSettings.profile.phone || '');
  const [address, setAddress] = useState(defaultSettings.profile.address || '');
  const [profilePic, setProfilePic] = useState<string | null>(defaultSettings.profile.profilePicture || null);
  const [roleLabelVisible, setRoleLabelVisible] = useState(!!defaultSettings.profile.showRoleLabel);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const loadUserSettings = async () => {
      setSettingsLoading(true);
      
      // If userId is undefined, try to sync it from Supabase
      if (!authUserId && userName && userRole && userRole !== 'admin') {
        console.log('🔄 authUserId is undefined, attempting to sync from Supabase...');
        try {
          const { findUserByNameRole } = await import('../utils/auth');
          const user = findUserByNameRole(userName, userRole);
          if (user && user.id && user.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            // Valid UUID found, update auth context
            console.log('✅ Found valid userId, updating auth context:', user.id);
            if (updateUserName) {
              // Use a workaround to update userId - we'll need to add updateUserId to auth context
              // For now, we'll just log it and the user will need to logout/login
              console.log('⚠️ Please logout and login again to sync your userId');
            }
          } else {
            // Try to find in Supabase
            const { supabase } = await import('../lib/supabase');
            const { data: supabaseUser } = await supabase
              .from('users')
              .select('id, name, role, email')
              .eq('name', userName)
              .eq('role', userRole)
              .is('deleted_at', null)
              .maybeSingle();
            
            if (supabaseUser) {
              console.log('✅ Found user in Supabase, ID:', supabaseUser.id);
              console.log('⚠️ Please logout and login again to sync your userId');
            } else {
              console.log('⚠️ User not found in Supabase. Please logout and login again.');
            }
          }
        } catch (syncError) {
          console.error('❌ Error syncing userId:', syncError);
        }
      }
      
      try {
        const loadedSettings = await loadSettings(settingsUserId, userRole);
        setSettings(loadedSettings);
        // Update form fields when settings are loaded
        setName(loadedSettings.profile.fullName);
        setUsername(loadedSettings.profile.username);
        setEmail(loadedSettings.profile.email);
        setPhone(loadedSettings.profile.phone || '');
        setAddress(loadedSettings.profile.address || '');
        setProfilePic(loadedSettings.profile.profilePicture || null);
        setRoleLabelVisible(!!loadedSettings.profile.showRoleLabel);
      } catch (error) {
        console.error('Error loading settings:', error);
        // Fallback to sync version
        const fallbackSettings = loadSettingsSync(settingsUserId, userRole);
        setSettings(fallbackSettings);
      } finally {
        setSettingsLoading(false);
      }
    };
    loadUserSettings();
  }, [settingsUserId, userRole, authUserId, userName, updateUserName]);

  const onSaveProfile = async () => {
    if (!userName || !userRole) {
      setProfileMessage('Please login first.');
      return;
    }
    
    console.log('💾 Saving profile:', { currentUserName: userName, newUsername: username, role: userRole });
    
    const excludeId = findUserByNameRole(userName, userRole)?.id || undefined;
    if (isUsernameTaken(username, excludeId)) {
      setProfileMessage('Username already exists. Please choose another one.');
      return;
    }
    
    // Use current userName to find user, then update to new username
    // Pass authUserId (database ID) if available for more reliable lookup
    console.log('🔍 Update profile params:', { 
      currentName: userName, 
      newName: username, 
      role: userRole, 
      authUserId: authUserId || 'undefined - will search by name/role' 
    });
    const res = await updateUserProfileByNameRole(userName, userRole, { name: username, email }, authUserId);
    if (!res.success) {
      console.error('❌ Profile update failed:', res.message);
      setProfileMessage(res.message);
      return;
    }
    
    console.log('✅ Profile updated successfully:', res.user);
    
    // Update auth context if name changed
    if (username !== userName && updateUserName) {
      updateUserName(username);
    }
    
    const next: UserSettings = {
      ...settings,
      profile: {
        fullName: name,
        username,
        email,
        phone,
        address,
        profilePicture: profilePic,
        showRoleLabel: roleLabelVisible,
      },
    };
    await saveSettings(settingsUserId, next, userRole);
    setSettings(next);
    setProfileMessage('Profile updated successfully');
  };

  const onChangePassword = () => {
    setPasswordMessage('');
    if (newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Confirm password must match.');
      return;
    }
    const res = updatePasswordByNameRole(userName, userRole, oldPassword, newPassword);
    setPasswordMessage(res.message);
    if (res.success) {
      // Password changed
    }
  };

  const onToggleDarkMode = async (value: boolean) => {
    const next = { ...settings, darkMode: value };
    setSettings(next);
    await saveSettings(settingsUserId, next, userRole);
    document.documentElement.classList.toggle('dark', value);
  };

  const handleProfilePicUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setProfilePic(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6">
        <Card className="p-4 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white">
              {userName.charAt(0)}
            </div>
            <div>
              <div className="text-gray-900">{userName}</div>
              <Badge className="text-xs bg-blue-100 text-blue-700 capitalize">{userRole || ''}</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-purple-200">
          <div className="text-gray-900 mb-4">Profile Information</div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Display Name</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white overflow-hidden">
                {profilePic ? <img src={profilePic} alt="Profile" className="w-16 h-16 object-cover" /> : userName.charAt(0)}
              </div>
              <div>
                <Label>Profile Picture</Label>
                <Input type="file" accept="image/*" onChange={(e) => handleProfilePicUpload(e.target.files?.[0] || null)} />
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl" onClick={onSaveProfile}>Save Profile</Button>
            {profileMessage && <span className="text-sm text-gray-600">{profileMessage}</span>}
          </div>
        </Card>

        <Card className="p-6 border-purple-200">
          <div className="text-gray-900 mb-4">Security Settings</div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Old Password</Label>
              <div className="relative">
                <Input 
                  type={showOldPassword ? "text" : "password"} 
                  value={oldPassword} 
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showOldPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <Label>New Password</Label>
              <div className="relative">
                <Input 
                  type={showNewPassword ? "text" : "password"} 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <Label>Confirm Password</Label>
              <div className="relative">
                <Input 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl" onClick={onChangePassword}>Change Password</Button>
            {passwordMessage && <span className="text-sm text-gray-600">{passwordMessage}</span>}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
