import Geolocation from '@react-native-community/geolocation';
import React, { Component } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  MediaType,
} from 'react-native-image-picker';
import {
  PERMISSIONS,
  Rationale,
  request,
  RESULTS,
} from 'react-native-permissions';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Video from 'react-native-video';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';

const ImportedSquibAPI = require('../api/index');
const SquibAPI = ImportedSquibAPI.default || ImportedSquibAPI;

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
  },
  slideInnerContainer: {
    width: sliderWidth,
    flex: 1,
  },
});

interface CreateSquibADBProps {
  onCapture?: (imagePath: string) => void;
  close?: (status: boolean) => void;
}

interface CreateSquibADBState {
  backCam: boolean;
  pictures: string[];
  latestPic: string | null;
  camera: boolean;
  squib: boolean;
  count: number;
  caption: string | null;
  isLoading: boolean;
  takingPic?: boolean;
  showZoomHint: boolean;
  isRecording: boolean;
  recordingProgress: number;
  recordingTime: number;
  recordedVideoUri: string | null;
  processingType: 'photo' | 'video' | null;
  latestVideo: string | null;
  currentImage: number;
  showTextbox: boolean;
  textboxSlide: Animated.Value;
  locationPermissionGranted: boolean;
}

// VisionCamera wrapper component
const VisionCameraWrapper = ({
  onTakePicture,
  onStartRecording,
  onStopRecording,
  isRecording,
  takingPic,
  backCam,
  onCameraRef,
}: {
  onTakePicture: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  isRecording: boolean;
  takingPic: boolean;
  backCam: boolean;
  onCameraRef: (ref: any) => void;
}) => {
  const { hasPermission, requestPermission } = useCameraPermission();

  // Use the recommended useCameraDevice hook approach
  const device = useCameraDevice(backCam ? 'back' : 'front');

  // Debug: Log the selected device
  console.log('🔍 ANDROID LOCATION DEBUG: backCam state:', backCam);
  console.log('🔍 ANDROID LOCATION DEBUG: Selected device:', device);
  console.log('🔍 ANDROID LOCATION DEBUG: Device position:', device?.position);
  console.log('🔍 ANDROID LOCATION DEBUG: Device ID:', device?.id);

  React.useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  if (!hasPermission) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'black',
        }}
      >
        <Text style={{ color: 'white' }}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!device) {
    console.log(
      '🔍 ANDROID LOCATION DEBUG: No camera device found for position:',
      backCam ? 'back' : 'front'
    );
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'black',
        }}
      >
        <Text style={{ color: 'white' }}>No camera device available</Text>
        <Text style={{ color: 'white', fontSize: 12, marginTop: 10 }}>
          Position: {backCam ? 'back' : 'front'}
        </Text>
      </View>
    );
  }

  console.log('🔍 ANDROID LOCATION DEBUG: Camera device found:', device);

  return (
    <Camera
      ref={onCameraRef}
      style={{ flex: 1 }}
      device={device}
      isActive={true}
      photo={true}
      video={true}
      audio={false}
      onInitialized={() => {
        console.log('🔍 ANDROID LOCATION DEBUG: Camera initialized');
      }}
    />
  );
};

export default class CreateSquibADB extends Component<
  CreateSquibADBProps,
  CreateSquibADBState
