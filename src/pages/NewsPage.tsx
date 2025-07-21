import Geolocation from '@react-native-community/geolocation';
import React, { Component } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Permission,
  PERMISSIONS,
  Rationale,
  request,
  RESULTS,
} from 'react-native-permissions';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import NewsItem from '../components/NewsItem';
const SquibApi = require('../api/index');

interface NewsItemData {
  text: string;
  image: string;
  video?: string;
  user_name: string;
  user_id: string;
  post_id: string;
  time_stamp: number;
  date_key?: number; // Epoch time for sorting
  lat?: number;
  lon?: number;
  location?: { city?: string; state?: string; country?: string };
  type?: 'photo' | 'video';
  user_photo?: string;
}

interface Props {
  navigation?: any; // Adjust navigation prop type as per your application
  refreshTrigger?: number; // Trigger to refresh data
}

interface State {
  squibs: NewsItemData[];
  refreshing: boolean;
  loading: boolean;
  lastKey: any;
  loadingMore: boolean;
  locationPermissionDenied: boolean;
  hasError: boolean;
  errorMessage: string;
}

export default class NewsPage extends Component<Props, State> {
  private api: typeof SquibApi;
  private scrollEndTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.api = new SquibApi();
    this.state = {
      squibs: [],
      refreshing: false,
      loading: false,
      lastKey: null,
      loadingMore: false,
      locationPermissionDenied: false,
      hasError: false,
      errorMessage: '',
    };
  }

  async componentDidMount() {
    this._getData(null, false); // Initial load, don't append

    // Add focus listener to refresh data when screen comes into focus
    const unsubscribe = this.props.navigation?.addListener('focus', () => {
      this._getData(null, false); // Refresh, don't append
    });

    // Clean up listener on unmount
    if (unsubscribe) {
      this.componentWillUnmount = unsubscribe;
    }
  }

  componentDidUpdate(prevProps: Props) {
    // If refreshTrigger changed, refresh the data
    if (
      prevProps.refreshTrigger !== this.props.refreshTrigger &&
      this.props.refreshTrigger
    ) {
      this._getData(null, false); // Refresh, don't append
    }
  }

  async _getLocationPermissions() {
    let permission: Permission | undefined;

    if (Platform.OS === 'android') {
      permission = PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION;
    } else if (Platform.OS === 'ios') {
      permission = PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
    }

    if (!permission) {
      return false;
    }

    const rationale: Rationale = {
      title: 'DemoApp',
      message: 'DemoApp would like access to your location',
      buttonPositive: 'OK',
    };

    const granted = await request(permission, rationale);
    return granted === RESULTS.GRANTED;
  }

  _getCurrentPosition = () => {
    return new Promise<{ lon: number; lat: number }>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Geolocation timeout'));
      }, 5000); // 5 second timeout

      Geolocation.getCurrentPosition(
        position => {
          clearTimeout(timeoutId);
          const { latitude, longitude } = position.coords;
          resolve({ lon: longitude, lat: latitude });
        },
        error => {
          clearTimeout(timeoutId);
          console.log('Error : ' + JSON.stringify(error));
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 1000 }
      );
    });
  };

  async _getData(lastKey = null, append = false) {
    try {
      this.setState({
        hasError: false,
        errorMessage: '',
        locationPermissionDenied: false,
      });

      const granted = await this._getLocationPermissions();
      if (granted) {
        try {
          const loc = await this._getCurrentPosition();
          console.log('Location obtained:', loc);
          const data = await this.api.getLocalSquibs(
            loc.lon,
            loc.lat,
            lastKey,
            10
          ); // Always use limit 10

          if (data && data.Items) {
            this.setState(prevState => {
              let newSquibs = append
                ? [...prevState.squibs, ...data.Items]
                : data.Items;

              // Sort by date_key in descending order (newest first)
              newSquibs.sort((a: NewsItemData, b: NewsItemData) => {
                const dateA = a.date_key || a.time_stamp || 0;
                const dateB = b.date_key || b.time_stamp || 0;
                return dateB - dateA;
              });

              return {
                squibs: newSquibs,
                lastKey: data.LastEvaluatedKey || null,
                refreshing: false,
                loadingMore: false,
                hasError: false,
                errorMessage: '',
              };
            });
          } else {
            this.setState({
              squibs: append ? this.state.squibs : [],
              refreshing: false,
              loadingMore: false,
              hasError: false,
              errorMessage: '',
            });
          }
        } catch (error) {
          console.log('Error getting location or data:', error);
          this.setState({
            squibs: append ? this.state.squibs : [],
            refreshing: false,
            loadingMore: false,
            hasError: true,
            errorMessage:
              'Unable to load content. Please check your connection and try again.',
          });
        }
      } else {
        // Location permission denied - show helpful message
        this.setState({
          squibs: append ? this.state.squibs : [],
          refreshing: false,
          loadingMore: false,
          locationPermissionDenied: true,
          hasError: false,
          errorMessage: '',
        });
      }
    } catch (error) {
      console.log('Error in _getData:', error);
      this.setState({
        squibs: append ? this.state.squibs : [],
        refreshing: false,
        loadingMore: false,
        hasError: true,
        errorMessage: 'Something went wrong. Please try again.',
      });
    }
  }

  _onRefresh = () => {
    this.setState({ refreshing: true, lastKey: null }, () =>
      this._getData(null, false)
    );
  };

  _onEndReached = () => {
    const { lastKey, loadingMore } = this.state;

    if (lastKey && !loadingMore) {
      this.setState({ loadingMore: true }, () => this._getData(lastKey, true));
    } else {
    }
  };

  render() {
    const {
      squibs,
      refreshing,
      loading,
      loadingMore,
      locationPermissionDenied,
      hasError,
      errorMessage,
    } = this.state;
    const { navigation } = this.props;
    const Icon: any = FontAwesome;
    return (
      <View style={{ flex: 1 }}>
        <StatusBar backgroundColor="blue" barStyle="light-content" />
        {loading ? (
          <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={styles.loadingText}>Loading Squibs...</Text>
            <Icon
              name="spinner"
              style={styles.loadingIcon}
              color={'#44C1AF'}
              size={30}
            />
          </View>
        ) : locationPermissionDenied ? (
          <ScrollView
            contentContainerStyle={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={this._onRefresh.bind(this)}
                tintColor="#44C1AF"
              />
            }
          >
            <Icon
              name="map-marker"
              style={styles.permissionIcon}
              color={'#44C1AF'}
              size={80}
            />
            <Text style={styles.permissionTitle}>Location Access Required</Text>
            <Text style={styles.permissionText}>
              SquibTurf needs location access to show you nearby posts. Please
              enable location permissions in Settings.
            </Text>
            <Text style={styles.permissionSubtext}>
              Pull down to refresh once permissions are granted
            </Text>
          </ScrollView>
        ) : hasError ? (
          <ScrollView
            contentContainerStyle={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={this._onRefresh.bind(this)}
                tintColor="#44C1AF"
              />
            }
          >
            <Icon
              name="exclamation-triangle"
              style={styles.errorIcon}
              color={'#FF6B6B'}
              size={80}
            />
            <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Text style={styles.errorSubtext}>Pull down to try again</Text>
          </ScrollView>
        ) : squibs.length > 0 ? (
          <ScrollView
            contentContainerStyle={{
              backgroundColor: '#ddd',
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={this._onRefresh.bind(this)}
                tintColor="#44C1AF"
              />
            }
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } =
                nativeEvent;
              if (
                layoutMeasurement.height + contentOffset.y >=
                contentSize.height - 20
              ) {
                this._onEndReached();
              }
            }}
            scrollEventThrottle={400}
          >
            {squibs.map((item, index) => (
              <NewsItem
                key={index}
                text={item.text}
                img={
                  Array.isArray(item.image)
                    ? item.image
                    : typeof item.image === 'string'
                    ? item.image.split(',')
                    : []
                }
                video={
                  item.video
                    ? Array.isArray(item.video)
                      ? item.video
                      : [item.video]
                    : undefined
                }
                name={item.user_name}
                time={item.time_stamp.toString()}
                userPhoto={item.user_photo}
                userId={item.user_id}
                onPress={() => {
                  const data = {
                    text: item.text,
                    image: Array.isArray(item.image)
                      ? item.image
                      : typeof item.image === 'string'
                      ? item.image.split(',')
                      : [],
                    video: item.video
                      ? Array.isArray(item.video)
                        ? item.video
                        : [item.video]
                      : undefined,
                    user_id: item.user_id,
                    post_id: item.post_id,
                  };
                  this.setState(prevState => ({ ...prevState, ...data }));
                  navigation?.navigate('Squib', data);
                }}
                lat={item.lat}
                lon={item.lon}
                location={item.location}
                type={item.type}
              />
            ))}
            {loadingMore && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text>Loading more...</Text>
              </View>
            )}
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={{ height: '100%', width: '100%' }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={this._onRefresh.bind(this)}
                tintColor="#44C1AF"
              />
            }
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } =
                nativeEvent;
              if (
                layoutMeasurement.height + contentOffset.y >=
                contentSize.height - 20
              ) {
                this._onEndReached();
              }
            }}
            scrollEventThrottle={400}
          >
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Icon
                name="plus-circle"
                style={styles.emptyIcon}
                color={'#44C1AF'}
                size={80}
              />
              <Text style={styles.emptyTitle}>Be the First!</Text>
              <Text style={styles.emptyText}>
                No posts in your area yet. Create the first squib and start
                sharing your experiences!
              </Text>
              <Text style={styles.emptySubtext}>
                Pull down to refresh or tap the camera button to post
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  pullToRefreshText: {
    color: '#44C1AF',
    width: 300,
    height: 20,
    textAlign: 'center',
    left: '50%',
    marginLeft: -150,
    top: '0%',
    marginTop: 80,
    position: 'absolute',
    fontStyle: 'italic',
  },
  downArrowIcon: {
    top: 100,
    left: '50%',
    marginLeft: -5,
  },
  noSquibsText: {
    color: '#44C1AF',
    fontWeight: 'bold',
    width: 300,
    textAlign: 'center',
    left: '50%',
    marginLeft: -150,
    top: '50%',
    marginTop: -20,
    marginBottom: 20,
  },
  flagIcon: {
    top: '50%',
    left: '50%',
    marginLeft: -40,
  },
  loadingText: {
    color: '#44C1AF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  loadingIcon: {
    marginTop: 10,
  },
  permissionIcon: {
    marginBottom: 20,
  },
  permissionTitle: {
    color: '#44C1AF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  permissionText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 30,
    lineHeight: 22,
  },
  permissionSubtext: {
    color: '#44C1AF',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  errorIcon: {
    marginBottom: 20,
  },
  errorTitle: {
    color: '#FF6B6B',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  errorText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 30,
    lineHeight: 22,
  },
  errorSubtext: {
    color: '#44C1AF',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#44C1AF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 30,
    lineHeight: 22,
  },
  emptySubtext: {
    color: '#44C1AF',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
