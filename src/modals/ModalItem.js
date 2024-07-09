import React, { Children, Component } from 'react';
import {
    View,
    Modal,
    Text,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
} from 'react-native';

export default class ModalItem extends Component {
    constructor(props) {
        super(props);

    }

    render() {
        const {
            children,
            show
        } = this.props;
        console.log('modal show', show)
        return (

            <Modal
                animationType={"slide"}
                transparent={false}
                visible={show}
                style={{ maxHeight: 500 }}
            >
                {children}
            </Modal>


        )
    }
}

const styles = StyleSheet.create({
    modal_closeText: {
        color: 'white',
        fontSize: 16
    },
    modal_close: {
        position: "absolute",
        top: 60,
        right: 10,
        zIndex: 999
    },

})