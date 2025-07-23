import Geolocation from '@react-native-community/geolocation';
import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  RefreshControl,
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
import {
  clearNewsPageData,
  newsPageData,
  newsPageLastKey,
  setNewsPageData,
} from './NewsPageDataCache';
import { newsPageScrollY, setNewsPageScrollY } from './NewsPageScrollState';
const SquibApi = require('../api/index');

interface NewsItemData {
  text: string;
  image: string;
  video?: string;
  user_name: string;
  user_id: string;
  post_id: string;
  time_stamp: number;
  date_key?: number;
  lat?: number;
  lon?: number;
  location?: { city?: string; state?: string; country?: string };
  type?: 'photo' | 'video';
  user_photo?: string;
}

interface Props {
  navigation?: any;
  refreshTrigger?: number;
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
  showScrollRestoreOverlay?: boolean;
}

export default class NewsPage extends React.Component<Props, State> {
  private api: typeof SquibApi;
  private flatListRef = React.createRef<FlatList<NewsItemData>>();
  private focusListener: any;
  private needsScrollRestore = false;
  private hasRestoredScroll = false;
  private restoreInProgress = false;
  private lastRestoreAttempt = 0;
  private windowHeight = Dimensions.get('window').height;
  private restoreTimeout: any = null;
  private failsafeTimeout: any = null;

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
      showScrollRestoreOverlay: false,
    };
  }

  async componentDidMount() {
    if (newsPageData.length > 0) {
      this.setState({
        squibs: newsPageData,
        lastKey: newsPageLastKey,
        showScrollRestoreOverlay: true,
      });
      this.restoreInProgress = true;
      this.lastRestoreAttempt = newsPageScrollY;
      // Failsafe: hide overlay after 2 seconds
      this.failsafeTimeout = setTimeout(() => {
        if (this.state.showScrollRestoreOverlay) {
          this.setState({ showScrollRestoreOverlay: false });
          this.restoreInProgress = false;
        }
      }, 2000);
    } else {
      this._getData(null, false);
    }
    this.focusListener = this.props.navigation?.addListener('focus', () => {
      if (this.flatListRef.current && this.state.squibs.length > 0) {
        this.tryRestoreScroll();
      }
    });
  }

  tryRestoreScroll = () => {
    if (
      this.restoreInProgress &&
      this.flatListRef.current &&
      this.lastRestoreAttempt > 0
    ) {
      this.flatListRef.current.scrollToOffset({
        offset: this.lastRestoreAttempt,
        animated: false,
      });
    }
  };

  componentWillUnmount() {
    if (this.focusListener) this.focusListener();
    if (this.restoreTimeout) clearTimeout(this.restoreTimeout);
    if (this.failsafeTimeout) clearTimeout(this.failsafeTimeout);
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (
      prevProps.refreshTrigger !== this.props.refreshTrigger &&
      this.props.refreshTrigger
    ) {
      this._getData(null, false);
    }
    // Do not restore scroll here; wait for onContentSizeChange
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
      }, 10000);
      Geolocation.getCurrentPosition(
        position => {
          clearTimeout(timeoutId);
          const { latitude, longitude } = position.coords;
          resolve({ lon: longitude, lat: latitude });
        },
        error => {
          clearTimeout(timeoutId);
          reject(error);
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 60000,
        }
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
          let loc;
          loc = await this._getCurrentPosition();
          const data = await this.api.getLocalSquibs(
            loc.lon,
            loc.lat,
            lastKey,
            10
          );
          if (data && data.Items) {
            this.setState(prevState => {
              let newSquibs = append
                ? [...prevState.squibs, ...data.Items]
                : data.Items;
              newSquibs.sort((a: NewsItemData, b: NewsItemData) => {
                const dateA = a.date_key || a.time_stamp || 0;
                const dateB = b.date_key || b.time_stamp || 0;
                return dateB - dateA;
              });
              setNewsPageData(newSquibs, data.LastEvaluatedKey || null);
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
            setNewsPageData(append ? this.state.squibs : [], null);
            this.setState({
              squibs: append ? this.state.squibs : [],
              refreshing: false,
              loadingMore: false,
              hasError: false,
              errorMessage: '',
            });
          }
        } catch (error: any) {
          const isLocationTimeout =
            error.code === 3 || error.message?.includes('timeout');
          const isNoLocationProvider =
            error.code === 2 ||
            error.message?.includes('No location provider available') ||
            error.message?.includes('POSITION_UNAVAILABLE');
          let errorMessage =
            'Unable to load content. Please check your connection and try again.';
          if (isLocationTimeout) {
            errorMessage =
              'Location request timed out. Please try again or check your GPS settings.';
          } else if (isNoLocationProvider) {
            errorMessage =
              'Location services not available. Please enable GPS or try on a real device.';
          }
          this.setState({
            squibs: append ? this.state.squibs : [],
            refreshing: false,
            loadingMore: false,
            hasError: true,
            errorMessage: errorMessage,
          });
        }
      } else {
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
    clearNewsPageData();
    this.setState({ refreshing: true, lastKey: null }, () =>
      this._getData(null, false)
    );
  };

  _onEndReached = () => {
    const { lastKey, loadingMore } = this.state;
    if (lastKey && !loadingMore) {
      this.setState({ loadingMore: true }, () => this._getData(lastKey, true));
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
        {this.state.showScrollRestoreOverlay && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
              backgroundColor: 'white',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <ActivityIndicator size="large" color="#44C1AF" />
          </View>
        )}
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
          <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
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
          </View>
        ) : hasError ? (
          <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
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
          </View>
        ) : squibs.length > 0 ? (
          <FlatList
            ref={this.flatListRef}
            data={squibs}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item, index }) => (
              <NewsItem
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
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={this._onRefresh.bind(this)}
                tintColor="#44C1AF"
              />
            }
            onScroll={e => setNewsPageScrollY(e.nativeEvent.contentOffset.y)}
            scrollEventThrottle={16}
            onEndReached={this._onEndReached}
            onEndReachedThreshold={0.1}
            ListFooterComponent={
              loadingMore ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text>Loading more...</Text>
                </View>
              ) : null
            }
            contentContainerStyle={{
              backgroundColor: '#ddd',
              paddingBottom: 100, // Add more padding to make white space longer
            }}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={10}
            onContentSizeChange={(w, h) => {
              if (
                this.restoreInProgress &&
                this.flatListRef.current &&
                this.lastRestoreAttempt > 0
              ) {
                if (h > this.lastRestoreAttempt + this.windowHeight) {
                  this.flatListRef.current.scrollToOffset({
                    offset: this.lastRestoreAttempt,
                    animated: false,
                  });
                  this.restoreInProgress = false;
                  if (this.restoreTimeout) clearTimeout(this.restoreTimeout);
                  if (this.failsafeTimeout) clearTimeout(this.failsafeTimeout);
                  this.setState({ showScrollRestoreOverlay: false });
                } else {
                  if (this.restoreTimeout) clearTimeout(this.restoreTimeout);
                  this.restoreTimeout = setTimeout(() => {
                    if (this.restoreInProgress && this.flatListRef.current) {
                      this.flatListRef.current.scrollToOffset({
                        offset: this.lastRestoreAttempt,
                        animated: false,
                      });
                    }
                  }, 100);
                }
              }
            }}
          />
        ) : (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingTop: 100,
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
