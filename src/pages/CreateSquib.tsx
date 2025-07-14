import React, { Component } from 'react';
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    Alert,
    Image,
    TextInput,
    Dimensions,
    KeyboardAvoidingView,
    Keyboard,
    Platform,
    Animated,
    PanResponder
} from 'react-native';
import Video from 'react-native-video';
import { RNCamera } from 'react-native-camera';
import Carousel from 'react-native-snap-carousel';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Geolocation from '@react-native-community/geolocation';
import { request, PERMISSIONS, RESULTS, Permission, Rationale } from 'react-native-permissions';
import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';

const ImportedSquibAPI = require("../api/index");
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
        backgroundColor: 'black'
    },
    slide: {
        width: Dimensions.get('window').width / 1.5,
        height: Dimensions.get('window').height / 1.5,
        paddingHorizontal: horizontalMargin,
        top: '15%',
    },
    slideInnerContainer: {
        width: sliderWidth,
        flex: 1
    }
});

interface CreateSquibProps {
    onCapture?: (imagePath: string) => void;
    close?: (status: boolean) => void;
}

interface CreateSquibState {
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
}

export default class CreateSquib extends Component<CreateSquibProps, CreateSquibState> {
    private camera: RNCamera | null = null;
    private api: any;
    private recordingTimer: NodeJS.Timeout | null = null;
    private progressAnimation: Animated.Value = new Animated.Value(0);

