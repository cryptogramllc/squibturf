// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';
import { RNS3 } from 'react-native-aws3';
import Config from 'react-native-config';
import 'react-native-get-random-values'; // Must be imported first for uuid to work
import ImageResizer from 'react-native-image-resizer';
import { v4 as uuidv4 } from 'uuid';

const moment = require('moment');

// Helper function to retry failed requests (especially for Android network issues)
const retryRequest = async (requestFn, maxRetries = 2, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      console.log(`👤 API: Request attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        throw error; // Re-throw on final attempt
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
      console.log(
        `👤 API: Retrying request (attempt ${attempt + 1}/${maxRetries})...`
      );
    }
  }
};

function SquibAPI() {
  this.api = axios.create({
    baseURL: 'https://ji58k1qfwl.execute-api.us-east-1.amazonaws.com/dev',
    timeout: 15000, // Increased timeout for Android
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // Separate API instance for profile endpoint
  this.profileApi = axios.create({
    baseURL: 'https://h38fikktw7.execute-api.us-east-1.amazonaws.com/prod',
    timeout: 15000, // Increased timeout for Android
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
  const accessKey = Config.ACCESS_KEY;
  const secretKey = Config.SECRET_KEY;
  // Debug logging to check if Config values are loaded
  console.log('🔍 AWS DEBUG: ACCESS_KEY loaded:', accessKey ? 'YES' : 'NO');
  console.log('🔍 AWS DEBUG: SECRET_KEY loaded:', secretKey ? 'YES' : 'NO');
  console.log(
    '🔍 AWS DEBUG: ACCESS_KEY length:',
    accessKey ? accessKey.length : 0
  );
  console.log(
    '🔍 AWS DEBUG: SECRET_KEY length:',
    secretKey ? secretKey.length : 0
  );
  console.log('🔍 AWS DEBUG: Platform:', Platform.OS);
  console.log('🔍 AWS DEBUG: Config object keys:', Object.keys(Config));
  console.log(
    '🔍 AWS DEBUG: ACCESS_KEY value (first 10 chars):',
    accessKey ? accessKey.substring(0, 10) + '...' : 'NULL'
  );

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
    await this.clearUserSquibsCache();

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
  console.log('🌍 API: getLocalSquibs called with params:', {
    lon: lon,
    lat: lat,
    lastKey: lastKey,
    limit: limit,
    page: page,
  });

  // Extract page number from lastKey if it exists
  if (lastKey && typeof lastKey === 'object' && lastKey.page !== undefined) {
    page = lastKey.page;
    console.log('🌍 API: Extracted page from lastKey:', page);
  }

  const data = {
    lon: lon.toFixed(2),
    lat: lat.toFixed(2),
    limit: limit,
    page: page,
  };

  console.log('🌍 API: Sending request to /local-squibs with data:', data);

  try {
    console.log('🌍 API: Making POST request to /local-squibs...');
    const response = await this.api.post('/local-squibs', data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log('🌍 API: Received response from /local-squibs:', {
      status: response.status,
      statusText: response.statusText,
      hasData: !!response.data,
      hasBody: !!response.data?.body,
    });

    let parsed;
    if (typeof response.data.body === 'string') {
      console.log('🌍 API: Parsing string response body...');
      parsed = JSON.parse(response.data.body);
    } else {
      console.log('🌍 API: Using object response body directly...');
      parsed = response.data.body;
    }

    console.log('🌍 API: Parsed response data:', {
      hasParsed: !!parsed,
      parsedType: typeof parsed,
      hasItems: !!parsed?.Items,
      itemsCount: parsed?.Items?.length || 0,
      hasLastKey: !!parsed?.LastEvaluatedKey,
      hasTotalItems: !!parsed?.TotalItems,
      hasCurrentPage: !!parsed?.CurrentPage,
    });

    // Defensive: If parsed is not an object or doesn't have Items, return empty array
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.Items)) {
      console.log('🌍 API: Invalid response format, returning empty array');
      return {
        Items: [],
        LastEvaluatedKey: null,
      };
    }

    const result = {
      Items: parsed.Items,
      LastEvaluatedKey: parsed.LastEvaluatedKey || null,
      TotalItems: parsed.TotalItems || parsed.Items.length,
      CurrentPage: parsed.CurrentPage || page,
    };

    console.log('🌍 API: Returning successful result:', {
      itemsCount: result.Items.length,
      hasLastKey: !!result.LastEvaluatedKey,
      totalItems: result.TotalItems,
      currentPage: result.CurrentPage,
    });

    return result;
  } catch (error) {
    console.log('🌍 API: Error in getLocalSquibs:', {
      error: error.message,
      errorType: error.constructor.name,
      hasResponse: !!error.response,
      responseStatus: error.response?.status,
      responseData: error.response?.data,
    });

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
  console.log('👤 API: getUserSquibs called with params:', {
    lastKey: lastKey,
    limit: limit,
    page: page,
  });

  // Validate user authentication first
  const user = await AsyncStorage.getItem('userInfo');
  if (!user) {
    console.log('🔐 API: No userInfo found in AsyncStorage');
    throw new Error('No user session found');
  }

  let pdata;
  try {
    pdata = JSON.parse(user);
  } catch (error) {
    console.log('🔐 API: Error parsing userInfo:', error);
    throw new Error('Invalid user session data');
  }

  if (!pdata || !pdata.uuid) {
    console.log('🔐 API: Invalid user data - missing UUID:', pdata);
    throw new Error('Invalid user session - missing UUID');
  }

  const userId = pdata.uuid;
  console.log('🔐 API: Using user UUID for getUserSquibs:', userId);

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

  console.log('👤 API: Sending request to /user-squibs with data:', data);
  console.log('👤 API: Platform:', Platform.OS, 'Version:', Platform.Version);
  console.log('👤 API: Base URL:', this.api.defaults.baseURL);
  console.log('👤 API: Timeout:', this.api.defaults.timeout);
  console.log('👤 API: Default headers:', this.api.defaults.headers);

  // Simple network connectivity test
  try {
    console.log('👤 API: Testing basic network connectivity...');
    const testResponse = await fetch('https://httpbin.org/get', {
      method: 'GET',
      timeout: 5000,
    });
    console.log(
      '👤 API: Network connectivity test result:',
      testResponse.status
    );
  } catch (networkError) {
    console.log(
      '👤 API: Network connectivity test failed:',
      networkError.message
    );
  }

  try {
    console.log('👤 API: Making POST request to /user-squibs...');

    // Use retry mechanism for network requests (especially helpful for Android)
    const response = await retryRequest(async () => {
      return await this.api.post('/user-squibs', data, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    console.log('👤 API: Received response from /user-squibs:', {
      status: response.status,
      statusText: response.statusText,
      hasData: !!response.data,
      hasBody: !!response.data?.body,
    });

    let parsed;
    if (typeof response.data.body === 'string') {
      console.log('👤 API: Parsing string response body...');
      parsed = JSON.parse(response.data.body);
    } else {
      console.log('👤 API: Using object response body directly...');
      parsed = response.data.body;
    }

    console.log('👤 API: Parsed response data:', {
      hasParsed: !!parsed,
      parsedType: typeof parsed,
      hasItems: !!parsed?.Items,
      itemsCount: parsed?.Items?.length || 0,
      hasLastKey: !!parsed?.LastEvaluatedKey,
      hasTotalItems: !!parsed?.TotalItems,
      hasCurrentPage: !!parsed?.CurrentPage,
    });

    // Defensive: If parsed is not an object or doesn't have Items, return empty array
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.Items)) {
      console.log('👤 API: Invalid response format, returning empty array');
      return {
        Items: [],
        LastEvaluatedKey: null,
      };
    }

    console.log('👤 API: Caching user squibs data for user:', userId);
    // Cache all items for this user in AsyncStorage
    const cacheData = {
      items: parsed.Items,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log(
      '👤 API: Cached',
      parsed.Items.length,
      'items for user:',
      userId
    );

    // Return first page from cached data
    const startIndex = 0;
    const endIndex = limit;
    const pageItems = parsed.Items.slice(startIndex, endIndex);

    const result = {
      Items: pageItems,
      LastEvaluatedKey:
        parsed.Items.length > endIndex
          ? { page: 1, totalItems: parsed.Items.length }
          : null,
      TotalItems: parsed.Items.length,
      CurrentPage: 0,
    };

    console.log('👤 API: Returning successful result:', {
      itemsCount: result.Items.length,
      hasLastKey: !!result.LastEvaluatedKey,
      totalItems: result.TotalItems,
      currentPage: result.CurrentPage,
    });

    return result;
  } catch (error) {
    console.log('👤 API: Error in getUserSquibs:', {
      platform: Platform.OS,
      platformVersion: Platform.Version,
      error: error.message,
      errorType: error.constructor.name,
      hasResponse: !!error.response,
      responseStatus: error.response?.status,
      responseData: error.response?.data,
      isNetworkError: error.message === 'Network Error',
      isTimeout: error.code === 'ECONNABORTED',
      config: {
        url: error.config?.url,
        method: error.config?.method,
        timeout: error.config?.timeout,
        baseURL: error.config?.baseURL,
      },
    });

    // Android-specific network error handling
    if (error.message === 'Network Error') {
      console.log(
        '👤 API: Android Network Error detected - this might be a platform-specific issue'
      );
      console.log('👤 API: Check network connectivity and try again');
      console.log('👤 API: Platform details:', {
        OS: Platform.OS,
        Version: Platform.Version,
      });
    }

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
    const response = await this.profileApi.post('/profile', data, {
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
    response = await this.profileApi.get(`/profile/${uuid}`, {
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

SquibAPI.prototype.deleteAccount = async function (email) {
  let response;
  try {
    response = await this.api.delete('/profile', {
      data: { email },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.log('Error deleting account:', error.response);
    console.log('Error deleting account:', error.request);
    throw error;
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

// Clear user squibs cache for current user
SquibAPI.prototype.clearUserSquibsCache = async function () {
  try {
    const user = await AsyncStorage.getItem('userInfo');
    if (user) {
      const pdata = JSON.parse(user);
      const userId = pdata.uuid;
      const cacheKey = `user_squibs_${userId}`;
      await AsyncStorage.removeItem(cacheKey);
      console.log('Cleared user squibs cache for user:', userId);
    }
  } catch (error) {
    console.log('Error clearing user squibs cache:', error);
  }
};

// Clear ALL user squibs caches (for logout)
SquibAPI.prototype.clearAllUserSquibsCaches = async function () {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const userSquibsKeys = keys.filter(key => key.startsWith('user_squibs_'));
    const locationKeys = keys.filter(key => key.startsWith('squibs_'));

    const keysToRemove = [...userSquibsKeys, ...locationKeys];

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log('Cleared all user squibs and location caches:', keysToRemove);
    }
  } catch (error) {
    console.log('Error clearing all user squibs caches:', error);
  }
};

// Comprehensive cache clearing function for logout
SquibAPI.prototype.clearAllCaches = async function () {
  try {
    // Clear AsyncStorage caches ONLY (not user session data)
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(
      key =>
        key.startsWith('user_squibs_') ||
        key.startsWith('squibs_') ||
        key.startsWith('profile_')
    );

    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      console.log('Cleared AsyncStorage caches:', cacheKeys);
    }

    // DO NOT clear userInfo here - that should be done separately for logout
    console.log('Cleared caches but preserved user session data');
  } catch (error) {
    console.log('Error clearing caches:', error);
  }
};

// Method to clear user session data (for logout)
SquibAPI.prototype.clearUserSession = async function () {
  try {
    await AsyncStorage.removeItem('userInfo');
    console.log('Cleared user session data from AsyncStorage');
  } catch (error) {
    console.log('Error clearing user session:', error);
  }
};

module.exports = SquibAPI;
