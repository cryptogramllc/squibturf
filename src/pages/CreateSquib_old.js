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
    Keyboard
} from 'react-native';

import { RNCamera } from 'react-native-camera'
import Carousel from 'react-native-snap-carousel';
import Icon from 'react-native-vector-icons/FontAwesome';

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

        // other styles for the item container
    },
    slideInnerContainer: {
        width: sliderWidth,
        flex: 1
        // other styles for the inner container
    }
})

export default class CreateSquib extends Component {
    constructor(props) {
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

    _renderItem({ item, index }) {
        return (
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
    }


    onCapture({ image }) {
        this.props.onCapture(image.path);
    }

    storePic = async () => {
        const { latestPic, count } = this.state;
        const pictures = this.state.pictures.concat(latestPic);
        const newAmount = count - 1
        this.setState({ pictures })
        this.setState({ count: newAmount })
    }
    takePicture = async () => {
        if (this.camera && !this.state.takingPic) {

            let options = {
                quality: 0.1,
                fixOrientation: true,
                forceUpOrientation: true,
                base64: true
            };

            this.setState({ takingPic: true });
            try {
                const data = await this.camera.takePictureAsync(options);
                this.setState({ latestPic: data.uri });
            } catch (err) {
                Alert.alert('Error', 'Failed to take picture: ' + (err.message || err));
                return;
            } finally {
                // this.setState({ takingPic: false });
            }
        }
    };
    triggerClose = (event) => {
        this.props.close(true);
    }

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

        return (
            <>

                {squib &&
                    <View style={{
                        backgroundColor: '#44C1AF',
                        flex: 1
                    }}>
                        <View style={{
                            height: 50,
                            width: 50,
                            position: 'absolute',
                            top: 35,
                            left: 25,
                            zIndex: 999
                        }}>
                            <TouchableOpacity
                                onPress={() => {
                                    this.setState({
                                        camera: camera ? false : true,
                                        squib: squib ? false : true,
                                    })
                                }}
                                style={{}}>
                                <Icon name="arrow-left" style={{ marginTop: 10 }} color={'white'} size={30} />

                            </TouchableOpacity>
                        </View>
                        <View style={{
                            height: 50,
                            width: 50,
                            position: 'absolute',
                            top: 50,
                            right: 20,
                            zIndex: 999
                        }}>
                            <TouchableOpacity
                                onPress={async () => {
                                    // 
                                    navigator.geolocation = require('@react-native-community/geolocation');
                                    const loc = await new Promise((res, rej) => {
                                        navigator.geolocation.getCurrentPosition(
                                            position => {
                                                const location = position;
                                                const lat = location.coords.latitude;
                                                const lon = location.coords.longitude;
                                                res({ lon, lat })
                                            { enableHighAccuracy: true, timeout: 3000, maximumAge: 1000 }
                                        )
                                    });
                                    Keyboard.dismiss;
                                    this.setState({ isLoading: true })
                                    await this.api.postNewSquib(pictures, caption, loc.lon, loc.lat);
                                    this.setState({ isLoading: false })
                                    this.props.close(true);
                                }}
                                style={{}}>
                                <Text style={{
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    fontSize: 18,
                                }}> Post </Text>
                            </TouchableOpacity>
                        </View>
                        <View
                            style={{
                                flex: 1,
                                padding: 20,
                                marginLeft: 30,
                                marginRight: 30,
                                borderRadius: 20,
                                top: 80,
                                backgroundColor: 'rgba(255,255,255, 0.2)',
                                overflow: 'hidden'
                            }}>
                            <TextInput
                                multiline
                                placeholder="Write a post..."
                                style={{
                                    flex: 1,
                                    color: 'white',
                                    fontSize: 20,
                                    height: 30,
                                    alignItems: 'stretch',
                                }}
                                onChangeText={text => this.setState({ caption: text })}
                            />
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

                {
                    latestPic &&
                    <View style={{
                        flex: 1,
                        position: 'absolute',
                        zIndex: 1000,
                        height: '100%',
                        width: '100%',

                    }}>
                        <TouchableOpacity
                            onPress={() => {
                                this.setState({ takingPic: false, latestPic: null })
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
                                this.setState({ takingPic: false, latestPic: null })
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
                {
                    camera &&
                    <>
                        <View style={{
                            height: 50,
                            width: 50,
                            transform: [{ rotate: "180deg" }],
                            position: 'absolute',
                            top: 35,
                            left: 0,
                            zIndex: 999,

                        }}>
                            <TouchableOpacity
                                onPress={this.triggerClose}
                                style={{}}>
                                <Icon name="times" style={{ marginTop: 10 }} color={'white'} size={30} />

                            </TouchableOpacity>
                        </View>
                        <View style={{
                            height: 50,
                            width: 50,
                            position: 'absolute',
                            top: 35,
                            right: 0,
                            zIndex: 999
                        }}>
                            <TouchableOpacity
                                onPress={() => {
                                    this.setState({
                                        camera: camera ? false : true,
                                        squib: squib ? false : true,
                                    })
                                }}
                                style={{}}>
                                <Icon name="arrow-right" style={{ marginTop: 10 }} color={'white'} size={30} />

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
                                    this.camera = ref
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
                                            this.setState({ backCam: backCam ? false : true })
                                        }}>
                                        <Icon name="undo" style={{ marginTop: 10 }} color={'white'} size={40} />

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
                {
                    isLoading &&
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
        )
    }

}


