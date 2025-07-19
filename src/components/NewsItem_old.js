import React from 'react';
import {
    Text,
    TouchableOpacity,
    View,
    Image,
    StyleSheet
} from 'react-native';
const moment = require('moment');

const NewsItem = ({ img, text, name, time, onPress }) => {
    return (
        <>
            <TouchableOpacity
                onPress={onPress}
                style={styles.newsItem}>
                <View style={styles.container}>
                    {
                        (img && img.length > 0) &&
                        img.map((image, key) => {
                            return (
                                image && <Image
                                    key={key}
                                    source={{ uri: `https://squibturf-images.s3.amazonaws.com//${image}` }}
                                    style={styles.newsItem_image}
                                />
                            );
                        }
                        )
                    }

                </View>
            </TouchableOpacity>
            <View style={{ backgroundColor: 'white', marginBottom: 10, }}>
                {text &&
                    <>
                        <Text style={styles.newsItem_text}>"{text}"</Text>
                        <Text style={styles.newsItem_name}>
                            Pinned by
                            <Text style={{ fontWeight: '700', color: '#44C1AF' }}> {name} </Text>
                            <Text style={{
                                right: 0,
                                position: 'absolute',
                                fontStyle: "italic",
                                color: '#444'
                            }}> ~ {moment(time).fromNow()} </Text>
                        </Text>
                    </>
                }
            </View>
        </>

    )
}

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
        width: '100%'
    },
    newsItem_image: {
        height: 250,
        width: '20%',
        flex: 1,
        // height: '100%',
        // width: '100%',
        // position: 'absolute'
    }
})

export default NewsItem;