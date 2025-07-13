import React from 'react';
import { useEffect, useState } from 'react';
import {
    Text,
    TouchableOpacity,
    View,
    Image,
    StyleSheet,
    ImageSourcePropType, // Import type definition for ImageSourcePropType
} from 'react-native';
import moment from 'moment'; // Use ES6 import for moment

interface NewsItemProps {
    img?: string[]; // Optional array of image URIs
    text?: string; // Optional text content
    name: string; // Required name of the author
    time: string; // Required timestamp as string
    onPress: () => void; // Function to handle press event
    lat?: number | string; // Optional latitude
    lon?: number | string; // Optional longitude
    location?: { city?: string; state?: string; country?: string }; // Optional location object
}

const NewsItem: React.FC<NewsItemProps> = ({ img, text, name, time, onPress, lat, lon, location }) => {
    const [locationInfo] = useState<{city?: string, state?: string, country?: string} | null>(location || null);

    // No more useEffect or fetchLocationMetadata logic

    return (
        <>
            <TouchableOpacity
                onPress={onPress}
                style={styles.newsItem}>
                <View style={styles.container}>
                    {
                        (img && img.length > 0) &&
                        img.map((image, key) => (
                            image && <Image
                                key={key}
                                source={{ uri: `https://squibturf-images.s3.amazonaws.com//${image}` }}
                                style={styles.newsItem_image}
                                onLoadStart={() => {
                                    console.log(`[NewsItem] [${key}] Loading image: https://squibturf-images.s3.amazonaws.com//${image}`);
                                }}
                                onLoad={() => {
                                    console.log(`[NewsItem] [${key}] Loaded image successfully: https://squibturf-images.s3.amazonaws.com//${image}`);
                                }}
                                onError={(e) => {
                                    console.error(`[NewsItem] [${key}] Failed to load image: https://squibturf-images.s3.amazonaws.com//${image}`, e.nativeEvent);
                                }}
                            />
                        ))
                    }
                </View>
            </TouchableOpacity>
            <View style={{ backgroundColor: 'white', marginBottom: 10 }}>
                {text &&
                    <>
                        <Text style={styles.newsItem_text}>"{text}"</Text>
                        {locationInfo && (
                            <View style={styles.locationOverlay}>
                                <Text style={styles.locationText}>
                                    {[
                                        locationInfo.city,
                                        locationInfo.state,
                                        locationInfo.country
                                    ].filter(Boolean).join(', ')}
                                </Text>
                            </View>
                        )}
                        <Text style={styles.newsItem_name}>
                            Pinned by
                            <Text style={{ fontWeight: '700', color: '#44C1AF' }}> {name} </Text>
                            <Text style={{
                                right: 0,
                                position: 'absolute',
                                fontStyle: "italic",
                                color: '#444'
                            }}> ~ {(() => {
                                let m = moment(time, moment.ISO_8601, true);
                                if (!m.isValid()) {
                                    m = moment(time, "MMM DD YYYY h:mm A");
                                }
                                return m.isValid() ? m.fromNow() : "Invalid date";
                            })()} </Text>
                        </Text>
                    </>
                }
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
    newsItem_image: {
        height: 250,
        width: '20%',
        flex: 1,
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
