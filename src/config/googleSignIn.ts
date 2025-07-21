import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In only once
let isConfigured = false;

export const configureGoogleSignIn = () => {
  if (isConfigured) {
    return; // Already configured
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

  isConfigured = true;
};

export { GoogleSignin };
