import React, { Component, ReactNode } from 'react';
import {
    View,
    Modal,
    StyleSheet,
    ModalProps,
    ViewStyle,
    TextStyle,
    KeyboardAvoidingView,
} from 'react-native';

interface ModalItemProps {
    children?: ReactNode; // Optional children prop
    show: boolean; // Required boolean prop indicating modal visibility
}

export default class ModalItem extends Component<ModalItemProps> {
    constructor(props: ModalItemProps) {
        super(props);
    }

    render() {
        const { children, show } = this.props;

        return (
            <Modal
                animationType="slide"
                transparent={false}
                visible={show}
                style={{ maxHeight: 500 } as ViewStyle} // Type assertion for style prop
            >
                {children}
            </Modal>
        );
    }
}

const styles = StyleSheet.create({
    modal_closeText: {
        color: 'white',
        fontSize: 16,
    },
    modal_close: {
        position: 'absolute',
        top: 60,
        right: 10,
        zIndex: 999,
    } as ViewStyle, // Type assertion for style prop
});
