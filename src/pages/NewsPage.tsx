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
  lat?: number;
  lon?: number;
  location?: { city?: string; state?: string; country?: string };
  type?: 'photo' | 'video';
}

interface Props {
  navigation?: any; // Adjust navigation prop type as per your application
  refreshTrigger?: number; // Trigger to refresh data
}

interface State {
  squibs: NewsItemData[];
  refreshing: boolean;
  loading: boolean;
}

export default class NewsPage extends Component<Props, State> {
  private api: typeof SquibApi;

  constructor(props: Props) {
    super(props);
    this.api = new SquibApi();
    this.state = {
      squibs: [],
      refreshing: false,
      loading: false,
    };
  }

  async componentDidMount() {
    this._getData();

    // Add focus listener to refresh data when screen comes into focus
    const unsubscribe = this.props.navigation?.addListener('focus', () => {
      console.log('NewsPage - focus event triggered, refreshing data');
      this._getData();
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
      console.log('NewsPage - refreshTrigger changed, refreshing data');
      this._getData();
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
      console.log('Unsupported platform for location permission');
      return false;
    }

    const rationale: Rationale = {
      title: 'DemoApp',
      message: 'DemoApp would like access to your location',
      buttonPositive: 'OK',
    };

    const granted = await request(permission, rationale);

    console.log('Permission granted:', granted);

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

  async _getData() {
    console.log('getting data');
    this.setState({ loading: true });
    try {
      const granted = await this._getLocationPermissions();
      if (granted) {
        try {
          const loc = await this._getCurrentPosition();
          const data = await this.api.getLocalSquibs(loc.lon, loc.lat);
          if (data) {
            this.setState({ squibs: data });
          }
        } catch (error) {
          console.log('geolocation or API error', error);
          // Set empty state so UI can render even if API fails
          this.setState({ squibs: [] });
        }
      } else {
        console.log('permission not granted');
        // Set empty state so UI can render even without location
        this.setState({ squibs: [] });
      }
    } catch (error) {
      console.log('Error in _getData:', error);
      // Set empty state so UI can render even if everything fails
      this.setState({ squibs: [] });
    } finally {
      this.setState({ refreshing: false, loading: false });
    }
  }

  _onRefresh = () => {
    this.setState({ refreshing: true });
    this._getData();
  };

  render() {
    const { squibs, refreshing, loading } = this.state;
    const { navigation } = this.props;
    const Icon: any = FontAwesome;
    return (
      <View>
        <StatusBar backgroundColor="blue" barStyle="light-content" />
        {loading ? (
          <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={styles.pullToRefreshText}>Loading Squibs...</Text>
            <Icon
              name="spinner"
              style={styles.downArrowIcon}
              color={'#44C1AF'}
              size={30}
            />
          </View>
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
          >
            {squibs
              .sort((a, b) => b.time_stamp - a.time_stamp)
              .map((item, index) => (
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
          >
            <View style={{ height: '100%' }}>
              <Text style={styles.pullToRefreshText}>Pull to refresh</Text>
              <Icon
                name="long-arrow-down"
                style={styles.downArrowIcon}
                color={'#44C1AF'}
                size={30}
              />
              <Text style={styles.noSquibsText}>
                No Squibs in your area. Make a new Post
              </Text>
              <Icon
                name="flag"
                style={styles.flagIcon}
                color={'#44C1AF'}
                size={80}
              />
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
});
