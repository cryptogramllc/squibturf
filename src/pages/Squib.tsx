import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { Component } from 'react';
import {
  Alert,
  Animated,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Video from 'react-native-video';
const SquibApi = require('../api/index');

interface Props {
  route: {
    params: {
      data: any;
      text: string;
      image: string[];
      video?: string[];
      type?: string;
    };
  };
  navigation: any;
}

interface State {
  comment: string | null;
  data: {
    comments: {
      user_id: string;
      avatar: string;
      comment: string;
      name: string;
    }[];
  } | null;
  currentImage: number;
  fadeAnimation: Animated.Value;
  imageLoadError: boolean;
  imageLoading: boolean;
  aspectRatio: number | null;
  videoError: boolean;
  videoLoading: boolean;
  shouldRenderVideo: boolean;
}

export default class Squib extends Component<Props, State> {
  api: typeof SquibApi;

  constructor(props: Props) {
    super(props);
    this.api = new SquibApi();
    this.state = {
      comment: null,
      data: null,
      currentImage: 0,
      fadeAnimation: new Animated.Value(1), // Initialize with 1 for opacity
      imageLoadError: false,
      imageLoading: true,
      aspectRatio: null, // <-- initialize aspectRatio
      videoError: false,
      videoLoading: true,
      shouldRenderVideo: false,
    };
  }

  async componentDidMount() {
    const data = await this.api.getComment();
    data && this.setState({ data });

    // Delay video rendering to prevent immediate crashes
    setTimeout(() => {
      this.setState({ shouldRenderVideo: true });
    }, 1000);
  }

  componentWillUnmount() {
    // Clean up any video resources
    console.log('Squib component unmounting - cleaning up video resources');
    this.setState({ shouldRenderVideo: false });
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevState.currentImage !== this.state.currentImage) {
      this.setImageAspectRatio();
    }
  }

  updateComment = (value: string) => {
    this.setState({ comment: value });
  };

  sendComment = async () => {
    // Get current user info from AsyncStorage
    const userInfo = await AsyncStorage.getItem('userInfo');
    const currentUser = userInfo ? JSON.parse(userInfo) : null;

    const newComment = {
      user_id: currentUser?.uuid || 'unknown',
      avatar:
        currentUser?.photo ||
        'https://cdn3.whatculture.com/images/2013/09/peter-griffin.jpg',
      comment: this.state.comment!,
      name: currentUser?.name || 'Unknown User',
    };

    if (this.state.data) {
      const updatedComments = [...this.state.data.comments, newComment];
      this.setState({ data: { comments: updatedComments } });
    }

    await this.api.postComment({
      comment: this.state.comment!,
      data: this.props.route.params.data,
    });

    this.setState({ comment: null });
    Keyboard.dismiss();
  };

  fadeOut = () => {
    Animated.timing(this.state.fadeAnimation, {
      toValue: 0,
      duration: 2000,
      useNativeDriver: true,
    }).start();
  };

  handleImageLoad = () => {
    console.log('Image loaded successfully');
    this.setState({ imageLoading: false, imageLoadError: false });
  };

  handleImageError = (error: any) => {
    console.error('Image load error:', error);
    this.setState({ imageLoadError: true, imageLoading: false });
  };

  handleImageLoadStart = () => {
    console.log('Image load started');
    this.setState({ imageLoading: true, imageLoadError: false });
  };

  testImageUrl = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      console.log(
        'Image URL test response:',
        response.status,
        response.statusText
      );
      if (!response.ok) {
        Alert.alert(
          'Image URL Test',
          `Failed to load image: ${response.status} ${response.statusText}`
        );
      } else {
        Alert.alert('Image URL Test', 'Image URL is accessible!');
      }
    } catch (error) {
      console.error('Image URL test error:', error);
      Alert.alert('Image URL Test', `Network error: ${error}`);
    }
  };

  testWithKnownImage = () => {
    // Test with a known working image
    const testUrl =
      'https://via.placeholder.com/300x200/FF0000/FFFFFF?text=Test+Image';
    Alert.alert('Testing with placeholder image', 'Check if this loads');
    console.log('Testing with placeholder image URL:', testUrl);
  };

  setImageAspectRatio = () => {
    const { image } = this.props.route.params;
    const { currentImage } = this.state;
    if (image && image.length > 0 && image[currentImage]) {
      Image.getSize(
        `https://squibturf-images.s3.amazonaws.com//${image[currentImage]}`,
        (width, height) => {
          this.setState({ aspectRatio: width / height });
        },
        error => {
          this.setState({ aspectRatio: 1 }); // fallback
        }
      );
    }
  };

  // Video lifecycle methods
  handleVideoLoadStart = () => {
    console.log('Video load started');
    this.setState({ videoLoading: true, videoError: false });
  };

  handleVideoLoad = () => {
    console.log('Video loaded successfully');
    this.setState({ videoLoading: false, videoError: false });
  };

  handleVideoError = (error: any) => {
    console.error('Video error:', error);
    this.setState({ videoError: true, videoLoading: false });
  };

  handleVideoEnd = () => {
    console.log('Video ended - restarting');
    // For videos with repeat=true, this shouldn't be called, but just in case
    // we can handle it gracefully
  };

  handleVideoProgress = (data: any) => {
    // Optional: track video progress
    console.log(
      'Video progress:',
      data.currentTime,
      '/',
      data.playableDuration
    );
  };

  handleVideoBuffer = (data: any) => {
    console.log('Video buffering:', data.currentBuffer);
  };

  handleVideoReadyForDisplay = () => {
    console.log('Video ready for display');
  };

  // Alternative video configuration for Android
  renderVideo = (uri: string) => {
    console.log('Rendering video with URI:', uri);
    return (
      <Video
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
        repeat={true}
        paused={false}
        muted={true}
        onLoadStart={() => {
          console.log('Video load started for:', uri);
          this.setState({ videoLoading: true, videoError: false });
        }}
        onLoad={() => {
          console.log('Video loaded successfully for:', uri);
          this.setState({ videoLoading: false, videoError: false });
        }}
        onError={error => {
          console.error('Video error for:', uri, error);
          this.setState({ videoError: true, videoLoading: false });
        }}
        onEnd={() => {
          console.log('Video ended for:', uri);
        }}
        ignoreSilentSwitch="ignore"
        playInBackground={false}
        playWhenInactive={false}
        // Android-specific settings
        useTextureView={true}
        controls={false}
        fullscreen={false}
      />
    );
  };

  render() {
    const { text, image, video, type } = this.props.route.params;
    const { navigation } = this.props;
    const media = [
      ...(video && video.length > 0
        ? video.map(v => ({
            type: 'video',
            uri: `https://squibturf-images.s3.amazonaws.com//${v}`,
          }))
        : []),
      ...(image && image.length > 0
        ? image.map(img => ({
            type: 'image',
            uri: `https://squibturf-images.s3.amazonaws.com//${img}`,
          }))
        : []),
    ];
    const { data, currentImage } = this.state;
    const current = media[currentImage];
    const Icon: any = FontAwesome;
    // Debug logs
    console.log(
      'Squib detail page - image param:',
      image,
      'type:',
      typeof image
    );
    if (Array.isArray(image)) {
      console.log('Squib detail page - image array contents:', image);
    }
    if (image && image.length > 0) {
      const constructedUri = `https://squibturf-images.s3.amazonaws.com//${image[currentImage]}`;
      console.log('Squib detail page - constructed image URI:', constructedUri);
    }
    if (video && video.length > 0) {
      const constructedVideoUri = `https://squibturf-images.s3.amazonaws.com//${video[0]}`;
      console.log(
        'Squib detail page - constructed video URI:',
        constructedVideoUri
      );
    }
    this.fadeOut();

    return (
      <View style={{ flex: 1, backgroundColor: '#44C1AF' }}>
        {/* Move back arrow */}
        <View
          style={{
            height: 50,
            width: 50,
            position: 'absolute',
            top: 60, // moved further down
            left: 25,
            zIndex: 999,
          }}
        >
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon
              name="arrow-left"
              style={{ marginTop: 10 }}
              color={'white'}
              size={30}
            />
          </TouchableOpacity>
        </View>
        {data && data.comments.length > 0 && (
          <View
            style={{
              height: 50,
              width: 50,
              position: 'absolute',
              top: 28,
              right: 10,
              zIndex: 999,
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.navigate('Comments', data.comments)}
            >
              <Icon
                name="comments"
                style={{ marginTop: 10 }}
                color={'white'}
                size={30}
              />
            </TouchableOpacity>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              position: 'absolute',
              width: '100%',
              height: '100%',
            }}
          >
            <TouchableOpacity
              style={{ flex: 1, width: '100%', height: '100%' }}
              activeOpacity={0.8}
              onPress={() =>
                this.setState({
                  currentImage: (currentImage + 1) % media.length,
                })
              }
            >
              {current && current.type === 'video' ? (
                <View style={{ width: '100%', height: '100%' }}>
                  {this.state.shouldRenderVideo && !this.state.videoError ? (
                    <Video
                      source={{ uri: current.uri }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                      repeat={true}
                      paused={false}
                      muted={true}
                      ignoreSilentSwitch="ignore"
                      playInBackground={false}
                      playWhenInactive={false}
                      useTextureView={false}
                      controls={false}
                      fullscreen={false}
                      onError={() => {
                        console.log('Video failed, showing fallback image');
                        this.setState({ videoError: true });
                      }}
                    />
                  ) : this.state.videoError ? (
                    // Fallback to image if video fails
                    <Image
                      source={{
                        uri:
                          image && image.length > 0
                            ? `https://squibturf-images.s3.amazonaws.com//${image[0]}`
                            : undefined,
                      }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.loadingText}>Loading video...</Text>
                    </View>
                  )}
                </View>
              ) : current ? (
                <Image
                  source={{ uri: current.uri }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : null}
              {media.length > 1 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 72,
                    right: 16,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 10,
                    zIndex: 10,
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 14 }}>
                    {currentImage + 1} / {media.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          {text && (
            <View
              style={{
                width: '100%',
                position: 'absolute',
                bottom: 0,
                zIndex: 999,
              }}
            >
              <Text style={styles.squibText}>&quot; {text} &quot;</Text>
            </View>
          )}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  helperTextCont: {
    zIndex: 999,
    top: '50%',
    position: 'absolute',
    marginTop: -25,
    width: '100%',
  },
  helperText: {
    color: 'white',
    fontSize: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    textAlign: 'center',
    padding: 10,
  },
  squibImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  squibImage: {
    width: '100%',
    height: '100%',
  },
  squibText: {
    padding: 30,
    fontSize: 18,
    width: '100%',
    textAlign: 'center',
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
    borderRadius: 10,
    zIndex: 1000,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    padding: 20,
    borderRadius: 10,
    zIndex: 1000,
    maxWidth: '80%',
  },
  errorText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
  testButton: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  testButtonText: {
    color: 'red',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  imageCounter: {
    position: 'absolute',
    top: 72, // moved further down to avoid notch/status bar
    right: 16, // more padding from the edge
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 10,
  },
  counterText: {
    color: 'white',
    fontSize: 14,
  },
});
