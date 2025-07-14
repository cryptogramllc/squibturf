// @ts-nocheck
import axios from 'axios';
import { RNS3 } from 'react-native-aws3';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImageResizer from 'react-native-image-resizer';
import { v4 as uuidv4 } from 'uuid';
import Config from 'react-native-config';

const moment = require('moment');

function SquibAPI() {
    this.api = axios.create({
        baseURL: 'https://ji58k1qfwl.execute-api.us-east-1.amazonaws.com/dev',
        timeout: 10000, // 10 second timeout
    });
    const accessKey = Config.ACCESS_KEY;
    const secretKey = Config.SECRET_KEY;
    // Debug logging to check if Config values are loaded
    console.log('Config.ACCESS_KEY:', Config.ACCESS_KEY);
    console.log('Config.SECRET_KEY:', Config.SECRET_KEY ? '***HIDDEN***' : 'undefined');
    this.s3Options = {
        keyPrefix: '/',
        bucket: 'squibturf-images',
        region: 'us-east-1',
        accessKey: accessKey, // changed from accessKeyId
        secretKey: secretKey, // changed from secretAccessKey
        successActionStatus: 201,
    };
}

SquibAPI.prototype.postNewSquib = async function (images, caption, lon, lat) {
    const fileNames = [];
    const videoFiles = [];

    for (const asset of images) {
        let isVideo = false;
        let file, ext, mime;
        try {
            if (typeof asset === 'string' && (asset.endsWith('.mp4') || asset.endsWith('.mov'))) {
                isVideo = true;
                ext = asset.endsWith('.mov') ? 'mov' : 'mp4';
                mime = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
                file = {
                    uri: asset,
                    name: `${uuidv4()}.${ext}`,
                    type: mime,
                };
                videoFiles.push(file.name);
                console.log(`[SquibAPI] Uploading video to S3: ${file.name} (ext: ${ext}, mime: ${mime})`);
            } else {
                ext = 'jpg';
                mime = 'image/jpg';
                const resize = await ImageResizer.createResizedImage(
                    asset,
                    640,
                    640,
                    'JPEG',
                    90,
                    0,
                    undefined,
                    false,
                    {
                        mode: 'contain',
                        onlyScaleDown: false,
                    },
                );
                file = {
                    uri: resize.uri,
                    name: `${uuidv4()}.jpg`,
                    type: mime,
                };
                fileNames.push(file.name);
                console.log(`[SquibAPI] Uploading image to S3: ${file.name}`);
            }
            const uploadResult = await RNS3.put(file, this.s3Options);
            if (uploadResult.status !== 201) {
                console.error(`[SquibAPI] S3 upload failed for ${file.name}:`, uploadResult);
                throw new Error(`S3 upload failed for ${file.name}`);
            } else {
                console.log(`[SquibAPI] S3 upload successful for ${file.name}`);
            }
        } catch (err) {
            console.error(`[SquibAPI] Error uploading file: ${asset}`, err);
            throw err;
        }
    }
    // Helper to fetch location metadata
    async function fetchLocationMetadata(lat, lon) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch location metadata');
        const data = await response.json();
        return {
            city: data.address.city || data.address.town || data.address.village,
            state: data.address.state,
            country: data.address.country,
        };
    }
    try {
        const user = await AsyncStorage.getItem('userInfo');
        const pdata = JSON.parse(user);
        let location = null;
        try {
            location = await fetchLocationMetadata(lat, lon);
        } catch (e) {
            console.warn('Failed to fetch location metadata', e);
        }
        const data = {
            text: caption,
            lon: lon.toFixed(2),
            lat: lat.toFixed(2),
            uuid: uuidv4(),
            image: fileNames,
            video: videoFiles.length > 0 ? videoFiles : undefined,
            user_id: pdata.uuid,
            user_name: pdata.name,
            time_stamp: moment().format('MMM DD YYYY h:mm A'),
            date_key: Date.now(), // Add epoch time for sorting
            location, // Add location info here
            type: videoFiles.length > 0 ? 'video' : 'photo',
        };
        console.log('[SquibAPI] Sending squib data to server:', {
            text: data.text,
            imageCount: data.image.length,
            videoCount: videoFiles.length,
            type: data.type,
            location: data.location
        });
        const response = await this.api.post('/create-squib', data);
        console.log('[SquibAPI] Server response:', response.data);
        return response;
    } catch (err) {
        console.error('[SquibAPI] Error posting squib to server:', err);
        throw err;
    }
};

SquibAPI.prototype.getLocalSquibs = async function (lon, lat) {
    const data = {
        lon: lon.toFixed(2),
        lat: lat.toFixed(2),
    };
    try {
        const response = await this.api.post('/local-squibs', data, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response.data.body.Items;
    } catch (error) {
        return error;
    }
};

SquibAPI.prototype.getUserSquibs = async function (lastKey = null) {
    const user = await AsyncStorage.getItem('userInfo');
    const pdata = JSON.parse(user);
    const data = { uuid: pdata.uuid };
    if (lastKey) {
        data.lastKey = lastKey;
    }
    try {
        const response = await this.api.post('/user-squibs', data, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        let parsed;
        if (typeof response.data.body === 'string') {
            parsed = JSON.parse(response.data.body);
        } else {
            parsed = response.data.body;
        }
        console.log('getUserSquibs parsed:', parsed);
        // Defensive: If parsed is not an object or doesn't have Items, return empty array
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.Items)) {
            return {
                Items: [],
                LastEvaluatedKey: null
            };
        }
        return {
            Items: parsed.Items,
            LastEvaluatedKey: parsed.LastEvaluatedKey || null
        };
    } catch (error) {
        return {
            Items: [],
            LastEvaluatedKey: null
        };
    }
};

SquibAPI.prototype.getComment = async function (comment = '', data = {}) {
    try {
        const response = await this.api.get('/v1/comments', {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    } catch (error) {
        console.log(error);
    }
};

SquibAPI.prototype.postComment = async function (data) {
    try {
        const response = await this.api.post('/v1/comments', data, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response;
    } catch (error) {
        return error;
    }
};

SquibAPI.prototype.sendProfile = async function (data) {
    let response;
    try {
        response = await this.api.post('/profile', data, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        console.log(error.response);
        console.log(error.request);
    }
    return response;
};



SquibAPI.prototype.deleteSquib = async function (data) {
    let response;
    try {
        response = await this.api.post('/delete-squib', data, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        console.log(error.response);
        console.log(error.request);
    }
    return response;
};

module.exports = SquibAPI;
