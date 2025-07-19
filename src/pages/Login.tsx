import { appleAuth } from '@invertase/react-native-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { jwtDecode } from 'jwt-decode';
import React, { Component } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

      // Clear ALL AsyncStorage data to ensure clean state
      await AsyncStorage.clear();
      console.log('🔐 LOGIN: Cleared all AsyncStorage data');

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
      const appleAuthRequestResponse = (await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      })) as AppleAuthRequestResponse;

      const { fullName, email, user, identityToken } = appleAuthRequestResponse;

      // Check if this is a first-time sign-in (Apple provides data) or subsequent sign-in (Apple returns null)
      const isFirstTimeSignIn = fullName || email;

      if (isFirstTimeSignIn) {
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
        if (!userData.email) {
          try {
            const decoded: any = jwtDecode(identityToken);
            userData.email = decoded.email || '';
          } catch (decodeError) {}
        }

        await this._sendData(userData);
      } else {
        // Check if we have existing user data (user previously consented to store it)
        const existingUser = await AsyncStorage.getItem('userInfo');
        let userData;

        if (existingUser) {
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
    } catch (err) {
      Alert.alert('Apple Sign-In Error', JSON.stringify(err));
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
          <TouchableOpacity
            style={styles.greenPill}
            onPress={this._onAppleButtonPress}
          >
            <FontAwesome name="apple" size={24} color="#fff" />
            <Text style={styles.greenPillText}>Sign in with Apple</Text>
          </TouchableOpacity>
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
