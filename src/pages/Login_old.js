import React, { Component } from 'react';
import {
    View,
    Text,
    StyleSheet
} from 'react-native';
import {
    GoogleSignin,
    GoogleSigninButton,
    statusCodes,
} from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppleButton, appleAuth } from '@invertase/react-native-apple-authentication';
import jwt_decode from "jwt-decode";

const SquibApi = require("../api");
const uuid = require('react-native-uuid');


GoogleSignin.configure({
    scopes: ['https://www.googleapis.com/auth/userinfo.profile'], // what API you want to access on behalf of the user, default is email and profile
    webClientId: '167248746846-6qqg19rbpsu54gndac8uicmu62ruoaq0.apps.googleusercontent.com', // client ID of type WEB for your server (needed to verify user ID and offline access)
    offlineAccess: true, // if you want to access Google API on behalf of the user FROM YOUR SERVER
    hostedDomain: '', // specifies a hosted domain restriction
    loginHint: '', // [iOS] The user's ID, or email address, to be prefilled in the authentication UI if possible. [See docs here](https://developers.google.com/identity/sign-in/ios/api/interface_g_i_d_sign_in.html#a0a68c7504c31ab0b728432565f6e33fd)
    forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs link below *.
    accountName: '', // [Android] specifies an account name on the device that should be used
    iosClientId: '167248746846-6qqg19rbpsu54gndac8uicmu62ruoaq0.apps.googleusercontent.com', // [iOS] optional, if you want to specify the client ID of type iOS (otherwise, it is taken from GoogleService-Info.plist)
});

export default class Login extends Component {
    constructor(props) {
        super(props);
        this.api = new SquibApi();
        this.state = {
            isSigninInProgress: false,
            userData: {
                email: null,
                password: null,
                confirmPassword: null,

            }
        }
        this.tracking = props.tracking;
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
            const userData = { ...user, ...{ uuid: uuid.v4() } }
            this._sendData(userData)
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
    }

    _sendData = async (info) => {
        try {
            if (!info.email) {
                throw 'No email assocaited with login';
            }
            const { navigation } = this.props;
            const response = await this.api.sendProfile(info);
            await AsyncStorage.setItem('userInfo', JSON.stringify(response.data));
            navigation.navigate('News');
        } catch (err) {
            console.log(err)
        }
    }

    _handleUserName = async (e) => {
        console.log(e);
        const value = e.target.value;
    }


    _handlePassword = async (e) => {
        console.log(e);
        const value = e.target.value;
    }


    _onHandleSubmit = async (e) => {
        console.log(e);
    }

