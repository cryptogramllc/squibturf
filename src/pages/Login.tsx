import { appleAuth } from '@invertase/react-native-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { jwtDecode } from 'jwt-decode';
import React, { Component } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import UUID from 'react-native-uuid';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { clearAllProfileCache } from '../components/NewsItem';
const SquibApi = require('../api'); // Using require since it's a CommonJS module

interface UserData {
  email: string | null;
  password: string | null;
  confirmPassword: string | null;
}

interface Props {
  navigation?: any; // Adjust type as per your navigation prop type
  tracking?: any; // Adjust type as per your tracking prop type
}

interface AppleAuthRequestResponse {
  user: string;
  fullName?: {
    familyName: string;
    givenName: string;
  };
  email: string;
  identityToken: string;
}

GoogleSignin.configure({
  scopes: [
    'https://www.googleapis.com/auth/userinfo.profile',
    'email',
    'profile',
  ],
  webClientId:
    '48152852824-rf6201o92gsokd470rqvph429v6tq9u1.apps.googleusercontent.com',
  offlineAccess: true,
  hostedDomain: '',
  forceCodeForRefreshToken: true,
  accountName: '',
  iosClientId:
    '48152852824-rf6201o92gsokd470rqvph429v6tq9u1.apps.googleusercontent.com',
});

