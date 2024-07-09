
import axios, { AxiosInstance } from 'axios';
import { RNS3 } from 'react-native-aws3';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImageResizer from 'react-native-image-resizer';

const uuid = require('react-native-uuid');
const moment = require('moment');

function SquibAPI() {
    this.api = axios.create({
        baseURL: 'https://ji58k1qfwl.execute-api.us-east-1.amazonaws.com/dev',
    });
    // this.api = axios.create({ baseURL: 'https://private-c7d868-squibturf.apiary-mock.com/' })
    const accessKey = process.env.ACCESS_KEY;
    const secretKey = process.env.SECRET_KEY;

    this.s3Options = {
        keyPrefix: '/',
        bucket: 'squibturf-images',
        region: 'us-east-1',
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
        successActionStatus: 201,
    };
}

// SquibAPI.prototype.getProfile = async function () {
//     try {
//         let user = await AsyncStorage.getItem('userInfo');
//         if (!user) {
//             const email = await AsyncStorage.getItem("email");
//             if (!email) { return null }
//             user = await this.api.post('/profile', { email });
//             await AsyncStorage.setItem('userInfo', JSON.stringify(user));
//         }
//         return user;

//     } catch (err) {
//         console.log(err);
//     }
// }

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
                name: `${uuid.v4()}.jpg`,
                type: 'image/jpg',
            };
            fileNames.push(file.name);
            await RNS3.put(file, this.s3Options);
        } catch (err) {
            console.log(err);
        }
    }

    try {
        const user = await AsyncStorage.getItem('userInfo');
        const pdata = JSON.parse(user);
        const data = {
            text: caption,
            lon: lon.toFixed(2),
            lat: lat.toFixed(2),
            uuid: uuid.v4(),
            image: fileNames,
            user_id: pdata.uuid,
            user_name: pdata.name,
            time_stamp: moment().format('MMM DD YYYY h:mm A'),
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

SquibAPI.prototype.getUserSquibs = async function () {
    const user = await AsyncStorage.getItem('userInfo');
    const pdata = JSON.parse(user);
    console.log('pdata', pdata);
    const data = { uuid: pdata.uuid };
    try {
        console.log('getting user squibs', data);
        const response = await this.api.post('/user-squibs', data, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response.data.body.Items;
    } catch (error) {
        return error;
    }
};

SquibAPI.prototype.getComment = async function (comment, data) {
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
    // console.log(data);
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
