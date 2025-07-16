import moment from 'moment'; // Use ES6 import for moment
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Video from 'react-native-video';

interface NewsItemProps {
  img?: string[]; // Optional array of image URIs
  video?: string[]; // Optional array of video URIs
  text?: string; // Optional text content
  name: string; // Required name of the author
  time: string; // Required timestamp as string
  onPress: () => void; // Function to handle press event
  lat?: number | string; // Optional latitude
  lon?: number | string; // Optional longitude
  location?: { city?: string; state?: string; country?: string }; // Optional location object
  type?: 'photo' | 'video'; // Optional content type
}

const NewsItem: React.FC<NewsItemProps> = ({
  img,
  video,
  text,
  name,
  time,
  onPress,
  lat,
  lon,
  location,
  type,
}) => {
  const [locationInfo] = useState<{
    city?: string;
    state?: string;
    country?: string;
  } | null>(location || null);

  // Calculate total media count and width
  const totalMedia = (img?.length || 0) + (video?.length || 0);
  const mediaFlexBasis = totalMedia > 0 ? 100 / totalMedia : 100;

  return (
    <>
      <TouchableOpacity onPress={onPress} style={styles.newsItem}>
        <View style={styles.container}>
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
      </TouchableOpacity>
      <View style={{ backgroundColor: 'white', marginBottom: 10 }}>
        {text && (
          <>
            <Text style={styles.newsItem_text}>"{text}"</Text>
            {locationInfo && (
              <View style={styles.locationOverlay}>
                <Text style={styles.locationText}>
                  {[locationInfo.city, locationInfo.state, locationInfo.country]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </View>
            )}
            <Text style={styles.newsItem_name}>
              Pinned by
              <Text style={{ fontWeight: '700', color: '#44C1AF' }}>
                {' '}
                {name}{' '}
              </Text>
              <Text
                style={{
                  right: 0,
                  position: 'absolute',
                  fontStyle: 'italic',
                  color: '#444',
                }}
              >
                {' '}
                ~{' '}
                {(() => {
                  let m = moment(time, moment.ISO_8601, true);
                  if (!m.isValid()) {
                    m = moment(time, 'MMM DD YYYY h:mm A');
                  }
                  return m.isValid() ? m.fromNow() : 'Invalid date';
                })()}{' '}
              </Text>
            </Text>
          </>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  newsItem: {
    backgroundColor: 'white',
    flex: 1,
    borderTopWidth: 1,
    borderColor: '#44C1AF',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  newsItem_text: {
    textAlign: 'left',
    fontSize: 14,
    fontWeight: '400',
    color: '#444',
    padding: 20,
    bottom: 0,
    width: '100%',
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
    marginLeft: 20,
    marginBottom: 4,
  },
  locationOverlay: {
    marginBottom: 0,
  },
});

export default NewsItem;