    constructor(props: CreateSquibProps) {
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
        };
    }

    async componentDidMount() {
        // Request camera permission when component mounts
        await this.requestCameraPermission();
        
        // Hide zoom hint after 5 seconds
        setTimeout(() => {
            this.setState({ showZoomHint: false });
        }, 5000);
    }

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
        // Only allow up to 5 total media assets
        const videoCount = pictures.filter(p => p.endsWith('.mp4') || p.endsWith('.mov')).length + (latestVideo ? 1 : 0);
        const totalCount = pictures.length + (latestPic ? 1 : 0) + (latestVideo ? 1 : 0);
        if (totalCount >= 5) return;
        if (latestPic) {
            const newPictures = Array.isArray(pictures) ? pictures.concat(latestPic) : [latestPic];
            this.setState({ pictures: newPictures });
        }
    };

    storeVideo = async () => {
        const { latestVideo, pictures } = this.state;
        // Only allow one video in total
        const videoCount = pictures.filter(p => p.endsWith('.mp4') || p.endsWith('.mov')).length;
        if (videoCount > 0 || !latestVideo) return;
        // Only allow up to 5 total media assets
        if (pictures.length >= 5) return;
        const newPictures = Array.isArray(pictures) ? pictures.concat(latestVideo) : [latestVideo];
        this.setState({ pictures: newPictures, latestVideo: null });
    };

    takePicture = async () => {
        const { pictures, latestVideo } = this.state;
        // Only allow up to 5 total media assets
        const videoCount = pictures.filter(p => p.endsWith('.mp4') || p.endsWith('.mov')).length + (latestVideo ? 1 : 0);
        const totalCount = pictures.length + (latestVideo ? 1 : 0);
        if (totalCount >= 5) return;
        if (this.camera && !this.state.takingPic && !this.state.isRecording) {
            // Request camera permission first
            const hasPermission = await this.requestCameraPermission();
            if (!hasPermission) {
                Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
                return;
            }

            this.setState({ takingPic: true, processingType: 'photo' });
            try {
                const data = await this.camera.takePictureAsync({
                    quality: 0.1,
                    fixOrientation: true,
                    forceUpOrientation: true,
                    base64: true
                });
                this.setState({ latestPic: data.uri });
            } catch (err: any) {
                Alert.alert('Error', 'Failed to take picture: ' + (err?.message || err));
            } finally {
                this.setState({ takingPic: false, processingType: null });
            }
        }
    };

    startVideoRecording = async () => {
        const { pictures, latestVideo } = this.state;
        // Only allow one video in total
        const videoCount = pictures.filter(p => p.endsWith('.mp4') || p.endsWith('.mov')).length + (latestVideo ? 1 : 0);
        if (videoCount > 0) return;
        // Only allow up to 5 total media assets
        const totalCount = pictures.length + (latestVideo ? 1 : 0);
        if (totalCount >= 5) return;
        if (this.camera && !this.state.isRecording && !this.state.takingPic) {
            const hasPermission = await this.requestCameraPermission();
            if (!hasPermission) {
                Alert.alert('Permission Denied', 'Camera permission is required to record videos.');
                return;
            }

            try {
                this.setState({ 
                    isRecording: true, 
                    recordingProgress: 0, 
                    recordingTime: 0,
                    processingType: 'video'
                });
                
                // Start progress animation
                this.progressAnimation.setValue(0);
                Animated.timing(this.progressAnimation, {
                    toValue: 1,
                    duration: 10000, // 10 seconds
                    useNativeDriver: false
                }).start();

                // Start recording timer
                this.recordingTimer = setInterval(() => {
                    this.setState(prevState => ({
                        recordingTime: prevState.recordingTime + 0.1,
                        recordingProgress: Math.min((prevState.recordingTime + 0.1) / 10, 1)
                    }));
                }, 100);

                // Start video recording with optimized settings for GIF conversion
                const options = {
                    quality: RNCamera.Constants.VideoQuality['288p'], // Lowest available quality for smaller file
                    maxDuration: 10,
                    maxFileSize: 10 * 1024 * 1024, // 10MB limit
                    mute: false,
                    codec: RNCamera.Constants.VideoCodec.H264 // Standard codec for better compatibility
                };

                const recordingPromise = this.camera.recordAsync(options);
                
                // Auto-stop after 10 seconds
                setTimeout(() => {
                    this.stopVideoRecording();
                }, 10000);

                // Wait for recording to complete and get the video URI
                const videoData = await recordingPromise;
                console.log('Video recording completed:', videoData);
                console.log('Video URI:', videoData.uri);
                this.setState({ latestVideo: videoData.uri });

            } catch (err: any) {
                Alert.alert('Error', 'Failed to start recording: ' + (err?.message || err));
                this.setState({ isRecording: false });
            }
        }
    };

    stopVideoRecording = async () => {
        if (this.camera && this.state.isRecording) {
            try {
                // Stop recording
                this.camera.stopRecording();
                this.setState({ isRecording: false });
                
                // Clear timer and animation
                if (this.recordingTimer) {
                    clearInterval(this.recordingTimer);
                    this.recordingTimer = null;
                }
                this.progressAnimation.stopAnimation();
                

                
            } catch (error) {
                console.error('Error stopping recording:', error);
                this.setState({ isRecording: false });
                Alert.alert('Error', 'Failed to save video recording');
            }
        }
    };

    onRecordingStart = () => {
        console.log('Recording started');
    };

    onRecordingEnd = () => {
        console.log('Recording ended');
        // The video URI will be available in the recording data
        // We'll handle it in the stopVideoRecording method
    };



    triggerClose = (event: any) => {
        this.props.close?.(true);
    };

    async requestCameraPermission(): Promise<boolean> {
        let permission: Permission | undefined;

        if (Platform.OS === 'android') {
            permission = PERMISSIONS.ANDROID.CAMERA;
        } else if (Platform.OS === 'ios') {
            permission = PERMISSIONS.IOS.CAMERA;
        }

        if (!permission) {
            console.log('Unsupported platform for camera permission');
            return false;
        }

        const rationale: Rationale = {
            title: 'Camera Permission',
            message: 'SquibTurf needs access to your camera to take photos for creating squibs.',
            buttonPositive: 'OK',
        };

        const granted = await request(permission, rationale);
        console.log('Camera permission granted:', granted);
        return granted === RESULTS.GRANTED;
    }

    async requestPhotoLibraryPermission(): Promise<boolean> {
        let permission: Permission | undefined;

        if (Platform.OS === 'android') {
            permission = PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
        } else if (Platform.OS === 'ios') {
            permission = PERMISSIONS.IOS.PHOTO_LIBRARY;
        }

        if (!permission) {
            console.log('Unsupported platform for photo library permission');
            return false;
        }

        const rationale: Rationale = {
            title: 'Photo Library Permission',
            message: 'SquibTurf needs access to your photo library to select images for creating squibs.',
            buttonPositive: 'OK',
        };

        const granted = await request(permission, rationale);
        console.log('Photo library permission granted:', granted);
        return granted === RESULTS.GRANTED;
    }

    pickImageFromLibrary = async () => {
        const options = {
            mediaType: 'photo' as MediaType,
            quality: 0.8 as const,
            selectionLimit: this.state.count,
            includeBase64: false,
        };

        launchImageLibrary(options, (response) => {
            if (response.didCancel) {
                console.log('User cancelled image picker');
                return;
            }
            if (response.errorCode) {
                if (response.errorCode === 'permission') {
                    Alert.alert(
                        'Permission Denied',
                        'Photo library permission is required to select images.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open Settings', onPress: () => require('react-native-permissions').openSettings() }
                        ]
                    );
                } else {
                    Alert.alert('Error', 'Failed to pick image: ' + response.errorMessage);
                }
                return;
            }
            if (response.assets && response.assets.length > 0) {
                const selectedImages = response.assets.map(asset => asset.uri).filter(uri => uri) as string[];
                const pictures = Array.isArray(this.state.pictures) ? this.state.pictures.concat(selectedImages) : selectedImages;
                const newCount = Math.max(0, this.state.count - selectedImages.length);
                this.setState({ 
                    pictures, 
                    count: newCount 
                });
            }
        });
    };

    getCurrentLocation = async (): Promise<{ lon: number, lat: number }> => {
        return new Promise((resolve, reject) => {
            Geolocation.getCurrentPosition(
                position => {
                    const { latitude, longitude } = position.coords;
                    resolve({ lon: longitude, lat: latitude });
                },
                error => {
                    console.log("Error: ", JSON.stringify(error));
                    reject(error);
                },
                { enableHighAccuracy: true, timeout: 3000, maximumAge: 1000 }
            );
        });
    };

    handleMediaTap = () => {
        const { pictures, currentImage } = this.state;
        if (pictures.length > 1) {
            this.setState({
                currentImage: currentImage !== pictures.length - 1 ? currentImage + 1 : 0
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
            latestVideo
        } = this.state;
        const Icon: any = FontAwesome;
        const videoTaken = pictures.filter(p => p.endsWith('.mp4') || p.endsWith('.mov')).length > 0 || latestVideo;
        const videoCount = pictures.filter(p => p.endsWith('.mp4') || p.endsWith('.mov')).length;
        const totalCount = pictures.length + (latestVideo ? 1 : 0);
        const remaining = 5 - totalCount;
        return (
            <>
                {squib &&
                    <View style={{
                        backgroundColor: '#44C1AF',
                        flex: 1
                    }}>
                        {/* For squib (left arrow) */}
                        <View style={{
                            height: 50,
                            width: 50,
                            position: 'absolute',
                            top: 60, // ensure consistent distance from top
                            left: 25,
                            zIndex: 999
                        }}>
                            <TouchableOpacity
                                onPress={() => {
                                    this.setState({
                                        camera: !camera,
                                        squib: !squib,
                                    })
                                }}
                                style={{}}>
                                <Icon name="arrow-left" style={{ marginTop: 10 }} color={'white'} size={30} />
                            </TouchableOpacity>
                        </View>
                        {/* Removed the absolutely positioned Post button from the top right */}
                        {/* Removed the old textbox and post button from the main view (inside render)
                            Only keep the animated sliding textbox panel for text entry */}
                        {/* <View style={{ alignItems: 'center', marginTop: 200 }}>
                            <TouchableOpacity
                                onPress={async () => {
                                    const loc = await this.getCurrentLocation();
                                    Keyboard.dismiss();
                                    this.setState({ isLoading: true });
                                    await this.api.postNewSquib(this.state.pictures, this.state.caption, loc.lon, loc.lat);
                                    this.setState({ isLoading: false });
                                    this.props.close?.(true);
                                }}
                                style={{
                                    backgroundColor: '#fff',
                                    borderRadius: 30,
                                    padding: 12,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    shadowColor: '#000',
                                    shadowOpacity: 0.1,
                                    shadowRadius: 4,
                                    elevation: 2,
                                    width: 60,
                                    height: 60
                                }}
                            >
                                <Icon name="paper-plane" color="#44C1AF" size={30} />
                            </TouchableOpacity>
                        </View> */}
                            {/* Always render the media (image/video) in the background, regardless of showTextbox */}
                            <View style={{ flex: 1, backgroundColor: 'black' }}>
                                <TouchableOpacity
                                    style={{ flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
                                    activeOpacity={1}
                                    onPress={this.handleMediaTap}
                                    onLongPress={this.showTextboxPanel}
                                >
                                    {(() => {
  const currentAsset = pictures[this.state.currentImage];
  if (currentAsset && (currentAsset.endsWith('.mp4') || currentAsset.endsWith('.mov'))) {
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
  }
  return null;
})()}
                                    {this.state.pictures.length > 1 && (
                                        <View style={{ position: 'absolute', top: 72, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, zIndex: 10 }}>
                                            <Text style={{ color: 'white', fontSize: 14 }}>{this.state.currentImage + 1} / {this.state.pictures.length}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                                {/* Add Text button at the bottom, always interactive if textbox is not open */}
                                {!this.state.showTextbox && (
                                    <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center', zIndex: 20 }}>
                                        <TouchableOpacity onPress={this.showTextboxPanel} style={{ backgroundColor: '#44C1AF', borderRadius: 20, padding: 12, minWidth: 120, alignItems: 'center' }}>
                                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Add Text</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                {/* Animated Textbox Panel overlays on top of the media */}
                                {this.state.showTextbox && (
                                    <KeyboardAvoidingView
                                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                                        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 999 }}
                                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                                    >
                                        <Animated.View
                                            style={{
                                                backgroundColor: 'rgba(255,255,255,0.95)',
                                                padding: 20,
                                                borderTopLeftRadius: 20,
                                                borderTopRightRadius: 20,
                                                transform: [{ translateY: this.state.textboxSlide.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }) }],
                                                display: this.state.showTextbox ? 'flex' : 'none',
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
                                                    await this.api.postNewSquib(this.state.pictures, this.state.caption, loc.lon, loc.lat);
                                                    this.setState({ isLoading: false });
                                                    this.props.close?.(true);
                                                }}
                                                style={{ backgroundColor: '#44C1AF', borderRadius: 30, padding: 12, alignItems: 'center', marginTop: 20 }}
                                            >
                                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Post</Text>
                                            </TouchableOpacity>
                                        </Animated.View>
                                    </KeyboardAvoidingView>
                                )}
                            </View>
                        
                    </View>
                }

                {latestPic &&
                    <View style={{
                        flex: 1,
                        position: 'absolute',
                        zIndex: 1000,
                        height: '100%',
                        width: '100%',
                    }}>
                        <View style={{
                            height: 50,
                            width: 50,
                            position: 'absolute',
                            top: 35,
                            right: 25,
                            zIndex: 1002
                        }}>
                            <TouchableOpacity
                                onPress={() => {
                                    this.setState({ takingPic: false, latestPic: null });
                                    this.props.close?.(true);
                                }}
                                style={{}}>
                                <Icon name="times" style={{ marginTop: 10 }} color={'white'} size={30} />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            onPress={() => {
                                this.setState({ takingPic: false, latestPic: null });
                                this.storePic();
                            }}
                            style={{
                                position: 'absolute',
                                zIndex: 1001,
                                borderWidth: 8,
                                borderColor: 'white',
                                borderRadius: 200,
                                height: 150,
                                width: 150,
                                left: '50%',
                                top: '50%',
                                marginLeft: -75,
                                marginTop: -200,
                                opacity: 0.5
                            }}>
                            <Icon name="check" style={{ marginTop: 15, marginLeft: 15 }} color={'white'} size={100} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                this.setState({ takingPic: false, latestPic: null });
                            }}
                            style={{
                                position: 'absolute',
                                zIndex: 1001,
                                borderWidth: 8,
                                borderColor: 'white',
                                borderRadius: 200,
                                height: 150,
                                width: 150,
                                left: '50%',
                                top: '50%',
                                marginLeft: -75,
                                marginTop: 50,
                                opacity: 0.5
                            }}>
                            <Icon name="times" style={{ marginTop: 10, marginLeft: 28 }} color={'white'} size={100} />
                        </TouchableOpacity>
                        <Image
                            source={{ uri: latestPic }}
                            style={{
                                height: '100%',
                                width: '100%'
                            }}
                        />
                    </View>
                }

                {latestVideo &&
                    <View style={{
                        flex: 1,
                        position: 'absolute',
                        zIndex: 1000,
                        height: '100%',
                        width: '100%',
                        backgroundColor: 'black'
                    }}>
                        <View style={{
                            height: 50,
                            width: 50,
                            position: 'absolute',
                            top: 35,
                            right: 25,
                            zIndex: 1002
                        }}>
                            <TouchableOpacity
                                onPress={() => {
                                    this.setState({ isRecording: false, latestVideo: null });
                                    this.props.close?.(true);
                                }}
                                style={{}}>
                                <Icon name="times" style={{ marginTop: 10 }} color={'white'} size={30} />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            onPress={() => {
                                this.setState({ isRecording: false, latestVideo: null });
                                this.storeVideo();
                            }}
                            style={{
                                position: 'absolute',
                                zIndex: 1001,
                                borderWidth: 8,
                                borderColor: 'white',
                                borderRadius: 200,
                                height: 150,
                                width: 150,
                                left: '50%',
                                top: '50%',
                                marginLeft: -75,
                                marginTop: -200,
                                opacity: 0.5
                            }}>
                            <Icon name="check" style={{ marginTop: 15, marginLeft: 15 }} color={'white'} size={100} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                this.setState({ isRecording: false, latestVideo: null });
                            }}
                            style={{
                                position: 'absolute',
                                zIndex: 1001,
                                borderWidth: 8,
                                borderColor: 'white',
                                borderRadius: 200,
                                height: 150,
                                width: 150,
                                left: '50%',
                                top: '50%',
                                marginLeft: -75,
                                marginTop: 50,
                                opacity: 0.5
                            }}>
                            <Icon name="times" style={{ marginTop: 10, marginLeft: 28 }} color={'white'} size={100} />
                        </TouchableOpacity>
                        <View style={{
                            position: 'absolute',
                            top: 100,
                            left: 0,
                            right: 0,
                            alignItems: 'center',
                            zIndex: 1001
                        }}>
                            <Text style={{
                                color: 'white',
                                fontSize: 18,
                                fontWeight: 'bold',
                                backgroundColor: 'rgba(0,0,0,0.7)',
                                paddingHorizontal: 15,
                                paddingVertical: 8,
                                borderRadius: 20
                            }}>
                                Video Preview
                            </Text>
                        </View>
                        <Video
                            source={{ uri: latestVideo }}
                            style={{
                                flex: 1,
                                width: '100%',
                                height: '100%'
                            }}
                            resizeMode="cover"
                            repeat={true}
                            paused={false}
                            muted={true}
                        />
                    </View>
                }

                {camera &&
                    <>
                        {/* For camera (right arrow) */}
                        <View style={{
                            height: 50,
                            width: 50,
                            position: 'absolute',
                            top: 60, // ensure consistent distance from top
                            right: 10, // previously moved from 25 to 10
                            zIndex: 999
                        }}>
                            <TouchableOpacity
                                onPress={() => {
                                    this.setState({
                                        camera: !camera,
                                        squib: !squib,
                                    })
                                }}
                                style={{}}>
                                <Icon name="arrow-right" style={{ marginTop: 10 }} color={'white'} size={30} />
                            </TouchableOpacity>
                        </View>
                        {/* Top-left: Cancel X button */}
                        <View style={{
                            height: 50,
                            width: 50,
                            position: 'absolute',
                            top: 60, // consistent with other top buttons
                            left: 25,
                            zIndex: 999
                        }}>
                            <TouchableOpacity
                                onPress={() => {
                                    this.props.close?.(true);
                                }}
                                style={{}}>
                                <Icon name="times" style={{ marginTop: 10 }} color={'white'} size={30} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.container}>
                            {remaining > 0 && (
                                <View style={{ position: 'absolute', zIndex: 1000, left: '50%', top: '50%', marginTop: -100, marginLeft: -50, opacity: 0.5 }}>
                                    <Text style={{ fontSize: 150, color: 'white', fontWeight: 'bold' }}>{remaining}</Text>
                                    <Text style={{ color: 'white', fontWeight: 'bold', marginLeft: -20 }}>Media Remaining</Text>
                                    {remaining === 0 && (
                                        <Text style={{ color: 'white', fontWeight: 'bold', marginLeft: -25, marginTop: 10 }}>Proceed to Next Step</Text>
                                    )}
                                </View>
                            )}
                                                         <RNCamera
                                 style={{ flex: 1, alignItems: 'center' }}
                                 ref={ref => {
                                     this.camera = ref;
                                 }}
                                 captureAudio={false}
                                 type={backCam ? RNCamera.Constants.Type.back : RNCamera.Constants.Type.front}
                                 useNativeZoom={true}
                                 maxZoom={5}
                                 onRecordingStart={this.onRecordingStart}
                                 onRecordingEnd={this.onRecordingEnd}
                             />
                             {showZoomHint && (
                                 <View style={{
                                     position: 'absolute',
                                     top: 120,
                                     left: 0,
                                     right: 0,
                                     alignItems: 'center',
                                     zIndex: 1001
                                 }}>
                                     <Text style={{
                                         color: 'white',
                                         fontSize: 16,
                                         fontWeight: 'bold',
                                         textAlign: 'center',
                                         backgroundColor: 'rgba(0,0,0,0.6)',
                                         paddingHorizontal: 15,
                                         paddingVertical: 8,
                                         borderRadius: 20
                                     }}>
                                         Pinch to zoom
                                     </Text>
                                 </View>
                             )}
                             
                             {/* Camera/Video Instructions */}
                             <View style={{
                                 position: 'absolute',
                                 bottom: 120,
                                 left: 0,
                                 right: 0,
                                 alignItems: 'center',
                                 zIndex: 1001
                             }}>
                                 <View style={{
                                     backgroundColor: 'rgba(0,0,0,0.6)',
                                     paddingHorizontal: 20,
                                     paddingVertical: 10,
                                     borderRadius: 20,
                                     flexDirection: 'row',
                                     alignItems: 'center'
                                 }}>
                                     <Icon name="camera" color="white" size={16} style={{ marginRight: 8 }} />
                                     <Text style={{
                                         color: 'white',
                                         fontSize: 14,
                                         fontWeight: 'bold',
                                         marginRight: 15
                                     }}>
                                         Tap for photo
                                     </Text>
                                     <Icon name="video-camera" color="white" size={16} style={{ marginRight: 8 }} />
                                     <Text style={{
                                         color: 'white',
                                         fontSize: 14,
                                         fontWeight: 'bold'
                                     }}>
                                         Hold for video
                                     </Text>
                                 </View>
                             </View>
                            {count > 0 &&
                                <>
                                    <TouchableOpacity
                                        style={{
                                            position: 'absolute',
                                            bottom: 45,
                                            right: 45
                                        }}
                                        onPress={() => {
                                            this.setState({ backCam: !backCam });
                                        }}>
                                        <Icon name="undo" style={{ marginTop: 10 }} color={'white'} size={40} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{
                                            position: 'absolute',
                                            bottom: 45,
                                            left: 25
                                        }}
                                        onPress={this.pickImageFromLibrary}>
                                        <Icon name="image" style={{ marginTop: 10 }} color={'white'} size={40} />
                                    </TouchableOpacity>
                                                                         <View style={{
                                         position: 'absolute',
                                         bottom: 30,
                                         left: '50%',
                                         marginLeft: -40,
                                         alignItems: 'center',
                                         justifyContent: 'center'
                                     }}>
                                         {/* Circular Progress Border */}
                                         {isRecording && (
                                             <View style={{
                                                 position: 'absolute',
                                                 width: 90,
                                                 height: 90,
                                                 borderRadius: 45,
                                                 borderWidth: 3,
                                                 borderColor: 'rgba(255, 68, 68, 0.3)',
                                                 justifyContent: 'center',
                                                 alignItems: 'center'
                                             }}>
                                                 <Animated.View style={{
                                                     position: 'absolute',
                                                     width: 84,
                                                     height: 84,
                                                     borderRadius: 42,
                                                     borderWidth: 3,
                                                     borderColor: 'transparent',
                                                     borderTopColor: '#ff4444',
                                                     transform: [{
                                                         rotate: this.progressAnimation.interpolate({
                                                             inputRange: [0, 1],
                                                             outputRange: ['0deg', '360deg']
                                                         })
                                                     }]
                                                 }} />
                                             </View>
                                         )}
                                         
                                         {/* Main Camera Button */}
                                         <TouchableOpacity
                                             style={{
                                                 height: 80,
                                                 width: 80,
                                                 borderRadius: 100,
                                                 backgroundColor: isRecording ? '#ff4444' : '#44C1AF',
                                                 borderWidth: 5,
                                                 borderColor: "white",
                                                 alignItems: 'center',
                                                 justifyContent: 'center'
                                             }}
                                             onPress={this.takePicture}
                                             onLongPress={this.startVideoRecording}
                                             onPressOut={isRecording ? this.stopVideoRecording : undefined}
                                             delayLongPress={200}
                                         >
                                             <Icon 
                                                 name={isRecording ? "stop" : "camera"} 
                                                 color="white" 
                                                 size={30} 
                                             />
                                         </TouchableOpacity>
                                         
                                         {/* Recording Time Display */}
                                         {isRecording && (
                                             <View style={{
                                                 position: 'absolute',
                                                 top: -40,
                                                 backgroundColor: 'rgba(0,0,0,0.7)',
                                                 paddingHorizontal: 10,
                                                 paddingVertical: 5,
                                                 borderRadius: 15
                                             }}>
                                                 <Text style={{
                                                     color: 'white',
                                                     fontSize: 14,
                                                     fontWeight: 'bold'
                                                 }}>
                                                     {recordingTime.toFixed(1)}s
                                                 </Text>
                                             </View>
                                         )}
                                     </View>
                                </>
                            }
                        </View>
                    </>
                }

                {isLoading &&
                    <View style={{
                        height: '100%',
                        width: '100%',
                        backgroundColor: 'rgba(0,0,0, 0.2)',
                        position: 'absolute',
                        zIndex: 1000,
                        flex: 1,
                        top: 0
                    }}>
                        <View style={{
                            height: 150,
                            width: 150,
                            backgroundColor: 'white',
                            borderRadius: 10,
                            left: '50%',
                            marginLeft: -75,
                            top: '50%',
                            marginTop: -75
                        }}>
                            <Icon
                                name="paper-plane"
                                color='#44C1AF'
                                size={40}
                                style={{ marginTop: 35, marginLeft: 55 }}
                            />
                                                         <Text
                                 style={{
                                     color: '#44C1AF',
                                     marginTop: 20,
                                     marginLeft: 25,
                                     textAlign: 'center',
                                     width: 100
                                 }}
                             > {processingType === 'video' ? 'Converting to GIF...' : 'Posting...'} </Text>
                        </View>
                    </View>
                }

                {/* Animated Textbox Panel */}
                {/* This block is now redundant as the textbox panel is rendered conditionally */}
                {/* <Animated.View
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        padding: 20,
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        transform: [{ translateY: this.state.textboxSlide.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }) }],
                        zIndex: 999,
                        display: this.state.showTextbox ? 'flex' : 'none',
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
                            await this.api.postNewSquib(this.state.pictures, this.state.caption, loc.lon, loc.lat);
                            this.setState({ isLoading: false });
                            this.props.close?.(true);
                        }}
                        style={{ backgroundColor: '#44C1AF', borderRadius: 30, padding: 12, alignItems: 'center', marginTop: 20 }}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Post</Text>
                    </TouchableOpacity>
                </Animated.View> */}
            </>
        );
    }
}
