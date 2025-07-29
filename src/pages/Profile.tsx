import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { Component } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const horizontalMargin = -15;
const slideWidth = 280;

const sliderWidth = Dimensions.get('window').width;
const itemWidth = slideWidth + horizontalMargin * 2;
const itemHeight = Dimensions.get('window').height / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'black',
  },
  slide: {
    width: Dimensions.get('window').width / 1.5,
    height: Dimensions.get('window').height / 1.5,
    paddingHorizontal: horizontalMargin,
    top: '15%',
    // other styles for the item container
  },
  slideInnerContainer: {
    width: sliderWidth,
    flex: 1,
    // other styles for the inner container
  },
});

interface Props {
  data?: {
    photo: string;
    name: string;
    email: string;
    bio?: string;
    displayName?: string;
    uuid?: string;
  };
  close: (flag: boolean) => void;
  userSessionReset: () => void;
  navigation?: any;
  onEditProfile?: (userData: any) => void;
}

interface State {
  userData: {
    photo: string;
    name: string;
    email: string;
    bio?: string;
    displayName?: string;
    givenName?: string;
    familyName?: string;
    uuid?: string;
  } | null;
}

export default class Profile extends Component<Props, State> {
  private api: any;

  constructor(props: Props) {
    super(props);
    this.api = new (require('../api'))();
    this.state = {
      userData: null,
    };
  }

  async componentDidMount() {
    // Force clear any cached state first
    this.setState({ userData: null });

    await this.loadUserData();

    // Add focus listener to refresh data when screen is focused
    const unsubscribe = this.props.navigation?.addListener('focus', () => {
      // Force clear state and reload data on focus
      this.setState({ userData: null }, () => {
        this.loadUserData();
      });
    });

    // Clean up listener on unmount
    if (unsubscribe) {
      this.componentWillUnmount = unsubscribe;
    }
  }

  componentDidUpdate(prevProps: Props) {
    // If the data prop changed (e.g., after profile edit), refresh the data
    if (prevProps.data !== this.props.data) {
      this.loadUserData();
    }
  }

  loadUserData = async () => {
    // Always get fresh user data from AsyncStorage first
    let userData = this.props.data;
    console.log('👤 PROFILE: userData from props:', userData);

    try {
      // Get fresh data from AsyncStorage
      const user = await AsyncStorage.getItem('userInfo');
      console.log('👤 PROFILE: Raw AsyncStorage data:', user);

      if (user) {
        const freshUserData = JSON.parse(user);
        console.log('👤 PROFILE: Parsed AsyncStorage data:', freshUserData);

        // Use fresh data from AsyncStorage, fallback to props data
        userData = freshUserData || userData;
        console.log(
          '👤 PROFILE: Final userData after AsyncStorage merge:',
          userData
        );
      } else {
        console.log('👤 PROFILE: No data found in AsyncStorage');
      }
    } catch (error) {
      console.log('👤 PROFILE: Error reading AsyncStorage:', error);
    }

    if (!userData) {
      console.log('👤 PROFILE: No data provided, cannot load user data');
      return;
    }

    // Skip API call if we have valid data from AsyncStorage
    // The API is returning wrong data for new users, so we'll use AsyncStorage data
    if (userData && userData.email && userData.uuid) {
      console.log(
        '👤 PROFILE: Using AsyncStorage data, skipping API call to avoid wrong data'
      );
      console.log('👤 PROFILE: Final userData (from AsyncStorage):', userData);
      this.setState({ userData: userData ?? null });
      return;
    }

    // Only call API if we don't have complete data from AsyncStorage
    if (userData && userData.uuid) {
      try {
        console.log(
          '👤 PROFILE: Fetching profile data from API for UUID:',
          userData.uuid
        );
        const response = await this.api.getProfile(userData.uuid);
        console.log('👤 PROFILE: API response:', response?.data);

        if (response && response.data) {
          // Use fresh data from API, merging with existing data
          userData = {
            ...userData,
            ...response.data,
          };
          console.log('👤 PROFILE: Final userData after API merge:', userData);
        }
      } catch (error) {
        console.log('👤 PROFILE: Error fetching profile data:', error);
      }
    }

    console.log('👤 PROFILE: Setting state with userData:', userData);
    this.setState({ userData: userData ?? null });
  };

  triggerClose = () => {
    this.props.close(true);
  };

  refreshProfile = async () => {
    await this.loadUserData();
  };

  handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data including your profile, posts, and account information.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: this.confirmDeleteAccount,
        },
      ]
    );
  };

  confirmDeleteAccount = () => {
    Alert.alert(
      'Final Confirmation',
      'This is your final warning. Deleting your account will:\n\n• Permanently remove your profile\n• Delete all your posts\n• Remove all your data from our servers\n• This action cannot be undone\n\nAre you absolutely sure you want to proceed?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Delete My Account',
          style: 'destructive',
          onPress: this.performAccountDeletion,
        },
      ]
    );
  };

  performAccountDeletion = async () => {
    try {
      const { userData } = this.state;

      if (!userData || !userData.email) {
        Alert.alert('Error', 'Unable to delete account. User data not found.');
        return;
      }

      // Show loading state
      Alert.alert(
        'Deleting Account',
        'Please wait while we delete your account...',
        [],
        { cancelable: false }
      );

      // Call the API to delete the account
      const response = await this.api.deleteAccount(userData.email);

      if (response && response.status === 200) {
        // Clear all local data
        await this.props.userSessionReset();

        Alert.alert(
          'Account Deleted',
          'Your account has been successfully deleted. Thank you for using SquibTurf.',
          [
            {
              text: 'OK',
              onPress: () => {
                this.props.close(true);
              },
            },
          ]
        );
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert(
        'Error',
        'Failed to delete your account. Please try again or contact support if the problem persists.',
        [
          {
            text: 'OK',
          },
        ]
      );
    }
  };

  render() {
    const { userData } = this.state;
    const Icon: any = FontAwesome;
    return (
      <>
        {userData ? (
          <>
            <View
              style={{
                height: 50,
                width: 50,
                transform: [{ rotate: '180deg' }],
                position: 'absolute',
                top: 60,
                left: 0,
                zIndex: 999,
              }}
            >
              <TouchableOpacity onPress={this.triggerClose}>
                <Icon
                  name="times"
                  style={{ marginTop: 10 }}
                  color={'#44C1AF'}
                  size={30}
                />
              </TouchableOpacity>
            </View>

            {/* Edit Profile Button - Top Right */}
            <View
              style={{
                position: 'absolute',
                top: 60,
                right: 20,
                zIndex: 999,
                flexDirection: 'row',
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  // Force refresh user data
                  this.setState({ userData: null }, () => {
                    this.loadUserData();
                  });
                }}
                style={{
                  padding: 8,
                  marginRight: 8,
                }}
              >
                <Icon name="refresh" size={20} color="#44C1AF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  // Use the callback to handle navigation
                  if (this.props.onEditProfile) {
                    this.props.onEditProfile(this.state.userData);
                  }
                }}
                style={{
                  padding: 8,
                }}
              >
                <Icon name="edit" size={24} color="#44C1AF" />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, top: 200 }}>
              <View>
                <Image
                  style={{
                    height: 200,
                    width: 200,
                    position: 'absolute',
                    marginLeft: -100,
                    left: '50%',
                    top: -100,
                    borderRadius: 150,
                    overflow: 'hidden',
                  }}
                  source={{
                    uri: (() => {
                      const photoUrl =
                        userData.photo &&
                        userData.photo.includes(
                          'squibturf-images.s3.amazonaws.com'
                        )
                          ? userData.photo.replace(
                              'squibturf-images.s3.amazonaws.com',
                              'squibturf-images.s3.us-east-1.amazonaws.com'
                            )
                          : userData.photo;
                      // Ensure the URL has the correct format with double slash
                      const finalPhotoUrl =
                        photoUrl &&
                        photoUrl.includes(
                          'squibturf-images.s3.us-east-1.amazonaws.com'
                        ) &&
                        !photoUrl.includes('//profile-')
                          ? photoUrl.replace(
                              'squibturf-images.s3.us-east-1.amazonaws.com/',
                              'squibturf-images.s3.us-east-1.amazonaws.com//'
                            )
                          : photoUrl;
                      return finalPhotoUrl;
                    })(),
                  }}
                />
              </View>
              <View style={{ top: 200, width: '100%', padding: 20 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 20,
                      flexDirection: 'row',
                      justifyContent: 'flex-start',
                    }}
                  >
                    {' '}
                    Display Name{' '}
                  </Text>
                  <Text
                    style={{
                      fontSize: 20,
                      flexDirection: 'row',
                      justifyContent: 'flex-end',
                      fontWeight: 'bold',
                      color: '#44C1AF',
                    }}
                  >
                    {' '}
                    {userData.displayName || userData.name}{' '}
                  </Text>
                </View>
                {(userData.givenName || userData.familyName) && (
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 30,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 20,
                        flexDirection: 'row',
                        justifyContent: 'flex-start',
                      }}
                    >
                      {' '}
                      Full Name{' '}
                    </Text>
                    <Text
                      style={{
                        fontSize: 20,
                        flexDirection: 'row',
                        justifyContent: 'flex-end',
                        fontWeight: 'bold',
                        color: '#44C1AF',
                      }}
                    >
                      {' '}
                      {`${userData.givenName || ''} ${
                        userData.familyName || ''
                      }`.trim()}{' '}
                    </Text>
                  </View>
                )}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 30,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 20,
                      flexDirection: 'row',
                      justifyContent: 'flex-start',
                    }}
                  >
                    {' '}
                    Email{' '}
                  </Text>
                  <Text
                    style={{
                      fontSize: 20,
                      flexDirection: 'row',
                      justifyContent: 'flex-end',
                      fontWeight: 'bold',
                      color: '#44C1AF',
                    }}
                  >
                    {' '}
                    {userData.email}{' '}
                  </Text>
                </View>
                {userData.bio && (
                  <View
                    style={{
                      marginTop: 30,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 20,
                        flexDirection: 'row',
                        justifyContent: 'flex-start',
                        marginBottom: 10,
                      }}
                    >
                      Bio
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        color: '#666',
                        lineHeight: 24,
                      }}
                    >
                      {userData.bio}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Settings Section */}
            <View
              style={{
                marginTop: 30,
                borderTopWidth: 1,
                borderTopColor: '#eee',
                paddingTop: 20,
                paddingHorizontal: 20,
                paddingBottom: 40,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  marginBottom: 20,
                  color: '#333',
                }}
              >
                Settings
              </Text>

              <TouchableOpacity
                onPress={() => {
                  this.props.userSessionReset();
                  this.props.close(true);
                }}
                style={{
                  paddingVertical: 12,
                  alignItems: 'center',
                  marginBottom: 15,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: '#007AFF',
                    textAlign: 'center',
                  }}
                >
                  Sign Out
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={this.handleDeleteAccount}
                style={{
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: '#FF3B30',
                    textAlign: 'center',
                  }}
                >
                  Delete Account
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text></Text>
          </>
        )}
      </>
    );
  }
}
