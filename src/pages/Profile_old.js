import React, { Component } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Keyboard,
    Image,
    Animated,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';


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


export default class Profile extends Component {
    constructor(props) {
        super(props);
        this.state = {
            userData: null
        }
    }
    async componentDidMount() {
        console.log("_loadData", this.props)
        let userData = this.props.data;
        if (!userData) {
            const user = await AsyncStorage.getItem('userInfo');
            userData = JSON.parse(user);
        }

        this.setState({ userData })

    }

    triggerClose = (event) => {
        this.props.close(true);
    }
    render() {
        const { userData } = this.state;

        return (
            <>
                {userData ?
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
                            <TouchableOpacity onPress={this.triggerClose}>
                                <Icon name="times" style={{ marginTop: 10 }} color={'#44C1AF'} size={30} />
                            </TouchableOpacity>


                        </View>
                        <View style={{
                            flex: 1,
                            top: 200,
                        }}>
                            <View>
                                <Image style={{
                                    height: 200,
                                    width: 200,
                                    position: 'absolute',
                                    marginLeft: -100,
                                    left: '50%',
                                    top: -100,
                                    borderRadius: 150,
                                    overflow: 'hidden'
                                }} source={{ uri: userData.photo }} />
                            </View>
                            <View style={{ top: 200, width: '100%', padding: 20 }}>
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}>
                                    <Text style={{
                                        fontSize: 20,
                                        flexDirection: 'row',
                                        justifyContent: 'flex-start',
                                    }}> Full Name </Text>
                                    <Text style={{
                                        fontSize: 20,
                                        flexDirection: 'row',
                                        justifyContent: 'flex-end', fontWeight: 'bold',
                                        fontWeight: 'bold',
                                        color: '#44C1AF'

                                    }}> {userData.name} </Text>
                                </View>
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: 30
                                }}>
                                    <Text style={{
                                        fontSize: 20,
                                        flexDirection: 'row',
                                        justifyContent: 'flex-start',
                                    }}> Email </Text>
                                    <Text style={{
                                        fontSize: 20,
                                        flexDirection: 'row',
                                        justifyContent: 'flex-end', fontWeight: 'bold',
                                        fontWeight: 'bold',
                                        color: '#44C1AF'

                                    }}> {userData.email} </Text>
                                </View>
                            </View>
                        </View>

                        <View style={{ bottom: '10%', alignItems: "center" }}>
                            <TouchableOpacity onPress={() => {
                                this.props.userSessionReset();
                                this.props.close(true);
                            }}>
                                <Text style={{
                                    fontSize: 20,
                                    flexDirection: 'row',
                                    justifyContent: 'flex-end', fontWeight: 'bold',
                                    fontWeight: 'bold',
                                    color: '#44C1AF',
                                    marginRight: 20,
                                    marginTop: 5
                                }}> Sign Out</Text>
                            </TouchableOpacity>
                        </View>
                    </> :
                    <>
                        <Text> No user data found</Text>
                    </>
                }

            </>
        );
    }
}