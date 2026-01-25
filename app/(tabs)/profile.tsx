import { StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View } from '@/components/Themed';
import { useAuthContext } from '@/lib/AuthContext';

export default function SettingsScreen() {
  const { user, signOut } = useAuthContext();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const getInitials = () => {
    if (!user?.email) return '?';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </View>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Free Plan</Text>
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="user-o"
            label="Edit Profile"
            onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available soon')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="tags"
            label="Categories"
            onPress={() => Alert.alert('Coming Soon', 'Category management will be available soon')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="bell-o"
            label="Notifications"
            onPress={() => Alert.alert('Coming Soon', 'Notification settings will be available soon')}
          />
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="dollar"
            label="Currency"
            value="USD"
            onPress={() => Alert.alert('Coming Soon', 'Currency selection will be available soon')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="moon-o"
            label="Appearance"
            value="Light"
            onPress={() => Alert.alert('Coming Soon', 'Dark mode will be available soon')}
          />
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="info-circle"
            label="Version"
            value="1.0.0"
            showArrow={false}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="shield"
            label="Privacy Policy"
            onPress={() => Alert.alert('Coming Soon', 'Privacy policy will be available soon')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="file-text-o"
            label="Terms of Service"
            onPress={() => Alert.alert('Coming Soon', 'Terms of service will be available soon')}
          />
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        activeOpacity={0.8}
      >
        <FontAwesome name="sign-out" size={18} color="#FF3B30" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>Made with care</Text>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  label,
  value,
  onPress,
  showArrow = true
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.menuItemLeft}>
        <View style={styles.menuIconContainer}>
          <FontAwesome name={icon as any} size={16} color="#8E8E93" />
        </View>
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {value && <Text style={styles.menuValue}>{value}</Text>}
        {showArrow && onPress && (
          <FontAwesome name="chevron-right" size={12} color="#C7C7CC" />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Profile Card
  profileCard: {
    backgroundColor: '#000',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#000',
    fontSize: 28,
    fontWeight: '700',
  },
  email: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Sections
  section: {
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 56,
  },

  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'transparent',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  menuValue: {
    fontSize: 15,
    color: '#8E8E93',
  },

  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  signOutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },

  // Footer
  footerText: {
    textAlign: 'center',
    color: '#C7C7CC',
    fontSize: 13,
    marginTop: 32,
  },
});
