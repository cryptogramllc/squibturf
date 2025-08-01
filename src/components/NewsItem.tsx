import moment from 'moment';
import React, { useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Video from 'react-native-video';
const SquibApi = require('../api');

// Global cache for profile photos to avoid duplicate API calls
const profilePhotoCache = new Map<
  string,
  { photo: string | null; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration

// Utility function to clear cache for a specific user (useful when profile is updated)
export const clearUserProfileCache = (userId: string) => {
  profilePhotoCache.delete(userId);
};

// Utility function to clear entire cache
export const clearAllProfileCache = () => {
  profilePhotoCache.clear();
};

interface NewsItemProps {
  img?: string[]; // Optional array of image URIs
  video?: string[]; // Optional array of video URIs
  text?: string; // Optional text content
  name: string; // Required name of the author
  time: string; // Required timestamp as string
  onPress: () => void; // Function to handle press event
  onMenuPress?: () => void; // Function to handle menu press (three dots)
  lat?: number | string; // Optional latitude
  lon?: number | string; // Optional longitude
  location?: { city?: string; state?: string; country?: string }; // Optional location object
  type?: 'photo' | 'video'; // Optional content type
  userPhoto?: string; // Optional user profile picture
  userId?: string; // User UUID to fetch profile picture
}

const NewsItem: React.FC<NewsItemProps> = ({
  img,
  video,
  text,
  name,
  time,
  onPress,
  onMenuPress,
  lat,
  lon,
  location,
  type,
  userPhoto,
  userId,
}) => {
  const [profilePicture, setProfilePicture] = useState<string | null>(
    userPhoto || null
  );
  const [showDropdown, setShowDropdown] = useState(false);

  // Helper function to show action sheet with multiple options
  const showActionSheet = () => {
    if (Platform.OS === 'ios') {
      const options = [
        { title: 'Cancel', action: () => {}, style: 'cancel' as const },
        {
          title: 'Delete',
          action: () => {
            // Show confirmation dialog
            Alert.alert(
              'Delete Squib',
              'Are you sure you want to delete this squib?',
              [
                { text: 'No', onPress: () => {}, style: 'cancel' },
                { text: 'Yes', onPress: onMenuPress, style: 'destructive' },
              ]
            );
          },
          style: 'destructive' as const,
        },
        // Future options can be easily added here:
        // { title: 'Report', action: () => handleReport(), style: 'default' as const },
        // { title: 'Edit', action: () => handleEdit(), style: 'default' as const },
      ];

      const actionSheetOptions = {
        title: 'Squib Options',
        options: options.map(opt => opt.title),
        cancelButtonIndex: 0,
        destructiveButtonIndex: 1,
      };

      ActionSheetIOS.showActionSheetWithOptions(
        actionSheetOptions,
        (buttonIndex: number) => {
          if (
            buttonIndex > 0 &&
            options[buttonIndex] &&
            typeof options[buttonIndex].action === 'function'
          ) {
            options[buttonIndex].action();
          }
        }
      );
    } else {
      // Android: Toggle dropdown menu
      setShowDropdown(!showDropdown);
    }
  };

  const handleDelete = () => {
    setShowDropdown(false);
    // Call the parent's onMenuPress directly - it will handle its own confirmation dialog
    if (onMenuPress) {
      onMenuPress();
    }
  };

  // Future menu options can be easily added here
  const menuOptions = [
    {
      title: 'Delete',
      icon: 'trash',
      action: handleDelete,
      style: 'destructive',
    },
    // { title: 'Report', icon: 'flag', action: () => handleReport(), style: 'default' },
    // { title: 'Edit', icon: 'edit', action: () => handleEdit(), style: 'default' },
  ];

  // Close dropdown when clicking outside
  const handlePressOutside = () => {
    if (showDropdown) {
      setShowDropdown(false);
    } else {
      // If dropdown is not open, call the original onPress
      onPress();
    }
  };

  // Calculate total media count and width
  const totalMedia = (img?.length || 0) + (video?.length || 0);
  const mediaFlexBasis = totalMedia > 0 ? 100 / totalMedia : 100;

  // Fetch user profile picture for all users with caching
  useEffect(() => {
    const fetchProfilePicture = async () => {
      if (userId) {
        // Check cache first
        const cached = profilePhotoCache.get(userId);
        const now = Date.now();

        if (cached && now - cached.timestamp < CACHE_DURATION) {
          // Use cached data if it's still valid
          setProfilePicture(cached.photo);
          return;
        }

        try {
          const api = new SquibApi();
          const response = await api.getProfile(userId);

          let photoUrl = null;
          if (response && response.data && response.data.photo) {
            photoUrl = response.data.photo;
            setProfilePicture(photoUrl);
          } else {
          }

          // Cache the result (even if null, to avoid repeated failed calls)
          profilePhotoCache.set(userId, {
            photo: photoUrl,
            timestamp: now,
          });
        } catch (error) {
          // Cache null result to avoid repeated failed calls
          profilePhotoCache.set(userId, {
            photo: null,
            timestamp: now,
          });
        }
      } else {
      }
    };

    fetchProfilePicture();
  }, [userId, name]);

  return (
    <TouchableOpacity onPress={handlePressOutside} style={styles.newsItem}>
      <View style={styles.container}>
        {/* User Info Section - LinkedIn Style */}
        <View style={styles.userInfoContainer}>
          <View style={styles.userInfoLeft}>
            {profilePicture ? (
              <Image
                source={{
                  uri: (() => {
                    const photoUrl =
                      profilePicture &&
                      profilePicture.includes(
                        'squibturf-images.s3.amazonaws.com'
                      )
                        ? profilePicture.replace(
                            'squibturf-images.s3.amazonaws.com',
                            'squibturf-images.s3.us-east-1.amazonaws.com'
                          )
                        : profilePicture;
                    // Ensure the URL has the correct format with double slash
                    const finalPhotoUrl =
                      photoUrl &&
                      photoUrl.includes(
                        'squibturf-images.s3.us-east-1.amazonaws.com'
                      ) &&
                      !photoUrl.includes('//profile-')
                        ? photoUrl.replace(
                            'squibturf-images.s3.us-east-1.amazonaws.com/',
                            'squibturf-images.s3.us-east-1.amazonaws.com//'
                          )
                        : photoUrl;
                    return finalPhotoUrl;
                  })(),
                }}
                style={styles.userProfilePic}
                onLoadStart={() => {}}
                onLoad={() => {}}
                onError={error => {
                  // Fallback to teal circle if image fails to load
                  setProfilePicture(null);
                }}
              />
            ) : (
              <View style={styles.userProfilePicPlaceholder}>
                <Text style={styles.userProfilePicText}>
                  {name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.userInfoText}>
              <Text style={styles.userName}>
                <Text style={{ fontWeight: '700', color: '#44C1AF' }}>
                  {name}
                </Text>
              </Text>
              <Text style={styles.userTime}>
                {(() => {
                  let m = moment(time, moment.ISO_8601, true);
                  if (!m.isValid()) {
                    m = moment(time, 'MMM DD YYYY h:mm A');
                  }
                  return m.isValid() ? m.fromNow() : 'Invalid date';
                })()}
              </Text>
            </View>
          </View>

          {/* Three Dots Menu */}
          {onMenuPress && (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={showActionSheet}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FontAwesome name="ellipsis-h" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Android Dropdown Menu */}
        {Platform.OS === 'android' && showDropdown && (
          <View style={styles.dropdownContainer}>
            {menuOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dropdownItem,
                  option.style === 'destructive' &&
                    styles.dropdownItemDestructive,
                ]}
                onPress={option.action}
                activeOpacity={0.7}
              >
                <FontAwesome
                  name={option.icon as any}
                  size={16}
                  color={option.style === 'destructive' ? '#ff4444' : '#666'}
                />
                <Text
                  style={[
                    styles.dropdownItemText,
                    option.style === 'destructive' &&
                      styles.dropdownItemTextDestructive,
                  ]}
                >
                  {option.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Squib Text Section */}
        {text && <Text style={styles.newsItem_text}>{text}</Text>}

        {/* Media Section */}
        {(img && img.length > 0) || (video && video.length > 0) ? (
          <View style={styles.mediaContainer}>
            {/* Render Images */}
            {img &&
              img.length > 0 &&
              img.map(
                (image, key) =>
                  image && (
                    <Image
                      key={`img-${key}`}
                      source={{
                        uri: `https://squibturf-images.s3.amazonaws.com//${image}`,
                      }}
                      style={[
                        styles.newsItem_media,
                        { flexBasis: `${mediaFlexBasis}%` },
                      ]}
                      onLoadStart={() => {}}
                      onLoad={() => {}}
                      onError={e => {}}
                    />
                  )
              )}
            {/* Render Videos */}
            {video &&
              video.length > 0 &&
              video.map(
                (videoFile, key) =>
                  videoFile && (
                    <View
                      key={`video-${key}`}
                      style={[
                        styles.videoContainer,
                        { flexBasis: `${mediaFlexBasis}%` },
                      ]}
                    >
                      <Video
                        source={{
                          uri: `https://squibturf-images.s3.amazonaws.com//${videoFile}`,
                        }}
                        style={[styles.newsItem_media, { width: '100%' }]}
                        resizeMode="cover"
                        repeat={false}
                        paused={true}
                        muted={true}
                        onLoadStart={() => {}}
                        onLoad={() => {}}
                        onError={e => {}}
                      />
                    </View>
                  )
              )}
          </View>
        ) : null}

        {/* Location Section */}
        {location && (
          <View style={styles.locationOverlay}>
            <View style={styles.locationContainer}>
              <FontAwesome
                name="map-marker"
                size={22}
                color="#44C1AF"
                style={styles.locationIcon}
              />
              <Text style={styles.locationText}>
                {[location.city, location.state, location.country]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  newsItem: {
    backgroundColor: 'white',
    marginBottom: 10,
    borderTopWidth: 1,
    borderColor: '#44C1AF',
  },
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  newsItem_text: {
    textAlign: 'left',
    fontSize: 14,
    fontWeight: '400',
    color: '#444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    lineHeight: 20,
  },
  newsItem_name: {
    textAlign: 'left',
    fontSize: 12,
    fontWeight: '400',
    color: '#444',
    padding: 20,
    top: -10,
    width: '100%',
  },
  newsItem_media: {
    height: 250,
    flex: 1,
  },
  newsItem_video: {
    height: 250,
    width: '20%',
    flex: 1,
  },
  videoContainer: {
    position: 'relative',
    flex: 1,
  },
  videoOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }],
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIcon: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationText: {
    fontSize: 14,
    color: '#44C1AF',
    textAlign: 'left',
    fontWeight: '500',
    marginLeft: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 4,
  },
  locationOverlay: {
    marginTop: 15,
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  userInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userProfilePic: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
  },
  userProfilePicPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#44C1AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userProfilePicText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfoText: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userTime: {
    fontSize: 12,
    color: '#666',
  },
  mediaContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  menuButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    position: 'absolute',
    top: 50, // Position below the header
    right: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 1000,
    minWidth: 120,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  dropdownItemDestructive: {
    borderBottomColor: '#ffebee',
  },
  dropdownItemText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dropdownItemTextDestructive: {
    color: '#ff4444',
  },
});

export default NewsItem;
