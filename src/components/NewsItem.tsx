import moment from 'moment'; // Use ES6 import for moment
import React, { useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Video from 'react-native-video';
const SquibApi = require('../api');

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
  const [locationInfo] = useState<{
    city?: string;
    state?: string;
    country?: string;
  } | null>(location || null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(
    userPhoto || null
  );

  // Calculate total media count and width
  const totalMedia = (img?.length || 0) + (video?.length || 0);
  const mediaFlexBasis = totalMedia > 0 ? 100 / totalMedia : 100;

  // Fetch user profile picture if userId is provided and no userPhoto
  useEffect(() => {
    const fetchProfilePicture = async () => {
      if (userId && !userPhoto) {
        try {
          const api = new SquibApi();
          const response = await api.getProfile(userId);
          console.log('response', response);
          if (response && response.data && response.data.photo) {
            setProfilePhoto(response.data.photo);
          }
        } catch (error) {
          console.log('Error fetching profile picture:', error);
        }
      }
    };

    fetchProfilePicture();
  }, [userId, userPhoto]);

  return (
    <TouchableOpacity onPress={onPress} style={styles.newsItem}>
      <View style={styles.container}>
        {/* User Info Section - LinkedIn Style */}
        <View style={styles.userInfoContainer}>
          <View style={styles.userInfoLeft}>
            {profilePhoto ? (
              <Image
                source={{ uri: profilePhoto }}
                style={styles.userProfilePic}
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
              onPress={() => {
                ActionSheetIOS.showActionSheetWithOptions(
                  {
                    title: 'Squib Options',
                    options: ['Cancel', 'Delete'],
                    cancelButtonIndex: 0,
                    destructiveButtonIndex: 1,
                  },
                  buttonIndex => {
                    if (buttonIndex === 1) {
                      onMenuPress();
                    }
                  }
                );
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FontAwesome name="ellipsis-h" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

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
                      onLoadStart={() => {
                        console.log(
                          `[NewsItem] [${key}] Loading image: https://squibturf-images.s3.amazonaws.com//${image}`
                        );
                      }}
                      onLoad={() => {
                        console.log(
                          `[NewsItem] [${key}] Loaded image successfully: https://squibturf-images.s3.amazonaws.com//${image}`
                        );
                      }}
                      onError={e => {
                        console.error(
                          `[NewsItem] [${key}] Failed to load image: https://squibturf-images.s3.amazonaws.com//${image}`,
                          e.nativeEvent
                        );
                      }}
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
                        repeat={true}
                        paused={false}
                        muted={true}
                        onLoadStart={() => {
                          console.log(
                            `[NewsItem] [${key}] Loading video: https://squibturf-images.s3.amazonaws.com//${videoFile}`
                          );
                        }}
                        onLoad={() => {
                          console.log(
                            `[NewsItem] [${key}] Loaded video successfully: https://squibturf-images.s3.amazonaws.com//${videoFile}`
                          );
                        }}
                        onError={e => {
                          console.error(
                            `[NewsItem] [${key}] Failed to load video: https://squibturf-images.s3.amazonaws.com//${videoFile}`,
                            e
                          );
                        }}
                      />
                    </View>
                  )
              )}
          </View>
        ) : null}

        {/* Location Section */}
        {locationInfo && (
          <View style={styles.locationOverlay}>
            <View style={styles.locationContainer}>
              <FontAwesome
                name="map-marker"
                size={22}
                color="#44C1AF"
                style={styles.locationIcon}
              />
              <Text style={styles.locationText}>
                {[locationInfo.city, locationInfo.state, locationInfo.country]
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
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  userProfilePicPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#44C1AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userProfilePicText: {
    color: 'white',
    fontSize: 14,
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
});

export default NewsItem;
