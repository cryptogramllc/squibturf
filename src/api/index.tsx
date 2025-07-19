// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { RNS3 } from 'react-native-aws3';
import Config from 'react-native-config';
import 'react-native-get-random-values'; // Must be imported first for uuid to work
import ImageResizer from 'react-native-image-resizer';
import { v4 as uuidv4 } from 'uuid';

const moment = require('moment');

function SquibAPI() {
  this.api = axios.create({
    baseURL: 'https://ji58k1qfwl.execute-api.us-east-1.amazonaws.com/dev',
    timeout: 10000, // 10 second timeout
  });
  const accessKey = Config.ACCESS_KEY;
  const secretKey = Config.SECRET_KEY;
  // Debug logging to check if Config values are loaded

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
      if (
        typeof asset === 'string' &&
        (asset.endsWith('.mp4') || asset.endsWith('.mov'))
      ) {
        isVideo = true;
        ext = asset.endsWith('.mov') ? 'mov' : 'mp4';
        mime = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
        file = {
          uri: asset,
          name: `${uuidv4()}.${ext}`,
          type: mime,
        };
        videoFiles.push(file.name);
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
          }
        );
        file = {
          uri: resize.uri,
          name: `${uuidv4()}.jpg`,
          type: mime,
        };
        fileNames.push(file.name);
      }
      const uploadResult = await RNS3.put(file, this.s3Options);
      if (uploadResult.status !== 201) {
        console.error(
          `[SquibAPI] S3 upload failed for ${file.name}:`,
          uploadResult
        );
        throw new Error(`S3 upload failed for ${file.name}`);
      } else {
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
    const response = await this.api.post('/create-squib', data);
    console.log('[SquibAPI] Server response:', response.data);

    // Invalidate user cache after posting new squib (local squibs are not cached)
    await this.invalidateUserCache();

    return response;
  } catch (err) {
    console.error('[SquibAPI] Error posting squib to server:', err);
    throw err;
  }
};

SquibAPI.prototype.getLocalSquibs = async function (
  lon,
  lat,
  lastKey = null,
  limit = 10,
  page = 0
) {
  // Extract page number from lastKey if it exists
  if (lastKey && typeof lastKey === 'object' && lastKey.page !== undefined) {
    page = lastKey.page;
  }

  const data = {
    lon: lon.toFixed(2),
    lat: lat.toFixed(2),
    limit: limit,
    page: page,
  };

  try {
    const response = await this.api.post('/local-squibs', data, {
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

    // Defensive: If parsed is not an object or doesn't have Items, return empty array
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.Items)) {
      return {
        Items: [],
        LastEvaluatedKey: null,
      };
    }

    return {
      Items: parsed.Items,
      LastEvaluatedKey: parsed.LastEvaluatedKey || null,
      TotalItems: parsed.TotalItems || parsed.Items.length,
      CurrentPage: parsed.CurrentPage || page,
    };
  } catch (error) {
    return {
      Items: [],
      LastEvaluatedKey: null,
    };
  }
};

