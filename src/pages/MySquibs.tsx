import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  StatusBar,
  Text,
  View,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import NewsItem from '../components/NewsItem';
import {
  clearMySquibsData,
  mySquibsData,
  mySquibsLastKey,
  setMySquibsData,
} from './MySquibsDataCache';
import { mySquibsScrollY, setMySquibsScrollY } from './MySquibsScrollState';
const SquibApi = require('../api');

interface NewsItemData {
  text: string;
  image: string;
  video?: string;
  uuid: string;
  user_id: string;
  post_id: string;
  time_stamp: number;
  date_key?: number;
  lat?: number;
  lon?: number;
  location?: { city?: string; state?: string; country?: string };
  type?: 'photo' | 'video';
}

interface Props {
  navigation?: any;
}

interface State {
  squibs: NewsItemData[];
  refreshing: boolean;
  lastKey: any;
  loadingMore: boolean;
  currentUser: {
    name?: string;
    photo?: string;
    uuid?: string;
  } | null;
  showScrollRestoreOverlay?: boolean;
}

export default class MySquibs extends React.Component<Props, State> {
  private api;
  private flatListRef = React.createRef<FlatList<NewsItemData>>();
  private focusListener: any;
  private restoreInProgress = false;
  private lastRestoreAttempt = 0;
  private windowHeight = Dimensions.get('window').height;
  private restoreTimeout: any = null;
  private failsafeTimeout: any = null;
  private loadedKeys: Set<any> = new Set();

  constructor(props: Props) {
    super(props);
    this.api = new SquibApi();
    this.state = {
      squibs: [],
      refreshing: false,
      lastKey: null,
      loadingMore: false,
      currentUser: null,
      showScrollRestoreOverlay: false,
    };
  }

  async componentDidMount() {
    if (mySquibsData.length > 0) {
      this.setState({
        squibs: mySquibsData,
        lastKey: mySquibsLastKey,
        showScrollRestoreOverlay: true,
      });
      this.restoreInProgress = true;
      this.lastRestoreAttempt = mySquibsScrollY;
      // Do NOT add mySquibsLastKey to loadedKeys here!
      // Failsafe: hide overlay after 2 seconds
      this.failsafeTimeout = setTimeout(() => {
        if (this.state.showScrollRestoreOverlay) {
          this.setState({ showScrollRestoreOverlay: false });
          this.restoreInProgress = false;
        }
      }, 2000);
    } else {
      this._getData();
    }
    this._loadCurrentUser();
    this.focusListener = this.props.navigation?.addListener('focus', () => {
      this._loadCurrentUser();
      if (this.flatListRef.current && this.state.squibs.length > 0) {
        this.tryRestoreScroll();
      }
    });
  }

  componentWillUnmount() {
    if (this.focusListener) this.focusListener();
    if (this.restoreTimeout) clearTimeout(this.restoreTimeout);
    if (this.failsafeTimeout) clearTimeout(this.failsafeTimeout);
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

  async _loadCurrentUser() {
    try {
      const user = await AsyncStorage.getItem('userInfo');
      if (user) {
        const userData = JSON.parse(user);
        this.setState({ currentUser: userData });
      }
    } catch (error) {
      // ignore
    }
  }

  async _getData(lastKey = null, append = false) {
    try {
      const data = await this.api.getUserSquibs(lastKey, 10, 0);
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
          setMySquibsData(newSquibs, data.LastEvaluatedKey || null);
          if (append && lastKey) this.loadedKeys.add(lastKey); // Only add after successful pagination
          return {
            squibs: newSquibs,
            lastKey: data.LastEvaluatedKey || null,
            refreshing: false,
            loadingMore: false,
          };
        });
      } else {
        setMySquibsData(append ? this.state.squibs : [], null);
        this.setState({
          squibs: append ? this.state.squibs : [],
          refreshing: false,
          loadingMore: false,
        });
      }
    } catch (error) {
      this.setState({ refreshing: false, loadingMore: false });
    }
  }

  _onRefresh = () => {
    clearMySquibsData();
    this.loadedKeys.clear();
    this.setState({ refreshing: true, lastKey: null }, () => this._getData());
  };

  _onEndReached = () => {
    const { lastKey, loadingMore } = this.state;
    if (lastKey && !loadingMore && !this.loadedKeys.has(lastKey)) {
      this.setState({ loadingMore: true }, () => this._getData(lastKey, true));
    }
  };

  render() {
    const {
      squibs,
      refreshing,
      loadingMore,
      currentUser,
      showScrollRestoreOverlay,
    } = this.state;
    const { navigation } = this.props;
    const Icon: any = FontAwesome;
    return (
      <View style={{ flex: 1 }}>
        <StatusBar backgroundColor="blue" barStyle="light-content" />
        {showScrollRestoreOverlay && (
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
        {squibs.length > 0 ? (
          <FlatList
            ref={this.flatListRef}
            data={squibs}
            keyExtractor={item => item.uuid}
            renderItem={({ item }) => (
              <View style={{ position: 'relative' }}>
                <NewsItem
                  text={item.text}
                  img={
                    typeof item.image === 'string'
                      ? item.image.split(',')
                      : Array.isArray(item.image)
                      ? item.image
                      : []
                  }
                  video={
                    item.video
                      ? Array.isArray(item.video)
                        ? item.video
                        : [item.video]
                      : undefined
                  }
                  name={currentUser?.name || 'You'}
                  userPhoto={currentUser?.photo}
                  userId={currentUser?.uuid}
                  time={item.time_stamp.toString()}
                  onPress={() => {
                    const navData = {
                      text: item.text,
                      image:
                        typeof item.image === 'string'
                          ? item.image.split(',')
                          : Array.isArray(item.image)
                          ? item.image
                          : [],
                      video: item.video
                        ? Array.isArray(item.video)
                          ? item.video
                          : [item.video]
                        : undefined,
                      user_id: item.user_id,
                      post_id: item.post_id,
                    };
                    navigation?.navigate('Squib', navData);
                  }}
                  onMenuPress={() => this.confirmDeleteByUuid(item.uuid)}
                  lat={item.lat}
                  lon={item.lon}
                  location={item.location}
                  type={item.type}
                />
              </View>
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={this._onRefresh}
                tintColor="#44C1AF"
              />
            }
            onScroll={e => setMySquibsScrollY(e.nativeEvent.contentOffset.y)}
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
              name="pencil"
              style={{ marginBottom: 20 }}
              color={'#44C1AF'}
              size={80}
            />
            <Text
              style={{
                color: '#44C1AF',
                fontSize: 24,
                fontWeight: 'bold',
                marginBottom: 15,
                textAlign: 'center',
              }}
            >
              No Posts Yet
            </Text>
            <Text
              style={{
                color: '#666',
                fontSize: 16,
                textAlign: 'center',
                marginBottom: 10,
                paddingHorizontal: 30,
                lineHeight: 22,
              }}
            >
              You haven't created any squibs yet. Tap the camera button to share
              your first post!
            </Text>
          </View>
        )}
      </View>
    );
  }

  confirmDeleteByUuid = async (uuid: string) => {
    const { squibs } = this.state;
    const index = squibs.findIndex(s => s.uuid === uuid);
    if (index === -1) return;
    Alert.alert('Delete Squib', 'Are you sure you want to delete this squib?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const array = [...squibs];
          await this.api.deleteSquib({ uuid });
          array.splice(index, 1);
          this.setState({ squibs: array });
        },
      },
    ]);
  };
}
