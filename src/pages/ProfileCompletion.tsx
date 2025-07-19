import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { Component } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
const SquibApi = require('../api');

interface Props {
  navigation?: any;
  route?: any;
  userData: {
    familyName?: string;
    givenName?: string;
    email?: string;
    name?: string;
    id: string;
    uuid: string;
  };
}

interface State {
  firstName: string;
  lastName: string;
  displayName: string;
  bio: string;
  isLoading: boolean;
}

export default class ProfileCompletion extends Component<Props, State> {
  private api: typeof SquibApi;

  constructor(props: Props) {
    super(props);
    this.api = new SquibApi();
    // Safely access userData with fallbacks from route.params
    const userData = props.route?.params?.userData || {};
    this.state = {
      firstName: userData.givenName || '',
      lastName: userData.familyName || '',
      displayName: userData.displayName || userData.name || '',
      bio: userData.bio || '',
      isLoading: false,
    };
  }

  handleCompleteProfile = async () => {
    const { firstName, lastName, displayName, bio } = this.state;
    const { navigation, route } = this.props;
    const userData = route?.params?.userData;

    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert(
        'Profile Incomplete',
        'Please enter both first name and last name.'
      );
      return;
    }

    if (!displayName.trim()) {
      Alert.alert('Profile Incomplete', 'Please enter a display name.');
      return;
    }

    // Ensure userData exists
    if (!userData) {
      Alert.alert('Error', 'User data not found. Please try logging in again.');
      return;
    }

    this.setState({ isLoading: true });

    try {
      // Create complete user profile with safe fallbacks
      const completeUserData = {
        ...userData,
        email: userData.email || '',
        givenName: firstName.trim(),
        familyName: lastName.trim(),
        name: displayName.trim(),
        bio: bio.trim(),
        displayName: displayName.trim(),
        profileCompleted: true,
      };

      await AsyncStorage.setItem('userInfo', JSON.stringify(completeUserData));

      // Send to backend API
      const apiResponse = await this.api.sendProfile(completeUserData);

      navigation?.navigate('News');
    } catch (error) {
      Alert.alert('Error', 'Failed to complete profile. Please try again.');
    } finally {
      this.setState({ isLoading: false });
    }
  };

  render() {
    const { firstName, lastName, displayName, bio, isLoading } = this.state;
    const Icon: any = FontAwesome;

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Help others get to know you better
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={text => this.setState({ firstName: text })}
              placeholder="Enter your first name"
              placeholderTextColor="#999"
              maxLength={30}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={text => this.setState({ lastName: text })}
              placeholder="Enter your last name"
              placeholderTextColor="#999"
              maxLength={30}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Display Name *</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={text => this.setState({ displayName: text })}
              placeholder="Enter your display name"
              placeholderTextColor="#999"
              maxLength={30}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Bio (Optional)</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={text => this.setState({ bio: text })}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              maxLength={150}
            />
            <Text style={styles.charCount}>{bio.length}/150</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={this.handleCompleteProfile}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.buttonText}>Creating Profile...</Text>
            ) : (
              <Text style={styles.buttonText}>Complete Profile</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              this.setState({ displayName: 'Apple User' }, () => {
                this.handleCompleteProfile();
              });
            }}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#44C1AF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    paddingHorizontal: 20,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: '#44C1AF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    padding: 12,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
  },
});
