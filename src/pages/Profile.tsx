import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { Component } from 'react';
import {
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
    console.log('Profile - componentDidMount called');
    await this.loadUserData();

    // Add focus listener to refresh data when screen is focused
    const unsubscribe = this.props.navigation?.addListener('focus', () => {
      console.log('Profile - focus event triggered');
      this.loadUserData();
    });

    // Clean up listener on unmount
    if (unsubscribe) {
      this.componentWillUnmount = unsubscribe;
    }
  }

  componentDidUpdate(prevProps: Props) {
    // If the data prop changed (e.g., after profile edit), refresh the data
    if (prevProps.data !== this.props.data) {
      console.log('Profile - data prop changed, refreshing user data');
      this.loadUserData();
    }
  }

  loadUserData = async () => {
    let userData = this.props.data;

    if (!userData) {
      // Try to get user data from AsyncStorage first
      const user = await AsyncStorage.getItem('userInfo');
      userData = user ? JSON.parse(user) : null;

      // If we have user data with a UUID, fetch fresh profile data from API
      if (userData && userData.uuid) {
        try {
          console.log(
            'Profile - fetching fresh profile data for UUID:',
            userData.uuid
          );
          const response = await this.api.getProfile(userData.uuid);

          if (response && response.data) {
            console.log('Profile - API response:', response.data);

            // Merge API response with existing user data
            const freshProfileData = {
              ...userData,
              ...response.data,
            };

            console.log('Profile - merged profile data:', freshProfileData);

            // Save the fresh data to AsyncStorage
            await AsyncStorage.setItem(
              'userInfo',
              JSON.stringify(freshProfileData)
            );

            userData = freshProfileData;
          } else {
            console.log('Profile - no API response, using cached data');
          }
        } catch (error) {
          console.log('Profile - error fetching profile data:', error);
          console.log('Profile - using cached data instead');
        }
      }
    }

    console.log('Profile - final userData:', userData);
    console.log('Profile - bio field:', userData?.bio);
    this.setState({ userData: userData ?? null });
  };

  triggerClose = () => {
    this.props.close(true);
  };

  refreshProfile = async () => {
    await this.loadUserData();
  };

  render() {
    const { userData } = this.state;
    const Icon: any = FontAwesome;

    console.log('Profile - render userData:', userData);
    console.log('Profile - render bio field:', userData?.bio);
    console.log('Profile - should show bio:', userData?.bio ? 'YES' : 'NO');
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
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  console.log('Profile - Edit Profile button pressed');
                  console.log(
                    'Profile - userData to pass:',
                    this.state.userData
                  );

                  // Use the callback to handle navigation
                  if (this.props.onEditProfile) {
                    console.log('Profile - calling onEditProfile callback');
                    this.props.onEditProfile(this.state.userData);
                  } else {
                    console.log(
                      'Profile - onEditProfile callback not available'
                    );
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
                  source={{ uri: userData.photo }}
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
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text> No user data found</Text>
          </>
        )}
      </>
    );
  }
}