const styles = StyleSheet.create({
  pillContainer: {
    backgroundColor: '#27ae60',
    borderRadius: 999,
    padding: 2,
    marginVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 210,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  testButton: {
    backgroundColor: '#27ae60',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginVertical: 10,
    width: 210,
    alignSelf: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  greenPill: {
    backgroundColor: '#44C1AF',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 10,
    justifyContent: 'center',
  },
  greenPillText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default class Login extends Component<
  Props,
  { isSigninInProgress: boolean; userData: UserData }
> {
  private api: typeof SquibApi;

  constructor(props: Props) {
    super(props);
    this.api = new SquibApi();
    this.state = {
      isSigninInProgress: false,
      userData: {
        email: null,
        password: null,
        confirmPassword: null,
      },
    };
  }

  async componentDidMount() {
    try {
      const { navigation } = this.props;
      const user = await AsyncStorage.getItem('userInfo');
      if (user) {
        navigation?.navigate('News');
      }
    } catch (error) {
      // Continue to show login screen if there's an error
    }
  }

  _signIn = async () => {
    try {
      console.log('🔐 LOGIN: Starting Google Sign-In process');

      // Force sign out first to clear any cached user data
      await GoogleSignin.signOut();
      console.log('🔐 LOGIN: Signed out from Google');

      await GoogleSignin.hasPlayServices();
      const userInfo: any = await GoogleSignin.signIn();

      console.log('🔐 LOGIN: Google Sign-In response:', userInfo);
      console.log('🔐 LOGIN: Google user data:', userInfo.data.user);

      const info: any = userInfo.data.user;
      const userData = { ...info, ...{ uuid: UUID.v4() } };

      console.log(
        '🔐 LOGIN: Processed user data before sending to API:',
        userData
      );
      this._sendData(userData);
    } catch (err: any) {
      console.error('🔐 LOGIN: Google Sign-In Error:', err);
      Alert.alert('Google Sign-In Error');
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
      } else if (err.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // play services not available or outdated
      } else {
        // some other error happened
      }
    }
  };

  _sendData = async (info: any) => {
    try {
      if (!info.email) {
        throw new Error('No email associated with login');
      }
      const { navigation } = this.props;

      console.log('🔐 LOGIN: Starting login process for email:', info.email);

      // Clear all caches when a new user logs in
      clearAllProfileCache();

      // Clear all user squibs caches to prevent data leakage
      const api = new SquibApi();
      await api.clearAllCaches();

      // Clear user session data to ensure clean state
      await api.clearUserSession();
      console.log('🔐 LOGIN: Cleared user session data for fresh login');

      const response = await this.api.sendProfile(info);
      console.log('🔐 LOGIN: API response:', response?.data);

      if (response) {
        // Use only the fresh data from the API response, don't merge with existing data
        const finalUserData = response.data;
        console.log('🔐 LOGIN: Final user data to be stored:', finalUserData);

        await AsyncStorage.setItem('userInfo', JSON.stringify(finalUserData));
        console.log('🔐 LOGIN: Stored user data in AsyncStorage');

        // Verify what was stored
        const storedUser = await AsyncStorage.getItem('userInfo');
        console.log('🔐 LOGIN: Verified stored user data:', storedUser);

        // Check if user needs profile completion based on backend response
        const needsProfileCompletion = finalUserData.needsProfileCompletion;

        if (needsProfileCompletion) {
          navigation?.navigate('ProfileCompletion', {
            userData: finalUserData,
          });
        } else {
          navigation?.navigate('News');
        }
      } else {
        console.log('🔐 LOGIN: No response from API');
      }
    } catch (err) {
      console.error('🔐 LOGIN: Error during login:', err);
      Alert.alert('Login Error', 'Failed to complete login. Please try again.');
    }
  };

  _onHandleSubmit = async (e: any) => {};

  _onAppleButtonPress = async () => {
    try {
      console.log('🍎 APPLE: Starting Apple Sign-In process');

      // Check if Apple Sign-In is supported
      const isSupported = appleAuth.isSupported;
      if (!isSupported) {
        Alert.alert(
          'Apple Sign-In Not Available',
          'Apple Sign-In is not available on this device. Please use another sign-in method.'
        );
        return;
      }

      console.log(
        '🍎 APPLE: Apple Sign-In is available, proceeding with request'
      );

      const appleAuthRequestResponse = (await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      })) as AppleAuthRequestResponse;

      console.log('🍎 APPLE: Apple Sign-In response received:', {
        hasUser: !!appleAuthRequestResponse.user,
        hasEmail: !!appleAuthRequestResponse.email,
        hasFullName: !!appleAuthRequestResponse.fullName,
        hasIdentityToken: !!appleAuthRequestResponse.identityToken,
      });

      const { fullName, email, user, identityToken } = appleAuthRequestResponse;

      // Check if this is a first-time sign-in (Apple provides data) or subsequent sign-in (Apple returns null)
      const isFirstTimeSignIn = fullName || email;

      if (isFirstTimeSignIn) {
        console.log('🍎 APPLE: First-time sign-in detected');
        // First-time sign-in: Apple provided user data
        const userData = {
          familyName: fullName?.familyName || '',
          givenName: fullName?.givenName || '',
          email: email || '',
          name:
            fullName?.givenName && fullName?.familyName
              ? `${fullName.givenName} ${fullName.familyName}`
              : 'Apple User',
          id: user,
          uuid: UUID.v4(),
          photo: null,
        };

        // If no email from Apple, try to decode from token
        if (!userData.email && identityToken) {
          try {
            const decoded: any = jwtDecode(identityToken);
            userData.email = decoded.email || '';
            console.log('🍎 APPLE: Decoded email from token:', userData.email);
          } catch (decodeError) {
            console.log(
              '🍎 APPLE: Failed to decode email from token:',
              decodeError
            );
          }
        }

        // Store user data for future sign-ins
        await AsyncStorage.setItem('userInfo', JSON.stringify(userData));
        console.log('🍎 APPLE: Stored user data for future sign-ins');

        await this._sendData(userData);
      } else {
        console.log('🍎 APPLE: Subsequent sign-in detected');
        // Check if we have existing user data (user previously consented to store it)
        const existingUser = await AsyncStorage.getItem('userInfo');
        let userData;

        if (existingUser) {
          console.log('🍎 APPLE: Found existing user data');
          // User has existing data (they previously signed in and we stored it)
          const existingUserData = JSON.parse(existingUser);
          userData = {
            familyName: existingUserData.familyName || '',
            givenName: existingUserData.givenName || '',
            email: existingUserData.email || '',
            name: existingUserData.name || 'Apple User',
            id: user,
            uuid: existingUserData.uuid,
            photo: existingUserData.photo || null,
          };
        } else {
          console.log('🍎 APPLE: No existing user data, creating minimal user');
          // No existing data - create minimal user data
          userData = {
            familyName: '',
            givenName: '',
            email: '',
            name: 'Apple User',
            id: user,
            uuid: UUID.v4(),
            photo: null,
          };
        }

        await this._sendData(userData);
      }
    } catch (err: any) {
      console.log(
        '🍎 APPLE: Apple Sign-In Error:',
        JSON.stringify(err, null, 2)
      );

      // Extract error code - handle different error object structures
      let errorCode = null;
      if (err.code !== undefined) {
        errorCode = parseInt(err.code);
      } else if (err.error && err.error.code !== undefined) {
        errorCode = parseInt(err.error.code);
      } else if (err.nativeErrorCode !== undefined) {
        errorCode = parseInt(err.nativeErrorCode);
      }

      console.log('🍎 APPLE: Extracted error code:', errorCode);

      // Handle specific Apple Sign-In errors
      if (errorCode === 1000) {
        // Alert.alert(
        //   'Apple Sign-In Error',
        //   "Please make sure you have an Apple ID set up in Settings > Sign in to your iPhone. If you're using a simulator, please set up an Apple ID in the simulator settings."
        // );
      } else if (errorCode === 1001) {
        // User cancelled - this is normal behavior, don't show an error
        console.log(
          '🍎 APPLE: User cancelled Apple Sign-In - this is normal behavior'
        );
        // Don't show any alert for cancellation - just return silently
        return;
      } else if (errorCode === 1002) {
        Alert.alert(
          'Apple Sign-In Error',
          'The sign-in request failed. Please try again.'
        );
      } else if (errorCode === 1003) {
        Alert.alert(
          'Apple Sign-In Error',
          'The sign-in request was invalid. Please try again.'
        );
      } else if (errorCode === 1004) {
        Alert.alert(
          'Apple Sign-In Error',
          'The sign-in request was not handled. Please try again.'
        );
      } else if (errorCode === 1005) {
        Alert.alert(
          'Apple Sign-In Error',
          'The sign-in request failed. Please try again.'
        );
      } else if (errorCode === 1006) {
        Alert.alert(
          'Apple Sign-In Error',
          'The sign-in request was not authorized. Please try again.'
        );
      } else if (errorCode === 1007) {
        Alert.alert(
          'Apple Sign-In Error',
          'The sign-in request was not authorized. Please try again.'
        );
      } else {
        // For any other error (including undefined error codes),
        // check if it's likely a cancellation or interruption
        const errorMessage = err.message || '';
        const isLikelyCancellation =
          errorMessage.includes('cancelled') ||
          errorMessage.includes('canceled') ||
          errorMessage.includes('interrupted') ||
          errorMessage.includes('user') ||
          errorCode === null ||
          errorCode === undefined;

        if (isLikelyCancellation) {
          console.log(
            '🍎 APPLE: Likely cancellation/interruption - not showing error to user'
          );
          // Don't show any alert for likely cancellations - just return silently
          return;
        } else {
          Alert.alert(
            'Apple Sign-In Error',
            `An unexpected error occurred: ${errorMessage || 'Unknown error'}`
          );
        }
      }
    }
  };

  render() {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8f8f8' }}>
        <Text
          style={{
            fontSize: 48,
            fontFamily: 'Lobster-Regular',
            color: '#44C1AF',
            textAlign: 'center',
            marginTop: 60,
          }}
        >
          SquibTurf
        </Text>
        <Text
          style={{
            fontSize: 20,
            color: '#888',
            textAlign: 'center',
            marginTop: 8,
            marginBottom: 8,
          }}
        >
          Please Login
        </Text>
        <View
          style={{
            justifyContent: 'flex-start',
            alignItems: 'center',
            marginTop: 120,
          }}
        >
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.greenPill}
              onPress={this._onAppleButtonPress}
            >
              <FontAwesome name="apple" size={24} color="#fff" />
              <Text style={styles.greenPillText}>Sign in with Apple</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.greenPill}
            onPress={this._signIn}
            disabled={this.state.isSigninInProgress}
          >
            <FontAwesome name="google" size={24} color="#fff" />
            <Text style={styles.greenPillText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}
