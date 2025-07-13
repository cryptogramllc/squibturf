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
    for (const image of images) {
        try {
            const resize = await ImageResizer.createResizedImage(
                image,
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
            const file = {
                uri: resize.uri,
                name: `${uuidv4()}.jpg`,
                type: 'image/jpg',
            };
            fileNames.push(file.name);
            await RNS3.put(file, this.s3Options);
        } catch (err) {
            console.log(err);
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
            user_id: pdata.uuid,
            user_name: pdata.name,
            time_stamp: moment().format('MMM DD YYYY h:mm A'),
            date_key: Date.now(), // Add epoch time for sorting
            location, // Add location info here
        };
        const response = await this.api.post('/create-squib', data);
        return response;
    } catch (err) {
        console.log(err);
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