> {
  private camera: any = null;
  private api: any;
  private recordingTimer: NodeJS.Timeout | null = null;
  private progressAnimation: Animated.Value = new Animated.Value(0);

  constructor(props: CreateSquibADBProps) {
    super(props);
    this.api = new SquibAPI();
    this.state = {
      backCam: true,
      pictures: [],
      latestPic: null,
      camera: true,
      squib: false,
      count: 5,
      caption: null,
      isLoading: false,
      showZoomHint: true,
      isRecording: false,
      recordingProgress: 0,
      recordingTime: 0,
      recordedVideoUri: null,
      processingType: null,
      latestVideo: null,
      currentImage: 0,
      showTextbox: false,
      textboxSlide: new Animated.Value(0),
      locationPermissionGranted: false,
    };
  }

  async componentDidMount() {
    console.log('🔍 ANDROID LOCATION DEBUG: CreateSquibADB component mounted');

    // Request permissions when component mounts
    await this.requestCameraPermission();
    await this.requestLocationPermission();

    // Add a delay to ensure React Native bridge is fully ready before mounting camera
    setTimeout(() => {
      console.log(
        '🔍 ANDROID LOCATION DEBUG: Component ready for camera mounting'
      );
    }, 2000);

    // Hide zoom hint after 5 seconds
    setTimeout(() => {
      this.setState({ showZoomHint: false });
    }, 5000);
  }

  componentDidUpdate(prevProps: any, prevState: any) {
    // Animate text area when switching to squib mode
    if (!prevState.squib && this.state.squib) {
      Animated.timing(this.state.textboxSlide, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }

    // Auto-advance to squib mode when 5 media items are reached
    const prevTotalCount =
      prevState.pictures.length +
      (prevState.latestPic ? 1 : 0) +
      (prevState.latestVideo ? 1 : 0);
    const currentTotalCount =
      this.state.pictures.length +
      (this.state.latestPic ? 1 : 0) +
      (this.state.latestVideo ? 1 : 0);

    if (prevTotalCount < 5 && currentTotalCount === 5 && !this.state.squib) {
      this.setState({
        camera: false,
        squib: true,
      });
    }
  }

  componentWillUnmount() {
    // Android-specific cleanup
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    this.camera = null;
  }

  // Android-specific location permission request
  async requestLocationPermission(): Promise<boolean> {
    try {
      const permission = PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      const rationale: Rationale = {
        title: 'Location Permission',
        message: 'SquibTurf needs access to your location to tag your squibs.',
        buttonPositive: 'OK',
      };

      const granted = await request(permission, rationale);
      console.log(
        '🔍 ANDROID LOCATION DEBUG: Location permission result:',
        granted
      );

      this.setState({ locationPermissionGranted: granted === RESULTS.GRANTED });
      return granted === RESULTS.GRANTED;
    } catch (error) {
      console.error(
        '🔍 ANDROID LOCATION DEBUG: Location permission error:',
        error
      );
      return false;
    }
  }

  async requestCameraPermission(): Promise<boolean> {
    try {
      const permission = PERMISSIONS.ANDROID.CAMERA;
      const rationale: Rationale = {
        title: 'Camera Permission',
        message:
          'SquibTurf needs access to your camera to take photos for creating squibs.',
        buttonPositive: 'OK',
      };

      const granted = await request(permission, rationale);
      console.log(
        '🔍 ANDROID LOCATION DEBUG: Camera permission result:',
        granted
      );
      return granted === RESULTS.GRANTED;
    } catch (error) {
      console.error(
        '🔍 ANDROID LOCATION DEBUG: Camera permission error:',
        error
      );
      return false;
    }
  }

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const permission = PERMISSIONS.ANDROID.RECORD_AUDIO;
      const rationale: Rationale = {
        title: 'Microphone Permission',
        message:
          'SquibTurf needs access to your microphone to record videos with sound.',
        buttonPositive: 'OK',
      };

      const granted = await request(permission, rationale);
      console.log(
        '🔍 ANDROID LOCATION DEBUG: Microphone permission result:',
        granted
      );
      return granted === RESULTS.GRANTED;
    } catch (error) {
      console.error(
        '🔍 ANDROID LOCATION DEBUG: Microphone permission error:',
        error
      );
      return false;
    }
  }

  // Android-specific location handling with emulator detection
  getCurrentLocation = async (): Promise<{ lon: number; lat: number }> => {
    console.log('🔍 ANDROID LOCATION DEBUG: getCurrentLocation called');

    return new Promise((resolve, reject) => {
      // Try to get actual GPS coordinates
      Geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          console.log('🔍 ANDROID LOCATION DEBUG: Raw GPS coordinates:', {
            longitude,
            latitude,
          });

          const coords = { lon: longitude, lat: latitude };
          console.log(
            '🔍 ANDROID LOCATION DEBUG: Using GPS coordinates:',
            coords
          );
          console.log(
            '🔍 ANDROID LOCATION DEBUG: Final coordinates being sent to API:',
            coords
          );

          resolve(coords);
        },
        error => {
          console.log(
            '🔍 ANDROID LOCATION DEBUG: GPS error:',
            JSON.stringify(error)
          );

          // Fallback to default coordinates if GPS fails
          const fallbackCoords = { lon: -81.5838299, lat: 28.2204699 }; // Orlando coordinates
          console.log(
            '🔍 ANDROID LOCATION DEBUG: Using fallback coordinates:',
            fallbackCoords
          );

          resolve(fallbackCoords);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // 10 second timeout
          maximumAge: 30000, // 30 second maximum age
        }
      );
    });
  };

  takePicture = async () => {
    console.log('🔍 ANDROID LOCATION DEBUG: takePicture called');

    const { pictures, latestVideo } = this.state;
    const totalCount = pictures.length + (latestVideo ? 1 : 0);
    if (totalCount >= 5) {
      console.log('🔍 ANDROID LOCATION DEBUG: Max media count reached');
      return;
    }

    const hasPermission = await this.requestCameraPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Denied',
        'Camera permission is required to take photos.'
      );
      return;
    }

    this.setState({ takingPic: true, processingType: 'photo' });

    try {
      if (!this.camera) {
        throw new Error('Camera is not available');
      }

      if (this.state.isRecording) {
        throw new Error('Cannot take picture while recording');
      }

      // Use VisionCamera's takePhoto method
      const photo = await this.camera.takePhoto({
        qualityPrioritization: 'balanced',
        flash: 'off',
      });

      // Convert path to proper URI for Android
      const photoUri =
        Platform.OS === 'android' ? `file://${photo.path}` : photo.path;

      console.log(
        '🔍 ANDROID LOCATION DEBUG: Photo taken successfully:',
        photoUri
      );
      this.setState({ latestPic: photoUri });
    } catch (err: any) {
      console.error('🔍 ANDROID LOCATION DEBUG: Error taking picture:', err);
      Alert.alert('Error', 'Failed to take picture: ' + (err?.message || err));
    } finally {
      this.setState({ takingPic: false, processingType: null });
    }
  };

  private isRecordingInProgress = false;

  startVideoRecording = async () => {
    console.log('🔍 ANDROID LOCATION DEBUG: startVideoRecording called');

    // Prevent multiple simultaneous calls with a class-level flag
    if (
      this.isRecordingInProgress ||
      this.state.isRecording ||
      this.state.takingPic
    ) {
      console.log(
        '🔍 ANDROID LOCATION DEBUG: Recording already in progress, skipping'
      );
      return;
    }

    const { pictures, latestVideo } = this.state;
    const videoCount =
      pictures.filter(p => p.endsWith('.mp4') || p.endsWith('.mov')).length +
      (latestVideo ? 1 : 0);
    if (videoCount > 0) return;

    const totalCount = pictures.length + (latestVideo ? 1 : 0);
    if (totalCount >= 5) return;

    const cameraPermission = await this.requestCameraPermission();
    if (!cameraPermission) {
      Alert.alert(
        'Permission Denied',
        'Camera permission is required to record videos.'
      );
      return;
    }

    // Set flags immediately to prevent multiple calls
    this.isRecordingInProgress = true;
    this.setState({
      isRecording: true,
      recordingProgress: 0,
      recordingTime: 0,
      processingType: 'video',
    });

    console.log(
      '🔍 ANDROID LOCATION DEBUG: Starting video recording with image-picker'
    );

    try {
      const result = await launchCamera({
        mediaType: 'video',
        videoQuality: 'low',
        durationLimit: 10, // 10 second limit
        saveToPhotos: false,
        includeBase64: false,
      });

      console.log('🔍 ANDROID LOCATION DEBUG: Video recording result:', result);

      if (result.didCancel) {
        console.log('🔍 ANDROID LOCATION DEBUG: Video recording cancelled');
        this.setState({
          isRecording: false,
          recordingProgress: 0,
          recordingTime: 0,
          processingType: null,
        });
        this.isRecordingInProgress = false;
        return;
      }

      if (result.errorCode) {
        console.error(
          '🔍 ANDROID LOCATION DEBUG: Video recording error:',
          result.errorMessage
        );
        Alert.alert('Error', 'Failed to record video: ' + result.errorMessage);
        this.setState({
          isRecording: false,
          recordingProgress: 0,
          recordingTime: 0,
          processingType: null,
        });
        this.isRecordingInProgress = false;
        return;
      }

      if (result.assets && result.assets[0]) {
        const videoAsset = result.assets[0];
        const videoUri = videoAsset.uri;

        if (videoUri) {
          console.log(
            '🔍 ANDROID LOCATION DEBUG: Video recorded successfully:',
            videoUri
          );
          this.setState({
            latestVideo: videoUri,
            isRecording: false,
            recordingProgress: 0,
            recordingTime: 0,
            processingType: null,
          });
        } else {
          console.error('🔍 ANDROID LOCATION DEBUG: No video URI in result');
          Alert.alert('Error', 'Failed to get video file');
        }
      } else {
        console.error('🔍 ANDROID LOCATION DEBUG: No video assets in result');
        Alert.alert('Error', 'No video was recorded');
      }
    } catch (error) {
      console.error(
        '🔍 ANDROID LOCATION DEBUG: Video recording exception:',
        error
      );
      Alert.alert('Error', 'Failed to record video');
    } finally {
      this.isRecordingInProgress = false;
    }
  };

  stopVideoRecording = async () => {
    console.log('🔍 ANDROID LOCATION DEBUG: stopVideoRecording called');

    // Since we're using launchCamera, recording is handled by the native camera app
    // This method is mainly for UI state management
    this.setState({
      isRecording: false,
      recordingProgress: 0,
      recordingTime: 0,
      processingType: null,
    });
    this.isRecordingInProgress = false;

    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }
    this.progressAnimation.stopAnimation();
  };

  onRecordingStart = () => {
    console.log('🔍 ANDROID LOCATION DEBUG: Recording started');
  };

  onRecordingEnd = () => {
    console.log('🔍 ANDROID LOCATION DEBUG: Recording ended');
  };

  triggerClose = (event: any) => {
    this.props.close?.(true);
  };

  _renderItem = ({ item }: { item: string; index: number }) => (
    <View style={styles.slide}>
      <Image
        source={{ uri: item }}
        style={{
          width: '100%',
          height: '100%',
          flex: 1,
          borderRadius: 20,
          overflow: 'hidden',
          resizeMode: 'cover',
        }}
      />
    </View>
  );

  onCapture = ({ image }: { image: { path: string } }) => {
    if (this.props.onCapture) {
      this.props.onCapture(image.path);
    }
  };

  storePic = async () => {
    const { latestPic, pictures, latestVideo } = this.state;
    const totalCount =
      pictures.length + (latestPic ? 1 : 0) + (latestVideo ? 1 : 0);
    if (totalCount > 5) return;

    if (latestPic) {
      const newPictures = Array.isArray(pictures)
        ? pictures.concat(latestPic)
        : [latestPic];
      this.setState({ pictures: newPictures });
    }
  };

  storeVideo = async () => {
    const { latestVideo, pictures } = this.state;
    const videoCount = pictures.filter(
      p => p.endsWith('.mp4') || p.endsWith('.mov')
    ).length;
    if (videoCount > 0 || !latestVideo) return;
    if (pictures.length >= 5) return;

    const newPictures = Array.isArray(pictures)
      ? pictures.concat(latestVideo)
      : [latestVideo];
    this.setState({ pictures: newPictures, latestVideo: null });
  };

  async requestPhotoLibraryPermission(): Promise<boolean> {
    try {
      const permission = PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
      const rationale: Rationale = {
        title: 'Photo Library Permission',
        message:
          'SquibTurf needs access to your photo library to select images for creating squibs.',
        buttonPositive: 'OK',
      };

      const granted = await request(permission, rationale);
      console.log(
        '🔍 ANDROID LOCATION DEBUG: Photo library permission result:',
        granted
      );
      return granted === RESULTS.GRANTED;
    } catch (error) {
      console.error(
        '🔍 ANDROID LOCATION DEBUG: Photo library permission error:',
        error
      );
      return false;
    }
  }

  pickImageFromLibrary = async () => {
    const { pictures, latestVideo } = this.state;
    const currentTotalCount = pictures.length + (latestVideo ? 1 : 0);
    const remainingSlots = 5 - currentTotalCount;
    console.log(
      '🔍 ANDROID LOCATION DEBUG: pickImageFromLibrary - remainingSlots:',
      remainingSlots
    );

    if (remainingSlots === 0) {
      Alert.alert('Limit Reached', 'You can only add up to 5 media items.');
      return;
    }

    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8 as const,
      selectionLimit: remainingSlots,
      includeBase64: false,
    };

    launchImageLibrary(options, response => {
      console.log(
        '🔍 ANDROID LOCATION DEBUG: Image picker response:',
        response
      );

      if (response.didCancel) {
        console.log('🔍 ANDROID LOCATION DEBUG: User cancelled image picker');
        return;
      }

      if (response.errorCode) {
        if (response.errorCode === 'permission') {
          Alert.alert(
            'Permission Denied',
            'Photo library permission is required to select images.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () =>
                  require('react-native-permissions').openSettings(),
              },
            ]
          );
        } else {
          Alert.alert(
            'Error',
            'Failed to pick image: ' + response.errorMessage
          );
        }
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const selectedImages = response.assets
          .map(asset => asset.uri)
          .filter(uri => uri) as string[];

        console.log(
          '🔍 ANDROID LOCATION DEBUG: Selected images:',
          selectedImages
        );

        const imagesToAdd = selectedImages.slice(0, remainingSlots);
        const newPictures = Array.isArray(this.state.pictures)
          ? [...this.state.pictures, ...imagesToAdd]
          : imagesToAdd;

        this.setState(
          {
            pictures: newPictures,
          },
          () => {
            console.log(
              '🔍 ANDROID LOCATION DEBUG: State updated - pictures:',
              this.state.pictures
            );
          }
        );
      }
    });
  };

  handleMediaTap = () => {
    const { pictures, currentImage } = this.state;
    if (pictures.length > 1) {
      this.setState({
        currentImage:
          currentImage !== pictures.length - 1 ? currentImage + 1 : 0,
      });
    }
  };

  showTextboxPanel = () => {
    this.setState({ showTextbox: true }, () => {
      Animated.timing(this.state.textboxSlide, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  };

  deleteCurrentMedia = () => {
    const { pictures, currentImage } = this.state;
    if (pictures.length > 0) {
      const newPictures = pictures.filter((_, index) => index !== currentImage);
      const newCurrentImage =
        newPictures.length > 0
          ? Math.min(currentImage, newPictures.length - 1)
          : 0;

      this.setState({
        pictures: newPictures,
        currentImage: newCurrentImage,
      });
    }
  };

  render() {
    const {
      backCam,
      camera,
      squib,
      latestPic,
      count,
      pictures,
      caption,
      isLoading,
      showZoomHint,
      isRecording,
      recordingProgress,
      recordingTime,
      processingType,
      latestVideo,
    } = this.state;

    console.log('🔍 ANDROID LOCATION DEBUG: RENDER - latestPic:', latestPic);
    console.log(
      '🔍 ANDROID LOCATION DEBUG: RENDER - pictures array:',
      pictures
    );

    const Icon: any = FontAwesome;
    const videoTaken =
      pictures.filter(p => p.endsWith('.mp4') || p.endsWith('.mov')).length >
        0 || latestVideo;
    const videoCount = pictures.filter(
      p => p.endsWith('.mp4') || p.endsWith('.mov')
    ).length;
    const totalCount =
      pictures.length + (latestPic ? 1 : 0) + (latestVideo ? 1 : 0);
    const remaining = 5 - totalCount;

    console.log('🔍 ANDROID LOCATION DEBUG: RENDER - remaining:', remaining);

    return (
      <>
        {squib && (
          <View style={{ backgroundColor: '#44C1AF', flex: 1 }}>
            {totalCount < 5 && (
              <View
                style={{
                  height: 50,
                  width: 50,
                  position: 'absolute',
                  top: 30,
                  left: 25,
                  zIndex: 999,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    this.setState({
                      camera: !camera,
                      squib: !squib,
                    });
                  }}
                >
                  <Icon
                    name="arrow-left"
                    style={{ marginTop: 10 }}
                    color={'white'}
                    size={30}
                  />
                </TouchableOpacity>
              </View>
            )}
            <View
              style={{
                flex: 1,
                backgroundColor: pictures.length > 0 ? 'black' : '#44C1AF',
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100%',
                  height: '100%',
                }}
                activeOpacity={1}
                onPress={this.handleMediaTap}
                onLongPress={this.showTextboxPanel}
              >
                {(() => {
                  const currentAsset = pictures[this.state.currentImage];
                  console.log(
                    '🔍 ANDROID LOCATION DEBUG: RENDER - currentAsset:',
                    currentAsset
                  );

                  if (
                    currentAsset &&
                    (currentAsset.endsWith('.mp4') ||
                      currentAsset.endsWith('.mov'))
                  ) {
                    return (
                      <Video
                        source={{ uri: currentAsset }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                        repeat
                        paused={false}
                        muted
                      />
                    );
                  } else if (currentAsset) {
                    return (
                      <Image
                        source={{ uri: currentAsset }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    );
                  } else {
                    return (
                      <View
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: '#44C1AF',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: 'white', fontSize: 18 }}>
                          No image selected
                        </Text>
                      </View>
                    );
                  }
                })()}

                {this.state.pictures.length > 1 && (
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
                      {this.state.currentImage + 1} /{' '}
                      {this.state.pictures.length}
                    </Text>
                  </View>
                )}

                {this.state.pictures.length > 0 && (
                  <TouchableOpacity
                    onPress={this.deleteCurrentMedia}
                    style={{
                      position: 'absolute',
                      bottom: 250,
                      left: '50%',
                      marginLeft: -70,
                      zIndex: 10,
                      backgroundColor: 'rgba(255, 0, 0, 0.8)',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                    }}
                  >
                    <Text
                      style={{
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: 16,
                      }}
                    >
                      Delete Media
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999,
                }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
              >
                <Animated.View
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    padding: 20,
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    transform: [
                      {
                        translateY: this.state.textboxSlide.interpolate({
                          inputRange: [0, 1],
                          outputRange: [300, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <TextInput
                    multiline
                    placeholder="Write a post..."
                    placeholderTextColor="#333"
                    style={{ color: '#222', fontSize: 20, minHeight: 80 }}
                    onChangeText={text => this.setState({ caption: text })}
                    value={this.state.caption || ''}
                  />
                  <TouchableOpacity
                    onPress={async () => {
                      const loc = await this.getCurrentLocation();
                      Keyboard.dismiss();
                      this.setState({ isLoading: true });
                      await this.api.postNewSquib(
                        this.state.pictures,
                        this.state.caption,
                        loc.lon,
                        loc.lat
                      );
                      this.setState({ isLoading: false });
                      this.props.close?.(true);
                    }}
                    style={{
                      backgroundColor: '#44C1AF',
                      borderRadius: 30,
                      padding: 12,
                      alignItems: 'center',
                      marginTop: 20,
                    }}
                  >
                    <Text
                      style={{
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: 18,
                      }}
                    >
                      Post
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </KeyboardAvoidingView>
            </View>
          </View>
        )}

        {latestPic && (
          <View
            style={{
              flex: 1,
              position: 'absolute',
              zIndex: 1000,
              height: '100%',
              width: '100%',
            }}
          >
            <View
              style={{
                height: 50,
                width: 50,
                position: 'absolute',
                top: 30,
                left: 25,
                zIndex: 1002,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  this.setState({ takingPic: false, latestPic: null });
                  this.props.close?.(true);
                }}
              >
                <Icon
                  name="times"
                  style={{ marginTop: 10 }}
                  color={'white'}
                  size={30}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => {
                this.setState({ takingPic: false, latestPic: null });
              }}
              style={{
                position: 'absolute',
                zIndex: 1001,
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: 25,
                height: 50,
                width: 120,
                left: 20,
                bottom: 50,
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
              }}
            >
              <Icon
                name="refresh"
                style={{ marginRight: 8 }}
                color={'white'}
                size={20}
              />
              <Text
                style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}
              >
                Retake
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                this.setState({ takingPic: false, latestPic: null });
                this.storePic();
              }}
              style={{
                position: 'absolute',
                zIndex: 1001,
                backgroundColor: '#44C1AF',
                borderRadius: 25,
                height: 50,
                width: 140,
                right: 20,
                bottom: 50,
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
              }}
            >
              <Icon
                name="check"
                style={{ marginRight: 8 }}
                color={'white'}
                size={20}
              />
              <Text
                style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}
              >
                Use Photo
              </Text>
            </TouchableOpacity>
            <Image
              source={{ uri: latestPic }}
              style={{ height: '100%', width: '100%' }}
            />
          </View>
        )}

        {latestVideo && (
          <View
            style={{
              flex: 1,
              position: 'absolute',
              zIndex: 1000,
              height: '100%',
              width: '100%',
              backgroundColor: 'black',
            }}
          >
            <View
              style={{
                height: 50,
                width: 50,
                position: 'absolute',
                top: 35,
                right: 25,
                zIndex: 1002,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  this.setState({ isRecording: false, latestVideo: null });
                  this.props.close?.(true);
                }}
              >
                <Icon
                  name="times"
                  style={{ marginTop: 10 }}
                  color={'white'}
                  size={30}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => {
                this.setState({ isRecording: false, latestVideo: null });
              }}
              style={{
                position: 'absolute',
                zIndex: 1001,
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: 25,
                height: 50,
                width: 120,
                left: 20,
                bottom: 50,
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
              }}
            >
              <Icon
                name="refresh"
                style={{ marginRight: 8 }}
                color={'white'}
                size={20}
              />
              <Text
                style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}
              >
                Retake
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                this.setState({ isRecording: false, latestVideo: null });
                this.storeVideo();
              }}
              style={{
                position: 'absolute',
                zIndex: 1001,
                backgroundColor: '#44C1AF',
                borderRadius: 25,
                height: 50,
                width: 140,
                right: 20,
                bottom: 50,
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
              }}
            >
              <Icon
                name="check"
                style={{ marginRight: 8 }}
                color={'white'}
                size={20}
              />
              <Text
                style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}
              >
                Use Video
              </Text>
            </TouchableOpacity>
            <View
              style={{
                position: 'absolute',
                top: 100,
                left: 0,
                right: 0,
                alignItems: 'center',
                zIndex: 1001,
              }}
            >
              <Text
                style={{
                  color: 'white',
                  fontSize: 18,
                  fontWeight: 'bold',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}
              >
                Video Preview
              </Text>
            </View>
            <Video
              source={{ uri: latestVideo }}
              style={{ flex: 1, width: '100%', height: '100%' }}
              resizeMode="cover"
              repeat={true}
              paused={false}
              muted={true}
            />
          </View>
        )}

        {camera && !latestPic && (
          <>
            <View
              style={{
                height: 50,
                width: 50,
                position: 'absolute',
                top: 30,
                right: 10,
                zIndex: 999,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  this.setState({
                    camera: !camera,
                    squib: !squib,
                  });
                }}
              >
                <Icon
                  name="arrow-right"
                  style={{ marginTop: 10 }}
                  color={'white'}
                  size={30}
                />
              </TouchableOpacity>
            </View>

            <View
              style={{
                position: 'absolute',
                top: 48,
                right: 80,
                zIndex: 999,
              }}
            >
              <Text
                style={{
                  color: 'white',
                  fontSize: 12,
                  fontWeight: '500',
                  opacity: 0.9,
                  textAlign: 'right',
                }}
              >
                {pictures.length > 0 || latestVideo
                  ? '💡 Done? Next, add text'
                  : '💡 Skip media, just add text'}
              </Text>
            </View>

            <View
              style={{
                height: 50,
                width: 50,
                position: 'absolute',
                top: 30,
                left: 25,
                zIndex: 999,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  this.props.close?.(true);
                }}
              >
                <Icon
                  name="times"
                  style={{ marginTop: 10 }}
                  color={'white'}
                  size={30}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.container}>
              {remaining > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    zIndex: 1000,
                    left: '50%',
                    top: '50%',
                    marginTop: -100,
                    marginLeft: -50,
                    opacity: 0.5,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 150,
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  >
                    {remaining}
                  </Text>
                  <Text
                    style={{
                      color: 'white',
                      fontWeight: 'bold',
                      marginLeft: -20,
                    }}
                  >
                    Media Remaining
                  </Text>
                  {remaining === 0 && (
                    <Text
                      style={{
                        color: 'white',
                        fontWeight: 'bold',
                        marginLeft: -25,
                        marginTop: 10,
                      }}
                    >
                      Proceed to Next Step
                    </Text>
                  )}
                </View>
              )}

              {!latestPic && (
                <VisionCameraWrapper
                  onTakePicture={this.takePicture}
                  onStartRecording={this.startVideoRecording}
                  onStopRecording={this.stopVideoRecording}
                  isRecording={this.state.isRecording}
                  takingPic={this.state.takingPic || false}
                  backCam={this.state.backCam}
                  onCameraRef={ref => {
                    this.camera = ref;
                  }}
                />
              )}

              {showZoomHint && (
                <View
                  style={{
                    position: 'absolute',
                    top: 120,
                    left: 0,
                    right: 0,
                    alignItems: 'center',
                    zIndex: 1001,
                  }}
                >
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 16,
                      fontWeight: 'bold',
                      textAlign: 'center',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      paddingHorizontal: 15,
                      paddingVertical: 8,
                      borderRadius: 20,
                    }}
                  >
                    Pinch to zoom
                  </Text>
                </View>
              )}

              <View
                style={{
                  position: 'absolute',
                  bottom: 180,
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                  zIndex: 1001,
                }}
              >
                <View
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Icon
                    name="camera"
                    color="white"
                    size={16}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 14,
                      fontWeight: 'bold',
                      marginRight: 15,
                    }}
                  >
                    Tap for photo
                  </Text>
                  <Icon
                    name="video-camera"
                    color="white"
                    size={16}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}
                  >
                    Tap for video
                  </Text>
                </View>
              </View>

              {count > 0 && (
                <>
                  <TouchableOpacity
                    style={{ position: 'absolute', bottom: 45, right: 45 }}
                    onPress={() => {
                      console.log(
                        '🔍 ANDROID LOCATION DEBUG: Camera flip button pressed'
                      );
                      console.log(
                        '🔍 ANDROID LOCATION DEBUG: Current backCam state:',
                        backCam
                      );
                      console.log(
                        '🔍 ANDROID LOCATION DEBUG: Changing backCam to:',
                        !backCam
                      );
                      this.setState({ backCam: !backCam });
                    }}
                  >
                    <Icon
                      name="undo"
                      style={{ marginTop: 10 }}
                      color={'white'}
                      size={40}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ position: 'absolute', bottom: 45, left: 25 }}
                    onPress={this.pickImageFromLibrary}
                  >
                    <Icon
                      name="image"
                      style={{ marginTop: 10 }}
                      color={'white'}
                      size={40}
                    />
                  </TouchableOpacity>

                  <View
                    style={{
                      position: 'absolute',
                      bottom: 30,
                      left: 0,
                      right: 0,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 30,
                    }}
                  >
                    {/* Photo Button */}
                    <TouchableOpacity
                      style={{
                        height: 70,
                        width: 70,
                        borderRadius: 100,
                        backgroundColor: '#44C1AF',
                        borderWidth: 4,
                        borderColor: 'white',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={this.takePicture}
                      disabled={isRecording}
                    >
                      <Icon name="camera" color="white" size={25} />
                    </TouchableOpacity>

                    {/* Video Button */}
                    <TouchableOpacity
                      style={{
                        height: 70,
                        width: 70,
                        borderRadius: 100,
                        backgroundColor: isRecording ? '#ff4444' : '#44C1AF',
                        borderWidth: 4,
                        borderColor: 'white',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => {
                        console.log(
                          '🔍 ANDROID LOCATION DEBUG: Video button pressed, isRecording:',
                          this.state.isRecording
                        );
                        if (this.state.isRecording) {
                          this.stopVideoRecording();
                        } else {
                          this.startVideoRecording();
                        }
                      }}
                    >
                      <Icon
                        name={isRecording ? 'stop' : 'video-camera'}
                        color="white"
                        size={25}
                      />
                    </TouchableOpacity>

                    {/* Recording Progress Ring */}
                    {isRecording && (
                      <View
                        style={{
                          position: 'absolute',
                          top: -50,
                          left: '50%',
                          marginLeft: -45,
                          width: 90,
                          height: 90,
                          borderRadius: 45,
                          borderWidth: 3,
                          borderColor: 'rgba(255, 68, 68, 0.3)',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Animated.View
                          style={{
                            position: 'absolute',
                            width: 84,
                            height: 84,
                            borderRadius: 42,
                            borderWidth: 3,
                            borderColor: 'transparent',
                            borderTopColor: '#ff4444',
                            transform: [
                              {
                                rotate: this.progressAnimation.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: ['0deg', '360deg'],
                                }),
                              },
                            ],
                          }}
                        />
                      </View>
                    )}

                    {/* Recording Timer */}
                    {isRecording && (
                      <View
                        style={{
                          position: 'absolute',
                          top: -80,
                          left: '50%',
                          marginLeft: -30,
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 15,
                        }}
                      >
                        <Text
                          style={{
                            color: 'white',
                            fontSize: 14,
                            fontWeight: 'bold',
                          }}
                        >
                          {recordingTime.toFixed(1)}s
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>
          </>
        )}

        {camera && latestPic && (
          <>
            <View
              style={{
                height: 50,
                width: 50,
                position: 'absolute',
                top: 60,
                right: 10,
                zIndex: 999,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  this.setState({
                    camera: !camera,
                    squib: !squib,
                  });
                }}
              >
                <Icon
                  name="arrow-right"
                  style={{ marginTop: 10 }}
                  color={'white'}
                  size={30}
                />
              </TouchableOpacity>
            </View>

            <View
              style={{
                height: 50,
                width: 50,
                position: 'absolute',
                top: 60,
                left: 25,
                zIndex: 999,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  this.props.close?.(true);
                }}
              >
                <Icon
                  name="times"
                  style={{ marginTop: 10 }}
                  color={'white'}
                  size={30}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.container}>
              <Image
                source={{ uri: latestPic }}
                style={{
                  flex: 1,
                  width: '100%',
                  height: '100%',
                }}
                resizeMode="cover"
                onError={error =>
                  console.error(
                    '🔍 ANDROID LOCATION DEBUG: Image loading error:',
                    error
                  )
                }
                onLoad={() =>
                  console.log(
                    '🔍 ANDROID LOCATION DEBUG: Image loaded successfully'
                  )
                }
              />

              <View
                style={{
                  position: 'absolute',
                  bottom: 30,
                  left: 0,
                  right: 0,
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                }}
              >
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    paddingHorizontal: 15,
                    paddingVertical: 10,
                    borderRadius: 20,
                  }}
                  onPress={() => {
                    this.setState({ latestPic: null });
                  }}
                >
                  <Icon
                    name="refresh"
                    color="white"
                    size={16}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}
                  >
                    Retake
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    height: 80,
                    width: 80,
                    borderRadius: 100,
                    backgroundColor: '#44C1AF',
                    borderWidth: 5,
                    borderColor: 'white',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={this.takePicture}
                >
                  <Icon name="camera" color="white" size={30} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#44C1AF',
                    paddingHorizontal: 15,
                    paddingVertical: 10,
                    borderRadius: 20,
                  }}
                  onPress={this.storePic}
                >
                  <Icon
                    name="check"
                    color="white"
                    size={16}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}
                  >
                    Use Photo
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {isLoading && (
          <View
            style={{
              height: '100%',
              width: '100%',
              backgroundColor: 'rgba(0,0,0, 0.2)',
              position: 'absolute',
              zIndex: 1000,
              flex: 1,
              top: 0,
            }}
          >
            <View
              style={{
                height: 150,
                width: 150,
                backgroundColor: 'white',
                borderRadius: 10,
                left: '50%',
                marginLeft: -75,
                top: '50%',
                marginTop: -75,
              }}
            >
              <Icon
                name="paper-plane"
                color="#44C1AF"
                size={40}
                style={{ marginTop: 35, marginLeft: 55 }}
              />
              <Text
                style={{
                  color: '#44C1AF',
                  marginTop: 20,
                  marginLeft: 25,
                  textAlign: 'center',
                  width: 100,
                }}
              >
                Posting...
              </Text>
            </View>
          </View>
        )}
      </>
    );
  }
}