    _onAppleButtonPress = async () => {
        try {
            // performs login request
            const appleAuthRequestResponse = await appleAuth.performRequest({
                requestedOperation: appleAuth.Operation.LOGIN,
                requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
            });
            // console.log(identityToken);

            // get current authentication state for user
            // /!\ This method must be tested on a real device. On the iOS simulator it always throws an error.
            const credentialState = await appleAuth.getCredentialStateForUser(appleAuthRequestResponse.user);


            // use credentialState response to ensure the user is authenticated
            if (credentialState === appleAuth.State.AUTHORIZED) {
                // user is authenticated
                const {
                    fullName: {
                        familyName,
                        givenName,
                    },
                    email,
                    user,
                    identityToken
                } = appleAuthRequestResponse;
                const userData = {
                    familyName,
                    givenName,
                    email,
                    name: `${givenName} ${familyName}`,
                    id: user,
                    uuid: uuid.v4(),
                    photo: null
                }
                if (!userData.email) {
                    const decoded = jwt_decode(identityToken);
                    userData.email = decoded.email;
                }
                await this._sendData(userData);

                /*
                    {
                    "authorizationCode":"cc7e9590ec1d249cc953cffc55d0b6356.0.rwsv.szjYPMAsWc7xwFEseAp1fQ",
                    "authorizedScopes":[ ],
                    "email":"jhkhan87@gmail.com",
                    "fullName":{
                        "familyName":"Khan",
                        "givenName":"Jibran",
                        "middleName":null,
                        "namePrefix":null,
                        "nameSuffix":null,
                        "nickname":null
                    },
                    "identityToken":"eyJraWQiOiI4NkQ4OEtmIiwiYWxnIjoiUlMyNTYifQ.eyJpc3MiOiJodHRwczovL2FwcGxlaWQuYXBwbGUuY29tIiwiYXVkIjoiY29tLnNxdWliLnR1cmYiLCJleHAiOjE2MzAzODM4NTcsImlhdCI6MTYzMDI5NzQ1Nywic3ViIjoiMDAwNjI1LmVlYjI5NThiY2E2NjQwYTViODRjMGM0NGMxYWExZmVhLjIxNDMiLCJub25jZSI6Ijg2NmI3YmVkNDVjMzJmOTI5Y2JkODMyYjI5ZjU0OGI5ZjU3OWIzNWI5YjE4YWY5YTVlOGNjNTU1OTFjM2RkMWEiLCJjX2hhc2giOiJrcWlWT1JKQTd2ZkM1enF5eDNjVWtnIiwiZW1haWwiOiJqaGtoYW44N0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6InRydWUiLCJhdXRoX3RpbWUiOjE2MzAyOTc0NTcsIm5vbmNlX3N1cHBvcnRlZCI6dHJ1ZX0.TDlKyk8zPO1-lp3sht1joNc-5m370dxZKK-J5oUGhowG4X5Gz7-URnIwf95p6_Gsvx7awLK6XyUUGB2zWo9ZvtRTbUl7i-KKdQ2GFgpx_pqLcfNY7OwAdNf8TmoFCpWQ5rLsb61ZEBxJVPikjOZh5mzzGW1IHeq1WVmppFqVsWAXaXawl28vyqtBQFMzhLOzJmScNWeOgqMQhcIRMUAAm0mhi4pshO42r2jvpLwGjKZxJjsGgXidMINyrIQK8-qdNQ-if1BSEoJPNlZwYNGJXwnEDel9vpU-OZ2uTe-5H7-IVckcXuJ-iU2cGsQ3J4DuLLzcHiS6c6wLsaoL9wfNyQ",
                    "nonce":"gFknC4LQidhcqlMM-9P58nLIq.4gS1PD",
                    "realUserStatus":1,
                    "state":null,
                    "user":"000625.eeb2958bca6640a5b84c0c44c1aa1fea.2143"
                    }
    
    
                
                    { photo: 'https://lh3.googleusercontent.com/a-/AOh14GiZ2-57DUZ_SIuqbmtBIICAFJWT_pUaxzgcWPJUZA=s120',
                    givenName: 'Jibran',
                    familyName: 'Khan',
                    name: 'Jibran Khan',
                    email: 'jhkhan87@gmail.com',
                    id: '115256054943389337622',
                    uuid: 'a67c4b63-e24b-4558-a731-8f7390b894f3' }
                */

            }

        } catch (err) {
            console.log('onAppleButtonPress ==>', err)
        }
    }




    render() {
        const styles = StyleSheet.create({
            input: {
                backgroundColor: '#44C1AF',
                padding: 20,
                margin: 20,
                borderRadius: 10,
                color: '#fff',
                fontWeight: 'bold',
            },
            submit: {
                fontWeight: 'bold',
                color: "#44C1AF",
                textAlign: 'center',
                fontSize: 20,
            }
        })
        return (
            <View style={{ flex: 1, height: '100%', width: '100%' }}>
                <Text style={{ fontSize: 30, fontWeight: 'bold', color: "#44C1AF", textAlign: 'center', marginTop: 60 }}> Login </Text>
                <View style={{
                    top: '30%',
                    left: '50%',
                    marginLeft: -90,
                }}>

                    <AppleButton
                        buttonStyle={AppleButton.Style.WHITE}
                        buttonType={AppleButton.Type.SIGN_IN}
                        style={{
                            width: 192, // You must specify a width
                            height: 45, // You must specify a height
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
        )
    }
}