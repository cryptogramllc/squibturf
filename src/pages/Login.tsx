import React, { Component } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
} from 'react-native';
import {
    GoogleSignin,
    GoogleSigninButton,
    statusCodes,
} from '@react-native-community/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppleButton, appleAuth } from '@invertase/react-native-apple-authentication';
import jwt_decode from "jwt-decode";
import SquibApi from "../api"; // Assuming SquibApi is properly exported as default
import uuid from 'react-native-uuid';

interface UserData {
    email: string | null;
    password: string | null;
    confirmPassword: string | null;
}

interface Props {
    navigation: any; // Adjust type as per your navigation prop type
    tracking: any; // Adjust type as per your tracking prop type
}

interface AppleAuthRequestResponse {
    user: string;
    fullName?: {
        familyName: string;
        givenName: string;
    };
    email: string;
    identityToken: string;
}

GoogleSignin.configure({
    scopes: ['https://www.googleapis.com/auth/userinfo.profile'],
    webClientId: '167248746846-6qqg19rbpsu54gndac8uicmu62ruoaq0.apps.googleusercontent.com',
    offlineAccess: true,
    hostedDomain: '',
    loginHint: '',
    forceCodeForRefreshToken: true,
    accountName: '',
    iosClientId: '167248746846-6qqg19rbpsu54gndac8uicmu62ruoaq0.apps.googleusercontent.com',
});

export default class Login extends Component<Props, { isSigninInProgress: boolean; userData: UserData }> {
    private api: SquibApi;

    constructor(props: Props) {
        super(props);
        this.api = new SquibApi();
        this.state = {
            isSigninInProgress: false,
            userData: {
                email: null,
                password: null,
                confirmPassword: null,
            }
        };
    }

    async componentDidMount() {
        const { navigation } = this.props;
        const user = await AsyncStorage.getItem('userInfo');
        if (user) {
            navigation.navigate('News');
        }
    }

    _signIn = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            const user = userInfo.user;
            const userData = { ...user, ...{ uuid: uuid() } };
            this._sendData(userData);
        } catch (error) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                // user cancelled the login flow
            } else if (error.code === statusCodes.IN_PROGRESS) {
                // operation (e.g. sign in) is in progress already
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                // play services not available or outdated
            } else {
                // some other error happened
            }
        }
    };

    _sendData = async (info: any) => {
        try {
            if (!info.email) {
                throw new Error('No email associated with login');
            }
            const { navigation } = this.props;
            const response = await this.api.sendProfile(info);
            await AsyncStorage.setItem('userInfo', JSON.stringify(response.data));
            navigation.navigate('News');
        } catch (err) {
            console.log(err);
        }
    };

    _onHandleSubmit = async (e: any) => {
        console.log(e);
    };

    _onAppleButtonPress = async () => {
        try {
            const appleAuthRequestResponse = await appleAuth.performRequest({
                requestedOperation: appleAuth.Operation.LOGIN,
                requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
            }) as AppleAuthRequestResponse;

            const credentialState = await appleAuth.getCredentialStateForUser(appleAuthRequestResponse.user);

            if (credentialState === appleAuth.State.AUTHORIZED) {
                const { fullName, email, user, identityToken } = appleAuthRequestResponse;
                const userData = {
                    familyName: fullName?.familyName,
                    givenName: fullName?.givenName,
                    email,
                    name: `${fullName?.givenName ?? ''} ${fullName?.familyName ?? ''}`,
                    id: user,
                    uuid: uuid(),
                    photo: null
                };

                if (!userData.email) {
                    const decoded: any = jwt_decode(identityToken);
                    userData.email = decoded.email;
                }

                await this._sendData(userData);
            }

        } catch (err) {
            console.log('onAppleButtonPress ==>', err);
        }
    };

    render() {
        return (
            <View style={{ flex: 1, height: '100%', width: '100%' }}>
                <Text style={{ fontSize: 30, fontWeight: 'bold', color: "#44C1AF", textAlign: 'center', marginTop: 60 }}> Login </Text>
                <View style={{
                    top: '30%',
                    left: '50%',
                    marginLeft: -90,
                    position: 'absolute'
                }}>
                    <AppleButton
                        buttonStyle={AppleButton.Style.WHITE}
                        buttonType={AppleButton.Type.SIGN_IN}
                        style={{
                            width: 192,
                            height: 45,
                            marginBottom: 30
                        }}
                        onPress={this._onAppleButtonPress}
                    />
                    <GoogleSigninButton
                        style={{
                            width: 192,
                            height: 48,
                        }}
                        size={GoogleSigninButton.Size.Wide}
                        color={GoogleSigninButton.Color.Dark}
                        onPress={this._signIn}
                        disabled={this.state.isSigninInProgress} />
                </View>
            </View>
        );
    }
}