SquibAPI.prototype.getUserSquibs = async function (
  lastKey = null,
  limit = 10,
  page = 0
) {
  const user = await AsyncStorage.getItem('userInfo');
  const pdata = JSON.parse(user);
  const userId = pdata.uuid;

  // Create cache key for user squibs
  const cacheKey = `user_squibs_${userId}`;

  // Extract page number from lastKey if it exists
  if (lastKey && typeof lastKey === 'object' && lastKey.page !== undefined) {
    page = lastKey.page;
  }

  // Check if we have cached data for this user in AsyncStorage
  try {
    const cachedDataString = await AsyncStorage.getItem(cacheKey);
    if (cachedDataString) {
      const cachedData = JSON.parse(cachedDataString);
      const cacheTimestamp = cachedData.timestamp;
      const cacheAge = Date.now() - cacheTimestamp;

      // Cache expires after 30 minutes
      if (cacheAge < 30 * 60 * 1000) {
        // Calculate pagination from cached data
        const startIndex = page * limit;
        const endIndex = startIndex + limit;
        const pageItems = cachedData.items.slice(startIndex, endIndex);

        return {
          Items: pageItems,
          LastEvaluatedKey:
            cachedData.items.length > endIndex
              ? { page: page + 1, totalItems: cachedData.items.length }
              : null,
          TotalItems: cachedData.items.length,
          CurrentPage: page,
        };
      } else {
        console.log('Cache expired for user squibs:', userId);
        await AsyncStorage.removeItem(cacheKey);
      }
    }
  } catch (error) {
    console.log('Error reading user squibs cache:', error);
  }

  // If no cache or cache expired, fetch all items for this user

  const data = {
    uuid: userId,
    limit: 1000, // Fetch all items (high limit)
    page: 0, // Always fetch page 0 to get all items
  };

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

    // Defensive: If parsed is not an object or doesn't have Items, return empty array
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.Items)) {
      return {
        Items: [],
        LastEvaluatedKey: null,
      };
    }

    // Cache all items for this user in AsyncStorage
    const cacheData = {
      items: parsed.Items,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

    // Return first page from cached data
    const startIndex = 0;
    const endIndex = limit;
    const pageItems = parsed.Items.slice(startIndex, endIndex);

    return {
      Items: pageItems,
      LastEvaluatedKey:
        parsed.Items.length > endIndex
          ? { page: 1, totalItems: parsed.Items.length }
          : null,
      TotalItems: parsed.Items.length,
      CurrentPage: 0,
    };
  } catch (error) {
    console.log('Error in getUserSquibs:', error);
    return {
      Items: [],
      LastEvaluatedKey: null,
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
  try {
    // If there's a profile picture to upload
    if (data.photo && data.photo.startsWith('file://')) {
      // Resize the image for profile picture
      const resize = await ImageResizer.createResizedImage(
        data.photo,
        300, // width for profile picture
        300, // height for profile picture
        'JPEG',
        90,
        0,
        undefined,
        false,
        {
          mode: 'contain',
          onlyScaleDown: false,
        }
      );

      const file = {
        uri: resize.uri,
        name: `profile-${uuidv4()}.jpg`,
        type: 'image/jpg',
      };
      const uploadResult = await RNS3.put(file, this.s3Options);

      if (uploadResult.status !== 201) {
        throw new Error('S3 upload failed for profile picture');
      } else {
        // Replace the local file path with the S3 URL
        data.photo = `https://squibturf-images.s3.us-east-1.amazonaws.com/${file.name}`;
      }
    }

    // Send the updated data to the backend
    const response = await this.api.post('/profile', data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response;
  } catch (error) {
    console.error('[SquibAPI] Error in sendProfile:', error);
    throw error;
  }
};

SquibAPI.prototype.getProfile = async function (uuid) {
  let response;
  try {
    response = await this.api.get(`/profile/${uuid}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.log('Error fetching profile:', error.response);
    console.log('Error fetching profile:', error.request);
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

// Cache invalidation function
SquibAPI.prototype.invalidateLocationCache = async function (lon, lat) {
  try {
    const locationKey = `squibs_${lon.toFixed(2)}_${lat.toFixed(2)}`;
    await AsyncStorage.removeItem(locationKey);
  } catch (error) {
    console.log('[SquibAPI] Error invalidating cache:', error);
  }
};

// Cache invalidation function for user squibs
SquibAPI.prototype.invalidateUserCache = async function () {
  try {
    const user = await AsyncStorage.getItem('userInfo');
    const pdata = JSON.parse(user);
    const userId = pdata.uuid;
    const cacheKey = `user_squibs_${userId}`;
    await AsyncStorage.removeItem(cacheKey);
    console.log('[SquibAPI] Invalidated cache for user:', userId);
  } catch (error) {
    console.log('[SquibAPI] Error invalidating user cache:', error);
  }
};

module.exports = SquibAPI;
