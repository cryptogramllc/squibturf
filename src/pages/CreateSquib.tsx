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
    Platform
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import Carousel from 'react-native-snap-carousel';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Geolocation from '@react-native-community/geolocation';
import { request, PERMISSIONS, RESULTS, Permission, Rationale } from 'react-native-permissions';
import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';

const SquibApi = require("../api");

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
}

export default class CreateSquib extends Component<CreateSquibProps, CreateSquibState> {
    private camera: RNCamera | null = null;
    private api: any;

    constructor(props: CreateSquibProps) {
        super(props);
        this.api = new SquibApi();
        this.state = {
            backCam: true,
            pictures: [],
            latestPic: null,
            camera: true,
            squib: false,
            count: 5,
            caption: null,
            isLoading: false
        };
    }

    async componentDidMount() {
        // Request camera permission when component mounts
        await this.requestCameraPermission();
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
        const { latestPic, count } = this.state;
        if (latestPic) {
            const pictures = this.state.pictures.concat(latestPic);
            const newAmount = count - 1;
            this.setState({ pictures, count: newAmount });
        }
    };

    takePicture = async () => {
        if (this.camera && !this.state.takingPic) {
            // Request camera permission first
            const hasPermission = await this.requestCameraPermission();
            if (!hasPermission) {
                Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
                return;
            }

            this.setState({ takingPic: true });
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
                this.setState({ takingPic: false });
            }
        }
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
                const pictures = this.state.pictures.concat(selectedImages);
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

    render() {
        const {
            backCam,
            camera,
            squib,
            latestPic,
            count,
            pictures,
            caption,
            isLoading
        } = this.state;
        const Icon: any = FontAwesome;
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
                        <View
                            style={{
                                // flex: 1,
                                padding: 20,
                                marginLeft: 30,
                                marginRight: 30,
                                borderRadius: 20,
                                top: 130, // was 80
                                backgroundColor: 'rgba(255,255,255, 0.2)',
                                overflow: 'hidden',
                                height: 200,
                            }}>
                            <TextInput
                                multiline
                                placeholder="Write a post..."
                                placeholderTextColor="#fff"
                                style={{
                                    color: 'white',
                                    fontSize: 20,
                                    flex: 1,
                                    // height: 30, // removed
                                    // alignItems: 'stretch',
                                }}
                                onChangeText={text => this.setState({ caption: text })}
                            />
                        </View>
                        <View style={{ alignItems: 'center', marginTop: 200 }}>
                            <TouchableOpacity
                                onPress={async () => {
                                    const loc = await this.getCurrentLocation();
                                    Keyboard.dismiss();
                                    this.setState({ isLoading: true });
                                    await this.api.postNewSquib(pictures, caption, loc.lon, loc.lat);
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
                        </View>
                            <Carousel
                                data={this.state.pictures}
                                renderItem={this._renderItem}
                                sliderWidth={sliderWidth}
                                itemWidth={itemWidth}
                                layout={'stack'}
                                layoutCardOffset={18}
                            />
                        
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
                            <View style={{
                                position: 'absolute',
                                zIndex: 1000,
                                left: '50%',
                                top: '50%',
                                marginTop: -100,
                                marginLeft: -50,
                                opacity: 0.5
                            }}>
                                <Text style={{
                                    fontSize: 150,
                                    color: 'white',
                                    fontWeight: 'bold'
                                }}>{count}</Text>
                                <Text style={{
                                    color: 'white',
                                    fontWeight: 'bold',
                                    marginLeft: -20
                                }}>Pictures Remaining</Text>
                                {count == 0 &&
                                    <Text style={{
                                        color: 'white',
                                        fontWeight: 'bold',
                                        marginLeft: -25,
                                        marginTop: 10
                                    }}>Proceed to Next Step</Text>
                                }
                            </View>
                            <RNCamera
                                style={{ flex: 1, alignItems: 'center' }}
                                ref={ref => {
                                    this.camera = ref;
                                }}
                                captureAudio={false}
                                type={backCam ? RNCamera.Constants.Type.back : RNCamera.Constants.Type.front}
                            />
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
                                    <TouchableOpacity
                                        style={{
                                            height: 80,
                                            width: 80,
                                            borderRadius: 100,
                                            backgroundColor: '#44C1AF',
                                            bottom: 30,
                                            position: 'absolute',
                                            borderWidth: 5,
                                            borderColor: "white",
                                            left: '50%',
                                            marginLeft: -40,
                                        }}
                                        onPress={this.takePicture}
                                    />
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
                            > Posting, Please Wait. </Text>
                        </View>
                    </View>
                }
            </>
        );
    }
}
