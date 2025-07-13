import React, { Component } from 'react';

import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Keyboard,
    Image,
    Animated
} from 'react-native';

import Icon from 'react-native-vector-icons/FontAwesome';

const SquibApi = require("../api");

export default class Squib extends Component {


    constructor(props) {
        super(props)
        this.api = new SquibApi();
        this.state = {
            comment: null,
            data: null,
            currentImage: 0,
            fadeAnimation: new Animated.Value(100)
        }
    }
    async componentDidMount() {
        const data = await this.api.getComment();
        data && this.setState({ data })
    }
    updateComment = (value) => {
        this.setState({ comment: value });
    }
    sendComment = async () => {
        const newComment = {
            "user_id": "74e212fa-e12e-4679-b5b9-a4e15ec0f231",
            "avatar": "https://cdn3.whatculture.com/images/2013/09/peter-griffin.jpg",
            "comment": this.state.comment,
            "name": "Peter Griffin"
        };
        var data = this.state.data;
        data.comments.push(newComment);
        console.log(data)
        this.setState({ data })
        await this.api.postComment({
            commment: this.state.comment,
            data: this.props.data
        });
        this.setState({ comment: null })
        Keyboard.dismiss();

    }

    fadeOut = () => {
        Animated.timing(this.state.fadeAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true
        }).start();
    };

    render() {
        const {
            text,
            image
        } = this.props.route.params;

        const { navigation } = this.props;

        const {
            data,
            currentImage
        } = this.state;

        this.fadeOut();
        return (

            <View
                style={{ flex: 1 }}
                behavior="padding"
                enabled={true}
            >
                <View style={{
                    height: 50,
                    width: 50,
                    position: 'absolute',
                    top: 28,
                    left: 25,
                    zIndex: 999
                }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{}}>
                        <Icon name="arrow-left" style={{ marginTop: 10 }} color={'white'} size={30} />
                    </TouchableOpacity>
                </View>
                {
                    (data && data.comments.length) &&
                    <View style={{
                        height: 50,
                        width: 50,
                        position: 'absolute',
                        top: 28,
                        right: 10,
                        zIndex: 999
                    }}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Comments', data.comments)
                            }
                            style={{}}>
                            <Icon
                                name="comments"
                                style={{ marginTop: 10, }}
                                color={"white"} size={30}
                            />
                        </TouchableOpacity>
                    </View>
                }
                <View
                    style={{
                        flexGrow: 1,
                        justifyContent: 'space-between',
                        backgroundColor: '#fff'
                    }}>
                    {
                        (image && image.length) &&

                        <View style={styles.squibImageContainer}>
                            <TouchableOpacity onPress={() => {
                                this.setState({ currentImage: currentImage !== (image.length - 1) ? currentImage + 1 : 0 })
                            }}>
                                <Image
                                    source={{ uri: `https://squibturf-images.s3.amazonaws.com//${image[currentImage]}` }}
                                    style={styles.squibImage}


                                />
                            </TouchableOpacity>
                            <Animated.View style={[styles.helperTextCont, { opacity: this.state.fadeAnimation }]}>
                                <Text style={styles.helperText} >
                                    Tap to see next image
                                </Text>
                            </Animated.View>
                        </View>


                    }
                    {
                        text && <Text style={styles.squibText}> " {text} "</Text>
                    }
                </View>


            </View >
        )
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
        color: "white",
        fontSize: 25,

        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        padding: 10,

    },

    squibReplyWrap: {
        flexDirection: "row",
        bottom: 0,
        height: 70,
        width: '100%',
        flexWrap: 'wrap',
        alignItems: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        borderColor: '#44C1AF',
        backgroundColor: 'white'
        // backgroundColor: '#44C1AF',
    },
    squibReplyInput: {
        flex: 1,
        height: 40,
        borderRadius: 4,
        paddingLeft: 20,
        marginLeft: 30,
        marginRight: 20,
        bottom: 0,
        backgroundColor: 'white'
    },
    squibImageContainer: {
        height: '100%',
        width: 'auto',
        flex: 1
    },
    squibImage: {
        height: '100%',
        width: '100%',
    },
    squibText: {
        padding: 30,
        fontSize: 18,
        position: 'absolute',
        // top: -30,
        zIndex: 999,
        width: '100%',
        textAlign: "center",
        bottom: 0,
        color: 'white',
        backgroundColor: "rgba(0, 0, 0, 0.3)"
    },

})