import axios, { AxiosInstance } from 'axios';
import { RNS3 } from 'react-native-aws3';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImageResizer from 'react-native-image-resizer';
import { NativeModules } from 'react-native';

const uuid = require('react-native-uuid');
const moment = require('moment');

interface SquibData {
    text: string;
    lon: string;
    lat: string;
    uuid: string;
    image: string[];
    user_id: string;
    user_name: string;
    time_stamp: string;
}

class SquibAPI {
    private api: AxiosInstance;
    private s3Options;

    constructor() {
        this.api = axios.create({
            baseURL: 'https://ji58k1qfwl.execute-api.us-east-1.amazonaws.com/dev',
        });

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

    public postNewSquib = async (images: string[], caption: string, lon: number, lat: number) => {
        const fileNames: string[] = [];
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
            const pdata = JSON.parse(user!);
            const data: SquibData = {
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

    public getLocalSquibs = async (lon: number, lat: number) => {
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

    public getUserSquibs = async () => {
        const user = await AsyncStorage.getItem('userInfo');
        const pdata = JSON.parse(user!);
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

    public getComment = async (comment: string = "", data: any = {}) => {
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

    public postComment = async (data: any) => {
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

    public sendProfile = async (data: any) => {
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

    public deleteSquib = async (data: any) => {
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
}

export default SquibAPI;
